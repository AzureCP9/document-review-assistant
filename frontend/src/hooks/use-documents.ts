import { useCallback, useEffect, useState } from "react";
import * as api from "../lib/api";
import type { Document } from "../types";

export function useDocuments(conversationId: string | null) {
	const [documents, setDocuments] = useState<Document[]>([]);
	const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null);
	const [uploading, setUploading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		if (!conversationId) {
			setDocuments([]);
			setSelectedDocumentId(null);
			return;
		}

		try {
			setError(null);
			const detail = await api.fetchConversation(conversationId);
			setDocuments(detail.documents);
			setSelectedDocumentId((current) => {
				if (current && detail.documents.some((document) => document.id === current)) {
					return current;
				}
				return detail.documents[0]?.id ?? null;
			});
		} catch (err) {
			setError(err instanceof Error ? err.message : "Failed to load documents");
		}
	}, [conversationId]);

	useEffect(() => {
		refresh();
	}, [refresh]);

	const upload = useCallback(
		async (file: File) => {
			if (!conversationId) return null;
			try {
				setUploading(true);
				setError(null);
				const document = await api.uploadDocument(conversationId, file);
				setDocuments((current) => [...current, document]);
				setSelectedDocumentId(document.id);
				return document;
			} catch (err) {
				setError(
					err instanceof Error ? err.message : "Failed to upload document",
				);
				return null;
			} finally {
				setUploading(false);
			}
		},
		[conversationId],
	);

	const selectDocument = useCallback((documentId: string) => {
		setSelectedDocumentId(documentId);
	}, []);

	const selectedDocument =
		documents.find((document) => document.id === selectedDocumentId) ?? null;

	return {
		documents,
		selectedDocument,
		selectedDocumentId,
		uploading,
		error,
		upload,
		refresh,
		selectDocument,
	};
}
