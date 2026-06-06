import { create } from "zustand";
import { supabase } from "@/lib/supabase";
import { matchGigs, MatchGigsParams } from "@/lib/api/gigs";
import {
  createEvent as apiCreateEvent,
  addJobToEvent as apiAddJobToEvent,
  getMyEvents,
  EventCreatePayload,
  JobInEventCreate,
} from "@/lib/api/events";
import { Gig, GigCategory, MyEventSummary, EventResponse } from "@/types/database";

interface GigFilters {
  category?: GigCategory;
  city?: string;
  minPay?: number;
  maxPay?: number;
}

const APPLICATIONS_TTL = 60 * 1000;   // 1 min — statuses can change quickly
const POSTED_TTL      = 2 * 60 * 1000; // 2 min — posted gigs/events change less often

interface GigState {
  gigs: Gig[];
  myPostedGigs: Gig[];        // standalone gigs (event_id IS NULL)
  myPostedEvents: MyEventSummary[];
  myApplications: Array<{ gig: Gig; status: string }>;
  isLoading: boolean;
  isFetchingMore: boolean;    // Background fetch indicator
  hasMore: boolean;           // More gigs available from backend
  error: string | null;
  filters: GigFilters;
  seenGigIds: Set<string>;    // Track all gig IDs shown to user
  posterScores: Record<string, number>; // gigId → poster's momentum score
  _applicationsFetchedAt: number;
  _postedFetchedAt: number;

  // Actions
  fetchGigs: (filters?: GigFilters, location?: MatchGigsParams) => Promise<void>;
  fetchMoreGigs: (location?: MatchGigsParams) => Promise<void>; // NEW: Fetch next batch
  fetchMyPostedGigs: () => Promise<void>;
  fetchMyPostedEvents: () => Promise<void>;
  fetchMyApplications: () => Promise<void>;
  getGig: (id: string) => Promise<Gig | null>;
  createGig: (gig: Partial<Gig>) => Promise<{ data: Gig | null; error: string | null }>;
  createEvent: (payload: EventCreatePayload) => Promise<{ data: EventResponse | null; error: string | null }>;
  addJobToEvent: (eventId: string, job: JobInEventCreate) => Promise<{ error: string | null }>;
  applyToGig: (gigId: string, gig?: Gig, message?: string) => Promise<{ error: string | null }>;
  setFilters: (filters: GigFilters) => void;
}

