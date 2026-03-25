import { AnimatePresence, motion } from "framer-motion";
import { MessageSquarePlus, PanelLeftClose, PanelLeftOpen, Trash2 } from "lucide-react";
import { useState } from "react";
import { relativeTime } from "../lib/utils";
import type { Conversation } from "../types";
import { Button } from "./ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "./ui/dialog";
import { ScrollArea } from "./ui/scroll-area";
import { Tooltip, TooltipContent, TooltipTrigger } from "./ui/tooltip";

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

	if (!open) {
		return (
			<motion.div
				initial={false}
				animate={{ width: 64 }}
				transition={{ duration: 0.18, ease: "easeInOut" }}
				className="flex h-full flex-shrink-0 flex-col border-r border-neutral-200 bg-white"
			>
				<div className="flex flex-col items-center gap-4 border-b border-neutral-100 px-2 py-3.5">
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={onToggle}
								title="Show sidebar"
								className="text-neutral-500 hover:bg-neutral-100 hover:text-neutral-800"
							>
								<PanelLeftOpen className="h-4.5 w-4.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">Show sidebar</TooltipContent>
					</Tooltip>
					<Tooltip>
						<TooltipTrigger asChild>
							<Button
								variant="ghost"
								size="icon"
								onClick={onCreate}
								title="New chat"
								className="text-[#FF6E30] hover:bg-[#FFF1EA] hover:text-[#E85C1F]"
							>
								<MessageSquarePlus className="h-4.5 w-4.5" />
							</Button>
						</TooltipTrigger>
						<TooltipContent side="right">New chat</TooltipContent>
					</Tooltip>
				</div>
			</motion.div>
		);
	}

	return (
		<>
			<motion.div
				initial={false}
				animate={{ width: 296 }}
				transition={{ duration: 0.18, ease: "easeInOut" }}
				className="flex h-full flex-shrink-0 flex-col border-r border-neutral-200 bg-white"
			>
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
							className="mb-3 flex h-11 w-full items-center justify-start gap-2 rounded-xl border border-neutral-200 bg-white px-3 text-sm font-medium text-neutral-800 hover:border-[#FFD2BF] hover:bg-[#FFF1EA] hover:text-[#C94C16]"
						>
							<MessageSquarePlus className="h-4 w-4" />
							<span>New chat</span>
						</Button>

						<div className="mb-2 px-1">
							<span className="text-sm font-semibold text-neutral-700">Chats</span>
						</div>

						{loading && conversations.length === 0 && (
							<div className="space-y-2 p-2">
								{[1, 2, 3].map((i) => (
									<div key={i} className="animate-pulse space-y-1">
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
								<motion.div
									key={conversation.id}
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									transition={{ duration: 0.15 }}
								>
									<button
										type="button"
										className={`group flex w-full items-center rounded-xl border px-3 py-2.5 text-left transition-colors ${
											selectedId === conversation.id
												? "border-[#FFD2BF] bg-[#FFF1EA]"
												: "border-transparent hover:border-neutral-200 hover:bg-neutral-50"
										}`}
										onClick={() => onSelect(conversation.id)}
										onMouseEnter={() => setHoveredId(conversation.id)}
										onMouseLeave={() => setHoveredId(null)}
									>
										<div className="min-w-0 flex-1 overflow-hidden">
											<p
												className={`truncate text-sm font-medium ${
													selectedId === conversation.id
														? "text-[#C94C16]"
														: "text-neutral-800"
												}`}
											>
												{conversation.title}
											</p>
											<div
												className={`mt-0.5 flex items-center gap-2 text-xs ${
													selectedId === conversation.id
														? "text-[#D87B52]"
														: "text-neutral-400"
												}`}
											>
												<span>{relativeTime(conversation.updated_at)}</span>
												{conversation.document_count > 0 && (
													<span
														className={`rounded-full px-2 py-0.5 text-[11px] ${
															selectedId === conversation.id
																? "bg-white text-[#C94C16]"
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
											{hoveredId === conversation.id && (
												<button
													type="button"
													className="inline-flex h-8 w-8 items-center justify-center rounded-md bg-transparent text-neutral-400 transition-colors hover:bg-transparent hover:text-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-200"
													onClick={(e) => {
														e.stopPropagation();
														setConversationToDelete(conversation);
													}}
													title="Delete conversation"
													aria-label={`Delete ${conversation.title}`}
												>
													<Trash2 className="h-[1.05rem] w-[1.05rem]" />
												</button>
											)}
										</div>
									</button>
								</motion.div>
							))}
						</AnimatePresence>
					</div>
				</ScrollArea>
			</motion.div>

			<Dialog
				open={conversationToDelete !== null}
				onOpenChange={(open) => {
					if (!open) {
						setConversationToDelete(null);
					}
				}}
			>
				<DialogContent className="max-w-sm">
					<DialogHeader>
						<DialogTitle>Delete conversation?</DialogTitle>
						<DialogDescription>
							This will permanently delete{" "}
							<span className="font-medium text-neutral-700">
								{conversationToDelete?.title ?? "this conversation"}
							</span>
							, including its messages and uploaded documents. This action cannot be
							undone.
						</DialogDescription>
					</DialogHeader>
					<div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
						Deleted conversations cannot be restored.
					</div>
					<div className="flex justify-end gap-2">
						<Button
							variant="ghost"
							onClick={() => setConversationToDelete(null)}
						>
							Cancel
						</Button>
						<Button
							className="bg-red-500 text-white hover:bg-red-600"
							onClick={() => {
								if (conversationToDelete) {
									onDelete(conversationToDelete.id);
								}
								setConversationToDelete(null);
							}}
						>
							Delete conversation
						</Button>
					</div>
				</DialogContent>
			</Dialog>
		</>
	);
}
