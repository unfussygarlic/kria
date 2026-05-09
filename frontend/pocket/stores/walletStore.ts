import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { MomentumWallet } from "@/types/database";

interface MomentumTransaction {
  id: string;
  amount: number;
  type: string;
  description: string | null;
  created_at: string;
}

interface WalletState {
  wallet: MomentumWallet | null;
  transactions: MomentumTransaction[];
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchWallet: () => Promise<void>;
  fetchTransactions: (limit?: number) => Promise<void>;
}

export const useWalletStore = create<WalletState>((set) => ({
  wallet: null,
  transactions: [],
  isLoading: false,
  error: null,

  fetchWallet: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    set({ isLoading: true });

    const { data, error } = await supabase
      .from("momentum_wallets")
      .select("*")
      .eq("profile_id", user.id)
      .single();

    if (error) {
      set({ error: error.message, isLoading: false });
      return;
    }

    set({ wallet: data, isLoading: false });
  },

  fetchTransactions: async (limit = 20) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    // First get wallet id
    const { data: wallet } = await supabase
      .from("momentum_wallets")
      .select("id")
      .eq("profile_id", user.id)
      .single();

    if (!wallet) return;

    const { data, error } = await supabase
      .from("momentum_transactions")
      .select("*")
      .eq("wallet_id", wallet.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (!error && data) {
      set({ transactions: data });
    }
  },
}));
