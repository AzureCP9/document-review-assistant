import { FileSearch } from "lucide-react";
import { DocumentMultiUpload } from "./DocumentMultiUpload";

interface NoDocumentsStateProps {
	onUpload: (files: File[]) => void;
	uploading?: boolean;
}

export function NoDocumentsState({
	onUpload,
	uploading,
}: NoDocumentsStateProps) {
	return (
		<div className="flex flex-col items-center px-4">
			<div className="mb-6 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-background">
				<FileSearch className="h-7 w-7 text-primary-text" />
			</div>
			<h2 className="mb-2 text-lg font-semibold text-neutral-800">
				Upload documents to get started
			</h2>
			<p className="mb-8 max-w-sm text-center text-sm text-neutral-500">
				Ask questions about leases, title reports, contracts, and other legal
				documents
			</p>
			<DocumentMultiUpload onUpload={onUpload} uploading={uploading} />
		</div>
	);
}
