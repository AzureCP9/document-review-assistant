import {
    useCallback,
    useEffect,
    useLayoutEffect,
    useRef,
    useState,
} from "react";
import { pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { searchDocument } from "../../lib/api";
import type { Document, DocumentSearchMatch } from "../../types";
import { DocumentHeader } from "./DocumentHeader";
import { DocumentNavigator } from "./DocumentNavigator";
import { DocumentPagination } from "./DocumentPagination";
import { PdfPane } from "./PdfPane";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url,
).toString();

const MIN_WIDTH = 280;
const DEFAULT_WIDTH_RATIO = 0.4;
const MAX_WIDTH_RATIO = 0.72;

interface DocumentViewerProps {
    documents: Document[];
    document: Document | null;
    focusRequest?: {
        documentName: string;
        keyPhrase: string;
        pageNumber: number;
        token: number;
    } | null;
    onClearFocus?: () => void;
    onFocusRequestConsumed?: (token: number) => void;
    onSelectDocument: (documentId: string) => void;
}

export function DocumentViewer({
    documents,
    document,
    focusRequest,
    onClearFocus,
    onFocusRequestConsumed,
    onSelectDocument,
}: DocumentViewerProps) {
    const [numPages, setNumPages] = useState<number>(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [pdfLoading, setPdfLoading] = useState(true);
    const [pdfError, setPdfError] = useState<string | null>(null);
    const [widthRatio, setWidthRatio] = useState(DEFAULT_WIDTH_RATIO);
    const [windowWidth, setWindowWidth] = useState(() => window.innerWidth);
    const [dragging, setDragging] = useState(false);
    const [navigatorOpen, setNavigatorOpen] = useState(true);
    const [documentQuery, setDocumentQuery] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [highlightQuery, setHighlightQuery] = useState("");
    const [searchMatches, setSearchMatches] = useState<DocumentSearchMatch[]>(
        [],
    );
    const [activeSearchIndex, setActiveSearchIndex] = useState(0);
    const [scrollRequest, setScrollRequest] = useState<{
        pageNumber: number;
        occurrenceIndex: number;
        token: number;
    } | null>(null);
    const [preferredSearchPage, setPreferredSearchPage] = useState<
        number | null
    >(null);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchError, setSearchError] = useState<string | null>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const skipNextSearchRef = useRef(false);
    const scrollTokenRef = useRef(0);
    const consumedFocusTokenRef = useRef<number | null>(null);

    useEffect(() => {
        const openingFromCitation =
            document &&
            focusRequest &&
            document.filename.toLowerCase() ===
                focusRequest.documentName.toLowerCase();

        const justConsumedFocus =
            !focusRequest && consumedFocusTokenRef.current !== null;

        if (openingFromCitation || justConsumedFocus) {
            if (justConsumedFocus) {
                consumedFocusTokenRef.current = null;
            }
            return;
        }

        setCurrentPage(1);
        setPdfLoading(true);
        setPdfError(null);
        setSearchQuery("");
        setHighlightQuery("");
        setSearchMatches([]);
        setActiveSearchIndex(0);
        setScrollRequest(null);
        setPreferredSearchPage(null);
        setSearchError(null);
    }, [document, focusRequest]);

    useEffect(() => {
        const handleResize = () => {
            setWindowWidth(window.innerWidth);
        };

        window.addEventListener("resize", handleResize);
        return () => {
            window.removeEventListener("resize", handleResize);
        };
    }, []);

    const width = Math.min(
        Math.round(windowWidth * MAX_WIDTH_RATIO),
        Math.max(MIN_WIDTH, Math.round(windowWidth * widthRatio)),
    );

    const handleMouseDown = useCallback(
        (e: React.MouseEvent) => {
            e.preventDefault();
            setDragging(true);

            const startX = e.clientX;
            const startRatio = widthRatio;
            const viewportWidth = window.innerWidth;

            const handleMouseMove = (moveEvent: MouseEvent) => {
                const delta = startX - moveEvent.clientX;
                const newWidth = Math.min(
                    Math.round(viewportWidth * MAX_WIDTH_RATIO),
                    Math.max(
                        MIN_WIDTH,
                        Math.round(viewportWidth * startRatio) + delta,
                    ),
                );
                setWidthRatio(newWidth / viewportWidth);
            };

            const handleMouseUp = () => {
                setDragging(false);
                window.removeEventListener("mousemove", handleMouseMove);
                window.removeEventListener("mouseup", handleMouseUp);
            };

            window.addEventListener("mousemove", handleMouseMove);
            window.addEventListener("mouseup", handleMouseUp);
        },
        [widthRatio],
    );

    const runSearch = useCallback(async () => {
        if (!document) {
            return;
        }

        const query = searchQuery.trim();
        if (query.length < 2) {
            setHighlightQuery("");
            setSearchMatches([]);
            setActiveSearchIndex(0);
            setSearchError(null);
            return;
        }

        try {
            setSearchLoading(true);
            setSearchError(null);
            const matches = await searchDocument(document.id, query);
            setHighlightQuery(query);
            setSearchMatches(matches);
            if (matches.length > 0) {
                const preferredIndex =
                    preferredSearchPage === null
                        ? 0
                        : matches.findIndex(
                              (match) =>
                                  match.page_number === preferredSearchPage,
                          );
                const nextIndex = preferredIndex >= 0 ? preferredIndex : 0;
                setActiveSearchIndex(nextIndex);
                const pageNumber = matches[nextIndex]!.page_number;
                setCurrentPage(pageNumber);
                setScrollRequest((previousRequest) => {
                    const occurrenceIndex =
                        matches[nextIndex]!.occurrence_index;
                    if (
                        previousRequest?.pageNumber === pageNumber &&
                        previousRequest.occurrenceIndex === occurrenceIndex
                    ) {
                        return previousRequest;
                    }

                    scrollTokenRef.current += 1;
                    return {
                        pageNumber,
                        occurrenceIndex,
                        token: scrollTokenRef.current,
                    };
                });
            } else {
                setActiveSearchIndex(0);
            }
        } catch (error) {
            setHighlightQuery("");
            setSearchError(
                error instanceof Error
                    ? error.message
                    : "Failed to search document.",
            );
            setSearchMatches([]);
            setActiveSearchIndex(0);
        } finally {
            setSearchLoading(false);
            setPreferredSearchPage(null);
        }
    }, [document, preferredSearchPage, searchQuery]);

    const goToSearchMatch = useCallback(
        (nextIndex: number) => {
            if (searchMatches.length === 0) {
                return;
            }
            const normalizedIndex =
                (nextIndex + searchMatches.length) % searchMatches.length;
            setActiveSearchIndex(normalizedIndex);
            const pageNumber = searchMatches[normalizedIndex]!.page_number;
            const occurrenceIndex =
                searchMatches[normalizedIndex]!.occurrence_index;
            setCurrentPage(pageNumber);
            scrollTokenRef.current += 1;
            setScrollRequest({
                pageNumber,
                occurrenceIndex,
                token: scrollTokenRef.current,
            });
        },
        [searchMatches],
    );

    useEffect(() => {
        const trimmedQuery = searchQuery.trim();
        if (!document) {
            return;
        }

        if (skipNextSearchRef.current) {
            skipNextSearchRef.current = false;
            return;
        }

        if (trimmedQuery.length === 0) {
            setHighlightQuery("");
            setSearchMatches([]);
            setActiveSearchIndex(0);
            setSearchError(null);
            setSearchLoading(false);
            return;
        }

        if (trimmedQuery.length < 2) {
            setHighlightQuery("");
            setSearchMatches([]);
            setActiveSearchIndex(0);
            setSearchLoading(false);
            setSearchError("Use at least 2 characters.");
            return;
        }

        const timeout = window.setTimeout(() => {
            void runSearch();
        }, 250);

        return () => {
            window.clearTimeout(timeout);
        };
    }, [document, runSearch, searchQuery]);

    useLayoutEffect(() => {
        if (!document || !focusRequest) {
            return;
        }

        if (
            document.filename.toLowerCase() !==
            focusRequest.documentName.toLowerCase()
        ) {
            return;
        }

        skipNextSearchRef.current = true;
        setHighlightQuery(focusRequest.keyPhrase);
        setCurrentPage(focusRequest.pageNumber);
        setScrollRequest({
            pageNumber: focusRequest.pageNumber,
            occurrenceIndex: 0,
            token: focusRequest.token,
        });
        setPreferredSearchPage(focusRequest.pageNumber);
        setSearchQuery(focusRequest.keyPhrase);
        setSearchMatches([]);
        setActiveSearchIndex(0);
        setSearchLoading(false);
        setSearchError(null);
        consumedFocusTokenRef.current = focusRequest.token;
        onFocusRequestConsumed?.(focusRequest.token);
    }, [document, focusRequest, onFocusRequestConsumed]);

    const handlePdfLoadError = useCallback((message: string) => {
        setPdfError(message);
        setPdfLoading(false);
    }, []);

    const handlePdfLoadSuccess = useCallback((pages: number) => {
        setNumPages(pages);
        setPdfLoading(false);
        setPdfError(null);
    }, []);

    const handleSearchQueryChange = useCallback((value: string) => {
        setSearchQuery(value);
        setSearchError(null);
    }, []);

    const handleClearSearch = useCallback(() => {
        setSearchQuery("");
        setHighlightQuery("");
        setSearchMatches([]);
        setActiveSearchIndex(0);
        setSearchError(null);
        setSearchLoading(false);
        setPreferredSearchPage(null);
        onClearFocus?.();
    }, [onClearFocus]);

    if (!document) {
        return (
            <PdfPane
                currentPage={1}
                document={null}
                onLoadError={() => {}}
                onLoadSuccess={() => {}}
                pdfError={null}
                pdfLoading={false}
                searchQuery=""
                width={width}
            />
        );
    }

    const activeSearchMatch = searchMatches[activeSearchIndex] ?? null;

    return (
        <div
            ref={containerRef}
            style={{
                width: `clamp(${MIN_WIDTH}px, ${(widthRatio * 100).toFixed(2)}vw, ${(MAX_WIDTH_RATIO * 100).toFixed(2)}vw)`,
            }}
            className="relative flex h-full flex-shrink-0 flex-col border-l border-neutral-200 bg-white"
        >
            <div
                className={`absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300 ${
                    dragging ? "bg-neutral-400" : ""
                }`}
                onMouseDown={handleMouseDown}
            />

            <DocumentHeader
                document={document}
                searchQuery={searchQuery}
                searchLoading={searchLoading}
                searchError={searchError}
                searchMatches={searchMatches}
                activeSearchIndex={activeSearchIndex}
                activeSearchMatch={activeSearchMatch}
                onClearSearch={handleClearSearch}
                onSearchQueryChange={handleSearchQueryChange}
                onPreviousMatch={() => goToSearchMatch(activeSearchIndex - 1)}
                onNextMatch={() => goToSearchMatch(activeSearchIndex + 1)}
            />

            <PdfPane
                currentPage={currentPage}
                document={document}
                onLoadError={handlePdfLoadError}
                onLoadSuccess={handlePdfLoadSuccess}
                pdfError={pdfError}
                pdfLoading={pdfLoading}
                searchQuery={highlightQuery}
                scrollRequest={scrollRequest}
                width={width}
            />

            <div className="border-t border-neutral-100 bg-white pb-3">
                <DocumentPagination
                    currentPage={currentPage}
                    numPages={numPages}
                    onPageChange={setCurrentPage}
                />

                <DocumentNavigator
                    documents={documents}
                    document={document}
                    documentQuery={documentQuery}
                    navigatorOpen={navigatorOpen}
                    onDocumentQueryChange={setDocumentQuery}
                    onNavigatorOpenChange={setNavigatorOpen}
                    onSelectDocument={onSelectDocument}
                />
            </div>
        </div>
    );
}
