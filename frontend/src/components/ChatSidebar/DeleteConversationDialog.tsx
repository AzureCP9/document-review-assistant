import type { Conversation } from "../../types";
import { Button } from "../ui/button";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
} from "../ui/dialog";

interface DeleteConversationDialogProps {
	conversation: Conversation | null;
	onClose: () => void;
	onConfirm: (id: string) => void;
}

export function DeleteConversationDialog({
	conversation,
	onClose,
	onConfirm,
}: DeleteConversationDialogProps) {
	return (
		<Dialog open={conversation !== null} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-sm">
				<DialogHeader>
					<DialogTitle>Delete conversation?</DialogTitle>
					<DialogDescription>
						This will permanently delete{" "}
						<span className="font-medium text-neutral-700">
							{conversation?.title ?? "this conversation"}
						</span>
						, including its messages and uploaded documents. This action cannot be
						undone.
					</DialogDescription>
				</DialogHeader>
				<div className="rounded-xl border border-red-100 bg-red-50 px-3 py-2 text-sm text-red-700">
					Deleted conversations cannot be restored.
				</div>
				<div className="flex justify-end gap-2">
					<Button variant="ghost" onClick={onClose}>
						Cancel
					</Button>
					<Button
						className="bg-red-500 text-white hover:bg-red-600"
						onClick={() => {
							if (conversation) {
								onConfirm(conversation.id);
							}
							onClose();
						}}
					>
						Delete conversation
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
