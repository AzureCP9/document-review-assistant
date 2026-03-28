import { Bot } from "lucide-react";
import { Streamdown } from "streamdown";
import { assistantMarkdownClassName } from "./message-markdown";

interface StreamingBubbleProps {
	content: string;
	finalizing?: boolean;
}

export function StreamingBubble({
	content,
	finalizing = false,
}: StreamingBubbleProps) {
	return (
		<div className="flex gap-3 py-1.5">
			<div className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-neutral-900">
				<Bot className="h-4 w-4 text-white" />
			</div>
			<div className="min-w-0 max-w-[80%]">
				{content ? (
					<>
						<div className={assistantMarkdownClassName}>
							<Streamdown mode="streaming">{content}</Streamdown>
						</div>
						{finalizing && (
							<p className="mt-2 text-xs text-neutral-400">
								Checking citations...
							</p>
						)}
					</>
				) : (
					<div className="flex items-center gap-1 py-2">
						<span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400" />
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.15s" }}
						/>
						<span
							className="h-1.5 w-1.5 animate-pulse rounded-full bg-neutral-400"
							style={{ animationDelay: "0.3s" }}
						/>
					</div>
				)}
			</div>
		</div>
	);
}
