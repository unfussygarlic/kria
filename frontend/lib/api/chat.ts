import { apiGet, apiPost } from "@/lib/api/client";
import {
  ConversationCreatedResponse,
  ConversationSummary,
  MessagesPage,
} from "@/types/database";

export interface CreateConversationPayload {
  other_user_id: string;
}

export const createConversation = (payload: CreateConversationPayload) =>
  apiPost<ConversationCreatedResponse>("/api/v1/conversations", payload);

export const getConversations = () =>
  apiGet<ConversationSummary[]>("/api/v1/conversations");

export const getMessages = (conversationId: string, before?: string) =>
  apiGet<MessagesPage>(
    `/api/v1/conversations/${conversationId}/messages${before ? `?before=${encodeURIComponent(before)}` : ""}`
  );

export const markAsRead = (conversationId: string) =>
  apiPost<{ success: boolean }>(`/api/v1/conversations/${conversationId}/mark-read`, {});

export const getUnreadCount = () =>
  apiGet<{ unread_count: number }>("/api/v1/conversations/unread-count");
