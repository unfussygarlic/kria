import { memo, useCallback, useRef } from "react";
import { View } from "react-native";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { useAuthStore } from "@/stores/authStore";
import {
  useFabDial,
  FloatingFab,
  FabOverlay,
  SpeedDialOption,
} from "@/components/ui/FabSpeedDial";

// ── Static data ───────────────────────────────────────────────────────────────

const FINDER_FAB_OPTIONS: SpeedDialOption[] = [
  {
    label: L.ACTION_CREATE_EVENT,
    icon: "calendar",
    onPress: () => router.push("/(main)/event/create"),
  },
  {
    label: L.ACTION_POST_GIG,
    icon: "briefcase",
    onPress: () => router.push("/(main)/post"),
  },
];

// ── Static screen options ─────────────────────────────────────────────────────

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
  title: L.TAB_HOME,
  tabBarIcon: ({ color, size }: any) => <Feather name="home" size={size} color={color} />,
};
const EXPLORE_OPT = {
  title: L.TAB_EXPLORE,
  tabBarIcon: ({ color, size }: any) => <Feather name="compass" size={size} color={color} />,
};
const SPACE_OPT = {
  title: L.TAB_SPACE,
  tabBarIcon: ({ color, size }: any) => <Feather name="layers" size={size} color={color} />,
};
const ARENA_OPT = {
  title: L.TAB_ARENA,
  tabBarIcon: ({ color, size }: any) => <Feather name="zap" size={size} color={color} />,
};
const HIDDEN = { href: null } as const;

// An inert spacer so the center slot exists in the tab bar layout.
const POST_SPACER = () => <View style={{ flex: 1 }} pointerEvents="none" />;
const POST_OPT = {
  title: "",
  tabBarLabel: () => null,
  tabBarButton: POST_SPACER,
};

// ── Seeker tabs — no FAB ──────────────────────────────────────────────────────
//
// memo() with zero props: never re-renders from parent state.

const SeekerTabsNavigator = memo(function SeekerTabsNavigator() {
  return (
    <Tabs screenOptions={SCREEN_OPTIONS}>
      <Tabs.Screen name="home"        options={HOME_OPT} />
      <Tabs.Screen name="explore"     options={EXPLORE_OPT} />
      <Tabs.Screen name="post"        options={HIDDEN} />
      <Tabs.Screen name="space"       options={SPACE_OPT} />
      <Tabs.Screen name="arena"       options={ARENA_OPT} />
      <Tabs.Screen name="chat"        options={HIDDEN} />
      <Tabs.Screen name="search"      options={HIDDEN} />
      <Tabs.Screen name="profile"     options={HIDDEN} />
      <Tabs.Screen name="personality" options={HIDDEN} />
    </Tabs>
  );
});

// ── Finder tabs — with FAB ────────────────────────────────────────────────────

const FinderTabsNavigator = memo(function FinderTabsNavigator() {
  return (
    <Tabs screenOptions={SCREEN_OPTIONS}>
      <Tabs.Screen name="home"        options={HOME_OPT} />
      <Tabs.Screen name="explore"     options={EXPLORE_OPT} />
      <Tabs.Screen name="post"        options={POST_OPT} />
      <Tabs.Screen name="space"       options={SPACE_OPT} />
      <Tabs.Screen name="arena"       options={ARENA_OPT} />
      <Tabs.Screen name="chat"        options={HIDDEN} />
      <Tabs.Screen name="search"      options={HIDDEN} />
      <Tabs.Screen name="profile"     options={HIDDEN} />
      <Tabs.Screen name="personality" options={HIDDEN} />
    </Tabs>
  );
});

// ── Layout ────────────────────────────────────────────────────────────────────

export default function TabsLayout() {
  const activeRole = useAuthStore((s) => s.activeRole);
  const isFinder = activeRole === "finder";

  const dial = useFabDial(FINDER_FAB_OPTIONS.length);

  const toggleRef = useRef(dial.toggle);
  toggleRef.current = dial.toggle;
  const stablePress = useCallback(() => toggleRef.current(), []);

  return (
    <View style={{ flex: 1 }}>
      {isFinder ? <FinderTabsNavigator /> : <SeekerTabsNavigator />}

      {isFinder && (
        <>
          <FloatingFab onPress={stablePress} rotation={dial.rotation} />
          <FabOverlay dial={dial} options={FINDER_FAB_OPTIONS} />
        </>
      )}
    </View>
  );
}
