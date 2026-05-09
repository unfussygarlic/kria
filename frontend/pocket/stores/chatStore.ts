import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import {
  createConversation,
  getConversations,
  getMessages,
  getUnreadCount,
  markAsRead,
  CreateConversationPayload,
} from "@/lib/api/chat";
import { ConversationSummary, Message } from "@/types/database";

interface ChatState {
  // Conversation list
  conversations: ConversationSummary[];
  isLoadingConversations: boolean;

  // Messages per conversation (conversationId → ordered oldest-first)
  messages: Record<string, Message[]>;
  hasMoreMessages: Record<string, boolean>;
  isLoadingMessages: Record<string, boolean>;

  // Optimistic sends: conversationId → set of temp IDs being sent
  pendingMessages: Record<string, Set<string>>;

  // Global unread badge
  unreadCount: number;

  // ── Actions ───────────────────────────────────────────────────────────────

  fetchConversations: () => Promise<void>;

  createConversation: (
    payload: CreateConversationPayload
  ) => Promise<{ id: string | null; error: string | null }>;

  fetchMessages: (conversationId: string) => Promise<void>;

  loadMoreMessages: (conversationId: string) => Promise<void>;

  /**
   * Optimistic send:
   * 1. Immediately add a temp message to the local list.
   * 2. Insert the real message via Supabase.
   * 3. Realtime fires INSERT → handleIncomingMessage replaces the temp.
   * 4. If the insert fails → rollback (remove the temp).
   */
  sendMessage: (
    conversationId: string,
    content: string,
    senderId: string
  ) => Promise<{ error: string | null }>;

  markConversationRead: (conversationId: string) => Promise<void>;

  fetchUnreadCount: () => Promise<void>;

  /**
   * Called by the global Realtime subscription (chat list) when a new
   * message arrives in any of the user's conversations.
   */
  handleIncomingMessage: (message: Message, currentUserId: string) => void;

  /**
   * Called by the conversation screen's Realtime subscription.
   * Adds the message and removes the matching optimistic temp if present.
   */
  handleConversationMessage: (
    message: Message,
    conversationId: string,
    currentUserId: string
  ) => void;
}

