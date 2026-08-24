import { memo, useCallback, useEffect, useRef } from "react";
import { Animated, View } from "react-native";
import { Tabs, router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { T } from "@/constants/colors";
import { L } from "@/constants/labels";
import { useAuthStore } from "@/stores/authStore";
import { scrollRegistry } from "@/lib/scrollRegistry";
import {
  useFabDial,
  FloatingFab,
  FabOverlay,
  SpeedDialOption,
} from "@/components/ui/FabSpeedDial";

// ── Static data ───────────────────────────────────────────────────────────────

const HOST_FAB_OPTIONS: SpeedDialOption[] = [
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

// ── Animated tab icon — springs to 1.15× scale when focused ──────────────────

function AnimatedTabIcon({
  name,
  size,
  color,
  focused,
}: {
  name: React.ComponentProps<typeof Feather>["name"];
  size: number;
  color: string;
  focused: boolean;
}) {
  const scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    Animated.spring(scale, {
      toValue: focused ? 1.18 : 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 5,
    }).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }] }}>
      <Feather name={name} size={size} color={color} />
    </Animated.View>
  );
}

// ── Screen options ────────────────────────────────────────────────────────────

function useScreenOptions() {
  const insets = useSafeAreaInsets();
  return {
    headerShown: false,
    tabBarActiveTintColor: T.primary,
    tabBarInactiveTintColor: T.textMuted,
    tabBarStyle: {
      backgroundColor: T.surface1,
      borderTopWidth: 0,
      height: 64,
      marginHorizontal: 16,
      marginBottom: Math.max(insets.bottom, 12),
      borderRadius: 24,
      elevation: 14,
      shadowColor: "#3E1230",
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 20,
      paddingBottom: 0,
    },
    tabBarLabelStyle: { fontSize: 11, fontWeight: "600" as const, fontFamily: "Inter_600SemiBold" },
    tabBarItemStyle: { paddingVertical: 4 },
  } as const;
}

// ── Tab icon factories ────────────────────────────────────────────────────────

const HOME_OPT = {
  title: L.TAB_HOME,
  tabBarIcon: ({ color, size, focused }: any) =>
    <AnimatedTabIcon name="home" size={size} color={color} focused={focused} />,
};
const EXPLORE_OPT = {
  title: L.TAB_EXPLORE,
  tabBarIcon: ({ color, size, focused }: any) =>
    <AnimatedTabIcon name="compass" size={size} color={color} focused={focused} />,
};
const SPACE_OPT = {
  title: L.TAB_SPACE,
  tabBarIcon: ({ color, size, focused }: any) =>
    <AnimatedTabIcon name="layers" size={size} color={color} focused={focused} />,
};
const PROFILE_OPT = {
  title: "Profile",
  tabBarIcon: ({ color, size, focused }: any) =>
    <AnimatedTabIcon name="user" size={size} color={color} focused={focused} />,
};
const HIDDEN = { href: null } as const;

const POST_SPACER = () => <View style={{ flex: 1 }} pointerEvents="none" />;
const POST_OPT = {
  title: "",
  tabBarLabel: () => null,
  tabBarButton: POST_SPACER,
};

// ── Scroll-to-top listeners ───────────────────────────────────────────────────

function makeScrollListener(screenName: string) {
  return ({ navigation }: { navigation: any }) => ({
    tabPress: () => {
      if (navigation.isFocused()) {
        scrollRegistry.scrollToTop(screenName);
      }
    },
  });
}

// ── Runner tabs ───────────────────────────────────────────────────────────────

const RunnerTabsNavigator = memo(function RunnerTabsNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="home"        options={HOME_OPT}    listeners={makeScrollListener("home")} />
      <Tabs.Screen name="explore"     options={EXPLORE_OPT} />
      <Tabs.Screen name="space"       options={SPACE_OPT}   listeners={makeScrollListener("space")} />
      <Tabs.Screen name="profile"     options={PROFILE_OPT} listeners={makeScrollListener("profile")} />
      {/* Routes below stay reachable via router.push but are not in the bar. */}
      <Tabs.Screen name="search"      options={HIDDEN} />
      <Tabs.Screen name="arena"       options={HIDDEN} />
      <Tabs.Screen name="post"        options={HIDDEN} />
      <Tabs.Screen name="chat"        options={HIDDEN} />
      <Tabs.Screen name="personality" options={HIDDEN} />
    </Tabs>
  );
});

// ── Host tabs ─────────────────────────────────────────────────────────────────

const HostTabsNavigator = memo(function HostTabsNavigator() {
  const screenOptions = useScreenOptions();
  return (
    <Tabs screenOptions={screenOptions}>
      <Tabs.Screen name="home"        options={HOME_OPT}    listeners={makeScrollListener("home")} />
      <Tabs.Screen name="explore"     options={EXPLORE_OPT} />
      <Tabs.Screen name="post"        options={POST_OPT} />
      <Tabs.Screen name="space"       options={SPACE_OPT}   listeners={makeScrollListener("space")} />
      <Tabs.Screen name="profile"     options={PROFILE_OPT} listeners={makeScrollListener("profile")} />
      <Tabs.Screen name="arena"       options={HIDDEN} />
      <Tabs.Screen name="chat"        options={HIDDEN} />
      <Tabs.Screen name="search"      options={HIDDEN} />
      <Tabs.Screen name="personality" options={HIDDEN} />
    </Tabs>
  );
});

// ── Layout ────────────────────────────────────────────────────────────────────

const SHOW_HOST_ROLE = false;

export default function TabsLayout() {
  const activeRole = useAuthStore((s) => s.activeRole);
  const isHost = SHOW_HOST_ROLE && activeRole === "host";

  const dial = useFabDial();

  const toggleRef = useRef(dial.toggle);
  toggleRef.current = dial.toggle;
  const stablePress = useCallback(() => toggleRef.current(), []);

  return (
    <View style={{ flex: 1 }}>
      {isHost ? <HostTabsNavigator /> : <RunnerTabsNavigator />}

      {isHost && (
        <>
          <FloatingFab onPress={stablePress} rotation={dial.rotation} />
          <FabOverlay dial={dial} options={HOST_FAB_OPTIONS} />
        </>
      )}
    </View>
  );
}