export const useGigStore = create<GigState>((set, get) => ({
  gigs: [],
  myPostedGigs: [],
  _applicationsFetchedAt: 0,
  _postedFetchedAt: 0,
  myPostedEvents: [],
  myApplications: [],
  isLoading: false,
  isFetchingMore: false,
  hasMore: true,
  error: null,
  filters: {},
  seenGigIds: new Set(),
  posterScores: {},

  fetchGigs: async (filters?: GigFilters, location?: MatchGigsParams) => {
    set({ isLoading: true, error: null, seenGigIds: new Set() });

    try {
      // Step 1: Get INITIAL batch (20 gigs) from FastAPI matching algorithm
      const matchResult = await matchGigs({
        ...location,
        limit: 20,
        offset: 0,
        excluded_ids: [], // Fresh start
      });

      const matchedGigs = matchResult.data?.gigs ?? [];
      const gigIds: string[] = matchedGigs.map((g) => g.gig_id);
      const hasMore = matchResult.data?.has_more ?? false;

      // Build posterScores map: gigId → poster momentum score
      const posterScores: Record<string, number> = {};
      for (const mg of matchedGigs) {
        if (mg.poster_score != null) {
          posterScores[mg.gig_id] = mg.poster_score;
        }
      }

      // Step 2: Fetch full gig data from Supabase
      let query = supabase.from("gigs").select("*");

      if (gigIds.length > 0) {
        query = query.in("id", gigIds);
      } else {
        // FastAPI returned nothing — fall back to recency
        const today = new Date().toISOString().split("T")[0];
        query = query
          .eq("status", "open")
          .gte("event_date", today)
          .order("momentum_boost", { ascending: false })
          .order("event_date", { ascending: true })
          .limit(20);
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

      // Track all seen IDs
      const seenGigIds = new Set(gigs.map((g) => g.id));

      set({ gigs, seenGigIds, hasMore, posterScores, isLoading: false });
    } catch {
      set({ error: "Failed to fetch gigs", isLoading: false });
    }
  },

  fetchMoreGigs: async (location?: MatchGigsParams) => {
    const { isFetchingMore, hasMore, seenGigIds, gigs } = get();

    // Prevent duplicate fetches
    if (isFetchingMore || !hasMore) return;

    set({ isFetchingMore: true, error: null });

    try {
      // Fetch NEXT batch (10 gigs) excluding already-seen IDs
      const matchResult = await matchGigs({
        ...location,
        limit: 10,
        offset: 0, // Always 0 because we're using exclusion list
        excluded_ids: Array.from(seenGigIds),
      });

      const matchedGigs = matchResult.data?.gigs ?? [];
      const gigIds: string[] = matchedGigs.map((g) => g.gig_id);
      const hasMore = matchResult.data?.has_more ?? false;

      // Collect new poster scores
      const newPosterScores: Record<string, number> = {};
      for (const mg of matchedGigs) {
        if (mg.poster_score != null) {
          newPosterScores[mg.gig_id] = mg.poster_score;
        }
      }

      if (gigIds.length === 0) {
        set({ hasMore: false, isFetchingMore: false });
        return;
      }

      // Fetch full gig data from Supabase
      const { data, error } = await supabase
        .from("gigs")
        .select("*")
        .in("id", gigIds);

      if (error) {
        set({ error: error.message, isFetchingMore: false });
        return;
      }

      // Re-sort to match FastAPI ranking order
      const newGigs =
        gigIds
          .map((id) => data?.find((g) => g.id === id))
          .filter(Boolean) as Gig[];

      // Append new gigs and update seen IDs
      const updatedGigs = [...gigs, ...newGigs];
      const updatedSeenIds = new Set([...seenGigIds, ...newGigs.map((g) => g.id)]);

      // Apply sliding window: Keep max 50 cards in memory
      const MAX_IN_MEMORY = 50;
      const finalGigs =
        updatedGigs.length > MAX_IN_MEMORY
          ? updatedGigs.slice(-MAX_IN_MEMORY) // Keep most recent 50
          : updatedGigs;

      set((state) => ({
        gigs: finalGigs,
        seenGigIds: updatedSeenIds,
        hasMore,
        posterScores: { ...state.posterScores, ...newPosterScores },
        isFetchingMore: false,
      }));
    } catch {
      set({ error: "Failed to fetch more gigs", isFetchingMore: false });
    }
  },

  fetchMyPostedGigs: async () => {
    const { _postedFetchedAt, myPostedGigs } = get();
    const now = Date.now();
    if (myPostedGigs.length > 0 && (now - _postedFetchedAt) < POSTED_TTL) return;

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from("gigs")
      .select("*")
      .eq("poster_id", user.id)
      .is("event_id", null)  // standalone gigs only
      .order("created_at", { ascending: false });

    if (!error && data) {
      set({ myPostedGigs: data, _postedFetchedAt: Date.now() });
    }
  },

  fetchMyPostedEvents: async () => {
    const { _postedFetchedAt, myPostedEvents } = get();
    const now = Date.now();
    if (myPostedEvents.length > 0 && (now - _postedFetchedAt) < POSTED_TTL) return;

    const result = await getMyEvents();
    if (result.data) {
      set({ myPostedEvents: result.data, _postedFetchedAt: Date.now() });
    }
  },

  fetchMyApplications: async () => {
    const { myApplications, _applicationsFetchedAt } = get();
    const now = Date.now();
    if (myApplications.length > 0 && (now - _applicationsFetchedAt) < APPLICATIONS_TTL) return;

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
      set({ myApplications: applications, _applicationsFetchedAt: Date.now() });
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

    // Bust TTL then refresh so we always see the new gig immediately
    set({ _postedFetchedAt: 0 });
    await get().fetchMyPostedGigs();

    return { data, error: null };
  },

  createEvent: async (payload: EventCreatePayload) => {
    const result = await apiCreateEvent(payload);
    if (result.data) {
      await get().fetchMyPostedEvents();
    }
    return result;
  },

  addJobToEvent: async (eventId: string, job: JobInEventCreate) => {
    const result = await apiAddJobToEvent(eventId, job);
    if (result.data) {
      await get().fetchMyPostedEvents();
    }
    return { error: result.error };
  },

  applyToGig: async (gigId: string, gig?: Gig, message?: string) => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "Not authenticated" };

    // Optimistic update — card is already gone from the deck, mark as applied instantly.
    // Also bust the TTL so the next fetch always re-validates.
    if (gig) {
      set((state) => ({
        myApplications: [...state.myApplications, { gig, status: "pending" }],
        _applicationsFetchedAt: 0,
      }));
    }

    const { error } = await supabase
      .from("gig_applications")
      .insert({
        gig_id: gigId,
        applicant_id: user.id,
        message,
      });

    if (error) {
      // Rollback optimistic update on failure
      if (gig) {
        set((state) => ({
          myApplications: state.myApplications.filter((a) => a.gig.id !== gigId),
        }));
      }
      return { error: error.message };
    }

    return { error: null };
  },

  setFilters: (filters: GigFilters) => {
    set({ filters });
    get().fetchGigs(filters);
  },
}));
