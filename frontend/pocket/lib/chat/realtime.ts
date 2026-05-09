/**
 * Supabase Realtime helpers for chat.
 *
 * Two subscription scopes:
 *  - subscribeToConversation: filtered by a specific conversation_id
 *    (used by the conversation screen — receives messages for that thread)
 *  - subscribeToAllMessages: no filter, RLS restricts to the user's conversations
 *    (used by the chat list to detect new messages across all threads)
 *
 * Both return an unsubscribe function — call it in useEffect cleanup.
 */

import { supabase } from "@/lib/supabase";
import { Message } from "@/types/database";

type MessageHandler = (message: Message) => void;

export function subscribeToConversation(
  conversationId: string,
  onMessage: MessageHandler
): () => void {
  const channel = supabase
    .channel(`conversation:${conversationId}`)
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
        filter: `conversation_id=eq.${conversationId}`,
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}

export function subscribeToAllMessages(onMessage: MessageHandler): () => void {
  const channel = supabase
    .channel("all_messages")
    .on(
      "postgres_changes",
      {
        event: "INSERT",
        schema: "public",
        table: "messages",
      },
      (payload) => {
        onMessage(payload.new as Message);
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
