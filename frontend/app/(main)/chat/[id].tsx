/**
 * Conversation screen — real-time 1-on-1 chat.
 *
 * Flow:
 *  1. Mount → fetch messages from FastAPI (paginated, 50/page)
 *  2. Subscribe to Supabase Realtime for live inserts
 *  3. Send → optimistic insert to local state + Supabase direct insert
 *  4. Realtime fires → replace optimistic msg with real msg
 *  5. Unmount → unsubscribe from Realtime
 *
 * Custom FlatList + TextInput implementation (no gifted-chat dependency).
 */

import React, {
  useEffect,
  useRef,
  useCallback,
  useState,
  useMemo,
} from "react";
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Image,
  ListRenderItemInfo,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToConversation } from "@/lib/chat/realtime";
import { Message } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes().toString().padStart(2, "0");
  const suffix = h >= 12 ? "pm" : "am";
  return `${h % 12 || 12}:${m} ${suffix}`;
}

function formatDateDivider(iso: string): string {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);

  if (d.toDateString() === today.toDateString()) return "Today";
  if (d.toDateString() === yesterday.toDateString()) return "Yesterday";
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year:
      d.getFullYear() !== today.getFullYear() ? "numeric" : undefined,
  });
}

// ── Message bubble ────────────────────────────────────────────────────────────

interface BubbleProps {
  message: Message;
  isOwn: boolean;
  isPending: boolean;
}

function MessageBubble({ message, isOwn, isPending }: BubbleProps) {
  return (
    <View
      style={[
        styles.bubbleRow,
        isOwn ? styles.bubbleRowRight : styles.bubbleRowLeft,
      ]}
    >
      <View
        style={[
          styles.bubble,
          isOwn ? styles.bubbleOwn : styles.bubbleOther,
          isPending && styles.bubblePending,
        ]}
      >
        <Text
          style={[
            styles.bubbleText,
            isOwn ? styles.bubbleTextOwn : styles.bubbleTextOther,
          ]}
        >
          {message.content}
        </Text>
        <Text
          style={[
            styles.bubbleTime,
            isOwn ? styles.bubbleTimeOwn : styles.bubbleTimeOther,
          ]}
        >
          {formatTime(message.created_at)}
          {isPending && (
            <Text style={styles.bubbleSending}> · sending</Text>
          )}
        </Text>
      </View>
    </View>
  );
}

// ── Date divider ──────────────────────────────────────────────────────────────

function DateDivider({ label }: { label: string }) {
  return (
    <View style={styles.dateDivider}>
      <View style={styles.dateLine} />
      <Text style={styles.dateDividerText}>{label}</Text>
      <View style={styles.dateLine} />
    </View>
  );
}

// ── Header ────────────────────────────────────────────────────────────────────

function Header({ name, avatar }: { name: string; avatar: string | null }) {
  const insets = useSafeAreaInsets();
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <View style={[styles.header, { paddingTop: insets.top + 8 }]}>
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => router.back()}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      >
        <Feather name="arrow-left" size={24} color={T.text} />
      </TouchableOpacity>

      {avatar ? (
        <Image source={{ uri: avatar }} style={styles.headerAvatar} />
      ) : (
        <View style={styles.headerAvatarFallback}>
          <Text style={styles.headerAvatarInitials}>{initials}</Text>
        </View>
      )}

      <Text style={styles.headerName} numberOfLines={1}>
        {name}
      </Text>
    </View>
  );
}

// ── Input bar ─────────────────────────────────────────────────────────────────

interface InputBarProps {
  onSend: (text: string) => void;
  bottomInset: number;
}

