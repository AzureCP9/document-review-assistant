import * as Collapsible from "@radix-ui/react-collapsible";
import { ChevronDown, Files, Search } from "lucide-react";
import type { Document } from "../../types";
import { Button } from "../ui/button";
import { ScrollArea } from "../ui/scroll-area";

interface DocumentNavigatorProps {
	documents: Document[];
	document: Document;
	documentQuery: string;
	navigatorOpen: boolean;
	onDocumentQueryChange: (value: string) => void;
	onNavigatorOpenChange: (open: boolean) => void;
	onSelectDocument: (documentId: string) => void;
}

export function DocumentNavigator({
	documents,
	document,
	documentQuery,
	navigatorOpen,
	onDocumentQueryChange,
	onNavigatorOpenChange,
	onSelectDocument,
}: DocumentNavigatorProps) {
	const filteredDocuments = documents.filter((item) =>
		item.filename
			.toLowerCase()
			.includes(documentQuery.trim().toLowerCase()),
	);

	if (documents.length <= 1) {
		return null;
	}

	return (
		<Collapsible.Root
			open={navigatorOpen}
			onOpenChange={onNavigatorOpenChange}
			className="border-t border-neutral-100 bg-white px-4 pt-2"
		>
			<div className="overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
				<Collapsible.Trigger asChild>
					<Button
						variant="ghost"
						className={`flex h-auto w-full items-center justify-between px-3 py-2.5 text-left transition-colors hover:bg-neutral-50 ${
							navigatorOpen ? "rounded-none" : "rounded-2xl"
						}`}
					>
						<div className="flex min-w-0 items-center gap-3">
							<div className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary-background">
								<Files className="h-4 w-4 text-primary-text" />
							</div>
							<div className="min-w-0">
								<p className="text-sm font-medium text-neutral-800">
									Documents
								</p>
								<p className="mt-0.5 text-xs text-neutral-400">
									{documents.length} loaded in this conversation
								</p>
							</div>
						</div>
						<div className="ml-3 flex items-center gap-3">
							<div className="hidden text-right sm:block">
								<p className="text-xs font-medium text-neutral-600">
									{navigatorOpen
										? "Showing document list"
										: "Browse documents"}
								</p>
								<p className="text-[11px] text-neutral-400">
									Search by file name
								</p>
							</div>
							<ChevronDown
								className={`h-4 w-4 text-neutral-500 transition-transform ${
									navigatorOpen ? "" : "-rotate-90"
								}`}
							/>
						</div>
					</Button>
				</Collapsible.Trigger>
				<Collapsible.Content className="border-t border-neutral-100 p-2">
					<div className="relative px-1 pb-2">
						<Search className="pointer-events-none absolute top-[calc(50%-4px)] left-4 h-4 w-4 -translate-y-1/2 text-neutral-400" />
						<input
							value={documentQuery}
							onChange={(event) => onDocumentQueryChange(event.target.value)}
							placeholder="Search documents by name..."
							className="h-9 w-full rounded-xl border border-neutral-200 bg-transparent pr-3 pl-9 text-sm text-neutral-700 outline-none transition-colors placeholder:text-neutral-400 focus:border-neutral-400"
						/>
					</div>
					<ScrollArea className="h-32">
						<div className="space-y-1 px-1 pb-1">
							{filteredDocuments.length > 0 ? (
								filteredDocuments.map((item) => (
									<button
										key={item.id}
										type="button"
										onClick={() => onSelectDocument(item.id)}
										className={`flex w-full items-start justify-between rounded-lg border px-3 py-2 text-left transition-colors ${
											item.id === document.id
												? "border-primary bg-primary-background text-primary-text"
												: "border-transparent bg-white text-neutral-700 hover:border-neutral-200 hover:bg-neutral-50"
										}`}
									>
										<div className="min-w-0 flex-1">
											<p className="truncate text-sm font-medium">
												{item.filename}
											</p>
											<p
												className={`mt-1 text-xs ${
													item.id === document.id
														? "text-primary-muted"
														: "text-neutral-400"
												}`}
											>
												{item.page_count} page
												{item.page_count === 1 ? "" : "s"}
											</p>
										</div>
										{item.id === document.id && (
											<span className="ml-3 rounded-full bg-white px-2 py-0.5 text-[11px] font-medium text-primary-text">
												Open
											</span>
										)}
									</button>
								))
							) : (
								<div className="px-3 py-6 text-center text-sm text-neutral-400">
									No matching documents
								</div>
							)}
						</div>
					</ScrollArea>
				</Collapsible.Content>
			</div>
		</Collapsible.Root>
	);
}
