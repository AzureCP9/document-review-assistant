import * as Collapsible from "@radix-ui/react-collapsible";
import {
	ChevronDown,
	ChevronLeft,
	ChevronRight,
	FileText,
	Files,
	Loader2,
	Search,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Document as PDFDocument, Page, pdfjs } from "react-pdf";
import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";
import { getDocumentUrl } from "../lib/api";
import type { Document } from "../types";
import { Button } from "./ui/button";
import { ScrollArea } from "./ui/scroll-area";

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
	"pdfjs-dist/build/pdf.worker.min.mjs",
	import.meta.url,
).toString();

const MIN_WIDTH = 280;
const MAX_WIDTH = 820;
const DEFAULT_WIDTH = MAX_WIDTH;

interface DocumentViewerProps {
	documents: Document[];
	document: Document | null;
	onSelectDocument: (documentId: string) => void;
}

export function DocumentViewer({
	documents,
	document,
	onSelectDocument,
}: DocumentViewerProps) {
	const [numPages, setNumPages] = useState<number>(0);
	const [currentPage, setCurrentPage] = useState(1);
	const [pdfLoading, setPdfLoading] = useState(true);
	const [pdfError, setPdfError] = useState<string | null>(null);
	const [width, setWidth] = useState(DEFAULT_WIDTH);
	const [dragging, setDragging] = useState(false);
	const [navigatorOpen, setNavigatorOpen] = useState(true);
	const [documentQuery, setDocumentQuery] = useState("");
	const containerRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		setCurrentPage(1);
		setPdfLoading(true);
		setPdfError(null);
	}, [document?.id]);

	const filteredDocuments = documents.filter((item) =>
		item.filename.toLowerCase().includes(documentQuery.trim().toLowerCase()),
	);

	const handleMouseDown = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			setDragging(true);

			const startX = e.clientX;
			const startWidth = width;

			const handleMouseMove = (moveEvent: MouseEvent) => {
				const delta = startX - moveEvent.clientX;
				const newWidth = Math.min(
					MAX_WIDTH,
					Math.max(MIN_WIDTH, startWidth + delta),
				);
				setWidth(newWidth);
			};

			const handleMouseUp = () => {
				setDragging(false);
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};

			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		},
		[width],
	);

	const pdfPageWidth = width - 48; // account for px-4 padding on each side

	if (!document) {
		return (
			<div
				style={{ width }}
				className="flex h-full flex-shrink-0 flex-col items-center justify-center border-l border-neutral-200 bg-neutral-50"
			>
				<FileText className="mb-3 h-10 w-10 text-neutral-300" />
				<p className="text-sm text-neutral-400">No documents uploaded</p>
			</div>
		);
	}

	const pdfUrl = getDocumentUrl(document.id);

	return (
		<div
			ref={containerRef}
			style={{ width }}
			className="relative flex h-full flex-shrink-0 flex-col border-l border-neutral-200 bg-white"
		>
			{/* Resize handle */}
			<div
				className={`absolute top-0 left-0 z-10 h-full w-1.5 cursor-col-resize transition-colors hover:bg-neutral-300 ${
					dragging ? "bg-neutral-400" : ""
				}`}
				onMouseDown={handleMouseDown}
			/>

			{/* Header */}
			<div className="border-b border-neutral-100 px-4 py-3">
				<div className="min-w-0">
					<p className="truncate text-sm font-medium text-neutral-800">
						{document.filename}
					</p>
					<p className="text-xs text-neutral-400">
						{document.page_count} page{document.page_count !== 1 ? "s" : ""}
					</p>
				</div>
			</div>

			{/* PDF content */}
			<div className="flex-1 overflow-y-auto p-4">
				{pdfError && (
					<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
						{pdfError}
					</div>
				)}

				<PDFDocument
					file={pdfUrl}
					onLoadSuccess={({ numPages: pages }) => {
						setNumPages(pages);
						setPdfLoading(false);
						setPdfError(null);
					}}
					onLoadError={(error) => {
						setPdfError(`Failed to load PDF: ${error.message}`);
						setPdfLoading(false);
					}}
					loading={
						<div className="flex items-center justify-center py-12">
							<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
						</div>
					}
				>
					{!pdfLoading && !pdfError && (
						<Page
							pageNumber={currentPage}
							width={pdfPageWidth}
							loading={
								<div className="flex items-center justify-center py-12">
									<Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
								</div>
							}
						/>
					)}
				</PDFDocument>
			</div>

			{/* Footer */}
			<div className="border-t border-neutral-100 bg-white pb-3">
				{numPages > 0 && (
					<div className="flex items-center justify-center gap-3 px-4 py-2.5">
						<Button
							variant="ghost"
							size="icon"
							className="h-7 w-7"
							disabled={currentPage <= 1}
							onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
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
							onClick={() => setCurrentPage((p) => Math.min(numPages, p + 1))}
						>
							<ChevronRight className="h-4 w-4" />
						</Button>
					</div>
				)}
				{documents.length > 1 && (
					<Collapsible.Root
						open={navigatorOpen}
						onOpenChange={setNavigatorOpen}
						className="border-t border-neutral-100 bg-white px-4 pt-2"
					>
						<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
							<Collapsible.Trigger asChild>
								<Button
									variant="ghost"
									className={`flex h-auto w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 ${
										navigatorOpen ? "rounded-none" : "rounded-2xl"
									}`}
								>
									<div className="flex min-w-0 items-center gap-3">
										<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-[#FF6E30] text-white">
											<Files className="h-4 w-4" />
										</div>
										<div className="min-w-0">
											<p className="text-sm font-medium text-neutral-800">
												Documents
											</p>
											<p className="mt-0.5 text-xs text-neutral-400">
												{documents.length} loaded in this conversation
											</p>
										</div>
									</div>
									<div className="ml-3 flex items-center gap-3">
										<div className="hidden text-right sm:block">
											<p className="text-xs font-medium text-neutral-600">
												{navigatorOpen ? "Showing document list" : "Browse documents"}
											</p>
											<p className="text-[11px] text-neutral-400">
												Search by file name
											</p>
										</div>
										<ChevronDown
											className={`h-4 w-4 text-neutral-500 transition-transform ${
												navigatorOpen ? "" : "-rotate-90"
											}`}
										/>
									</div>
								</Button>
							</Collapsible.Trigger>
							<Collapsible.Content className="border-t border-neutral-100 p-2">
								<div className="relative px-1 pb-2">
									<Search className="pointer-events-none absolute top-[calc(50%-4px)] left-4 h-4 w-4 -translate-y-1/2 text-neutral-400" />
									<input
										value={documentQuery}
										onChange={(event) => setDocumentQuery(event.target.value)}
										placeholder="Search documents by name..."
										className="h-9 w-full rounded-xl border border-neutral-200 bg-neutral-50 pr-3 pl-9 text-sm text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400 focus:bg-white"
									/>
								</div>
								<ScrollArea className="h-32">
									<div className="space-y-1 px-1 pb-1">
									{filteredDocuments.length > 0 ? (
										filteredDocuments.map((item) => (
											<button
												key={item.id}
												type="button"
												onClick={() => onSelectDocument(item.id)}
												className={`flex w-full items-start justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
													item.id === document.id
														? "border-[#FF6E30] bg-[#FFF1EA] text-[#C94C16]"
														: "border-transparent bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50"
												}`}
											>
												<div className="min-w-0 flex-1">
													<p className="truncate text-sm font-medium">
														{item.filename}
													</p>
													<p
														className={`mt-1 text-xs ${
															item.id === document.id
																? "text-[#D87B52]"
																: "text-neutral-400"
														}`}
													>
														{item.page_count} page
														{item.page_count === 1 ? "" : "s"}
													</p>
												</div>
												{item.id === document.id && (
													<span className="ml-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-[#C94C16]">
														Open
													</span>
												)}
											</button>
										))
									) : (
										<div className="px-3 py-6 text-center text-sm text-neutral-400">
											No matching documents
										</div>
									)}
									</div>
								</ScrollArea>
							</Collapsible.Content>
						</div>
					</Collapsible.Root>
				)}
			</div>
		</div>
	);
}
