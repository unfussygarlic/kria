"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { PageLoader } from "@/components/ui/Spinner";
import { ShieldCheck, Star, Briefcase, User, MapPin, FileText, ChevronDown, Smartphone } from "lucide-react";
import type { Profile } from "@/types";
import { INDIAN_STATES, CITIES_BY_STATE } from "@/lib/locations";

const inputCls =
  "w-full bg-surface-3 border border-theme rounded-lg px-4 py-3 text-text text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted";
const selectCls =
  "w-full bg-surface-3 border border-theme rounded-lg px-4 py-3 text-text text-sm focus:outline-none focus:border-primary transition-colors appearance-none cursor-pointer";
const labelCls =
  "block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5";
const sectionCls = "bg-surface-1 border border-theme rounded-xl p-6 space-y-5";
const sectionHeadCls =
  "flex items-center gap-2 text-[10px] font-bold uppercase tracking-widest text-text-muted pb-1";

const ID_TYPE_LABELS: Record<string, string> = {
  aadhaar:         "Aadhaar",
  pan:             "PAN Card",
  voter_id:        "Voter ID",
  driving_licence: "Driving Licence",
  passport:        "Passport",
};

export default function ProfilePage() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"profile" | "identity">("profile");
  const [gigsPosted, setGigsPosted] = useState(0);

  // Profile tab
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [city, setCity] = useState("");
  const [stateVal, setStateVal] = useState("");
  const [phone, setPhone] = useState("");
  const [phoneError, setPhoneError] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [savedProfile, setSavedProfile] = useState(false);
  const [saveError, setSaveError] = useState("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const [{ data }, { count: postedCount }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).single(),
        supabase.from("gigs").select("*", { count: "exact", head: true }).eq("poster_id", user.id),
      ]);
      if (data) {
        setProfile(data as Profile);
        setFirstName(data.first_name ?? "");
        setLastName(data.last_name ?? "");
        setDisplayName(data.display_name ?? "");
        setBio(data.bio ?? "");
        setCity(data.city ?? "");
        setStateVal(data.state ?? "");
        setPhone(data.phone ?? "");
      }
      setGigsPosted(postedCount ?? 0);
      setLoading(false);
    };
    load();
  }, []);

  const normalizePhone = (raw: string): string | null => {
    const digits = raw.replace(/\D/g, "");
    if (!digits) return null;
    if (/^[6-9]\d{9}$/.test(digits)) return `+91${digits}`;
    if (/^91[6-9]\d{9}$/.test(digits)) return `+${digits}`;
    return `+${digits}`;
  };

  const handleSaveProfile = async () => {
    setPhoneError("");
    setSaveError("");
    const trimmedPhone = phone.trim();
    let normalizedPhone: string | null = null;
    if (trimmedPhone) {
      normalizedPhone = normalizePhone(trimmedPhone);
      const digits = trimmedPhone.replace(/\D/g, "");
      if (!/^([6-9]\d{9}|91[6-9]\d{9})$/.test(digits)) {
        setPhoneError("Enter a valid 10-digit Indian mobile number.");
        return;
      }
    }
    setSavingProfile(true);
    setSavedProfile(false);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setSavingProfile(false); return; }
    const { error } = await supabase.from("profiles").update({
      first_name: firstName || null,
      last_name: lastName || null,
      display_name: displayName,
      bio: bio || null,
      city: city || null,
      state: stateVal || null,
      phone: normalizedPhone,
    }).eq("id", user.id);
    setSavingProfile(false);
    if (error) {
      setSaveError("Something went wrong. Please try again.");
      return;
    }
    if (normalizedPhone) setPhone(normalizedPhone);
    setSavedProfile(true);
    setTimeout(() => setSavedProfile(false), 2500);
  };

  if (loading) return <PageLoader />;

  const initials = (profile?.first_name?.[0] ?? profile?.display_name?.[0] ?? "H").toUpperCase();
  const name = profile?.first_name
    ? `${profile.first_name}${profile.last_name ? " " + profile.last_name : ""}`
    : profile?.display_name ?? "—";
  const reputation = profile?.poster_reputation ?? 0;
  const repPct = (reputation / 5) * 100;

  const verifiedIds: string[] = profile?.verified_id_types ?? [];
  const isVerified = verifiedIds.length > 0;

  return (
    <div className="p-8 max-w-2xl mx-auto">
      <div className="mb-8">
        <p className="pg-eyebrow">Account</p>
        <h1 className="pg-title">Profile</h1>
      </div>

      {/* Identity card */}
      <div className="bg-surface-1 border border-theme rounded-xl p-6 mb-6">
        <div className="flex items-center gap-5 mb-6">
          <div className="w-20 h-20 rounded-full bg-primary flex items-center justify-center flex-shrink-0 border-2 border-primary/30">
            <span className="text-2xl font-black text-text-inv">{initials}</span>
          </div>
          <div>
            <p className="text-xl font-bold text-text">{name}</p>
            <p className="text-sm text-text-muted mt-0.5">
              {[profile?.city, profile?.state].filter(Boolean).join(", ") || "—"}
              {" · "}
              <span className="text-primary font-semibold">Host</span>
            </p>
            {isVerified && (
              <div className="flex items-center gap-1.5 mt-1.5">
                <ShieldCheck size={13} className="text-primary" />
                <span className="text-xs text-primary font-bold uppercase tracking-wide">Identity Verified</span>
              </div>
            )}
          </div>
        </div>

        <div className="pt-5 border-t border-theme">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-widest text-text-muted">
              <Star size={11} className="text-amber-400" />
              Reputation Score
            </div>
            <span className="text-sm font-bold text-text">{reputation.toFixed(1)} / 5.0</span>
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: "var(--border-color)" }}>
            <div className="h-full bg-primary rounded-full" style={{ width: `${repPct}%` }} />
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 gap-4 mb-6">
        <div className="bg-surface-1 border border-theme rounded-xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Gigs Posted</span>
            <Briefcase size={15} className="text-primary" />
          </div>
          <p className="text-3xl font-bold text-primary">{gigsPosted}</p>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-primary/20 group-hover:bg-primary transition-colors duration-300" />
        </div>
        <div className="bg-surface-1 border border-theme rounded-xl p-5 relative overflow-hidden group">
          <div className="flex items-center justify-between mb-3">
            <span className="text-[10px] font-bold uppercase tracking-widest text-text-muted">Phone</span>
          </div>
          <p className="text-lg font-bold text-text">{phone || "—"}</p>
          <div className="absolute bottom-0 left-0 w-full h-[2px] bg-secondary/20 group-hover:bg-secondary transition-colors duration-300" />
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-surface-2 rounded-xl p-1 mb-6">
        {(["profile", "identity"] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2.5 text-xs font-bold uppercase tracking-widest rounded-lg transition-all ${
              activeTab === tab
                ? "bg-primary text-text-inv"
                : "text-text-muted hover:text-text"
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* ── Profile tab ──────────────────────────────────────────────────────── */}
      {activeTab === "profile" && (
        <div className="space-y-4">
          <div className={sectionCls}>
            <p className={sectionHeadCls}>
              <User size={11} /> Personal Info
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>First Name</label>
                <input
                  className={inputCls}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  placeholder="Rahul"
                />
              </div>
              <div>
                <label className={labelCls}>Last Name</label>
                <input
                  className={inputCls}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  placeholder="Sharma"
                />
              </div>
            </div>
            <div>
              <label className={labelCls}>Display Name</label>
              <input
                className={inputCls}
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="Your name or brand"
              />
            </div>
            <div>
              <label className={labelCls}>Phone Number</label>
              <input
                className={`${inputCls}${phoneError ? " !border-error" : ""}`}
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setPhoneError(""); }}
                placeholder="9876543210"
                type="tel"
                inputMode="numeric"
              />
              {phoneError && (
                <p className="text-xs mt-1.5" style={{ color: "var(--color-error)" }}>{phoneError}</p>
              )}
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionHeadCls}>
              <MapPin size={11} /> Location
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>State</label>
                <div className="relative">
                  <select
                    className={selectCls}
                    value={stateVal}
                    onChange={(e) => { setStateVal(e.target.value); setCity(""); }}
                  >
                    <option value="">Select state</option>
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
                </div>
              </div>
              <div>
                <label className={labelCls}>City</label>
                <div className="relative">
                  <select
                    className={`${selectCls} ${!stateVal ? "opacity-50 cursor-not-allowed" : ""}`}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    disabled={!stateVal}
                  >
                    <option value="">{stateVal ? "Select city" : "Select state first"}</option>
                    {(CITIES_BY_STATE[stateVal] ?? []).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  <ChevronDown size={13} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-text-muted" />
                </div>
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={sectionHeadCls}>
              <FileText size={11} /> About
            </p>
            <div>
              <label className={labelCls}>Bio</label>
              <textarea
                className={`${inputCls} resize-none`}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell runners a bit about you or your company…"
                rows={4}
              />
            </div>
          </div>

          {saveError && (
            <div className="rounded-xl px-4 py-3 text-sm" style={{ backgroundColor: "rgba(255,115,81,0.08)", border: "1px solid rgba(255,115,81,0.25)", color: "var(--color-error)" }}>
              {saveError}
            </div>
          )}

          <button
            onClick={handleSaveProfile}
            disabled={savingProfile}
            className="px-6 py-3 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-60 shadow-[0_4px_20px_rgba(212,255,0,0.15)]"
          >
            {savingProfile ? "Saving…" : savedProfile ? "Saved ✓" : "Save Changes"}
          </button>
        </div>
      )}

      {/* ── Identity tab ─────────────────────────────────────────────────────── */}
      {activeTab === "identity" && (
        <div className="space-y-4">
          {/* Status banner */}
          {isVerified ? (
            <div className="flex items-center gap-3 bg-primary/10 border border-primary/30 rounded-xl px-5 py-4">
              <ShieldCheck size={20} className="text-primary flex-shrink-0" />
              <div>
                <p className="text-sm font-bold text-primary">Identity Verified</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Your identity has been verified via the Kria mobile app.
                </p>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-3 rounded-xl px-5 py-4" style={{ backgroundColor: "var(--hover-bg)", border: "1px solid var(--border-color)" }}>
              <div className="w-5 h-5 rounded-full border-2 flex-shrink-0" style={{ borderColor: "var(--border-color)" }} />
              <div>
                <p className="text-sm font-bold text-text-muted">Not Verified</p>
                <p className="text-xs text-text-muted mt-0.5">
                  Verify your identity to build trust with Runners.
                </p>
              </div>
            </div>
          )}

          {/* Verified IDs list */}
          {verifiedIds.length > 0 && (
            <div className={sectionCls}>
              <p className={sectionHeadCls}>
                <ShieldCheck size={11} /> Verified IDs
              </p>
              <div className="space-y-2">
                {verifiedIds.map((idType) => (
                  <div
                    key={idType}
                    className="flex items-center gap-3 rounded-lg px-4 py-3"
                    style={{ backgroundColor: "rgba(212,255,0,0.06)", border: "1px solid rgba(212,255,0,0.20)" }}
                  >
                    <ShieldCheck size={14} className="text-primary flex-shrink-0" />
                    <span className="text-sm font-semibold text-text">
                      {ID_TYPE_LABELS[idType] ?? idType}
                    </span>
                    <span className="ml-auto text-[10px] font-bold uppercase tracking-wider text-primary">Verified</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* How to verify */}
          <div className={sectionCls}>
            <p className={sectionHeadCls}>
              <Smartphone size={11} /> How to Verify
            </p>
            <p className="text-sm text-text-muted leading-relaxed">
              Identity verification is done through the <span className="font-semibold text-text">Kria mobile app</span>. Open the app, go to your profile, and tap <span className="font-semibold text-text">Verify Identity</span> to upload a government-issued ID.
            </p>
            <div className="flex flex-wrap gap-2 pt-1">
              {["Aadhaar", "PAN Card", "Voter ID", "Driving Licence", "Passport"].map((id) => (
                <span
                  key={id}
                  className="text-[10px] font-bold uppercase tracking-wide px-3 py-1.5 rounded-lg"
                  style={{ backgroundColor: "var(--hover-bg)", border: "1px solid var(--border-subtle)", color: "var(--color-text-muted)" }}
                >
                  {id}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
