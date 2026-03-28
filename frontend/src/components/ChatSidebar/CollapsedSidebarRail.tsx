import { MessageSquarePlus, PanelLeftOpen } from "lucide-react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface CollapsedSidebarRailProps {
	onCreate: () => void;
	onToggle: () => void;
}

export function CollapsedSidebarRail({
	onCreate,
	onToggle,
}: CollapsedSidebarRailProps) {
	return (
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
						className="text-primary hover:bg-primary-background hover:text-primary-hover"
					>
						<MessageSquarePlus className="h-4.5 w-4.5" />
					</Button>
				</TooltipTrigger>
				<TooltipContent side="right">New chat</TooltipContent>
			</Tooltip>
		</div>
	);
}
