"use client";

/**
 * CommandPalette — ⌘K / Ctrl+K popup for jumping straight to a gig or an
 * action. Kept intentionally small and un-fuzzy: substring match on gig
 * title/city + a hardcoded actions list. If we outgrow that, swap in cmdk
 * (react package) — not worth the bundle bump yet for ~50 gigs and 5 actions.
 *
 * Keyboard:
 *   ↑ / ↓ move highlight
 *   Enter selects
 *   Esc closes
 *
 * Open from anywhere: mount `<CommandPalette />` in TopBar; it listens on
 * `document` for keydown itself.
 */

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Search, Plus, Briefcase, Calendar, Inbox, BarChart2, Zap,
  ArrowRight, HelpCircle, User, LogOut,
} from "lucide-react";
import { useHostQueue } from "./HostQueueProvider";
import { supabase } from "@/lib/supabase";

// ── Action definitions ──────────────────────────────────────────────────────

interface Action {
  id: string;
  label: string;
  hint?: string;
  Icon: React.ElementType;
  run: (router: ReturnType<typeof useRouter>) => void | Promise<void>;
  /** Search tokens — matched against query substring. */
  tokens: string[];
}

const ACTIONS: Action[] = [
  { id: "new-gig",    label: "Post a gig",           hint: "Create",           Icon: Plus,       run: (r) => r.push("/gigs/new"),      tokens: ["post", "new", "gig", "create"] },
  { id: "new-event",  label: "Post an event",        hint: "Create",           Icon: Calendar,   run: (r) => r.push("/events/new"),    tokens: ["post", "new", "event", "create"] },
  { id: "gigs",       label: "All gigs",             hint: "Browse",           Icon: Briefcase,  run: (r) => r.push("/gigs"),          tokens: ["gigs", "list", "all"] },
  { id: "events",     label: "All events",           hint: "Browse",           Icon: Calendar,   run: (r) => r.push("/events"),        tokens: ["events", "list"] },
  { id: "apps",       label: "Applications inbox",   hint: "Review",           Icon: Inbox,      run: (r) => r.push("/applications"),  tokens: ["applications", "applicants", "inbox", "review"] },
  { id: "analytics",  label: "Analytics",            hint: "Metrics",          Icon: BarChart2,  run: (r) => r.push("/analytics"),     tokens: ["analytics", "metrics", "stats", "chart"] },
  { id: "sub",        label: "Subscription",         hint: "Billing",          Icon: Zap,        run: (r) => r.push("/subscription"),  tokens: ["subscription", "billing", "plan", "trial"] },
  { id: "profile",    label: "Profile",              hint: "Settings",         Icon: User,       run: (r) => r.push("/profile"),       tokens: ["profile", "account", "me"] },
  { id: "support",    label: "Help & Support",       hint: "Help",             Icon: HelpCircle, run: (r) => r.push("/support"),       tokens: ["help", "support", "contact"] },
  { id: "signout",    label: "Sign out",             hint: "Session",          Icon: LogOut,
    run: async (r) => { await supabase.auth.signOut(); r.replace("/login"); }, tokens: ["signout", "logout", "quit", "exit"] },
];

// ── Palette ─────────────────────────────────────────────────────────────────

type Result =
  | { kind: "action"; action: Action }
  | { kind: "gig"; id: string; title: string; city: string };

