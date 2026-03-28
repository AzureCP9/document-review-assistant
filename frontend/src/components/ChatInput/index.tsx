import { Paperclip, SendHorizontal } from "lucide-react";
import { type KeyboardEvent, useCallback, useRef, useState } from "react";
import { Button } from "../ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

interface ChatInputProps {
    onSend: (content: string) => void;
    onUpload: (file: File) => void;
    onUploadMany: (files: File[]) => void;
    disabled: boolean;
    hasDocuments: boolean;
}

export function ChatInput({
    onSend,
    onUpload,
    onUploadMany,
    disabled,
    hasDocuments,
}: ChatInputProps) {
    const [value, setValue] = useState("");
    const textareaRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleSend = useCallback(() => {
        const trimmed = value.trim();
        if (!trimmed || disabled) return;
        onSend(trimmed);
        setValue("");
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto";
        }
    }, [value, disabled, onSend]);

    const handleKeyDown = useCallback(
        (event: KeyboardEvent<HTMLTextAreaElement>) => {
            if (event.key === "Enter" && !event.shiftKey) {
                event.preventDefault();
                handleSend();
            }
        },
        [handleSend],
    );

    const handleInput = useCallback(() => {
        const textarea = textareaRef.current;
        if (!textarea) return;
        textarea.style.height = "auto";
        textarea.style.height = `${Math.min(textarea.scrollHeight, 200)}px`;
    }, []);

    const handleFileChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            const files = event.target.files
                ? Array.from(event.target.files)
                : [];
            if (files.length > 1) {
                onUploadMany(files);
            } else {
                const file = files[0];
                if (!file) {
                    return;
                }
                onUpload(file);
            }

            if (fileInputRef.current) {
                fileInputRef.current.value = "";
            }
        },
        [onUpload, onUploadMany],
    );

    return (
        <div className="border-t border-neutral-200 bg-white p-3">
            <div
                className={`flex items-center gap-2 rounded-xl border px-3 py-2 transition-colors ${
                    disabled
                        ? "border-neutral-200 bg-neutral-50"
                        : "border-neutral-200 bg-transparent"
                }`}
            >
                <Tooltip>
                    <TooltipTrigger asChild>
                        <div>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-9 w-9 flex-shrink-0 self-center"
                                onClick={() => fileInputRef.current?.click()}
                            >
                                <Paperclip className="h-4 w-4 text-neutral-500" />
                            </Button>
                        </div>
                    </TooltipTrigger>
                    <TooltipContent>
                        {hasDocuments
                            ? "Upload more documents"
                            : "Upload documents"}
                    </TooltipContent>
                </Tooltip>

                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf"
                    multiple
                    className="hidden"
                    onChange={handleFileChange}
                />

                <textarea
                    ref={textareaRef}
                    value={value}
                    onChange={(event) => setValue(event.target.value)}
                    onInput={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="Ask a question about your documents..."
                    rows={1}
                    className="max-h-[200px] min-h-[36px] flex-1 resize-none self-center bg-transparent py-2 text-sm text-neutral-800 placeholder-neutral-400 outline-none disabled:cursor-not-allowed"
                    disabled={disabled}
                />

                <Button
                    variant="ghost"
                    size="icon"
                    className={`h-9 w-9 flex-shrink-0 self-center rounded-lg transition-colors ${
                        value.trim() && !disabled
                            ? "text-primary-text hover:bg-primary-background hover:text-primary-text"
                            : "text-neutral-400 hover:bg-transparent hover:text-neutral-400"
                    }`}
                    disabled={!value.trim() || disabled}
                    onClick={handleSend}
                >
                    <SendHorizontal className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}
