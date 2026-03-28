import { Loader2 } from "lucide-react";
import { useEffect, useRef } from "react";
import type { Citation, Message } from "../../types";
import { ChatInput } from "../ChatInput";
import { MessageBubble, StreamingBubble } from "../MessageBubble";
import { ConversationPlaceholder } from "./ConversationPlaceholder";
import { EmptyConversationState } from "./EmptyConversationState";

function MessagesPanel({
	activeCitationKey,
	error,
	finalizing,
	messages,
	onCitationClick,
	scrollRef,
	streaming,
	streamingContent,
}: {
	activeCitationKey: string | null;
	error: string | null;
	finalizing: boolean;
	messages: Message[];
	onCitationClick?: (citation: Citation) => void;
	scrollRef: React.MutableRefObject<HTMLDivElement | null>;
	streaming: boolean;
	streamingContent: string;
}) {
	return (
		<>
			{error && (
				<div className="mx-4 mt-2 rounded-lg bg-red-50 px-4 py-2 text-sm text-red-600">
					{error}
				</div>
			)}

			<div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4">
				<div className="mx-auto max-w-2xl space-y-1">
					{messages.map((message) => (
						<MessageBubble
							key={message.id}
							message={message}
							activeCitationKey={activeCitationKey}
							onCitationClick={onCitationClick}
						/>
					))}
					{streaming && (
						<StreamingBubble
							content={streamingContent}
							finalizing={finalizing}
						/>
					)}
				</div>
			</div>
		</>
	);
}

interface ChatWindowProps {
	messages: Message[];
	loading: boolean;
	error: string | null;
	finalizing: boolean;
	streaming: boolean;
	streamingContent: string;
	hasDocuments: boolean;
	conversationId: string | null;
	activeCitationKey: string | null;
	onCitationClick?: (citation: Citation) => void;
	onSend: (content: string) => void;
	onUpload: (file: File) => void;
	onUploadMany: (files: File[]) => void;
}

export function ChatWindow({
	messages,
	loading,
	error,
	finalizing,
	streaming,
	streamingContent,
	hasDocuments,
	conversationId,
	activeCitationKey,
	onCitationClick,
	onSend,
	onUpload,
	onUploadMany,
}: ChatWindowProps) {
	const scrollRef = useRef<HTMLDivElement>(null);
	const messagesLength = messages.length;

	useEffect(() => {
		if (scrollRef.current) {
			window.requestAnimationFrame(() => {
				if (!scrollRef.current) {
					return;
				}

				scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
			});
		}
	}, [finalizing, messagesLength, streaming, streamingContent]);

	if (!conversationId) {
		return <ConversationPlaceholder />;
	}

	if (loading) {
		return (
			<div className="flex flex-1 items-center justify-center bg-white">
				<Loader2 className="h-6 w-6 animate-spin text-neutral-400" />
			</div>
		);
	}

	if (messages.length === 0 && !streaming) {
		return (
			<EmptyConversationState
				hasDocuments={hasDocuments}
				streaming={streaming}
				onSend={onSend}
				onUpload={onUpload}
				onUploadMany={onUploadMany}
			/>
		);
	}

	return (
		<div className="flex flex-1 flex-col bg-white">
			<MessagesPanel
				activeCitationKey={activeCitationKey}
				error={error}
				finalizing={finalizing}
				messages={messages}
				onCitationClick={onCitationClick}
				scrollRef={scrollRef}
				streaming={streaming}
				streamingContent={streamingContent}
			/>

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
