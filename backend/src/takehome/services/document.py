from __future__ import annotations

import os
import re
import uuid
from dataclasses import dataclass

import fitz  # PyMuPDF
import structlog
from fastapi import UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from takehome.common.errors import ValidationError
from takehome.config import settings
from takehome.db.models import Document

logger = structlog.get_logger()


@dataclass(slots=True)
class DocumentSearchMatch:
    page_number: int
    snippet: str
    occurrence_index: int


def _normalize_match_character(character: str) -> str:
    if character in ("'", "\u2019"):
        return "'"
    return character


def _is_word_character(character: str) -> bool:
    return character.isalnum()


def _build_normalized_text_with_map(value: str) -> tuple[str, list[int]]:
    normalized = ""
    index_map: list[int] = []
    previous_was_whitespace = True

    for index, raw_character in enumerate(value):
        character = _normalize_match_character(raw_character)
        previous_character = _normalize_match_character(value[index - 1]) if index > 0 else ""
        next_character = (
            _normalize_match_character(value[index + 1]) if index < len(value) - 1 else ""
        )
        keep_as_word_character = _is_word_character(character) or (
            character == "'"
            and _is_word_character(previous_character)
            and _is_word_character(next_character)
        )

        if not keep_as_word_character:
            if previous_was_whitespace or not normalized:
                continue

            normalized += " "
            index_map.append(index)
            previous_was_whitespace = True
            continue

        normalized += character.lower()
        index_map.append(index)
        previous_was_whitespace = False

    if normalized.endswith(" "):
        normalized = normalized[:-1]
        index_map.pop()

    return normalized, index_map


async def upload_document(
    session: AsyncSession, conversation_id: str, file: UploadFile
) -> Document:
    """Upload and process a PDF document for a conversation.

    Validates the file is a PDF, saves it to disk, extracts text using PyMuPDF,
    and stores metadata in the database.

    Raises ValidationError if the file is invalid.
    """
    # Validate file type
    if file.content_type not in ("application/pdf", "application/x-pdf"):
        filename = file.filename or ""
        if not filename.lower().endswith(".pdf"):
            raise ValidationError("Only PDF files are supported.")

    # Read file content
    content = await file.read()

    # Validate file size
    if len(content) > settings.max_upload_size:
        raise ValidationError(
            f"File too large. Maximum size is {settings.max_upload_size // (1024 * 1024)}MB."
        )

    # Generate a unique filename to avoid collisions
    original_filename = file.filename or "document.pdf"
    unique_name = f"{uuid.uuid4().hex}_{original_filename}"
    file_path = os.path.join(settings.upload_dir, unique_name)

    # Ensure upload directory exists
    os.makedirs(settings.upload_dir, exist_ok=True)

    # Save the file to disk
    with open(file_path, "wb") as f:
        f.write(content)

    logger.info("Saved uploaded PDF", filename=original_filename, path=file_path, size=len(content))

    # Extract text using PyMuPDF
    extracted_text = ""
    page_count = 0
    try:
        doc = fitz.open(file_path)
        page_count = len(doc)
        pages: list[str] = []
        for page_num in range(page_count):
            page = doc[page_num]
            text = page.get_text()  # type: ignore[union-attr]
            if text.strip():
                pages.append(f"--- Page {page_num + 1} ---\n{text}")
        extracted_text = "\n\n".join(pages)
        doc.close()
    except Exception:
        logger.exception("Failed to extract text from PDF", filename=original_filename)
        extracted_text = ""

    logger.info(
        "Extracted text from PDF",
        filename=original_filename,
        page_count=page_count,
        text_length=len(extracted_text),
    )

    # Create the document record
    document = Document(
        conversation_id=conversation_id,
        filename=original_filename,
        file_path=file_path,
        extracted_text=extracted_text if extracted_text else None,
        page_count=page_count,
    )
    session.add(document)
    await session.commit()
    await session.refresh(document)
    return document


async def get_document(session: AsyncSession, document_id: str) -> Document | None:
    """Get a document by its ID."""
    stmt = select(Document).where(Document.id == document_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_document_for_conversation(
    session: AsyncSession, conversation_id: str
) -> Document | None:
    """Get the document for a conversation, if one exists."""
    stmt = select(Document).where(Document.conversation_id == conversation_id)
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_documents_for_conversation(
    session: AsyncSession, conversation_id: str
) -> list[Document]:
    """List documents for a conversation ordered by upload time."""
    stmt = (
        select(Document)
        .where(Document.conversation_id == conversation_id)
        .order_by(Document.uploaded_at.asc())
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


def search_document_text(document: Document, query: str) -> list[DocumentSearchMatch]:
    """Search extracted document text and return snippet matches."""
    search_term = query.strip()
    if not search_term or not document.extracted_text:
        return []

    normalized_query, _ = _build_normalized_text_with_map(search_term)
    if not normalized_query:
        return []

    page_pattern = re.compile(r"--- Page (\d+) ---\n(.*?)(?=\n\n--- Page \d+ ---|\Z)", re.DOTALL)

    matches: list[DocumentSearchMatch] = []
    for page_match in page_pattern.finditer(document.extracted_text):
        page_number = int(page_match.group(1))
        page_text = page_match.group(2)
        normalized_page_text, index_map = _build_normalized_text_with_map(page_text)
        search_from = 0
        occurrence_index = 0
        while search_from < len(normalized_page_text):
            match_start = normalized_page_text.find(normalized_query, search_from)
            if match_start < 0:
                break

            match_end = match_start + len(normalized_query)
            original_start = index_map[match_start] if match_start < len(index_map) else None
            original_end = index_map[match_end - 1] if match_end - 1 < len(index_map) else None
            if original_start is not None and original_end is not None:
                start = max(0, original_start - 90)
                end = min(len(page_text), original_end + 1 + 140)
                snippet = " ".join(page_text[start:end].split())
                matches.append(
                    DocumentSearchMatch(
                        page_number=page_number,
                        snippet=snippet,
                        occurrence_index=occurrence_index,
                    )
                )
                occurrence_index += 1

            # Advance by one normalized character so repeated terms on the same page
            # produce separate matches instead of collapsing to the first hit only.
            search_from = match_start + 1

    return matches
