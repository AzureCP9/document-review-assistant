import { ChevronLeft, ChevronRight, Loader2, Search, X } from "lucide-react";
import type { KeyboardEvent } from "react";
import type { DocumentSearchMatch } from "../../types";
import { Button } from "../ui/button";
import { renderHighlightedSnippet } from "./search-highlighting";

interface DocumentSearchPanelProps {
	searchQuery: string;
	searchLoading: boolean;
	searchError: string | null;
	searchMatches: DocumentSearchMatch[];
	activeSearchIndex: number;
	activeSearchMatch: DocumentSearchMatch | null;
	onSearchQueryChange: (value: string) => void;
	onClearSearch: () => void;
	onPreviousMatch: () => void;
	onNextMatch: () => void;
}

export function DocumentSearchPanel({
	searchQuery,
	searchLoading,
	searchError,
	searchMatches,
	activeSearchIndex,
	activeSearchMatch,
	onSearchQueryChange,
	onClearSearch,
	onPreviousMatch,
	onNextMatch,
}: DocumentSearchPanelProps) {
	const handleKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
		if (event.key !== "Enter") {
			return;
		}

		event.preventDefault();
		onNextMatch();
	};

	return (
		<div className="space-y-2">
			<div className="relative">
				<Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-neutral-400" />
				<input
					value={searchQuery}
					onChange={(event) => onSearchQueryChange(event.target.value)}
					onKeyDown={handleKeyDown}
					placeholder="Search this document..."
					className="h-9 w-full rounded-xl border border-neutral-200 bg-transparent pr-9 pl-9 text-sm text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400"
				/>
				{searchQuery.trim().length > 0 && !searchLoading && (
					<button
						type="button"
						onClick={onClearSearch}
						aria-label="Clear document search"
						className="absolute top-1/2 right-2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-md text-neutral-400 transition-colors hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
					>
						<X className="h-4 w-4" />
					</button>
				)}
				{searchLoading && (
					<Loader2 className="absolute top-1/2 right-3 h-4 w-4 -translate-y-1/2 animate-spin text-neutral-400" />
				)}
			</div>

			{searchError && <p className="text-xs text-red-600">{searchError}</p>}

			{searchMatches.length > 0 && (
				<div className="flex items-center justify-between gap-3 rounded-xl border border-primary bg-primary-background px-3 py-2">
					<div className="min-w-0">
						<p className="text-xs font-medium text-primary-text">
							Match {activeSearchIndex + 1} of {searchMatches.length}
						</p>
						<p className="truncate text-xs text-primary-muted">
							Page {activeSearchMatch?.page_number}:{" "}
							{activeSearchMatch
								? renderHighlightedSnippet(
										activeSearchMatch.snippet,
										searchQuery,
									)
								: null}
						</p>
					</div>
					<div className="flex items-center gap-1">
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onPreviousMatch}
						>
							<ChevronLeft className="h-4 w-4" />
						</Button>
						<Button
							type="button"
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							onClick={onNextMatch}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				</div>
			)}

			{searchQuery.trim().length >= 2 &&
				!searchLoading &&
				searchMatches.length === 0 &&
				!searchError && (
					<p className="text-xs text-neutral-500">
						No matches found in this document.
					</p>
				)}
		</div>
	);
}
