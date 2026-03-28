import { ChatInput } from "../ChatInput";
import { NoDocumentsState } from "../NoDocumentsState";

interface EmptyConversationStateProps {
	hasDocuments: boolean;
	streaming: boolean;
	onSend: (content: string) => void;
	onUpload: (file: File) => void;
	onUploadMany: (files: File[]) => void;
}

export function EmptyConversationState({
	hasDocuments,
	streaming,
	onSend,
	onUpload,
	onUploadMany,
}: EmptyConversationStateProps) {
	return (
		<div className="flex flex-1 flex-col bg-white">
			<div className="flex flex-1 items-center justify-center">
				{hasDocuments ? (
					<div className="text-center">
						<p className="text-sm text-neutral-500">
							Documents uploaded. Ask a question to get started.
						</p>
					</div>
				) : (
					<NoDocumentsState onUpload={onUploadMany} />
				)}
			</div>
			<ChatInput
				onSend={onSend}
				onUpload={onUpload}
				onUploadMany={onUploadMany}
				disabled={streaming}
				hasDocuments={hasDocuments}
			/>
		</div>
	);
}
