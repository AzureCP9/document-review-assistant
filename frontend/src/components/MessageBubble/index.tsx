import { motion } from "framer-motion";
import "streamdown/styles.css";
import type { Citation, Message } from "../../types";
import { AssistantMessage } from "./AssistantMessage";

export { StreamingBubble } from "./StreamingBubble";

interface MessageBubbleProps {
	message: Message;
	activeCitationKey?: string | null;
	onCitationClick?: (citation: Citation) => void;
}

export function MessageBubble({
	message,
	activeCitationKey,
	onCitationClick,
}: MessageBubbleProps) {
	if (message.role === "system") {
		return (
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ duration: 0.2 }}
				className="flex justify-center py-2"
			>
				<p className="text-xs text-neutral-400">{message.content}</p>
			</motion.div>
		);
	}

	if (message.role === "user") {
		return (
			<motion.div
				initial={{ opacity: 0, y: 8 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ duration: 0.2 }}
				className="flex justify-end py-1.5"
			>
				<div className="max-w-[75%] rounded-2xl rounded-br-md bg-neutral-100 px-4 py-2.5">
					<p className="whitespace-pre-wrap text-sm text-neutral-800">
						{message.content}
					</p>
				</div>
			</motion.div>
		);
	}

	return (
		<AssistantMessage
			message={message}
			activeCitationKey={activeCitationKey}
			onCitationClick={onCitationClick}
		/>
	);
}
