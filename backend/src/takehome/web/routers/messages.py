from __future__ import annotations

import json
import re
from collections.abc import AsyncIterator
from datetime import datetime

import structlog
from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from starlette.responses import StreamingResponse

from takehome.common.errors import NotFoundError
from takehome.db.models import Document, Message
from takehome.db.session import get_session
from takehome.services.conversation import get_conversation, update_conversation
from takehome.services.document import get_documents_for_conversation
from takehome.services.llm import Citation, chat_with_document, extract_citations, generate_title

logger = structlog.get_logger()

router = APIRouter(tags=["messages"])


# --------------------------------------------------------------------------- #
# Schemas
# --------------------------------------------------------------------------- #


class MessageOut(BaseModel):
    id: str
    conversation_id: str
    role: str
    content: str
    sources_cited: int
    citations: list[Citation]
    created_at: datetime

    model_config = {"from_attributes": True}


class MessageCreate(BaseModel):
    content: str


# --------------------------------------------------------------------------- #
# Endpoints
# --------------------------------------------------------------------------- #


@router.get(
    "/api/conversations/{conversation_id}/messages",
    response_model=list[MessageOut],
)
async def list_messages(
    conversation_id: str,
    session: AsyncSession = Depends(get_session),
) -> list[MessageOut]:
    """List all messages in a conversation, ordered by creation time."""
    # Verify the conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise NotFoundError("Conversation not found")

    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .order_by(Message.created_at.asc())
    )
    result = await session.execute(stmt)
    messages = list(result.scalars().all())

    return [
        MessageOut(
            id=m.id,
            conversation_id=m.conversation_id,
            role=m.role,
            content=m.content,
            sources_cited=m.sources_cited,
            citations=_load_citations(m.citations_json),
            created_at=m.created_at,
        )
        for m in messages
    ]


def _load_citations(citations_json: str | None) -> list[Citation]:
    if not citations_json:
        return []

    try:
        raw = json.loads(citations_json)
    except json.JSONDecodeError:
        logger.warning("Failed to decode message citations", citations_json=citations_json)
        return []

    citations: list[Citation] = []
    for item in raw:
        try:
            citations.append(Citation.model_validate(item))
        except Exception:
            logger.warning("Skipping invalid citation payload", citation=item)
    return citations


def _normalize_text(value: str) -> str:
    return " ".join(value.lower().split())


def _normalize_document_name(value: str) -> str:
    value = value.strip().lower()
    value = re.sub(r"\.pdf$", "", value)
    return re.sub(r"[^a-z0-9]+", "", value)


def _match_document_for_citation(
    citation: Citation,
    documents: list[Document],
) -> Document | None:
    citation_name = citation.document_name.strip().lower()
    normalized_citation_name = _normalize_document_name(citation.document_name)

    for document in documents:
        filename = document.filename.strip().lower()
        if filename == citation_name:
            return document

    for document in documents:
        normalized_filename = _normalize_document_name(document.filename)
        if normalized_filename == normalized_citation_name:
            return document

    return None


def _verify_citations(
    citations: list[Citation],
    documents: list[Document],
) -> list[Citation]:
    verified: list[Citation] = []

    for citation in citations:
        document = _match_document_for_citation(citation, documents)
        if document is None:
            logger.info(
                "Dropping citation due to document name mismatch",
                citation_document_name=citation.document_name,
                available_documents=[document.filename for document in documents],
            )
            continue
        if citation.page_number < 1 or citation.page_number > document.page_count:
            logger.info(
                "Dropping citation due to invalid page number",
                citation_document_name=citation.document_name,
                citation_page_number=citation.page_number,
                document_page_count=document.page_count,
            )
            continue

        page_text = _get_page_text(document.extracted_text, citation.page_number)
        if not page_text:
            logger.info(
                "Dropping citation due to missing extracted page text",
                citation_document_name=citation.document_name,
                citation_page_number=citation.page_number,
            )
            continue

        if _normalize_text(citation.key_phrase) not in _normalize_text(page_text):
            logger.info(
                "Dropping citation due to key phrase mismatch",
                citation_document_name=citation.document_name,
                citation_page_number=citation.page_number,
                citation_key_phrase=citation.key_phrase,
            )
            continue

        verified.append(citation)

    return verified


def _get_page_text(extracted_text: str | None, page_number: int) -> str | None:
    if not extracted_text:
        return None

    pattern = rf"--- Page {page_number} ---\n(.*?)(?=\n\n--- Page \d+ ---|\Z)"
    match = re.search(pattern, extracted_text, re.DOTALL)
    if not match:
        return None
    return match.group(1)


