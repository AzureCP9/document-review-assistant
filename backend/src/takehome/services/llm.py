from __future__ import annotations

from collections.abc import AsyncIterator

from pydantic import BaseModel, Field

from pydantic_ai import Agent

from takehome.config import (
    settings,  # noqa: F401  # pyright: ignore[reportUnusedImport] - triggers ANTHROPIC_API_KEY export
)

agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    system_prompt=(
        "You are a helpful legal document assistant for commercial real estate lawyers. "
        "You help lawyers review and understand documents during due diligence.\n\n"
        "IMPORTANT INSTRUCTIONS:\n"
        "- Answer questions based on the document content provided.\n"
        "- When referencing specific parts of the document, cite the relevant section or clause.\n"
        "- If the answer is not in the document, say so clearly. Do not fabricate information.\n"
        "- Be concise and precise. Lawyers value accuracy over verbosity.\n"
        "- When you reference specific content, mention the section, clause, or page."
    ),
)


class Citation(BaseModel):
    document_name: str
    page_number: int = Field(ge=1)
    section_or_clause: str | None = Field(default=None, max_length=120)
    key_phrase: str = Field(min_length=1, max_length=240)


class CitationExtractionResult(BaseModel):
    citations: list[Citation] = Field(default_factory=list)  # pyright: ignore[reportUnknownVariableType]


citation_agent = Agent(
    "anthropic:claude-haiku-4-5-20251001",
    output_type=CitationExtractionResult,  # pyright: ignore[reportCallIssue]
    system_prompt=(
        "You extract only verified citations from legal-document answers.\n"
        "Return citations only when the answer is directly supported by the provided documents.\n"
        "The document context includes explicit page markers in the form '--- Page N ---'. Use those markers to determine page numbers.\n"
        "Each citation must include the exact document name, page number, an optional section or clause label when one is clearly available, and a short exact key phrase copied verbatim from the document text.\n"
        "Prefer 1 to 5 citations that support the most important factual claims in the answer.\n"
        "When the answer makes multiple concrete factual claims, return citations for the strongest supported ones instead of returning none.\n"
        "If the answer is mostly about one document, citations should usually come from that document.\n"
        "Do not cite claims that are framed as missing, unknown, or not found in the documents.\n"
        "If support is missing or unclear, omit the citation instead of guessing.\n"
        "Do not return duplicate citations.\n"
        "Use section_or_clause for labels like 'Tenant's Obligations', 'Section 4.1', or 'Clause 8.3.1' when the document clearly provides them. Otherwise return null."
    ),
)


async def generate_title(user_message: str) -> str:
    """Generate a 3-5 word conversation title from the first user message."""
    result = await agent.run(
        f"Generate a concise 3-5 word title for a conversation that starts with: '{user_message}'. "
        "Return only the title, nothing else."
    )
    title = str(result.output).strip().strip('"').strip("'")
    # Truncate if too long
    if len(title) > 100:
        title = title[:97] + "..."
    return title


async def chat_with_document(
    user_message: str,
    document_text: str | None,
    conversation_history: list[dict[str, str]],
) -> AsyncIterator[str]:
    """Stream a response to the user's message, yielding text chunks.

    Builds a prompt that includes document context and conversation history,
    then streams the response from the LLM.
    """
    # Build the full prompt with context
    prompt_parts: list[str] = []

    # Add document context if available
    if document_text:
        prompt_parts.append(
            "The following is the content of the document being discussed:\n\n"
            "<document>\n"
            f"{document_text}\n"
            "</document>\n"
        )
    else:
        prompt_parts.append(
            "No document has been uploaded yet. If the user asks about a document, "
            "let them know they need to upload one first.\n"
        )

    # Add conversation history
    if conversation_history:
        prompt_parts.append("Previous conversation:\n")
        for msg in conversation_history:
            role = msg["role"]
            content = msg["content"]
            if role == "user":
                prompt_parts.append(f"User: {content}\n")
            elif role == "assistant":
                prompt_parts.append(f"Assistant: {content}\n")
        prompt_parts.append("\n")

    # Add the current user message
    prompt_parts.append(f"User: {user_message}")

    full_prompt = "\n".join(prompt_parts)

    async with agent.run_stream(full_prompt) as result:
        async for text in result.stream_text(delta=True):
            yield text


async def extract_citations(
    user_message: str,
    answer_markdown: str,
    document_text: str | None,
    document_names: list[str] | None = None,
) -> list[Citation]:
    """Extract structured citations for an answer from the provided document context."""
    if not document_text or not answer_markdown.strip():
        return []

    available_documents = ", ".join(document_names or [])

    result = await citation_agent.run(
        "\n\n".join(
            [
                "User question:",
                user_message,
                "Assistant answer:",
                answer_markdown,
                "Document context:",
                document_text,
                "Return only citations that are explicitly supported by the document context.",
                "Use the exact document names and the explicit page markers from the provided context.",
                f"Available document names: {available_documents or 'None'}",
                "Return at least one citation whenever the answer contains a concrete factual statement clearly supported by the context.",
            ]
        )
    )
    parsed = result.output

    deduped: list[Citation] = []
    seen: set[tuple[str, int, str]] = set()
    for citation in parsed.citations:
        key = (
            citation.document_name.strip().lower(),
            citation.page_number,
            (citation.section_or_clause or "").strip().lower(),
            citation.key_phrase.strip().lower(),
        )
        if key in seen:
            continue
        seen.add(key)
        deduped.append(citation)
    return deduped