function InputBar({ onSend, bottomInset }: InputBarProps) {
  const [text, setText] = useState("");
  const inputRef = useRef<TextInput>(null);

  const handleSend = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed) return;
    setText("");
    inputRef.current?.clear(); // flush native buffer on multiline inputs
    onSend(trimmed);
  }, [text, onSend]);

  return (
    <View style={[styles.inputBar, { paddingBottom: bottomInset + rw(8) }]}>
      <TextInput
        ref={inputRef}
        style={styles.textInput}
        value={text}
        onChangeText={setText}
        placeholder="Type a message…"
        placeholderTextColor={T.textMuted}
        multiline
        maxLength={2000}
        returnKeyType="default"
      />
      <TouchableOpacity
        style={[styles.sendButton, !text.trim() && styles.sendButtonDisabled]}
        onPress={handleSend}
        disabled={!text.trim()}
        activeOpacity={0.7}
      >
        <Feather
          name="send"
          size={18}
          color={text.trim() ? T.textInverse : T.textMuted}
        />
      </TouchableOpacity>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

/** Item in the combined list: either a message or a date divider label */
type ListItem =
  | { kind: "message"; message: Message }
  | { kind: "divider"; label: string; key: string };

export default function ConversationScreen() {
  const { id: conversationId } = useLocalSearchParams<{ id: string }>();
  const insets = useSafeAreaInsets();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? "";

  const {
    conversations,
    messages: messagesMap,
    hasMoreMessages,
    isLoadingMessages,
    pendingMessages,
    fetchConversations,
    fetchMessages,
    loadMoreMessages,
    sendMessage,
    markConversationRead,
    handleConversationMessage,
  } = useChatStore();

  const conversation = conversations.find((c) => c.id === conversationId);
  const otherUserName = conversation?.other_user_name ?? "User";
  const otherUserId = conversation?.other_user_id ?? "";
  const otherUserAvatar = conversation?.other_user_avatar ?? null;

  const currentMessages = messagesMap[conversationId ?? ""] ?? [];
  const isLoading = isLoadingMessages[conversationId ?? ""] ?? false;
  const hasMore = hasMoreMessages[conversationId ?? ""] ?? false;
  const pendingSet = pendingMessages[conversationId ?? ""] ?? new Set<string>();

  // Ref to keep Realtime handler stable
  const handleRef = useRef({ handleConversationMessage, currentUserId });
  handleRef.current = { handleConversationMessage, currentUserId };

  // If we navigated here directly (e.g. from applicants screen) and the
  // conversation isn't in the store yet, fetch the list so we get the name.
  useEffect(() => {
    if (conversationId && !conversation) {
      fetchConversations();
    }
  }, [conversationId]); // intentionally run once on mount

  // Fetch messages on mount
  useEffect(() => {
    if (!conversationId) return;
    fetchMessages(conversationId);
  }, [conversationId, fetchMessages]);

  // Mark as read when entering
  useEffect(() => {
    if (!conversationId || !currentUserId) return;
    markConversationRead(conversationId);
  }, [conversationId, currentUserId, markConversationRead]);

  // Subscribe to Realtime for this conversation
  useEffect(() => {
    if (!conversationId) return;
    const unsubscribe = subscribeToConversation(conversationId, (message) => {
      handleRef.current.handleConversationMessage(
        message,
        conversationId,
        handleRef.current.currentUserId
      );
    });
    return unsubscribe;
  }, [conversationId]);

  // Build display list: newest-first (for inverted FlatList) + date dividers
  const listItems = useMemo<ListItem[]>(() => {
    // Work through messages newest-first
    const reversed = [...currentMessages].reverse();
    const items: ListItem[] = [];
    let lastDateLabel = "";

    for (const msg of reversed) {
      const label = formatDateDivider(msg.created_at);
      items.push({ kind: "message", message: msg });
      if (label !== lastDateLabel) {
        items.push({ kind: "divider", label, key: `divider-${msg.id}` });
        lastDateLabel = label;
      }
    }

    return items;
  }, [currentMessages]);

  const handleSend = useCallback(
    async (text: string) => {
      if (!conversationId || !currentUserId) return;
      await sendMessage(conversationId, text, currentUserId);
    },
    [conversationId, currentUserId, sendMessage]
  );

  // "Load earlier" fires when user scrolls to the top (end of inverted list)
  const handleEndReached = useCallback(() => {
    if (!conversationId || !hasMore || isLoading) return;
    loadMoreMessages(conversationId);
  }, [conversationId, hasMore, isLoading, loadMoreMessages]);

  const renderItem = useCallback(
    ({ item }: ListRenderItemInfo<ListItem>) => {
      if (item.kind === "divider") {
        return <DateDivider label={item.label} />;
      }
      const msg = item.message;
      const isOwn = msg.sender_id === currentUserId;
      const isPending = pendingSet.has(msg.id);
      return (
        <MessageBubble message={msg} isOwn={isOwn} isPending={isPending} />
      );
    },
    [currentUserId, pendingSet]
  );

  const keyExtractor = useCallback(
    (item: ListItem) =>
      item.kind === "divider" ? item.key : item.message.id,
    []
  );

  // ListFooterComponent renders at the TOP of an inverted list
  const LoadEarlierFooter = useMemo(() => {
    if (!hasMore && !isLoading) return null;
    return (
      <View style={styles.loadEarlier}>
        {isLoading && currentMessages.length > 0 ? (
          <ActivityIndicator size="small" color={T.primary} />
        ) : (
          <TouchableOpacity
            onPress={() =>
              conversationId && loadMoreMessages(conversationId)
            }
            style={styles.loadEarlierButton}
          >
            <Text style={styles.loadEarlierText}>Load earlier messages</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  }, [hasMore, isLoading, currentMessages.length, conversationId, loadMoreMessages]);

  if (isLoading && currentMessages.length === 0) {
    return (
      <View style={styles.screen}>
        <Header name={otherUserName} avatar={otherUserAvatar} />
        <View style={styles.loadingCenter}>
          <ActivityIndicator size="large" color={T.primary} />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Header name={otherUserName} avatar={otherUserAvatar} />

      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <FlatList
          data={listItems}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          inverted
          contentContainerStyle={styles.listContent}
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={LoadEarlierFooter}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />

        <InputBar onSend={handleSend} bottomInset={insets.bottom} />
      </KeyboardAvoidingView>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  flex: {
    flex: 1,
  },
  loadingCenter: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },

  // Header
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(16),
    paddingBottom: rw(12),
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: rw(12),
  },
  backButton: {
    padding: rw(4),
  },
  headerAvatar: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: T.border,
  },
  headerAvatarFallback: {
    width: rw(36),
    height: rw(36),
    borderRadius: rw(18),
    backgroundColor: T.primary100,
    justifyContent: "center",
    alignItems: "center",
  },
  headerAvatarInitials: {
    color: T.primary,
    fontWeight: "700",
    fontSize: rf(14),
  },
  headerName: {
    flex: 1,
    fontSize: rf(17),
    fontWeight: "700",
    color: T.text,
  },

  // Message list
  listContent: {
    paddingHorizontal: rw(12),
    paddingVertical: rw(8),
  },

  // Bubble
  bubbleRow: {
    marginVertical: rw(3),
    flexDirection: "row",
  },
  bubbleRowRight: {
    justifyContent: "flex-end",
  },
  bubbleRowLeft: {
    justifyContent: "flex-start",
  },
  bubble: {
    maxWidth: "75%",
    borderRadius: 18,
    paddingHorizontal: rw(14),
    paddingVertical: rw(8),
  },
  bubbleOwn: {
    backgroundColor: T.primary,
    borderBottomRightRadius: 4,
  },
  bubbleOther: {
    backgroundColor: T.secondary200,
    borderBottomLeftRadius: 4,
  },
  bubblePending: {
    opacity: 0.65,
  },
  bubbleText: {
    fontSize: rf(15),
    lineHeight: rf(21),
  },
  bubbleTextOwn: {
    color: T.textInverse,
  },
  bubbleTextOther: {
    color: T.text,
  },
  bubbleTime: {
    fontSize: rf(11),
    marginTop: rw(3),
  },
  bubbleTimeOwn: {
    color: "rgba(255,255,255,0.65)",
    textAlign: "right",
  },
  bubbleTimeOther: {
    color: T.textMuted,
  },
  bubbleSending: {
    fontStyle: "italic",
  },

  // Date divider
  dateDivider: {
    flexDirection: "row",
    alignItems: "center",
    marginVertical: rw(10),
    gap: rw(8),
  },
  dateLine: {
    flex: 1,
    height: 1,
    backgroundColor: T.border,
  },
  dateDividerText: {
    fontSize: rf(12),
    color: T.textMuted,
    fontWeight: "500",
  },

  // Load earlier
  loadEarlier: {
    alignItems: "center",
    paddingVertical: rw(12),
  },
  loadEarlierButton: {
    paddingHorizontal: rw(16),
    paddingVertical: rw(6),
    backgroundColor: T.primary50,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.primary100,
  },
  loadEarlierText: {
    color: T.primary,
    fontSize: rf(13),
    fontWeight: "600",
  },

  // Input bar
  inputBar: {
    flexDirection: "row",
    alignItems: "flex-end",
    paddingHorizontal: rw(12),
    paddingTop: rw(8),
    backgroundColor: T.surface,
    borderTopWidth: 1,
    borderTopColor: T.border,
    gap: rw(8),
  },
  textInput: {
    flex: 1,
    backgroundColor: T.bg,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: T.border,
    paddingHorizontal: rw(14),
    paddingVertical: rw(10),
    fontSize: rf(15),
    color: T.text,
    maxHeight: 120,
  },
  sendButton: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    backgroundColor: T.primary,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: rw(1),
  },
  sendButtonDisabled: {
    backgroundColor: T.secondary200,
  },
});
