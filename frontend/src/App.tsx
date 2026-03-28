import { useCallback, useRef, useState } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentViewer } from "./components/DocumentViewer";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocuments } from "./hooks/use-documents";
import { useMessages } from "./hooks/use-messages";
import type { Citation } from "./types";

interface DocumentFocusRequest {
	documentName: string;
	keyPhrase: string;
	pageNumber: number;
	token: number;
}

export default function App() {
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [documentFocusRequest, setDocumentFocusRequest] =
        useState<DocumentFocusRequest | null>(null);
    const [activeCitationKey, setActiveCitationKey] = useState<string | null>(
        null,
    );
    const citationFocusTokenRef = useRef(0);
    const {
        conversations,
        selectedId,
        loading: conversationsLoading,
        create,
        select,
        remove,
        refresh: refreshConversations,
    } = useConversations();

    const {
        messages,
        loading: messagesLoading,
        error: messagesError,
        finalizing,
        streaming,
        streamingContent,
        send,
    } = useMessages(selectedId);

    const {
        documents,
        selectedDocument,
        upload,
        refresh: refreshDocuments,
        selectDocument,
    } = useDocuments(selectedId);

    const handleSend = useCallback(
        async (content: string) => {
            await send(content);
            refreshConversations();
        },
        [send, refreshConversations],
    );

    const handleUpload = useCallback(
        async (file: File) => {
            const doc = await upload(file);
            if (doc) {
                refreshDocuments();
                refreshConversations();
            }
        },
        [upload, refreshDocuments, refreshConversations],
    );

    const handleUploadMany = useCallback(
        async (files: File[]) => {
            for (const file of files) {
                const doc = await upload(file);
                if (!doc) {
                    break;
                }
            }
            refreshDocuments();
            refreshConversations();
        },
        [upload, refreshDocuments, refreshConversations],
    );

    const handleCreate = useCallback(async () => {
        await create();
    }, [create]);

    const handleCitationClick = useCallback(
        (citation: Citation) => {
            const matchingDocument = documents.find(
                (document) =>
                    document.filename.toLowerCase() ===
                    citation.document_name.toLowerCase(),
            );

            if (!matchingDocument) {
                return;
            }

            selectDocument(matchingDocument.id);
            citationFocusTokenRef.current += 1;
            setActiveCitationKey(
                `${citation.document_name}:${citation.page_number}:${citation.key_phrase}`,
            );
            setDocumentFocusRequest({
                documentName: citation.document_name,
                keyPhrase: citation.key_phrase,
                pageNumber: citation.page_number,
                token: citationFocusTokenRef.current,
            });
        },
        [documents, selectDocument],
    );

    const handleFocusRequestConsumed = useCallback((token: number) => {
        setDocumentFocusRequest((currentRequest) =>
            currentRequest?.token === token ? null : currentRequest,
        );
    }, []);

    const handleClearDocumentFocus = useCallback(() => {
        setDocumentFocusRequest(null);
        setActiveCitationKey(null);
    }, []);

    return (
        <TooltipProvider delayDuration={200}>
            <div className="relative flex h-screen bg-neutral-50">
                <ChatSidebar
                    conversations={conversations}
                    selectedId={selectedId}
                    loading={conversationsLoading}
                    open={sidebarOpen}
                    onToggle={() => setSidebarOpen((open) => !open)}
                    onSelect={select}
                    onCreate={handleCreate}
                    onDelete={remove}
                />

                <ChatWindow
                    messages={messages}
                    loading={messagesLoading}
                    error={messagesError}
                    finalizing={finalizing}
                    streaming={streaming}
                    streamingContent={streamingContent}
                    hasDocuments={documents.length > 0}
                    conversationId={selectedId}
                    activeCitationKey={activeCitationKey}
                    onCitationClick={handleCitationClick}
                    onSend={handleSend}
                    onUpload={handleUpload}
                    onUploadMany={handleUploadMany}
                />

                <DocumentViewer
                    documents={documents}
                    document={selectedDocument}
                    focusRequest={documentFocusRequest}
                    onClearFocus={handleClearDocumentFocus}
                    onFocusRequestConsumed={handleFocusRequestConsumed}
                    onSelectDocument={selectDocument}
                />
            </div>
        </TooltipProvider>
    );
}
