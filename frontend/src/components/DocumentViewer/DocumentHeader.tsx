import type { Document, DocumentSearchMatch } from "../../types";
import { DocumentSearchPanel } from "./DocumentSearchPanel";

interface DocumentHeaderProps {
	document: Document;
	searchQuery: string;
	searchLoading: boolean;
	searchError: string | null;
	searchMatches: DocumentSearchMatch[];
	activeSearchIndex: number;
	activeSearchMatch: DocumentSearchMatch | null;
	onNextMatch: () => void;
	onPreviousMatch: () => void;
	onClearSearch: () => void;
	onSearchQueryChange: (value: string) => void;
}

export function DocumentHeader({
	document,
	searchQuery,
	searchLoading,
	searchError,
	searchMatches,
	activeSearchIndex,
	activeSearchMatch,
	onNextMatch,
	onPreviousMatch,
	onClearSearch,
	onSearchQueryChange,
}: DocumentHeaderProps) {
	return (
		<div className="border-b border-neutral-100 px-4 py-3">
			<div className="min-w-0 space-y-3">
				<div>
					<p className="truncate text-sm font-medium text-neutral-800">
						{document.filename}
					</p>
					<p className="text-xs text-neutral-400">
						{document.page_count} page
						{document.page_count !== 1 ? "s" : ""}
					</p>
				</div>
				<DocumentSearchPanel
					searchQuery={searchQuery}
					searchLoading={searchLoading}
					searchError={searchError}
					searchMatches={searchMatches}
					activeSearchIndex={activeSearchIndex}
					activeSearchMatch={activeSearchMatch}
					onClearSearch={onClearSearch}
					onSearchQueryChange={onSearchQueryChange}
					onPreviousMatch={onPreviousMatch}
					onNextMatch={onNextMatch}
				/>
			</div>
		</div>
	);
}
