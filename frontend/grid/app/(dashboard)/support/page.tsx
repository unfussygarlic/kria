"use client";

import { useState } from "react";
import { ChevronDown, CheckCircle2, Send } from "lucide-react";
import { submitSupportQuery } from "@/lib/api/support";
import { createClient } from "@/lib/supabase/client";

// ── FAQ data ──────────────────────────────────────────────────────────────────

const FAQS = [
  {
    section: "Getting Started",
    items: [
      {
        q: "What is Kria Grid?",
        a: "Kria Grid is the Host dashboard where you post gigs, manage applicants, track check-ins via OTP, and monitor your overall performance as an employer on the Kria platform.",
      },
      {
        q: "How do I post my first gig?",
        a: "Go to Gigs → click 'Post a Gig'. Fill in the role, date, location, pay, and required headcount. Once published, Runners matching your criteria can apply.",
      },
      {
        q: "What is the difference between a Runner and a Host?",
        a: "Runners are gig workers who apply for and complete jobs. Hosts (you) are businesses or individuals who post gigs and hire Runners.",
      },
    ],
  },
  {
    section: "Gigs & Applications",
    items: [
      {
        q: "How does the OTP check-in system work?",
        a: "When a Runner arrives for their shift, they enter a one-time code shown on your Grid dashboard. This timestamps their arrival and starts the check-in flow — no manual tracking needed.",
      },
      {
        q: "Can I pause a gig without deleting it?",
        a: "Yes — open the gig and toggle 'Pause'. Paused gigs are hidden from Runners but all applicant data is retained. You can resume at any time.",
      },
      {
        q: "How do I reject an applicant?",
        a: "In the Applications tab, click the applicant to open their profile. You'll see an option to accept or reject. Rejected applicants are not notified automatically — you can message them directly.",
      },
    ],
  },
  {
    section: "Momentum & Ratings",
    items: [
      {
        q: "What is a Runner's Momentum score?",
        a: "Momentum is a 0–1000 reliability score that captures a Runner's track record across punctuality, consistency, host ratings, and platform activity. Higher = more dependable.",
      },
      {
        q: "How do I rate a Runner after a gig?",
        a: "After a gig closes, you'll be prompted to rate each Runner across three dimensions specific to that gig type. Ratings are averaged and feed directly into their Momentum score.",
      },
      {
        q: "What is my Host reputation score?",
        a: "Your reputation is the average score Runners give you (out of 5) after completing gigs. It reflects how well you run shifts — clear communication, timely pay, and fair treatment all matter.",
      },
    ],
  },
  {
    section: "Account & Billing",
    items: [
      {
        q: "What does the free trial include?",
        a: "The 90-day trial gives you full access to all features — unlimited gigs, applicant Momentum data, OTP check-ins, analytics, and priority support.",
      },
      {
        q: "What happens when my trial expires?",
        a: "Paid plans are coming soon. Your data is preserved and you'll be notified before any access changes. Reach out to us if your trial ends and you need an extension.",
      },
      {
        q: "How do I update my business details?",
        a: "Go to Profile (top-right dropdown) to update your display name, business info, and notification preferences.",
      },
    ],
  },
];

// ── Category config ───────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "account",      label: "Account & Profile" },
  { value: "gigs",         label: "Gigs & Applications" },
  { value: "checkin",      label: "Check-in & OTP" },
  { value: "payments",     label: "Payments & Billing" },
  { value: "runners",      label: "Runners & Ratings" },
  { value: "technical",    label: "Technical Issue" },
  { value: "other",        label: "Other" },
];

