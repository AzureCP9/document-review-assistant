export interface Conversation {
	id: string;
	title: string;
	created_at: string;
	updated_at: string;
	document_count: number;
}

export interface Message {
	id: string;
	conversation_id: string;
	role: "user" | "assistant" | "system";
	content: string;
	sources_cited: number;
	citations: Citation[];
	created_at: string;
}

export interface Citation {
	document_name: string;
	page_number: number;
	section_or_clause?: string | null;
	key_phrase: string;
}

export interface DocumentSearchMatch {
	page_number: number;
	snippet: string;
	occurrence_index: number;
}

export interface Document {
	id: string;
	conversation_id: string;
	filename: string;
	page_count: number;
	uploaded_at: string;
}

export interface ConversationDetail extends Conversation {
	documents: Document[];
}
