import { FileText, Loader2 } from "lucide-react";
import { memo } from "react";
import { Document as PDFDocument, Page } from "react-pdf";
import { getDocumentUrl } from "../../lib/api";
import type { Document } from "../../types";
import { usePdfHighlights } from "./use-pdf-highlights";

interface ScrollRequest {
	pageNumber: number;
	occurrenceIndex: number;
	token: number;
}

interface PdfPaneProps {
	currentPage: number;
	document: Document | null;
	onLoadError: (message: string) => void;
	onLoadSuccess: (pages: number) => void;
	pdfError: string | null;
	pdfLoading: boolean;
	searchQuery: string;
	scrollRequest?: ScrollRequest | null;
	width: number;
}

const RenderedPdfPage = memo(function RenderedPdfPage({
	currentPage,
	pdfPageWidth,
	onTextLayerRender,
}: {
	currentPage: number;
	pdfPageWidth: number;
	onTextLayerRender: () => void;
}) {
	return (
		<Page
			pageNumber={currentPage}
			width={pdfPageWidth}
			onRenderTextLayerSuccess={onTextLayerRender}
			loading={
				<div className="flex items-center justify-center py-12">
					<Loader2 className="h-5 w-5 animate-spin text-neutral-300" />
				</div>
			}
		/>
	);
});

export const PdfPane = memo(function PdfPane({
	currentPage,
	document,
	onLoadError,
	onLoadSuccess,
	pdfError,
	pdfLoading,
	searchQuery,
	scrollRequest,
	width,
}: PdfPaneProps) {
	const { pageRef, handleTextLayerRender } = usePdfHighlights({
		currentPage,
		scrollRequest,
		searchQuery,
	});

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
	const pdfPageWidth = width - 48;

	return (
		<div className="flex-1 overflow-y-auto p-4">
			{pdfError && (
				<div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
					{pdfError}
				</div>
			)}

			<PDFDocument
				file={pdfUrl}
				onLoadSuccess={({ numPages }) => onLoadSuccess(numPages)}
				onLoadError={(error) => onLoadError(`Failed to load PDF: ${error.message}`)}
				loading={
					<div className="flex items-center justify-center py-12">
						<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
					</div>
				}
			>
				{!pdfLoading && !pdfError && (
					<div ref={pageRef}>
						<RenderedPdfPage
							currentPage={currentPage}
							pdfPageWidth={pdfPageWidth}
							onTextLayerRender={handleTextLayerRender}
						/>
					</div>
				)}
			</PDFDocument>
		</div>
	);
});