// ── FAQ accordion item ─────────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);

  return (
    <div
      className="border-b last:border-b-0 cursor-pointer select-none"
      style={{ borderColor: "var(--border-color)" }}
      onClick={() => setOpen((o) => !o)}
    >
      <div className="flex items-center justify-between gap-4 py-4">
        <span className="text-sm font-medium" style={{ color: "var(--color-text)" }}>
          {q}
        </span>
        <ChevronDown
          size={16}
          className="flex-shrink-0 transition-transform duration-200"
          style={{
            color: "var(--color-text-muted)",
            transform: open ? "rotate(180deg)" : "rotate(0deg)",
          }}
        />
      </div>
      {open && (
        <p className="text-sm pb-4 leading-relaxed" style={{ color: "var(--color-text-sub)" }}>
          {a}
        </p>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────

type FormState = "idle" | "submitting" | "success" | "error";

export default function SupportPage() {
  const [category, setCategory] = useState("");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formState, setFormState] = useState<FormState>("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!category || !subject.trim() || !message.trim()) return;

    setFormState("submitting");
    setErrorMsg("");

    try {
      const supabase = createClient();
      const { data: { user } } = await supabase.auth.getUser();
      const email = user?.email ?? "";

      const { error } = await submitSupportQuery({ category, subject: subject.trim(), message: message.trim(), email });
      if (error) throw new Error(error);

      setFormState("success");
      setCategory("");
      setSubject("");
      setMessage("");
    } catch (err: unknown) {
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setFormState("error");
    }
  };

  return (
    <div className="p-8 max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-10">
        <p className="pg-eyebrow">Get help</p>
        <h1 className="pg-title">Help &amp; Support</h1>
        <p className="text-sm mt-2" style={{ color: "var(--color-text-muted)" }}>
          Browse answers below or send us a query — we respond within 24 hours.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── FAQ column ── */}
        <div className="lg:col-span-3 space-y-8">
          {FAQS.map((section) => (
            <div
              key={section.section}
              className="rounded-2xl overflow-hidden"
              style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
            >
              <div
                className="px-6 py-4 border-b"
                style={{ borderColor: "var(--border-color)", backgroundColor: "var(--color-surface-2)" }}
              >
                <h3
                  className="text-[11px] font-bold uppercase tracking-widest"
                  style={{ color: "var(--color-text-muted)" }}
                >
                  {section.section}
                </h3>
              </div>
              <div className="px-6">
                {section.items.map((item) => (
                  <FaqItem key={item.q} q={item.q} a={item.a} />
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* ── Contact form column ── */}
        <div className="lg:col-span-2">
          <div
            className="rounded-2xl p-6 sticky top-6"
            style={{ backgroundColor: "var(--card-bg)", border: "1px solid var(--border-color)" }}
          >
            <h2 className="text-base font-bold mb-1" style={{ color: "var(--color-text)" }}>
              Send a query
            </h2>
            <p className="text-xs mb-6" style={{ color: "var(--color-text-muted)" }}>
              Can't find your answer? We'll get back to you.
            </p>

            {formState === "success" ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <CheckCircle2 size={36} style={{ color: "var(--color-primary)" }} />
                <p className="font-semibold text-sm" style={{ color: "var(--color-text)" }}>
                  Query submitted!
                </p>
                <p className="text-xs" style={{ color: "var(--color-text-muted)" }}>
                  We'll respond to your email within 24 hours.
                </p>
                <button
                  className="mt-2 text-xs font-semibold underline underline-offset-2"
                  style={{ color: "var(--color-primary)" }}
                  onClick={() => setFormState("idle")}
                >
                  Submit another
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                {/* Category */}
                <div>
                  <label className="form-label">Category</label>
                  <div className="relative">
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      required
                      className="form-input w-full appearance-none pr-8"
                      style={{ cursor: "pointer" }}
                    >
                      <option value="">Select a category</option>
                      {CATEGORIES.map((c) => (
                        <option key={c.value} value={c.value}>
                          {c.label}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      size={14}
                      className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                      style={{ color: "var(--color-text-muted)" }}
                    />
                  </div>
                </div>

                {/* Subject */}
                <div>
                  <label className="form-label">Subject</label>
                  <input
                    type="text"
                    className="form-input w-full"
                    placeholder="Brief summary of your issue"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    required
                    maxLength={120}
                  />
                </div>

                {/* Message */}
                <div>
                  <label className="form-label">Message</label>
                  <textarea
                    className="form-input w-full resize-none"
                    placeholder="Describe your issue in detail..."
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                    maxLength={2000}
                  />
                  <p className="text-[10px] mt-1 text-right" style={{ color: "var(--color-text-muted)" }}>
                    {message.length}/2000
                  </p>
                </div>

                {errorMsg && (
                  <p className="text-xs" style={{ color: "var(--color-error)" }}>
                    {errorMsg}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={formState === "submitting" || !category || !subject.trim() || !message.trim()}
                  className="btn-primary flex items-center justify-center gap-2 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {formState === "submitting" ? (
                    <span className="w-4 h-4 border-2 rounded-full animate-spin" style={{ borderColor: "currentColor", borderTopColor: "transparent" }} />
                  ) : (
                    <Send size={14} />
                  )}
                  {formState === "submitting" ? "Sending…" : "Send query"}
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
