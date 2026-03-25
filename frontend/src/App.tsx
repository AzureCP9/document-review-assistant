import { useCallback, useState } from "react";
import { ChatSidebar } from "./components/ChatSidebar";
import { ChatWindow } from "./components/ChatWindow";
import { DocumentViewer } from "./components/DocumentViewer";
import { TooltipProvider } from "./components/ui/tooltip";
import { useConversations } from "./hooks/use-conversations";
import { useDocuments } from "./hooks/use-documents";
import { useMessages } from "./hooks/use-messages";

export default function App() {
  const [sidebarOpen, setSidebarOpen] = useState(true);
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
          streaming={streaming}
          streamingContent={streamingContent}
          hasDocuments={documents.length > 0}
          conversationId={selectedId}
          onSend={handleSend}
          onUpload={handleUpload}
          onUploadMany={handleUploadMany}
        />

        <DocumentViewer
          documents={documents}
          document={selectedDocument}
          onSelectDocument={selectDocument}
        />
      </div>
    </TooltipProvider>
  );
}
