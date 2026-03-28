import { motion } from "framer-motion";
import { Trash2 } from "lucide-react";
import { relativeTime } from "../../lib/utils";
import type { Conversation } from "../../types";

interface ConversationItemProps {
	conversation: Conversation;
	hovered: boolean;
	selected: boolean;
	onDelete: (conversation: Conversation) => void;
	onHoverChange: (conversationId: string | null) => void;
	onSelect: (id: string) => void;
}

export function ConversationItem({
	conversation,
	hovered,
	selected,
	onDelete,
	onHoverChange,
	onSelect,
}: ConversationItemProps) {
	return (
		<motion.div
			initial={{ opacity: 0, height: 0 }}
			animate={{ opacity: 1, height: "auto" }}
			exit={{ opacity: 0, height: 0 }}
			transition={{ duration: 0.15 }}
		>
			<button
				type="button"
				className={`group flex w-full items-center rounded-xl border px-3 py-2.5 text-left transition-colors ${
					selected
						? "border-primary bg-primary-background"
						: "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
				}`}
				onClick={() => onSelect(conversation.id)}
				onMouseEnter={() => onHoverChange(conversation.id)}
				onMouseLeave={() => onHoverChange(null)}
			>
				<div className="min-w-0 flex-1 overflow-hidden">
					<p
						className={`max-w-full overflow-hidden text-ellipsis whitespace-nowrap text-sm font-medium ${
							selected ? "text-primary-text" : "text-neutral-800"
						}`}
					>
						{conversation.title}
					</p>
					<div
						className={`mt-0.5 flex items-center gap-2 text-xs ${
							selected ? "text-primary-muted" : "text-neutral-400"
						}`}
					>
						<span>{relativeTime(conversation.updated_at)}</span>
						{conversation.document_count > 0 && (
							<span
								className={`rounded-full px-2 py-0.5 text-[11px] ${
									selected
										? "bg-white text-primary-text"
										: "bg-neutral-100 text-neutral-500"
								}`}
							>
								{conversation.document_count} doc
								{conversation.document_count === 1 ? "" : "s"}
							</span>
						)}
					</div>
				</div>

				<div className="ml-2 flex w-8 flex-shrink-0 justify-end">
					<button
						type="button"
						className={`inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-neutral-400 transition-all hover:bg-transparent hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200 ${
							hovered
								? "pointer-events-auto opacity-100"
								: "pointer-events-none opacity-0"
						}`}
						onClick={(event) => {
							event.stopPropagation();
							onDelete(conversation);
						}}
						title="Delete conversation"
						aria-label={`Delete ${conversation.title}`}
					>
						<Trash2 className="h-[1.05rem] w-[1.05rem]" />
					</button>
				</div>
			</button>
		</motion.div>
	);
}
