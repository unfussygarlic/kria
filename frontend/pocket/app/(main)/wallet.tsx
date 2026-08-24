/**
 * Wallet — Momentum balance + transaction history.
 *
 * Redesigned 2026-08-23: gradient balance hero, SHADOW cards for actions +
 * transactions, TYPE tokens, S/R spacing.
 */

import { useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useWalletStore } from "@/stores/walletStore";
import { T } from "@/constants/colors";
import { S, R, SHADOW, TYPE } from "@/constants/design";
import { rw } from "@/constants/responsive";

export default function WalletScreen() {
  const { wallet, transactions, fetchWallet, fetchTransactions } = useWalletStore();

  useEffect(() => {
    fetchWallet();
    fetchTransactions();
  }, []);

  const getTransactionIcon = (type: string) => {
    if (type.includes("completion")) return "check-circle";
    if (type.includes("bonus") || type.includes("rating")) return "star";
    if (type.includes("penalty")) return "alert-circle";
    if (type.includes("spend")) return "minus-circle";
    return "zap";
  };

  const getTransactionColor = (amount: number) => {
    return amount >= 0 ? T.success : T.error;
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, headerTitle: "Momentum Wallet" }} />
      <View style={styles.container}>
        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          ItemSeparatorComponent={() => <View style={{ height: S.xs }} />}
          ListHeaderComponent={
            <>
              {/* Balance hero */}
              <LinearGradient
                colors={T.gradAccent}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.balanceCard}
              >
                <Text style={styles.balanceEyebrow}>CURRENT BALANCE</Text>
                <View style={styles.balanceRow}>
                  <Feather name="zap" size={28} color="#FFFFFF" />
                  <Text style={styles.balanceAmount}>{wallet?.balance || 0}</Text>
                </View>
                <View style={styles.lifetimeStats}>
                  <View style={styles.lifetimeStat}>
                    <Text style={styles.lifetimeValue}>+{wallet?.lifetime_earned || 0}</Text>
                    <Text style={styles.lifetimeLabel}>Earned</Text>
                  </View>
                  <View style={styles.lifetimeDivider} />
                  <View style={styles.lifetimeStat}>
                    <Text style={styles.lifetimeValue}>-{wallet?.lifetime_spent || 0}</Text>
                    <Text style={styles.lifetimeLabel}>Spent</Text>
                  </View>
                </View>
              </LinearGradient>

              {/* Actions */}
              <View style={styles.actions}>
                <Pressable style={styles.actionButton}>
                  <Feather name="trending-up" size={20} color={T.primary} />
                  <Text style={styles.actionText}>How to earn</Text>
                </Pressable>
                <Pressable style={styles.actionButton}>
                  <Feather name="gift" size={20} color={T.secondary} />
                  <Text style={styles.actionText}>Spend</Text>
                </Pressable>
              </View>

              <Text style={styles.historyTitle}>HISTORY</Text>
            </>
          }
          renderItem={({ item }) => (
            <View style={styles.transaction}>
              <View
                style={[
                  styles.transactionIcon,
                  {
                    backgroundColor:
                      item.amount >= 0 ? T.success + "22" : T.error + "22",
                  },
                ]}
              >
                <Feather
                  name={getTransactionIcon(item.type) as any}
                  size={18}
                  color={getTransactionColor(item.amount)}
                />
              </View>
              <View style={styles.transactionInfo}>
                <Text style={styles.transactionDesc} numberOfLines={1}>
                  {item.description || item.type.replace(/_/g, " ")}
                </Text>
                <Text style={styles.transactionDate}>
                  {new Date(item.created_at).toLocaleDateString("en-IN", {
                    day: "numeric",
                    month: "short",
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </Text>
              </View>
              <Text
                style={[
                  styles.transactionAmount,
                  { color: getTransactionColor(item.amount) },
                ]}
              >
                {item.amount >= 0 ? "+" : ""}
                {item.amount}
              </Text>
            </View>
          )}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={48} color={T.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>Complete gigs to earn Momentum</Text>
            </View>
          }
        />
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: T.bg,
  },
  list: {
    padding: S.md,
    paddingBottom: S.hero,
    gap: S.xs,
  },

  balanceCard: {
    padding: S.xl,
    borderRadius: R.hero,
    alignItems: "center",
    marginBottom: S.md,
    ...SHADOW.lg,
  },
  balanceEyebrow: {
    ...TYPE.label,
    color: "rgba(255,255,255,0.9)",
  },
  balanceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: S.xs,
    marginTop: S.xs,
  },
  balanceAmount: {
    ...TYPE.display,
    fontSize: 52,
    color: "#FFFFFF",
  },
  lifetimeStats: {
    flexDirection: "row",
    marginTop: S.md,
    gap: S.xxl,
  },
  lifetimeStat: {
    alignItems: "center",
  },
  lifetimeValue: {
    ...TYPE.title3,
    color: "#FFFFFF",
  },
  lifetimeLabel: {
    ...TYPE.caption,
    color: "rgba(255,255,255,0.75)",
    marginTop: 2,
  },
  lifetimeDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.28)",
  },

  actions: {
    flexDirection: "row",
    gap: S.sm,
    marginBottom: S.md,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: S.xs,
    backgroundColor: T.surface1,
    paddingVertical: S.sm,
    borderRadius: R.button,
    ...SHADOW.card,
  },
  actionText: {
    ...TYPE.body,
    fontFamily: "Inter_600SemiBold",
    fontWeight: "600",
    color: T.text,
  },

  historyTitle: {
    ...TYPE.label,
    color: T.textMuted,
    marginTop: S.xs,
    marginBottom: S.xs,
    marginLeft: 4,
  },

  transaction: {
    flexDirection: "row",
    alignItems: "center",
    padding: S.sm,
    backgroundColor: T.surface1,
    borderRadius: R.card,
    gap: S.sm,
    ...SHADOW.card,
  },
  transactionIcon: {
    width: rw(40),
    height: rw(40),
    borderRadius: rw(20),
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    ...TYPE.body,
    color: T.text,
    textTransform: "capitalize",
  },
  transactionDate: {
    ...TYPE.caption,
    color: T.textMuted,
    marginTop: 2,
  },
  transactionAmount: {
    ...TYPE.title3,
  },
  empty: {
    alignItems: "center",
    paddingVertical: S.hero,
    gap: S.xs,
  },
  emptyText: {
    ...TYPE.title3,
    color: T.textSub,
  },
  emptySubtext: {
    ...TYPE.body,
    color: T.textMuted,
  },
});