export const useChatStore = create<ChatState>((set, get) => ({
  conversations: [],
  isLoadingConversations: false,
  messages: {},
  hasMoreMessages: {},
  isLoadingMessages: {},
  pendingMessages: {},
  unreadCount: 0,

  // ── Conversations ─────────────────────────────────────────────────────────

  fetchConversations: async () => {
    set({ isLoadingConversations: true });
    const result = await getConversations();
    if (result.data) {
      set({ conversations: result.data });
    }
    set({ isLoadingConversations: false });
  },

  createConversation: async (payload) => {
    const result = await createConversation(payload);
    if (result.error) return { id: null, error: result.error };

    // Refresh the list so the new conversation appears
    await get().fetchConversations();
    return { id: result.data!.id, error: null };
  },

  // ── Messages ──────────────────────────────────────────────────────────────

  fetchMessages: async (conversationId) => {
    set((s) => ({
      isLoadingMessages: { ...s.isLoadingMessages, [conversationId]: true },
    }));

    const result = await getMessages(conversationId);
    if (result.data) {
      set((s) => ({
        messages: { ...s.messages, [conversationId]: result.data!.messages },
        hasMoreMessages: {
          ...s.hasMoreMessages,
          [conversationId]: result.data!.has_more,
        },
        isLoadingMessages: { ...s.isLoadingMessages, [conversationId]: false },
      }));
    } else {
      set((s) => ({
        isLoadingMessages: { ...s.isLoadingMessages, [conversationId]: false },
      }));
    }
  },

  loadMoreMessages: async (conversationId) => {
    const { messages, hasMoreMessages, isLoadingMessages } = get();
    if (isLoadingMessages[conversationId] || !hasMoreMessages[conversationId]) {
      return;
    }

    const existing = messages[conversationId] ?? [];
    const oldestMessage = existing[0];
    if (!oldestMessage) return;

    set((s) => ({
      isLoadingMessages: { ...s.isLoadingMessages, [conversationId]: true },
    }));

    const result = await getMessages(conversationId, oldestMessage.created_at);
    if (result.data) {
      set((s) => ({
        messages: {
          ...s.messages,
          [conversationId]: [
            ...result.data!.messages,
            ...(s.messages[conversationId] ?? []),
          ],
        },
        hasMoreMessages: {
          ...s.hasMoreMessages,
          [conversationId]: result.data!.has_more,
        },
        isLoadingMessages: { ...s.isLoadingMessages, [conversationId]: false },
      }));
    } else {
      set((s) => ({
        isLoadingMessages: { ...s.isLoadingMessages, [conversationId]: false },
      }));
    }
  },

  sendMessage: async (conversationId, content, senderId) => {
    const tempId = `temp_${Date.now()}_${Math.random()}`;

    const optimisticMsg: Message = {
      id: tempId,
      conversation_id: conversationId,
      sender_id: senderId,
      content,
      type: "text",
      metadata: null,
      created_at: new Date().toISOString(),
    };

    // Optimistic add
    set((s) => ({
      messages: {
        ...s.messages,
        [conversationId]: [
          ...(s.messages[conversationId] ?? []),
          optimisticMsg,
        ],
      },
      pendingMessages: {
        ...s.pendingMessages,
        [conversationId]: new Set([
          ...(s.pendingMessages[conversationId] ?? []),
          tempId,
        ]),
      },
    }));

    // Insert and immediately retrieve the real row (id, created_at, etc.)
    // This lets us replace the temp message without waiting for a Realtime round-trip.
    const { data: inserted, error } = await supabase
      .from("messages")
      .insert({
        conversation_id: conversationId,
        sender_id: senderId,
        content,
        type: "text",
      })
      .select()
      .single();

    if (error) {
      // Rollback optimistic message
      set((s) => {
        const pending = new Set(s.pendingMessages[conversationId] ?? []);
        pending.delete(tempId);
        return {
          messages: {
            ...s.messages,
            [conversationId]: (s.messages[conversationId] ?? []).filter(
              (m) => m.id !== tempId
            ),
          },
          pendingMessages: { ...s.pendingMessages, [conversationId]: pending },
        };
      });
      return { error: error.message };
    }

    // Replace temp with the real message immediately.
    // Realtime may still fire later — the dedup check in handleConversationMessage
    // will ignore it since the real ID is already present.
    set((s) => {
      const pending = new Set(s.pendingMessages[conversationId] ?? []);
      pending.delete(tempId);
      const withoutTemp = (s.messages[conversationId] ?? []).filter(
        (m) => m.id !== tempId
      );
      const alreadyPresent = withoutTemp.some((m) => m.id === inserted.id);
      return {
        messages: {
          ...s.messages,
          [conversationId]: alreadyPresent
            ? withoutTemp
            : [...withoutTemp, inserted as Message],
        },
        pendingMessages: { ...s.pendingMessages, [conversationId]: pending },
      };
    });

    return { error: null };
  },

  // ── Unread / mark-read ────────────────────────────────────────────────────

  markConversationRead: async (conversationId) => {
    await markAsRead(conversationId);

    // Zero out the unread count for this conversation locally
    set((s) => ({
      conversations: s.conversations.map((c) =>
        c.id === conversationId ? { ...c, unread_count: 0 } : c
      ),
      // Recompute total unread
      unreadCount: s.conversations
        .map((c) => (c.id === conversationId ? 0 : c.unread_count))
        .reduce((a, b) => a + b, 0),
    }));
  },

  fetchUnreadCount: async () => {
    const result = await getUnreadCount();
    if (result.data) {
      set({ unreadCount: result.data.unread_count });
    }
  },

  // ── Realtime handlers ─────────────────────────────────────────────────────

  handleIncomingMessage: (message, currentUserId) => {
    const isFromOther = message.sender_id !== currentUserId;

    set((s) => {
      const convIndex = s.conversations.findIndex(
        (c) => c.id === message.conversation_id
      );

      if (convIndex === -1) {
        // Conversation not loaded yet — bump unreadCount directly so the
        // badge updates immediately. fetchConversations (called below) will
        // populate the full entry.
        return {
          unreadCount: isFromOther ? s.unreadCount + 1 : s.unreadCount,
        };
      }

      const updated = s.conversations.map((c) => {
        if (c.id !== message.conversation_id) return c;
        return {
          ...c,
          last_message_content: message.content,
          last_message_sender_id: message.sender_id,
          last_message_at: message.created_at,
          unread_count: isFromOther ? c.unread_count + 1 : c.unread_count,
        };
      });
      const newTotal = updated.reduce((sum, c) => sum + c.unread_count, 0);
      return { conversations: updated, unreadCount: newTotal };
    });

    // If the conversation wasn't in the list, fetch so it appears in chat list
    if (!get().conversations.some((c) => c.id === message.conversation_id)) {
      get().fetchConversations();
    }
  },

  handleConversationMessage: (message, conversationId, currentUserId) => {
    set((s) => {
      const existing = s.messages[conversationId] ?? [];
      const pending = new Set(s.pendingMessages[conversationId] ?? []);

      // If this real message came from us, remove the oldest temp placeholder.
      // We match by "temp_" prefix rather than checking the pending set, because
      // sendMessage clears pendingMessages immediately on successful insert.
      let updatedList = existing;
      if (message.sender_id === currentUserId) {
        const tempIndex = updatedList.findIndex(
          (m) => m.id.startsWith("temp_") && m.sender_id === currentUserId
        );
        if (tempIndex !== -1) {
          const tempId = updatedList[tempIndex].id;
          pending.delete(tempId);
          updatedList = updatedList.filter((m) => m.id !== tempId);
        }
      }

      // Deduplicate by ID before appending
      const alreadyPresent = updatedList.some((m) => m.id === message.id);
      const finalList = alreadyPresent
        ? updatedList
        : [...updatedList, message];

      return {
        messages: { ...s.messages, [conversationId]: finalList },
        pendingMessages: { ...s.pendingMessages, [conversationId]: pending },
      };
    });

    // Also update the conversation list entry
    get().handleIncomingMessage(message, currentUserId);
  },
}));
