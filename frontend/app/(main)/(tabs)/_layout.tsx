import { memo, useCallback, useRef, useMemo, useEffect } from "react";
import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import {
  useFabDial,
  FloatingFab,
  FabOverlay,
  SpeedDialOption,
} from "@/components/ui/FabSpeedDial";
import { useChatStore } from "@/stores/chatStore";
import { useAuthStore } from "@/stores/authStore";
import { subscribeToAllMessages } from "@/lib/chat/realtime";

// ── Static data ───────────────────────────────────────────────────────────────

const FAB_OPTIONS: SpeedDialOption[] = [
  {
    label: "Create an Event",
    icon: "calendar",
    onPress: () => router.push("/(main)/event/create"),
  },
  {
    label: "Post a Gig",
    icon: "briefcase",
    onPress: () => router.push("/(main)/post"),
  },
];

// ── Static screen options — module-level so references never change ───────────

const SCREEN_OPTIONS = {
  headerShown: false,
  tabBarActiveTintColor: T.primary,
  tabBarInactiveTintColor: T.textMuted,
  tabBarStyle: {
    backgroundColor: T.surface,
    borderTopWidth: 0,
    height: 64,
    marginHorizontal: 16,
    marginBottom: 20,
    borderRadius: 24,
    elevation: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 16,
    paddingBottom: 0,
  },
  tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const },
  tabBarItemStyle: { paddingVertical: 4 },
} as const;

const HOME_OPT = {
  title: "Home",
  tabBarIcon: ({ color, size }: any) => <Feather name="home" size={size} color={color} />,
};
const EXPLORE_OPT = {
  title: "Explore",
  tabBarIcon: ({ color, size }: any) => <Feather name="compass" size={size} color={color} />,
};
const SPACE_OPT = {
  title: "My Space",
  tabBarIcon: ({ color, size }: any) => <Feather name="layers" size={size} color={color} />,
};
// CHAT_OPT is built dynamically in TabsNavigator to show the unread badge
const HIDDEN = { href: null } as const;

// An inert spacer so the center slot exists in the tab bar layout.
// Has no press handler — the real FAB button floats above it.
const POST_SPACER = () => <View style={{ flex: 1 }} pointerEvents="none" />;
const POST_OPT = {
  title: "",
  tabBarLabel: () => null,
  tabBarButton: POST_SPACER,
};

// ── TabsNavigator — zero props ────────────────────────────────────────────────
//
// Zero props means React.memo is an absolute guarantee: this component will
// NEVER re-render after its initial mount, regardless of what changes in the
// parent. Pressing the FAB only changes TabsLayout's local state; memo() stops
// that change right here and nothing inside Tabs is ever touched.

// TabsNavigator receives unreadCount so the Chat tab badge updates in real-time.
// memo() still prevents re-renders from FAB toggle; only unreadCount changes
// will trigger a re-render here.
const TabsNavigator = memo(function TabsNavigator({ unreadCount }: { unreadCount: number }) {
  const chatOpt = useMemo(
    () => ({
      title: "Chat",
      tabBarIcon: ({ color, size }: { color: string; size: number }) => (
        <Feather name="message-circle" size={size} color={color} />
      ),
      tabBarBadge: unreadCount > 0 ? (unreadCount > 99 ? "99+" : unreadCount) : undefined,
    }),
    [unreadCount]
  );

  return (
    <Tabs screenOptions={SCREEN_OPTIONS}>
      <Tabs.Screen name="home"        options={HOME_OPT} />
      <Tabs.Screen name="explore"     options={EXPLORE_OPT} />
      <Tabs.Screen name="post"        options={POST_OPT} />
      <Tabs.Screen name="space"       options={SPACE_OPT} />
      <Tabs.Screen name="chat"        options={chatOpt} />
      <Tabs.Screen name="search"      options={HIDDEN} />
      <Tabs.Screen name="profile"     options={HIDDEN} />
      <Tabs.Screen name="personality" options={HIDDEN} />
    </Tabs>
  );
});

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const dial = useFabDial(FAB_OPTIONS.length);
  const unreadCount = useChatStore((s) => s.unreadCount);
  const fetchUnreadCount = useChatStore((s) => s.fetchUnreadCount);
  const handleIncomingMessage = useChatStore((s) => s.handleIncomingMessage);
  const session = useAuthStore((s) => s.session);
  const currentUserId = session?.user?.id ?? "";

  // Initial unread count fetch on mount
  useEffect(() => {
    fetchUnreadCount();
  }, [fetchUnreadCount]);

  // Global Realtime subscription — always alive regardless of which tab is active.
  // This drives the chat badge count for incoming messages from other users.
  const currentUserIdRef = useRef(currentUserId);
  currentUserIdRef.current = currentUserId;
  const handleRef = useRef(handleIncomingMessage);
  handleRef.current = handleIncomingMessage;

  useEffect(() => {
    if (!currentUserId) return;
    const unsubscribe = subscribeToAllMessages((message) => {
      handleRef.current(message, currentUserIdRef.current);
    });
    return unsubscribe;
  }, [currentUserId]);

  // Ref pattern keeps onPress stable across renders without stale closure.
  const toggleRef = useRef(dial.toggle);
  toggleRef.current = dial.toggle;
  const stablePress = useCallback(() => toggleRef.current(), []);

  return (
    <View style={{ flex: 1 }}>
      {/*
       * TabsNavigator re-renders only when unreadCount changes.
       * FAB dial state changes do NOT reach it (different prop, not changed).
       */}
      <TabsNavigator unreadCount={unreadCount} />

      {/*
       * FloatingFab: absolutely positioned circle button rendered OUTSIDE
       * React Navigation. Pressing it has zero interaction with the navigator.
       * memo() + stable props → also never re-renders.
       */}
      <FloatingFab onPress={stablePress} rotation={dial.rotation} />

      {/*
       * FabOverlay: the only component that re-renders when dial.open changes.
       * Backdrop + pills, no Modal, always mounted, pointerEvents-controlled.
       */}
      <FabOverlay dial={dial} options={FAB_OPTIONS} />
    </View>
  );
}
