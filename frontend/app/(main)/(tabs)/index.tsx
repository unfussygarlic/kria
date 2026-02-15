import { useEffect, useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  RefreshControl,
} from "react-native";
import { router } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useAuthStore } from "@/stores/authStore";
import { useGigStore } from "@/stores/gigStore";
import { useWalletStore } from "@/stores/walletStore";
import { Colors } from "@/constants/colors";
import { GigCard } from "@/components/gig/GigCard";

type Tab = "available" | "my_gigs";

export default function HomeScreen() {
  const [activeTab, setActiveTab] = useState<Tab>("available");
  const [refreshing, setRefreshing] = useState(false);

  const profile = useAuthStore((s) => s.profile);
  const { gigs, myPostedGigs, myApplications, fetchGigs, fetchMyPostedGigs, fetchMyApplications } =
    useGigStore();
  const { wallet, fetchWallet } = useWalletStore();

  useEffect(() => {
    fetchGigs();
    fetchMyPostedGigs();
    fetchMyApplications();
    fetchWallet();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await Promise.all([
      fetchGigs(),
      fetchMyPostedGigs(),
      fetchMyApplications(),
      fetchWallet(),
    ]);
    setRefreshing(false);
  };

  const displayData = activeTab === "available" ? gigs : myPostedGigs;

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.greeting}>Hello, {profile?.display_name}</Text>
          <Pressable
            style={styles.momentumBadge}
            onPress={() => router.push("/(main)/wallet")}
          >
            <Feather name="zap" size={14} color={Colors.momentum.DEFAULT} />
            <Text style={styles.momentumText}>{wallet?.balance || 0}</Text>
          </Pressable>
        </View>
        <Pressable
          style={styles.postButton}
          onPress={() => router.push("/(main)/post")}
        >
          <Feather name="plus" size={20} color={Colors.text.inverse} />
          <Text style={styles.postButtonText}>Post Gig</Text>
        </Pressable>
      </View>

      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable
          style={[styles.tab, activeTab === "available" && styles.tabActive]}
          onPress={() => setActiveTab("available")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "available" && styles.tabTextActive,
            ]}
          >
            Available Gigs
          </Text>
        </Pressable>
        <Pressable
          style={[styles.tab, activeTab === "my_gigs" && styles.tabActive]}
          onPress={() => setActiveTab("my_gigs")}
        >
          <Text
            style={[
              styles.tabText,
              activeTab === "my_gigs" && styles.tabTextActive,
            ]}
          >
            My Posted Gigs
          </Text>
        </Pressable>
      </View>

      {/* Gig List */}
      <FlatList
        data={displayData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <GigCard
            gig={item}
            onPress={() => router.push(`/(main)/gig/${item.id}`)}
          />
        )}
        contentContainerStyle={styles.list}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.empty}>
            <Feather name="inbox" size={48} color={Colors.text.muted} />
            <Text style={styles.emptyText}>
              {activeTab === "available"
                ? "No gigs available right now"
                : "You haven't posted any gigs yet"}
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: Colors.surface,
  },
  greeting: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.text.primary,
  },
  momentumBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 4,
  },
  momentumText: {
    fontSize: 14,
    fontWeight: "600",
    color: Colors.momentum.DEFAULT,
  },
  postButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: Colors.primary.DEFAULT,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
  },
  postButtonText: {
    color: Colors.text.inverse,
    fontWeight: "600",
    fontSize: 14,
  },
  tabs: {
    flexDirection: "row",
    backgroundColor: Colors.surface,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  tab: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginRight: 8,
  },
  tabActive: {
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary.DEFAULT,
  },
  tabText: {
    fontSize: 14,
    color: Colors.text.secondary,
  },
  tabTextActive: {
    color: Colors.primary.DEFAULT,
    fontWeight: "600",
  },
  list: {
    padding: 16,
    gap: 12,
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 12,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.text.muted,
    textAlign: "center",
  },
});