export function CommandPalette() {
  const router = useRouter();
  const { gigs } = useHostQueue();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [highlight, setHighlight] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // ── Global open shortcut (⌘K / Ctrl+K) + custom event ─────────────────
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape" && open) setOpen(false);
    };
    // Fired by the TopBar's search-shaped button so mouse users can open it too.
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    document.addEventListener("kria:open-palette", onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("kria:open-palette", onOpen);
    };
  }, [open]);

  // Focus input & reset state on open.
  useEffect(() => {
    if (!open) return;
    setQuery("");
    setHighlight(0);
    const t = window.setTimeout(() => inputRef.current?.focus(), 30);
    return () => window.clearTimeout(t);
  }, [open]);

  // ── Search ──────────────────────────────────────────────────────────────
  const results: Result[] = useMemo(() => {
    const q = query.trim().toLowerCase();
    const matchedGigs: Result[] = gigs
      .filter((g) => !q || g.title.toLowerCase().includes(q) || g.city.toLowerCase().includes(q))
      .slice(0, 8)
      .map((g) => ({ kind: "gig" as const, id: g.id, title: g.title, city: g.city }));

    const matchedActions: Result[] = ACTIONS
      .filter((a) => !q || a.label.toLowerCase().includes(q) || a.tokens.some((t) => t.includes(q)))
      .map((a) => ({ kind: "action" as const, action: a }));

    // Gigs first when the query looks like text (people usually search a name);
    // actions first when the query is empty (nothing to search yet).
    return q ? [...matchedGigs, ...matchedActions] : [...matchedActions, ...matchedGigs];
  }, [query, gigs]);

  // Clamp highlight when results shrink.
  useEffect(() => {
    if (highlight >= results.length) setHighlight(Math.max(0, results.length - 1));
  }, [results.length, highlight]);

  const runResult = useCallback(async (r: Result) => {
    setOpen(false);
    if (r.kind === "action") await r.action.run(router);
    else router.push(`/gigs/${r.id}`);
  }, [router]);

  const onListKey = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") { e.preventDefault(); setHighlight((h) => Math.min(results.length - 1, h + 1)); }
    else if (e.key === "ArrowUp") { e.preventDefault(); setHighlight((h) => Math.max(0, h - 1)); }
    else if (e.key === "Enter") { e.preventDefault(); if (results[highlight]) runResult(results[highlight]!); }
  }, [results, highlight, runResult]);

  // Scroll highlighted row into view.
  useEffect(() => {
    if (!listRef.current) return;
    const row = listRef.current.querySelector<HTMLElement>(`[data-hl="${highlight}"]`);
    row?.scrollIntoView({ block: "nearest" });
  }, [highlight]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4"
      style={{
        // Much lighter than the old rgba(0,0,0,0.55): a 55%-black backdrop
        // reads as a heavy black bar above the palette (which starts at
        // 15vh). Modern palettes (Raycast / Linear / cmdk) lean on a soft
        // tint + backdrop blur so the underlying UI stays legible.
        backgroundColor: "rgba(20,20,17,0.28)",
        backdropFilter: "blur(6px) saturate(120%)",
        WebkitBackdropFilter: "blur(6px) saturate(120%)",
      }}
      onClick={() => setOpen(false)}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onListKey}
        className="w-full max-w-lg rounded-2xl overflow-hidden shadow-2xl"
        style={{
          backgroundColor: "var(--sidebar-bg)",
          border: "1px solid var(--border-color)",
        }}
      >
        {/* Input */}
        <div
          className="flex items-center gap-3 px-4 py-3 border-b"
          style={{ borderColor: "var(--border-color)" }}
        >
          <Search size={16} className="text-text-muted flex-shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search gigs, jump to a page…"
            className="flex-1 bg-transparent outline-none text-sm text-text placeholder:text-text-muted"
            // Every autofill / password-manager / mobile tap-highlight source
            // needs to be silenced explicitly, otherwise Chrome shows a
            // translucent "autofill" overlay on top of the input the moment
            // it gains focus (that's the "black translucent space" the user
            // was seeing). Combining browser attributes with vendor hints
            // (1Password / LastPass / Bitwarden) makes this reliable across
            // extensions too.
            type="text"
            role="combobox"
            aria-autocomplete="list"
            aria-expanded={results.length > 0}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
            name="palette-search"
            data-1p-ignore="true"
            data-lpignore="true"
            data-form-type="other"
            style={{ WebkitTapHighlightColor: "transparent" }}
          />
          <kbd
            className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1.5 py-0.5 rounded"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[50vh] overflow-y-auto py-1">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center text-xs text-text-muted">
              No matches for &ldquo;{query}&rdquo;
            </div>
          ) : (
            results.map((r, i) => {
              const active = i === highlight;
              const rowStyle = active
                ? { backgroundColor: "var(--hover-bg, color-mix(in srgb, var(--lime) 8%, transparent))" }
                : {};
              if (r.kind === "action") {
                const A = r.action;
                return (
                  <button
                    key={A.id}
                    data-hl={i}
                    onMouseEnter={() => setHighlight(i)}
                    onClick={() => runResult(r)}
                    style={rowStyle}
                    className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                  >
                    <A.Icon size={15} className={active ? "text-primary" : "text-text-muted"} />
                    <span className="text-sm text-text flex-1">{A.label}</span>
                    {A.hint && (
                      <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">{A.hint}</span>
                    )}
                    {active && <ArrowRight size={12} className="text-primary" />}
                  </button>
                );
              }
              // Gig row
              return (
                <button
                  key={r.id}
                  data-hl={i}
                  onMouseEnter={() => setHighlight(i)}
                  onClick={() => runResult(r)}
                  style={rowStyle}
                  className="w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors"
                >
                  <Briefcase size={15} className={active ? "text-primary" : "text-text-muted"} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-text truncate">{r.title}</p>
                    <p className="text-[10px] text-text-muted mt-0.5">{r.city}</p>
                  </div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Gig</span>
                  {active && <ArrowRight size={12} className="text-primary" />}
                </button>
              );
            })
          )}
        </div>

        {/* Footer hint */}
        <div
          className="flex items-center gap-4 px-4 py-2 text-[10px] text-text-muted border-t"
          style={{ borderColor: "var(--border-color)", backgroundColor: "var(--card-bg)" }}
        >
          <span className="flex items-center gap-1"><kbd className="font-bold">↑↓</kbd> navigate</span>
          <span className="flex items-center gap-1"><kbd className="font-bold">↵</kbd> open</span>
          <span className="ml-auto flex items-center gap-1"><kbd className="font-bold">⌘K</kbd> to toggle</span>
        </div>
      </div>
    </div>
  );
}
