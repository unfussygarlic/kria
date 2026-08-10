"use client";

/**
 * HostQueueProvider — single-source-of-truth for the host's gig summaries.
 *
 * Fetches `GET /gigs/mine` once when the dashboard mounts, then re-polls
 * every 90 seconds so the bell / sidebar dots stay reasonably fresh without
 * a socket. Also re-fetches whenever the tab regains focus (host comes back
 * from another tab after taking action on Pocket).
 *
 * Consumers:
 *   - Sidebar     — red dot next to Applications / Gigs when queue non-empty
 *   - TopBar bell — count of items needing attention + dropdown preview
 *   - Command palette — searchable list of gigs
 *
 * We intentionally don't pull the full Gig[] here — the /gigs list page
 * still hits Supabase directly for the fuller shape. This provider is only
 * for the lightweight summary used by the nav shell.
 */

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { listMyGigs, type PostedGigSummary } from "@/lib/api/gigs";
import { computeWorkQueue, type WorkQueue } from "@/lib/urgency";

interface HostQueueCtx {
  gigs: PostedGigSummary[];
  queue: WorkQueue;
  loading: boolean;
  refresh: () => Promise<void>;
}

const EMPTY_QUEUE: WorkQueue = {
  urgent: [], expired: [], pending: [], upcoming: [], totalPendingApplications: 0,
};

const Ctx = createContext<HostQueueCtx>({
  gigs: [],
  queue: EMPTY_QUEUE,
  loading: true,
  refresh: async () => {},
});

const REFRESH_MS = 90_000;

export function HostQueueProvider({ children }: { children: React.ReactNode }) {
  const [gigs, setGigs] = useState<PostedGigSummary[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    const res = await listMyGigs();
    if (res.data) setGigs(res.data.items);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
    const id = window.setInterval(refresh, REFRESH_MS);
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => {
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [refresh]);

  const queue = useMemo(() => computeWorkQueue(gigs), [gigs]);

  return (
    <Ctx.Provider value={{ gigs, queue, loading, refresh }}>
      {children}
    </Ctx.Provider>
  );
}

export function useHostQueue() {
  return useContext(Ctx);
}
