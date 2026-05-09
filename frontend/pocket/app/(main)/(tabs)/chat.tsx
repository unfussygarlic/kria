import {
  useEffect,
  useCallback,
} from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  RefreshControl,
  Image,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { rf, rw } from "@/constants/responsive";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { ConversationSummary } from "@/types/database";

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatTime(isoString: string | null): string {
  if (!isoString) return "";
  const date = new Date(isoString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  if (diffHours < 24) {
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
  if (diffHours < 168) {
    // < 7 days
    return date.toLocaleDateString([], { weekday: "short" });
  }
  return date.toLocaleDateString([], { month: "short", day: "numeric" });
}

function getInitials(name: string): string {
  return name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({
  uri,
  name,
  size = 48,
}: {
  uri: string | null;
  name: string;
  size?: number;
}) {
  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={[styles.avatar, { width: size, height: size, borderRadius: size / 2 }]}
      />
    );
  }
  return (
    <View
      style={[
        styles.avatarFallback,
        { width: size, height: size, borderRadius: size / 2 },
      ]}
    >
      <Text style={[styles.avatarInitials, { fontSize: rf(size * 0.35) }]}>
        {getInitials(name)}
      </Text>
    </View>
  );
}

function ConversationRow({
  item,
  currentUserId,
}: {
  item: ConversationSummary;
  currentUserId: string;
}) {
  const isUnread = item.unread_count > 0;
  const isMine = item.last_message_sender_id === currentUserId;
  const preview = item.last_message_content
    ? `${isMine ? "You: " : ""}${item.last_message_content}`
    : "No messages yet";

  return (
    <TouchableOpacity
      style={styles.row}
      activeOpacity={0.7}
      onPress={() => router.push(`/(main)/chat/${item.id}`)}
    >
      <Avatar uri={item.other_user_avatar} name={item.other_user_name} />
      <View style={styles.rowContent}>
        <View style={styles.rowHeader}>
          <Text
            style={[styles.rowName, isUnread && styles.rowNameBold]}
            numberOfLines={1}
          >
            {item.other_user_name}
          </Text>
          <Text style={styles.rowTime}>{formatTime(item.last_message_at)}</Text>
        </View>
        <View style={styles.rowFooter}>
          <Text
            style={[styles.rowPreview, isUnread && styles.rowPreviewBold]}
            numberOfLines={1}
          >
            {preview}
          </Text>
          {isUnread && (
            <View style={styles.badge}>
              <Text style={styles.badgeText}>
                {item.unread_count > 99 ? "99+" : item.unread_count}
              </Text>
            </View>
          )}
        </View>
      </View>
    </TouchableOpacity>
  );
}

function EmptyState() {
  return (
    <View style={styles.empty}>
      <Feather name="message-circle" size={52} color={T.primary200} />
      <Text style={styles.emptyTitle}>No conversations yet</Text>
      <Text style={styles.emptySubtitle}>
        When a gig poster accepts your application, you can chat here.
      </Text>
    </View>
  );
}

// ── Main screen ───────────────────────────────────────────────────────────────

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const { conversations, isLoadingConversations, fetchConversations } = useChatStore();
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? "";

  // Initial fetch
  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const renderItem = useCallback(
    ({ item }: { item: ConversationSummary }) => (
      <ConversationRow item={item} currentUserId={currentUserId} />
    ),
    [currentUserId]
  );

  const keyExtractor = useCallback((item: ConversationSummary) => item.id, []);

  return (
    <View style={[styles.screen, { paddingTop: insets.top }]}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Messages</Text>
      </View>

      <FlatList
        data={conversations}
        renderItem={renderItem}
        keyExtractor={keyExtractor}
        contentContainerStyle={
          conversations.length === 0 ? styles.fillCenter : styles.list
        }
        ListEmptyComponent={isLoadingConversations ? null : <EmptyState />}
        refreshControl={
          <RefreshControl
            refreshing={isLoadingConversations}
            onRefresh={fetchConversations}
            tintColor={T.primary}
            colors={[T.primary]}
          />
        }
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: T.bg,
  },
  header: {
    paddingHorizontal: rw(20),
    paddingVertical: rw(16),
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  headerTitle: {
    fontSize: rf(22),
    fontWeight: "700",
    color: T.text,
  },
  list: {
    paddingBottom: rw(20),
  },
  fillCenter: {
    flex: 1,
    justifyContent: "center",
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: rw(20),
    paddingVertical: rw(12),
    backgroundColor: T.surface,
    gap: rw(12),
  },
  avatar: {
    backgroundColor: T.border,
  },
  avatarFallback: {
    backgroundColor: T.primary100,
    justifyContent: "center",
    alignItems: "center",
  },
  avatarInitials: {
    color: T.primary,
    fontWeight: "700",
  },
  rowContent: {
    flex: 1,
    gap: 3,
  },
  rowHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  rowName: {
    fontSize: rf(15),
    color: T.text,
    fontWeight: "500",
    flex: 1,
    marginRight: rw(8),
  },
  rowNameBold: {
    fontWeight: "700",
  },
  rowTime: {
    fontSize: rf(12),
    color: T.textMuted,
  },
  rowFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: rw(8),
  },
  rowPreview: {
    fontSize: rf(13),
    color: T.textMuted,
    flex: 1,
  },
  rowPreviewBold: {
    color: T.textSub,
    fontWeight: "600",
  },
  badge: {
    backgroundColor: T.primary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 6,
  },
  badgeText: {
    color: T.textInverse,
    fontSize: rf(11),
    fontWeight: "700",
  },
  separator: {
    height: 1,
    backgroundColor: T.border,
    marginLeft: rw(20 + 48 + 12), // align with text
  },
  empty: {
    alignItems: "center",
    padding: rw(40),
    gap: rw(16),
  },
  emptyTitle: {
    fontSize: rf(20),
    fontWeight: "700",
    color: T.text,
  },
  emptySubtitle: {
    fontSize: rf(14),
    color: T.textMuted,
    textAlign: "center",
    lineHeight: rf(14) * 1.6,
  },
});
