import { ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "../ui/button";

interface DocumentPaginationProps {
	currentPage: number;
	numPages: number;
	onPageChange: (updater: (page: number) => number) => void;
}

export function DocumentPagination({
	currentPage,
	numPages,
	onPageChange,
}: DocumentPaginationProps) {
	if (numPages <= 0) {
		return null;
	}

	return (
		<div className="flex items-center justify-center gap-3 px-4 py-2.5">
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				disabled={currentPage <= 1}
				onClick={() => onPageChange((page) => Math.max(1, page - 1))}
			>
				<ChevronLeft className="h-4 w-4" />
			</Button>
			<span className="text-xs text-neutral-500">
				Page {currentPage} of {numPages}
			</span>
			<Button
				variant="ghost"
				size="icon"
				className="h-7 w-7"
				disabled={currentPage >= numPages}
				onClick={() => onPageChange((page) => Math.min(numPages, page + 1))}
			>
				<ChevronRight className="h-4 w-4" />
			</Button>
		</div>
	);
}
