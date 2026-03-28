import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Streamdown } from "streamdown";
import type { Citation, Message } from "../../types";
import { assistantMarkdownClassName } from "./message-markdown";

function formatDocumentTitle(documentName: string): string {
	return documentName
		.replace(/\.pdf$/i, "")
		.replace(/[-_]+/g, " ")
		.replace(/\s+/g, " ")
		.trim()
		.replace(/\b\w/g, (character) => character.toUpperCase());
}

interface AssistantMessageProps {
	message: Message;
	activeCitationKey?: string | null;
	onCitationClick?: (citation: Citation) => void;
}

export function AssistantMessage({
	message,
	activeCitationKey,
	onCitationClick,
}: AssistantMessageProps) {
	const citationsByDocument = message.citations.reduce<
		Array<{ documentName: string; citations: Citation[] }>
	>((groups, citation) => {
		const existingGroup = groups.find(
			(group) => group.documentName === citation.document_name,
		);

		if (existingGroup) {
			existingGroup.citations.push(citation);
			return groups;
		}

		groups.push({
			documentName: citation.document_name,
			citations: [citation],
		});
		return groups;
	}, []);

	return (
		<motion.div
			initial={{ opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ duration: 0.2 }}
			className="flex gap-3 py-1.5"
		>
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				<div className={assistantMarkdownClassName}>
					<Streamdown>{message.content}</Streamdown>
				</div>
				{message.citations.length > 0 && (
					<div className="mt-3 rounded-2xl border border-neutral-200 bg-neutral-50/70 p-2.5">
						<div className="mb-2 flex items-center justify-between px-1">
							<p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-neutral-500">
								Sources
							</p>
							<p className="text-[11px] text-neutral-400">
								{message.citations.length} citation
								{message.citations.length !== 1 ? "s" : ""}
							</p>
						</div>
						<div className="space-y-2">
							{citationsByDocument.map((group) => (
								<div
									key={group.documentName}
									className="rounded-xl border border-neutral-200/80 bg-white/80 p-2"
								>
									<div className="mb-1.5 flex items-center justify-between px-1">
										<p className="truncate text-[11px] font-semibold uppercase tracking-[0.06em] text-neutral-500">
											{formatDocumentTitle(group.documentName)}
										</p>
										<p className="text-[11px] text-neutral-400">
											{group.citations.length} citation
											{group.citations.length !== 1 ? "s" : ""}
										</p>
									</div>
									<div className="space-y-1.5">
										{group.citations.map((citation, index) => {
											const citationKey = `${citation.document_name}:${citation.page_number}:${citation.key_phrase}`;
											const isActive = activeCitationKey === citationKey;

											return (
												<button
													type="button"
													key={`${citation.document_name}-${citation.page_number}-${index}`}
													onClick={() => onCitationClick?.(citation)}
													aria-pressed={isActive}
													className={`flex w-full items-start justify-between gap-3 rounded-xl border px-3 py-2 text-left text-xs shadow-sm transition-colors ${
														isActive
															? "border-primary bg-primary-background"
															: "border-transparent bg-white hover:border-primary hover:bg-primary-background"
													}`}
												>
													<div className="min-w-0 flex-1">
														{citation.section_or_clause && (
															<p
																className={`truncate text-[11px] font-medium ${
																	isActive
																		? "text-primary-text"
																		: "text-neutral-500"
																}`}
															>
																{citation.section_or_clause}
															</p>
														)}
														<p
															className={`line-clamp-2 ${
																isActive
																	? "text-primary-muted"
																	: "text-neutral-600"
															} ${citation.section_or_clause ? "mt-0.5" : ""}`}
														>
															"{citation.key_phrase}"
														</p>
													</div>
													<p
														className={`flex-shrink-0 text-[11px] font-medium ${
															isActive
																? "text-primary-text"
																: "text-neutral-500"
														}`}
													>
														Page {citation.page_number}
													</p>
												</button>
											);
										})}
									</div>
								</div>
							))}
						</div>
					</div>
				)}
				{message.sources_cited > 0 && (
					<p className="mt-1.5 text-xs text-neutral-400">
						{message.sources_cited} source
						{message.sources_cited !== 1 ? "s" : ""} cited
					</p>
				)}
			</div>
		</motion.div>
	);
}
