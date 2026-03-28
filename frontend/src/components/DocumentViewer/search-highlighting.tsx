import type { ReactNode } from "react";

function escapeRegExp(value: string): string {
	return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getBaseSpanText(span: HTMLSpanElement): string {
	return span.dataset.pdfHighlightOriginalText ?? span.textContent ?? "";
}

function isWordCharacter(character: string): boolean {
	return /[\p{L}\p{N}]/u.test(character);
}

function isApostrophe(character: string): boolean {
	return character === "'" || character === "\u2019";
}

function normalizeWhitespace(value: string): string {
	let normalized = "";
	let previousWasWhitespace = true;

	for (let index = 0; index < value.length; index += 1) {
		const character = value[index] ?? "";
		const previousCharacter = index > 0 ? value[index - 1] ?? "" : "";
		const nextCharacter =
			index < value.length - 1 ? value[index + 1] ?? "" : "";
		const keepAsWordCharacter =
			isWordCharacter(character) ||
			(isApostrophe(character) &&
				isWordCharacter(previousCharacter) &&
				isWordCharacter(nextCharacter));

		if (!keepAsWordCharacter) {
			if (previousWasWhitespace || normalized.length === 0) {
				continue;
			}

			normalized += " ";
			previousWasWhitespace = true;
			continue;
		}

		normalized += character.toLowerCase();
		previousWasWhitespace = false;
	}

	return normalized.trim();
}

function collectLineSpans(root: HTMLElement): Array<{
	spans: HTMLSpanElement[];
	text: string;
	top: number;
}> {
	const spans = Array.from(root.querySelectorAll("span")).filter(
		(node): node is HTMLSpanElement =>
			node instanceof HTMLSpanElement &&
			!node.classList.contains("endOfContent") &&
			Boolean(getBaseSpanText(node).trim()),
	);

	const sortedSpans = spans.sort((left, right) => {
		const leftRect = left.getBoundingClientRect();
		const rightRect = right.getBoundingClientRect();

		if (Math.abs(leftRect.top - rightRect.top) > 2) {
			return leftRect.top - rightRect.top;
		}

		return leftRect.left - rightRect.left;
	});

	const lines: Array<{ spans: HTMLSpanElement[]; text: string; top: number }> = [];

	for (const span of sortedSpans) {
		const top = span.getBoundingClientRect().top;
		const currentLine =
			lines.length > 0 ? lines[lines.length - 1] : undefined;

		if (!currentLine || Math.abs(currentLine.top - top) > 2) {
			lines.push({
				spans: [span],
				text: getBaseSpanText(span),
				top,
			});
			continue;
		}

		currentLine.spans.push(span);
		currentLine.text = `${currentLine.text} ${getBaseSpanText(span)}`.trim();
	}

	return lines;
}

function restoreHighlightedSpan(span: HTMLSpanElement): void {
	const originalText = span.dataset.pdfHighlightOriginalText;
	if (originalText !== undefined) {
		span.textContent = originalText;
	}

	span.removeAttribute("data-pdf-highlight-original-text");
	span.removeAttribute("data-pdf-highlight-start");
	span.removeAttribute("data-pdf-highlight-end");
	span.classList.remove("document-search-highlight");
	span.classList.remove("pdf-search-highlight");
}

function highlightSpanRange(
	span: HTMLSpanElement,
	startIndex: number,
	endIndex: number,
): void {
	const originalText = getBaseSpanText(span);
	if (!originalText || startIndex >= endIndex) {
		return;
	}

	span.dataset.pdfHighlightStart = String(startIndex);
	span.dataset.pdfHighlightEnd = String(endIndex);
	span.classList.add("document-search-highlight", "pdf-search-highlight");
}

export function renderHighlightedSnippet(
	snippet: string,
	query: string,
): ReactNode {
	const trimmedQuery = query.trim();
	if (!trimmedQuery) {
		return snippet;
	}

	const pattern = new RegExp(`(${escapeRegExp(trimmedQuery)})`, "ig");
	const parts = snippet.split(pattern);

	return parts.map((part, index) => {
		const isMatch = part.toLowerCase() === trimmedQuery.toLowerCase();
		if (!isMatch) {
			return <span key={`${part}-${index}`}>{part}</span>;
		}

		return (
			<mark
				key={`${part}-${index}`}
				className="rounded bg-primary-background px-1 py-0.5 text-primary-text"
			>
				{part}
			</mark>
		);
	});
}

export function clearPdfHighlights(root: HTMLElement): void {
	const highlightedNodes = root.querySelectorAll(".pdf-search-highlight");
	const start = performance.now();

	for (const node of highlightedNodes) {
		if (!(node instanceof HTMLSpanElement)) {
			continue;
		}

		restoreHighlightedSpan(node);
	}

	console.debug("[pdf-highlight-dom] clear", {
		count: highlightedNodes.length,
		durationMs: Math.round((performance.now() - start) * 100) / 100,
	});
}

export function highlightPdfTextLayer(
	root: HTMLElement,
	query: string,
	occurrenceIndex = 0,
): HTMLElement | null {
	const start = performance.now();
	const normalizedQuery = normalizeWhitespace(query);
	if (!normalizedQuery) {
		clearPdfHighlights(root);
		console.debug("[pdf-highlight-dom] skip-empty-query", {
			durationMs: Math.round((performance.now() - start) * 100) / 100,
		});
		return null;
	}

	const lines = collectLineSpans(root);
	const lineSegments: Array<{
		line: (typeof lines)[number];
		start: number;
		end: number;
	}> = [];
	let candidateText = "";

	for (const line of lines) {
		const lineText = line.text.trim();
		if (!lineText) {
			continue;
		}

		if (candidateText.length > 0) {
			candidateText += " ";
		}

		const start = candidateText.length;
		candidateText += normalizeWhitespace(lineText);
		const end = candidateText.length;

		lineSegments.push({
			line,
			start,
			end,
		});
	}

	let matchStart = -1;
	let searchFrom = 0;
	for (let index = 0; index <= occurrenceIndex; index += 1) {
		matchStart = candidateText.indexOf(normalizedQuery, searchFrom);
		if (matchStart < 0) {
			break;
		}
		searchFrom = matchStart + 1;
	}

	if (matchStart >= 0) {
		const matchEnd = matchStart + normalizedQuery.length;
		const targetRanges = new Map<
			HTMLSpanElement,
			{ start: number; end: number }
		>();

		for (const segment of lineSegments) {
			const overlapStart = Math.max(matchStart, segment.start);
			const overlapEnd = Math.min(matchEnd, segment.end);
			if (overlapStart >= overlapEnd) {
				continue;
			}

			for (const span of segment.line.spans) {
				const spanTextLength = getBaseSpanText(span).length;
				targetRanges.set(span, {
					start: 0,
					end: spanTextLength,
				});
			}
		}

		const highlightedNodes = Array.from(
			root.querySelectorAll(".pdf-search-highlight"),
		).filter(
			(node): node is HTMLSpanElement => node instanceof HTMLSpanElement,
		);

		for (const node of highlightedNodes) {
			const targetRange = targetRanges.get(node);
			const currentStart = Number(node.dataset.pdfHighlightStart ?? -1);
			const currentEnd = Number(node.dataset.pdfHighlightEnd ?? -1);

			if (
				targetRange &&
				currentStart === targetRange.start &&
				currentEnd === targetRange.end
			) {
				targetRanges.delete(node);
				continue;
			}

			restoreHighlightedSpan(node);
		}

		for (const [span, range] of targetRanges) {
			highlightSpanRange(span, range.start, range.end);
		}

		const highlightedCount = root.querySelectorAll(
			".pdf-search-highlight",
		).length;
		console.debug("[pdf-highlight-dom] apply", {
			occurrenceIndex,
			lineCount: lines.length,
			segmentCount: lineSegments.length,
			highlightedCount,
			durationMs: Math.round((performance.now() - start) * 100) / 100,
		});

		const firstHighlight = root.querySelector(".document-search-highlight");
		if (firstHighlight instanceof HTMLElement) {
			return firstHighlight;
		}

		return lineSegments[0]?.line.spans[0] ?? null;
	}

	clearPdfHighlights(root);
	console.debug("[pdf-highlight-dom] no-match", {
		occurrenceIndex,
		durationMs: Math.round((performance.now() - start) * 100) / 100,
	});
	return null;
}
