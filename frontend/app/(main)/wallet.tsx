import { useEffect } from "react";
import { View, Text, StyleSheet, FlatList, Pressable } from "react-native";
import { Stack } from "expo-router";
import { Feather } from "@expo/vector-icons";
import { useWalletStore } from "@/stores/walletStore";
import { T } from "@/constants/colors";

export default function WalletScreen() {
  const { wallet, transactions, fetchWallet, fetchTransactions } =
    useWalletStore();

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
      <Stack.Screen
        options={{
          headerShown: true,
          headerTitle: "Momentum Wallet",
        }}
      />
      <View style={styles.container}>
        {/* Balance Card */}
        <View style={styles.balanceCard}>
          <Feather name="zap" size={32} color={T.momentum} />
          <Text style={styles.balanceLabel}>Current Balance</Text>
          <Text style={styles.balanceAmount}>{wallet?.balance || 0}</Text>
          <View style={styles.lifetimeStats}>
            <View style={styles.lifetimeStat}>
              <Text style={styles.lifetimeValue}>
                +{wallet?.lifetime_earned || 0}
              </Text>
              <Text style={styles.lifetimeLabel}>Earned</Text>
            </View>
            <View style={styles.lifetimeDivider} />
            <View style={styles.lifetimeStat}>
              <Text style={styles.lifetimeValue}>
                -{wallet?.lifetime_spent || 0}
              </Text>
              <Text style={styles.lifetimeLabel}>Spent</Text>
            </View>
          </View>
        </View>

        {/* Actions */}
        <View style={styles.actions}>
          <Pressable style={styles.actionButton}>
            <Feather name="trending-up" size={20} color={T.primary} />
            <Text style={styles.actionText}>How to Earn</Text>
          </Pressable>
          <Pressable style={styles.actionButton}>
            <Feather name="gift" size={20} color={T.secondary} />
            <Text style={styles.actionText}>Spend Momentum</Text>
          </Pressable>
        </View>

        {/* Transaction History */}
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>History</Text>
        </View>

        <FlatList
          data={transactions}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <View style={styles.transaction}>
              <View
                style={[
                  styles.transactionIcon,
                  {
                    backgroundColor:
                      item.amount >= 0
                        ? "rgba(22, 163, 74, 0.1)"
                        : "rgba(220, 38, 38, 0.1)",
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
                <Text style={styles.transactionDesc}>
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
          contentContainerStyle={styles.transactionList}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Feather name="inbox" size={48} color={T.textMuted} />
              <Text style={styles.emptyText}>No transactions yet</Text>
              <Text style={styles.emptySubtext}>
                Complete gigs to earn momentum
              </Text>
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
  balanceCard: {
    backgroundColor: T.momentumLight,
    margin: 16,
    padding: 24,
    borderRadius: 16,
    alignItems: "center",
  },
  balanceLabel: {
    fontSize: 14,
    color: T.textSub,
    marginTop: 8,
  },
  balanceAmount: {
    fontSize: 48,
    fontWeight: "bold",
    color: T.momentum,
    marginTop: 4,
  },
  lifetimeStats: {
    flexDirection: "row",
    marginTop: 20,
    gap: 32,
  },
  lifetimeStat: {
    alignItems: "center",
  },
  lifetimeValue: {
    fontSize: 18,
    fontWeight: "600",
    color: T.text,
  },
  lifetimeLabel: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  lifetimeDivider: {
    width: 1,
    backgroundColor: T.border,
  },
  actions: {
    flexDirection: "row",
    paddingHorizontal: 16,
    gap: 12,
    marginBottom: 16,
  },
  actionButton: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: T.surface,
    paddingVertical: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: T.border,
  },
  actionText: {
    fontSize: 14,
    fontWeight: "600",
    color: T.text,
  },
  historyHeader: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
  },
  historyTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: T.text,
  },
  transactionList: {
    paddingBottom: 32,
  },
  transaction: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: T.surface,
    borderBottomWidth: 1,
    borderBottomColor: T.border,
    gap: 12,
  },
  transactionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  transactionInfo: {
    flex: 1,
  },
  transactionDesc: {
    fontSize: 14,
    color: T.text,
    textTransform: "capitalize",
  },
  transactionDate: {
    fontSize: 12,
    color: T.textMuted,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: "600",
  },
  empty: {
    alignItems: "center",
    paddingVertical: 48,
    gap: 8,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: "600",
    color: T.textSub,
  },
  emptySubtext: {
    fontSize: 14,
    color: T.textMuted,
  },
});
