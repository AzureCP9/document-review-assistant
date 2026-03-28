import { useCallback, useEffect, useLayoutEffect, useRef } from "react";
import {
    clearPdfHighlights,
    highlightPdfTextLayer,
} from "./search-highlighting";

interface ScrollRequest {
    pageNumber: number;
    occurrenceIndex: number;
    token: number;
}

interface UsePdfHighlightsOptions {
    currentPage: number;
    scrollRequest?: ScrollRequest | null;
    searchQuery: string;
}

export function usePdfHighlights({
    currentPage,
    scrollRequest,
    searchQuery,
}: UsePdfHighlightsOptions) {
    const pageRef = useRef<HTMLDivElement>(null);
    const lastHandledScrollTokenRef = useRef<number | null>(null);
    const lastAppliedHighlightKeyRef = useRef<string | null>(null);
    const pendingRevealTokenRef = useRef<number | null>(null);
    const currentPageRef = useRef(currentPage);
    const scrollRequestRef = useRef(scrollRequest);
    const searchQueryRef = useRef(searchQuery);

    useLayoutEffect(() => {
        currentPageRef.current = currentPage;
        scrollRequestRef.current = scrollRequest;
        searchQueryRef.current = searchQuery;
    }, [currentPage, scrollRequest, searchQuery]);

    const getTextLayer = useCallback(() => {
        const textLayer = pageRef.current?.querySelector(
            ".react-pdf__Page__textContent",
        );
        return textLayer instanceof HTMLElement ? textLayer : null;
    }, []);

    const setTextLayerVisible = useCallback((visible: boolean) => {
        const textLayer = getTextLayer();
        if (!textLayer) {
            return;
        }

        textLayer.style.visibility = visible ? "visible" : "hidden";
    }, [getTextLayer]);

    const ensureHighlights = useCallback(() => {
        const textLayer = getTextLayer();
        if (!textLayer) {
            return null;
        }

        const trimmedQuery = searchQueryRef.current.trim();
        if (!trimmedQuery) {
            clearPdfHighlights(textLayer);
            lastAppliedHighlightKeyRef.current = null;
            textLayer.style.visibility = "visible";
            return null;
        }

        const occurrenceIndex = scrollRequestRef.current?.occurrenceIndex ?? 0;
        const highlightKey = `${currentPageRef.current}:${occurrenceIndex}:${trimmedQuery}`;
        const existingHighlight = textLayer.querySelector(
            ".document-search-highlight",
        );
        if (
            lastAppliedHighlightKeyRef.current === highlightKey &&
            existingHighlight instanceof HTMLElement
        ) {
            return existingHighlight;
        }

        const highlightedMatch = highlightPdfTextLayer(
            textLayer,
            trimmedQuery,
            occurrenceIndex,
        );
        lastAppliedHighlightKeyRef.current = highlightKey;
        return highlightedMatch;
    }, [getTextLayer]);

    const maybeScrollToMatch = useCallback(
        (
            highlightedMatch: HTMLElement | null,
            allowPageFallback: boolean,
        ) => {
            const activeScrollRequest = scrollRequestRef.current;
            const activePage = currentPageRef.current;

            if (!activeScrollRequest || activeScrollRequest.pageNumber !== activePage) {
                return;
            }

            if (lastHandledScrollTokenRef.current === activeScrollRequest.token) {
                return;
            }

            lastHandledScrollTokenRef.current = activeScrollRequest.token;

            window.requestAnimationFrame(() => {
                if (highlightedMatch instanceof HTMLElement) {
                    highlightedMatch.scrollIntoView({
                        block: "center",
                        behavior: "smooth",
                    });
                    return;
                }

                if (!allowPageFallback) {
                    lastHandledScrollTokenRef.current = null;
                    return;
                }

                pageRef.current?.scrollIntoView({
                    block: "center",
                    behavior: "smooth",
                });
            });
        },
        [],
    );

    const handleTextLayerRender = useCallback(() => {
        const highlightedMatch = ensureHighlights();
        setTextLayerVisible(true);
        pendingRevealTokenRef.current = null;
        maybeScrollToMatch(highlightedMatch, true);
    }, [ensureHighlights, maybeScrollToMatch, setTextLayerVisible]);

    useLayoutEffect(() => {
        if (!scrollRequest || scrollRequest.pageNumber !== currentPage || !searchQuery.trim()) {
            return;
        }

        pendingRevealTokenRef.current = scrollRequest.token;
        setTextLayerVisible(false);
    }, [currentPage, scrollRequest, searchQuery, setTextLayerVisible]);

    useLayoutEffect(() => {
        const textLayer = getTextLayer();
        if (!textLayer) {
            return;
        }

        const highlightedMatch = ensureHighlights();
        maybeScrollToMatch(highlightedMatch, false);
        if (highlightedMatch instanceof HTMLElement) {
            setTextLayerVisible(true);
            pendingRevealTokenRef.current = null;
        }
    }, [
        currentPage,
        ensureHighlights,
        getTextLayer,
        maybeScrollToMatch,
        searchQuery,
        scrollRequest?.token,
        setTextLayerVisible,
    ]);

    useEffect(() => {
        return () => {
            setTextLayerVisible(true);
        };
    }, [setTextLayerVisible]);

    return {
        pageRef,
        handleTextLayerRender,
    };
}
