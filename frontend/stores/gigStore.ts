import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { matchGigs, MatchGigsParams } from "@/lib/api/gigs";
import { Gig, GigCategory } from "@/types/database";

interface GigFilters {
  category?: GigCategory;
  city?: string;
  minPay?: number;
  maxPay?: number;
}

interface GigState {
  gigs: Gig[];
  myPostedGigs: Gig[];
  myApplications: Array<{ gig: Gig; status: string }>;
  isLoading: boolean;
  error: string | null;
  filters: GigFilters;

  // Actions
  fetchGigs: (filters?: GigFilters, location?: MatchGigsParams) => Promise<void>;
  fetchMyPostedGigs: () => Promise<void>;
  fetchMyApplications: () => Promise<void>;
  getGig: (id: string) => Promise<Gig | null>;
  createGig: (gig: Partial<Gig>) => Promise<{ data: Gig | null; error: string | null }>;
  applyToGig: (gigId: string, message?: string) => Promise<{ error: string | null }>;
  setFilters: (filters: GigFilters) => void;
}

export const useGigStore = create<GigState>((set, get) => ({
  gigs: [],
  myPostedGigs: [],
  myApplications: [],
  isLoading: false,
  error: null,
  filters: {},

  fetchGigs: async (filters?: GigFilters, location?: MatchGigsParams) => {
    set({ isLoading: true, error: null });

    try {
      // Step 1: Get ranked gig IDs from FastAPI matching algorithm
      const matchResult = await matchGigs({ ...location, limit: 50 });
      const gigIds: string[] =
        matchResult.data?.gigs.map((g) => g.gig_id) ?? [];

      // Step 2: Fetch full gig data from Supabase
      let query = supabase.from("gigs").select("*");

      if (gigIds.length > 0) {
        query = query.in("id", gigIds);
      } else {
        // FastAPI returned nothing (unreachable or empty) — fall back to recency
        const today = new Date().toISOString().split("T")[0];
        query = query
          .eq("status", "open")
          .gte("event_date", today)
          .order("momentum_boost", { ascending: false })
          .order("event_date", { ascending: true });
      }

      if (filters?.category) {
        query = query.eq("category", filters.category);
      }
      if (filters?.city) {
        query = query.eq("city", filters.city);
      }
      if (filters?.minPay !== undefined) {
        query = query.gte("pay_amount", filters.minPay);
      }
      if (filters?.maxPay !== undefined) {
        query = query.lte("pay_amount", filters.maxPay);
      }

      const { data, error } = await query;

      if (error) {
        set({ error: error.message, isLoading: false });
        return;
      }

      // Step 3: Re-sort to match FastAPI ranking order
      const gigs =
        gigIds.length > 0 && data
          ? (gigIds
              .map((id) => data.find((g) => g.id === id))
              .filter(Boolean) as Gig[])
          : (data ?? []);

      set({ gigs, isLoading: false });
    } catch {
      set({ error: "Failed to fetch gigs", isLoading: false });
    }
  },

  fetchMyPostedGigs: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("gigs")
      .select("*")
      .eq("poster_id", user.id)
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ myPostedGigs: data });
    }
  },

  fetchMyApplications: async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("gig_applications")
      .select(`
        status,
        gig:gigs(*)
      `)
      .eq("applicant_id", user.id)
      .order("applied_at", { ascending: false });

    if (!error && data) {
      const applications = data
        .filter((a) => a.gig)
        .map((a) => ({
          gig: a.gig as unknown as Gig,
          status: a.status,
        }));
      set({ myApplications: applications });
    }
  },

  getGig: async (id: string) => {
    const { data, error } = await supabase
      .from("gigs")
      .select("*")
      .eq("id", id)
      .single();

    if (error) return null;
    return data;
  },

  createGig: async (gig) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { data: null, error: "Not authenticated" };

    const { data, error } = await supabase
      .from("gigs")
      .insert({
        ...gig,
        poster_id: user.id,
        status: "open",
      })
      .select()
      .single();

    if (error) {
      return { data: null, error: error.message };
    }

    // Refresh my posted gigs
    await get().fetchMyPostedGigs();

    return { data, error: null };
  },

  applyToGig: async (gigId: string, message?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    const { error } = await supabase
      .from("gig_applications")
      .insert({
        gig_id: gigId,
        applicant_id: user.id,
        message,
      });

    if (error) {
      return { error: error.message };
    }

    // Refresh applications
    await get().fetchMyApplications();

    return { error: null };
  },

  setFilters: (filters: GigFilters) => {
    set({ filters });
    get().fetchGigs(filters);
  },
}));
