import { Files, Loader2 } from "lucide-react";
import { type DragEvent, useCallback, useRef, useState } from "react";

interface DocumentMultiUploadProps {
	onUpload: (files: File[]) => void;
	uploading?: boolean;
}

export function DocumentMultiUpload({
	onUpload,
	uploading = false,
}: DocumentMultiUploadProps) {
	const [dragOver, setDragOver] = useState(false);
	const fileInputRef = useRef<HTMLInputElement>(null);

	const getPdfFiles = useCallback((files: FileList | File[]) => {
		return Array.from(files).filter((file) => file.type === "application/pdf");
	}, []);

	const handleDragOver = useCallback((e: DragEvent) => {
		e.preventDefault();
		setDragOver(true);
	}, []);

	const handleDragLeave = useCallback((e: DragEvent) => {
		e.preventDefault();
		setDragOver(false);
	}, []);

	const handleDrop = useCallback(
		(e: DragEvent) => {
			e.preventDefault();
			setDragOver(false);
			const files = getPdfFiles(e.dataTransfer.files);
			if (files.length > 0) {
				onUpload(files);
			}
		},
		[getPdfFiles, onUpload],
	);

	const handleClick = useCallback(() => {
		fileInputRef.current?.click();
	}, []);

	const handleFileChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const files = e.target.files ? getPdfFiles(e.target.files) : [];
			if (files.length > 0) {
				onUpload(files);
			}
			if (fileInputRef.current) {
				fileInputRef.current.value = "";
			}
		},
		[getPdfFiles, onUpload],
	);

	return (
		<button
			type="button"
			className={`w-full max-w-md cursor-pointer rounded-xl border-2 border-dashed px-8 py-10 text-center transition-colors ${
				dragOver
					? "border-neutral-400 bg-neutral-100"
					: "border-neutral-200 bg-white hover:border-neutral-300 hover:bg-neutral-50"
			}`}
			onDragOver={handleDragOver}
			onDragLeave={handleDragLeave}
			onDrop={handleDrop}
			onClick={handleClick}
		>
			<input
				ref={fileInputRef}
				type="file"
				accept=".pdf"
				multiple
				className="hidden"
				onChange={handleFileChange}
			/>

			{uploading ? (
				<div className="flex flex-col items-center">
					<Loader2 className="mb-3 h-10 w-10 animate-spin text-neutral-400" />
					<p className="text-sm font-medium text-neutral-600">
						Uploading documents...
					</p>
				</div>
			) : (
				<div className="flex flex-col items-center">
					<Files className="mb-3 h-10 w-10 text-neutral-400" />
					<p className="text-sm font-medium text-neutral-600">
						Upload PDF documents
					</p>
					<p className="mt-1 text-xs text-neutral-400">
						Click or drag and drop multiple files
					</p>
				</div>
			)}
		</button>
	);
}
