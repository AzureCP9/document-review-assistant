import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, PanelLeftClose } from "lucide-react";
import { useState } from "react";
import type { Conversation } from "../../types";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";
import { CollapsedSidebarRail } from "./CollapsedSidebarRail";
import { ConversationItem } from "./ConversationItem";
import { DeleteConversationDialog } from "./DeleteConversationDialog";

interface ChatSidebarProps {
	conversations: Conversation[];
	selectedId: string | null;
	loading: boolean;
	open: boolean;
	onToggle: () => void;
	onSelect: (id: string) => void;
	onCreate: () => void;
	onDelete: (id: string) => void;
}

export function ChatSidebar({
	conversations,
	selectedId,
	loading,
	open,
	onToggle,
	onSelect,
	onCreate,
	onDelete,
}: ChatSidebarProps) {
	const [hoveredId, setHoveredId] = useState<string | null>(null);
	const [conversationToDelete, setConversationToDelete] =
		useState<Conversation | null>(null);

	return (
		<>
			<motion.div
				initial={false}
				animate={{ width: open ? 296 : 64 }}
				transition={{ duration: 0.18, ease: "easeInOut" }}
				className="box-border flex h-full flex-shrink-0 flex-col overflow-x-hidden overflow-y-hidden border-r border-neutral-200 bg-white"
			>
				{open ? (
					<>
						<div className="flex items-center justify-between border-b border-neutral-100 px-3 py-3">
							<div className="min-w-0 overflow-hidden">
								<p className="truncate whitespace-nowrap text-sm font-semibold text-neutral-800">
									Orbital
								</p>
								<p className="truncate whitespace-nowrap text-xs text-neutral-400">
									Document review
								</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={onToggle}
								title="Hide sidebar"
								className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
							>
								<PanelLeftClose className="h-4.5 w-4.5" />
							</Button>
						</div>

						<ScrollArea className="flex-1">
							<div className="p-3">
								<Button
									type="button"
									variant="ghost"
									onClick={onCreate}
									className="mb-3 flex h-11 w-full items-center justify-start gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 hover:border-primary hover:bg-primary-background hover:text-primary-text"
								>
									<MessageSquarePlus className="h-4 w-4" />
									<span>New chat</span>
								</Button>

								<div className="mb-2 px-1">
									<span className="text-sm font-semibold text-neutral-700">Chats</span>
								</div>

								{loading && conversations.length === 0 && (
									<div className="space-y-2 p-2">
										{[1, 2, 3].map((item) => (
											<div key={item} className="animate-pulse space-y-1">
												<div className="h-4 w-3/4 rounded bg-neutral-100" />
												<div className="h-3 w-1/2 rounded bg-neutral-50" />
											</div>
										))}
									</div>
								)}

								{!loading && conversations.length === 0 && (
									<p className="px-2 py-8 text-center text-xs text-neutral-400">
										No conversations yet
									</p>
								)}

								<AnimatePresence initial={false}>
									{conversations.map((conversation) => (
										<ConversationItem
											key={conversation.id}
											conversation={conversation}
											hovered={hoveredId === conversation.id}
											selected={selectedId === conversation.id}
											onDelete={setConversationToDelete}
											onHoverChange={setHoveredId}
											onSelect={onSelect}
										/>
									))}
								</AnimatePresence>
							</div>
						</ScrollArea>
					</>
				) : (
					<CollapsedSidebarRail onCreate={onCreate} onToggle={onToggle} />
				)}
			</motion.div>

			<DeleteConversationDialog
				conversation={conversationToDelete}
				onClose={() => setConversationToDelete(null)}
				onConfirm={onDelete}
			/>
		</>
	);
}