@router.post("/api/conversations/{conversation_id}/messages")
async def send_message(
    conversation_id: str,
    body: MessageCreate,
    session: AsyncSession = Depends(get_session),
) -> StreamingResponse:
    """Send a user message and stream back the AI response via SSE."""
    # Verify the conversation exists
    conversation = await get_conversation(session, conversation_id)
    if conversation is None:
        raise NotFoundError("Conversation not found")

    # Save the user message
    user_message = Message(
        conversation_id=conversation_id,
        role="user",
        content=body.content,
    )
    session.add(user_message)
    await session.commit()
    await session.refresh(user_message)

    logger.info("User message saved", conversation_id=conversation_id, message_id=user_message.id)

    documents = await get_documents_for_conversation(session, conversation_id)
    document_context = "\n\n".join(
        (
            f'<document name="{document.filename}">\n'
            f"{document.extracted_text}\n"
            "</document>"
        )
        for document in documents
        if document.extracted_text
    ) or None

    # Load conversation history (exclude the message we just saved, it will be the user_message param)
    stmt = (
        select(Message)
        .where(Message.conversation_id == conversation_id)
        .where(Message.id != user_message.id)
        .order_by(Message.created_at.asc())
    )
    result = await session.execute(stmt)
    history_messages = list(result.scalars().all())

    conversation_history: list[dict[str, str]] = [
        {"role": m.role, "content": m.content} for m in history_messages
    ]

    # Determine if this is the first user message (for title generation)
    user_msg_count = sum(1 for m in history_messages if m.role == "user")
    is_first_message = user_msg_count == 0

    async def event_stream() -> AsyncIterator[str]:
        """Generate SSE events with the streamed LLM response."""
        full_response = ""

        try:
            async for chunk in chat_with_document(
                user_message=body.content,
                document_text=document_context,
                conversation_history=conversation_history,
            ):
                full_response += chunk
                event_data = json.dumps({"type": "content", "content": chunk})
                yield f"data: {event_data}\n\n"

        except Exception:
            logger.exception(
                "Error during LLM streaming",
                conversation_id=conversation_id,
            )
            error_msg = "I'm sorry, an error occurred while generating a response. Please try again."
            full_response = error_msg
            event_data = json.dumps({"type": "content", "content": error_msg})
            yield f"data: {event_data}\n\n"

        finalizing_data = json.dumps({"type": "finalizing"})
        yield f"data: {finalizing_data}\n\n"

        citations: list[Citation] = []
        try:
            citations = await extract_citations(
                user_message=body.content,
                answer_markdown=full_response,
                document_text=document_context,
                document_names=[document.filename for document in documents],
            )
            logger.info(
                "Extracted citations from answer",
                conversation_id=conversation_id,
                extracted_citation_count=len(citations),
                citations=[citation.model_dump(mode="json") for citation in citations],
            )
            citations = _verify_citations(citations, documents)
            logger.info(
                "Verified citations for answer",
                conversation_id=conversation_id,
                verified_citation_count=len(citations),
                citations=[citation.model_dump(mode="json") for citation in citations],
            )
        except Exception:
            logger.exception(
                "Failed to extract citations",
                conversation_id=conversation_id,
            )

        sources = len(citations)
        serialized_citations = json.dumps(
            [citation.model_dump(mode="json") for citation in citations]
        )

        # Save the assistant message to the database.
        # We need a fresh session since the outer one may have been closed.
        from takehome.db.session import async_session as session_factory

        async with session_factory() as save_session:
            assistant_message = Message(
                conversation_id=conversation_id,
                role="assistant",
                content=full_response,
                sources_cited=sources,
                citations_json=serialized_citations if citations else None,
            )
            save_session.add(assistant_message)
            await save_session.commit()
            await save_session.refresh(assistant_message)

            # Auto-generate title from first user message
            if is_first_message:
                try:
                    title = await generate_title(body.content)
                    await update_conversation(save_session, conversation_id, title)
                    logger.info(
                        "Auto-generated conversation title",
                        conversation_id=conversation_id,
                        title=title,
                    )
                except Exception:
                    logger.exception(
                        "Failed to generate title",
                        conversation_id=conversation_id,
                    )

            # Send the final message event with the complete assistant message
            message_data = json.dumps(
                {
                    "type": "message",
                    "message": {
                        "id": assistant_message.id,
                        "conversation_id": assistant_message.conversation_id,
                        "role": assistant_message.role,
                        "content": assistant_message.content,
                        "sources_cited": assistant_message.sources_cited,
                        "citations": [citation.model_dump(mode="json") for citation in citations],
                        "created_at": assistant_message.created_at.isoformat(),
                    },
                }
            )
            yield f"data: {message_data}\n\n"

            # Send the done signal
            done_data = json.dumps(
                {
                    "type": "done",
                    "sources_cited": sources,
                    "message_id": assistant_message.id,
                }
            )
            yield f"data: {done_data}\n\n"

    return StreamingResponse(
        event_stream(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no",
        },
    )
