"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Info, MapPin, AlertCircle, Loader2, Upload, X, Image as ImageIcon } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { geocodeVenue, updateGigLocation } from "@/lib/api/recommendations";
import { generateGigCover } from "@/lib/api/gigs";
import type { GigCategory, PayType, GenderPreference } from "@/types";

const ROLE_GROUPS: {
  category: string;
  emoji: string;
  roles: { value: GigCategory; label: string; description: string }[];
}[] = [
  {
    category: "Event & Promotion", emoji: "🎪",
    roles: [
      { value: "event_registration",  label: "Event Registration",          description: "Manage attendee check-ins, badges, and registration desks" },
      { value: "usher",               label: "Usher / Crowd Assistance",    description: "Guide attendees, manage queues, and assist crowd movement" },
      { value: "booth_staff",         label: "Booth Staff",                 description: "Handle exhibition stalls, product booths, and visitor interactions" },
      { value: "promoter",            label: "Promoter / Brand Promotion",  description: "Promote brands, engage customers, and distribute marketing materials" },
      { value: "sampling_promoter",   label: "Sampling & Product Promotion",description: "Distribute product samples and explain offerings to visitors" },
      { value: "lead_collection",     label: "Lead Collection",             description: "Collect customer details, surveys, and potential sales leads" },
      { value: "event_helper",        label: "General Event Helper",        description: "Assist organizers with miscellaneous event tasks and coordination" },
    ],
  },
  {
    category: "Hospitality", emoji: "🍽️",
    roles: [
      { value: "hospitality_staff",  label: "Hospitality Staff",       description: "Assist guests with seating, refreshments, and event support" },
      { value: "guest_management",   label: "Guest Management",        description: "Coordinate VIPs, guest lists, and attendee assistance" },
      { value: "front_desk",         label: "Front Desk / Reception",  description: "Handle reception, visitor coordination, and front desk operations" },
    ],
  },
  {
    category: "Technical Support", emoji: "💻",
    roles: [
      { value: "event_tech_support",    label: "Event Tech Support",      description: "Assist with laptops, projectors, Wi-Fi, and event technical setup" },
      { value: "sound_light_assistant", label: "Sound & Light Assistant", description: "Support audio systems, lighting equipment, and stage setup" },
    ],
  },
  {
    category: "Media & Content", emoji: "📸",
    roles: [
      { value: "photographer",         label: "Photographer",          description: "Capture photos for events, booths, and promotional activities" },
      { value: "videographer",         label: "Videographer",          description: "Record event videos, interviews, and promotional content" },
      { value: "social_media_creator", label: "Social Media Creator",  description: "Create reels, stories, posts, and live event social coverage" },
    ],
  },
  {
    category: "Stage & Hosting", emoji: "🎤",
    roles: [
      { value: "emcee", label: "Emcee / Host", description: "Host events, make announcements, and engage audiences" },
    ],
  },
  {
    category: "Other", emoji: "🔧",
    roles: [
      { value: "other", label: "Other", description: "Any role not listed above" },
    ],
  },
];

const INDIAN_CITIES = [
  "Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
  "Kochi", "Chandigarh", "Lucknow", "Nagpur", "Indore",
];

const LANGUAGES = ["English", "Hindi", "Tamil", "Telugu", "Kannada", "Malayalam", "Marathi", "Bengali", "Gujarati", "Punjabi"];

const STEPS = ["Category", "Basic Info", "Schedule", "Requirements"];

interface FormData {
  category: GigCategory | "";
  title: string;
  company_name: string;
  description: string;
  slots_total: number;
  pay_amount: number;
  pay_type: PayType;
  venue_name: string;
  city: string;
  event_date: string;
  shift_start_time: string;
  shift_end_time: string;
  report_time: string;
  gender_preference: GenderPreference;
  dress_code: string;
  languages_required: string[];
  experience_required: boolean;
  requirements_note: string;
  // Location (set after geocoding confirmation on step 3)
  venue_lat: number | null;
  venue_lng: number | null;
  geocoded_address: string;
  // Optional cover photo — replaces the template photo slot in the cover PNG.
  cover_photo: File | null;
  cover_photo_preview: string | null;
}

const MAX_PHOTO_BYTES = 10 * 1024 * 1024; // 10 MB (matches backend limit)

const INITIAL: FormData = {
  category: "",
  title: "", company_name: "", description: "",
  slots_total: 1, pay_amount: 0, pay_type: "fixed",
  venue_name: "", city: "", event_date: "", shift_start_time: "09:00", shift_end_time: "18:00", report_time: "",
  gender_preference: "any", dress_code: "", languages_required: [], experience_required: false, requirements_note: "",
  venue_lat: null, venue_lng: null, geocoded_address: "",
  cover_photo: null, cover_photo_preview: null,
};

const inputCls = "w-full bg-surface-3 border border-theme rounded-lg px-4 py-3 text-text text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted";
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5";

export default function NewGigPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormData>(INITIAL);
  const [selectedGroup, setSelectedGroup] = useState<string | null>(
    () => ROLE_GROUPS.find((g) => g.roles.some((r) => r.value === INITIAL.category))?.category ?? null
  );
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [geocoding, setGeocoding] = useState(false);
  const [geocodeError, setGeocodeError] = useState("");

  const set = (patch: Partial<FormData>) => setForm((f) => ({ ...f, ...patch }));

  const photoInputRef = useRef<HTMLInputElement>(null);
  const [photoError, setPhotoError] = useState("");

  const handlePickPhoto = (file: File | null) => {
    setPhotoError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      setPhotoError("Photo must be JPEG, PNG, or WebP.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setPhotoError("Photo is too large (max 10 MB).");
      return;
    }
    // Revoke previous preview URL if any
    if (form.cover_photo_preview) URL.revokeObjectURL(form.cover_photo_preview);
    set({ cover_photo: file, cover_photo_preview: URL.createObjectURL(file) });
  };

  const handleRemovePhoto = () => {
    if (form.cover_photo_preview) URL.revokeObjectURL(form.cover_photo_preview);
    set({ cover_photo: null, cover_photo_preview: null });
    if (photoInputRef.current) photoInputRef.current.value = "";
  };

  const handleFetchLocation = async () => {
    if (!form.venue_name || !form.city) return;
    setGeocoding(true);
    setGeocodeError("");
    set({ venue_lat: null, venue_lng: null, geocoded_address: "" });

    const result = await geocodeVenue(form.venue_name, form.city);
    setGeocoding(false);
    if (result.error || !result.data) {
      setGeocodeError(result.error ?? "Could not resolve venue. You can still post without a pin.");
      return;
    }
    set({
      venue_lat: result.data.latitude,
      venue_lng: result.data.longitude,
      geocoded_address: result.data.formatted_address,
    });
  };

  const toggleLang = (lang: string) =>
    set({ languages_required: form.languages_required.includes(lang)
      ? form.languages_required.filter((l) => l !== lang)
      : [...form.languages_required, lang] });

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { setError("Not authenticated."); setSubmitting(false); return; }

    const { data, error: err } = await supabase
      .from("gigs")
      .insert({
        poster_id: user.id,
        category: form.category,
        title: form.title,
        company_name: form.company_name || null,
        description: form.description,
        slots_total: form.slots_total,
        slots_filled: 0,
        pay_amount: form.pay_amount,
        pay_type: form.pay_type,
        venue_name: form.venue_name,
        city: form.city,
        event_date: form.event_date,
        shift_start_time: form.shift_start_time,
        shift_end_time: form.shift_end_time,
        report_time: form.report_time || null,
        gender_preference: form.gender_preference,
        dress_code: form.dress_code || null,
        languages_required: form.languages_required,
        experience_required: form.experience_required,
        requirements_note: form.requirements_note || null,
        status: "open",
      })
      .select()
      .single();

    if (err) { setError(err.message); setSubmitting(false); return; }

    // Save geocoded coordinates server-side (PostGIS update)
    if (form.venue_lat !== null && form.venue_lng !== null) {
      await updateGigLocation(data.id, form.venue_lat, form.venue_lng, form.geocoded_address);
    }

    // Auto-generate cover art. If the host uploaded a photo it goes into the
    // template's photo slot; otherwise the compositor renders a template-only
    // cover. Fire-and-forget so gig creation doesn't block on cover render.
    generateGigCover(data.id, form.cover_photo ?? undefined).catch(() => {
      // Non-fatal — gig is already created, cover can be regenerated later.
    });

    setSubmitting(false);
    router.replace(`/gigs/${data.id}`);
  };

  const canNext = () => {
    if (step === 0) return !!form.category;
    if (step === 1) return !!form.title && form.pay_amount > 0 && form.slots_total > 0;
    if (step === 2) return !!form.venue_name && !!form.city && !!form.event_date && form.venue_lat !== null;
    return true;
  };

  return (
    <div className="p-8 max-w-3xl mx-auto">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="flex items-center gap-2 text-text-muted hover:text-text text-xs font-bold uppercase tracking-wider mb-8 transition-colors"
      >
        <ArrowLeft size={15} /> Back
      </button>

      {/* Step indicator */}
      <div className="relative flex items-start justify-between mb-12">
        <div className="absolute top-5 left-0 w-full h-px bg-white/10 -z-10" />
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex flex-col items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-bg transition-all ${
                done
                  ? "bg-primary text-text-inv"
                  : active
                  ? "bg-primary text-text-inv"
                  : "bg-surface-2 border border-white/10 text-text-muted"
              }`}>
                {done ? <Check size={16} /> : i + 1}
              </div>
              <span className={`text-[10px] font-bold uppercase tracking-widest ${active ? "text-text" : done ? "text-text-muted" : "text-text-muted/50"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      {/* Step 0: Role */}
      {step === 0 && (
        <div className="space-y-5">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold text-text">Choose Role</h2>
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">Required</span>
          </div>

          {/* Category group chips */}
          <div className="grid grid-cols-3 gap-2">
            {ROLE_GROUPS.map(({ category, emoji }) => {
              const isActive = selectedGroup === category;
              const hasSelection = ROLE_GROUPS.find((g) => g.category === category)?.roles.some((r) => r.value === form.category);
              return (
                <button
                  key={category}
                  onClick={() => setSelectedGroup(isActive ? null : category)}
                  className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-left transition-all ${
                    isActive
                      ? "border-primary bg-primary/10 text-primary"
                      : hasSelection
                      ? "border-primary/40 bg-primary/5 text-text"
                      : "border-white/10 bg-surface-1 text-text-muted hover:border-white/20 hover:text-text"
                  }`}
                >
                  <span className="text-lg flex-shrink-0">{emoji}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide leading-tight">{category}</span>
                  {hasSelection && !isActive && <span className="ml-auto w-1.5 h-1.5 rounded-full bg-primary flex-shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Roles for selected group */}
          {selectedGroup && (() => {
            const group = ROLE_GROUPS.find((g) => g.category === selectedGroup)!;
            return (
              <div className="space-y-2">
                <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted px-1">{selectedGroup}</p>
                <div className="grid grid-cols-1 gap-2">
                  {group.roles.map(({ value, label, description }) => (
                    <button
                      key={value}
                      onClick={() => set({ category: value })}
                      className={`flex items-start gap-4 p-4 rounded-xl border text-left transition-all ${
                        form.category === value
                          ? "border-primary bg-primary/10 shadow-[0_0_12px_rgba(212,255,0,0.08)]"
                          : "border-white/10 bg-surface-1 hover:border-primary/40"
                      }`}
                    >
                      <div className={`w-4 h-4 rounded-full border-2 flex-shrink-0 mt-0.5 transition-colors ${
                        form.category === value ? "border-primary bg-primary" : "border-white/20"
                      }`} />
                      <div>
                        <p className={`text-sm font-semibold ${form.category === value ? "text-primary" : "text-text"}`}>{label}</p>
                        <p className="text-xs text-text-muted mt-0.5 leading-relaxed">{description}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            );
          })()}

          {!selectedGroup && (
            <p className="text-xs text-text-muted text-center py-4">Select a category above to see available roles</p>
          )}
        </div>
      )}

      {/* Step 1: Basic info */}
      {step === 1 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-text mb-6">Basic Info</h2>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 space-y-5">
            <div>
              <label className={labelCls}>Gig Title *</label>
              <input className={inputCls} placeholder="e.g. Lead Coordinator for Tech Summit" value={form.title} onChange={(e) => set({ title: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Company / Brand Name</label>
              <input className={inputCls} placeholder="e.g. TechConf India" value={form.company_name} onChange={(e) => set({ company_name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={`${inputCls} resize-none`} placeholder="Detail the responsibilities and what to expect…" value={form.description} onChange={(e) => set({ description: e.target.value })} rows={4} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Available Slots *</label>
                <input className={inputCls} type="number" min={1} value={form.slots_total} onChange={(e) => set({ slots_total: Number(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>Pay Type</label>
                <div className="flex p-1 bg-[#201f1f] rounded-lg border border-white/10">
                  {(["fixed", "hourly", "per_day"] as PayType[]).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => set({ pay_type: t })}
                      className={`flex-1 py-2 text-[10px] font-bold uppercase rounded-md transition-colors ${form.pay_type === t ? "bg-white/5 text-primary" : "text-text-muted hover:text-text"}`}
                    >
                      {t === "fixed" ? "Fixed" : t === "hourly" ? "Hourly" : "Per Day"}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            <div>
              <label className={labelCls}>Pay Amount (₹) *</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-primary font-bold text-sm">₹</span>
                <input className={`${inputCls} pl-10`} type="number" placeholder="5000" value={form.pay_amount || ""} onChange={(e) => set({ pay_amount: Number(e.target.value) })} />
              </div>
            </div>

            {/* Cover photo picker (optional) */}
            <div>
              <label className={labelCls}>Cover Photo (optional)</label>
              <input
                ref={photoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={(e) => handlePickPhoto(e.target.files?.[0] ?? null)}
                className="hidden"
              />
              {form.cover_photo_preview ? (
                <div className="flex items-start gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={form.cover_photo_preview}
                    alt="Cover preview"
                    className="w-24 h-30 rounded-lg object-cover border border-white/10"
                    style={{ aspectRatio: "4/5" }}
                  />
                  <div className="flex-1 space-y-2">
                    <p className="text-xs text-text-sub leading-relaxed">
                      This photo will fill the photo slot in the gig cover so runners see a real image, not the template.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => photoInputRef.current?.click()}
                        className="text-[10px] font-bold uppercase tracking-wider text-primary hover:brightness-110 transition"
                      >
                        Change
                      </button>
                      <span className="text-text-muted">·</span>
                      <button
                        type="button"
                        onClick={handleRemovePhoto}
                        className="flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider text-text-muted hover:text-text transition"
                      >
                        <X size={11} /> Remove
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  className="w-full flex items-center gap-3 p-4 border border-dashed border-white/15 hover:border-primary/60 rounded-xl transition-colors text-left"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <Upload size={16} className="text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-semibold text-text">Upload a cover photo</p>
                    <p className="text-xs text-text-muted mt-0.5">Photos of your venue, team, or past events make cards stand out. JPEG / PNG / WebP · max 10 MB.</p>
                  </div>
                  <ImageIcon size={14} className="text-text-muted flex-shrink-0" />
                </button>
              )}
              {photoError && (
                <p className="text-xs text-error mt-2">{photoError}</p>
              )}
            </div>
          </div>
          <div className="flex items-center gap-3 p-4 border border-dashed border-white/10 rounded-xl">
            <Info size={16} className="text-primary flex-shrink-0" />
            <p className="text-xs text-text-muted">Accurate pay estimates help attract 40% more qualified professionals on Kria Grid.</p>
          </div>
        </div>
      )}

      {/* Step 2: Schedule */}
      {step === 2 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-text mb-6">Scheduling</h2>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 space-y-5">
            <div>
              <label className={labelCls}>Venue Name *</label>
              <input
                className={inputCls}
                placeholder="e.g. KTPO Convention Center"
                value={form.venue_name}
                onChange={(e) => { set({ venue_name: e.target.value, venue_lat: null, venue_lng: null, geocoded_address: "" }); setGeocodeError(""); }}
              />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <select
                className={inputCls}
                value={form.city}
                onChange={(e) => { set({ city: e.target.value, venue_lat: null, venue_lng: null, geocoded_address: "" }); setGeocodeError(""); }}
              >
                <option value="">Select city</option>
                {INDIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>

            {/* Location fetch — required to proceed */}
            {form.venue_name && form.city && (
              <div className="space-y-3">
                {form.venue_lat === null && !geocoding && !geocodeError && (
                  <p className="text-xs font-semibold" style={{ color: "var(--color-primary)" }}>
                    Pin the location to continue — runners use this to find nearby gigs.
                  </p>
                )}
                <button
                  type="button"
                  onClick={handleFetchLocation}
                  disabled={geocoding}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold uppercase tracking-wider transition-all disabled:opacity-50 disabled:pointer-events-none"
                  style={
                    form.venue_lat !== null
                      ? { border: "1px solid rgba(212,255,0,0.3)", color: "var(--color-text-muted)", backgroundColor: "var(--hover-bg)" }
                      : { border: "1px solid var(--color-primary)", color: "var(--color-primary)", backgroundColor: "rgba(212,255,0,0.06)" }
                  }
                >
                  {geocoding
                    ? <><Loader2 size={13} className="animate-spin" /> Locating…</>
                    : form.venue_lat !== null
                      ? <><MapPin size={13} /> Location Pinned — Re-fetch</>
                      : <><MapPin size={13} /> Pin Location (Required)</>
                  }
                </button>

                {!geocoding && form.venue_lat !== null && (
                  <div className="flex items-start gap-3 p-4 bg-surface-2 border border-primary/20 rounded-lg">
                    <MapPin size={14} className="text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-semibold text-text">{form.geocoded_address}</p>
                      <p className="text-[10px] text-text-muted mt-0.5">
                        {form.venue_lat.toFixed(5)}, {form.venue_lng!.toFixed(5)}
                      </p>
                    </div>
                  </div>
                )}

                {!geocoding && geocodeError && (
                  <div className="flex items-start gap-3 p-4 bg-surface-2 border border-error/20 rounded-lg">
                    <AlertCircle size={14} className="text-error flex-shrink-0 mt-0.5" />
                    <p className="text-xs text-text-muted">{geocodeError} Please check the venue name and try again.</p>
                  </div>
                )}
              </div>
            )}

            <div>
              <label className={labelCls}>Event Date *</label>
              <input className={inputCls} type="date" value={form.event_date} onChange={(e) => set({ event_date: e.target.value })} min={new Date().toISOString().split("T")[0]} />
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Shift Start *</label>
                <input className={inputCls} type="time" value={form.shift_start_time} onChange={(e) => set({ shift_start_time: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Shift End *</label>
                <input className={inputCls} type="time" value={form.shift_end_time} onChange={(e) => set({ shift_end_time: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Report Time</label>
                <input className={inputCls} type="time" value={form.report_time} onChange={(e) => set({ report_time: e.target.value })} />
              </div>
            </div>
            <p className="text-xs text-text-muted">Report time is when runners should arrive (usually 30 min before shift).</p>
          </div>
        </div>
      )}

      {/* Step 3: Requirements + Review */}
      {step === 3 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-text mb-6">Requirements</h2>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 space-y-5">
            <div>
              <label className={labelCls}>Gender Preference</label>
              <select className={inputCls} value={form.gender_preference} onChange={(e) => set({ gender_preference: e.target.value as GenderPreference })}>
                <option value="any">Any</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Dress Code</label>
              <input className={inputCls} placeholder="e.g. Formal — black trousers, white shirt" value={form.dress_code} onChange={(e) => set({ dress_code: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Languages Required</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang}
                    type="button"
                    onClick={() => toggleLang(lang)}
                    className={`px-3 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wide border transition-colors ${
                      form.languages_required.includes(lang)
                        ? "bg-primary/10 border-primary text-primary"
                        : "bg-surface-2 border-white/10 text-text-muted hover:border-white/20 hover:text-text"
                    }`}
                  >
                    {lang}
                  </button>
                ))}
              </div>
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${form.experience_required ? "bg-primary border-primary" : "border-white/20 group-hover:border-white/40"}`}>
                {form.experience_required && <Check size={12} className="text-text-inv" />}
              </div>
              <input type="checkbox" className="sr-only" checked={form.experience_required} onChange={(e) => set({ experience_required: e.target.checked })} />
              <span className="text-sm text-text">Prior event experience required</span>
            </label>
            <div>
              <label className={labelCls}>Additional Notes</label>
              <textarea className={`${inputCls} resize-none`} placeholder="Any other notes for applicants…" value={form.requirements_note} onChange={(e) => set({ requirements_note: e.target.value })} rows={3} />
            </div>
          </div>

          {/* Review summary */}
          <div className="bg-surface-2 border border-white/10 rounded-xl p-5 space-y-3">
            <p className="text-[10px] font-bold uppercase tracking-widest text-text-muted mb-4">Review Summary</p>
            {[
              ["Title", form.title],
              ["Role", ROLE_GROUPS.flatMap((g) => g.roles).find((r) => r.value === form.category)?.label ?? form.category.replace(/_/g, " ")],
              ["Pay", `₹${form.pay_amount.toLocaleString("en-IN")} ${form.pay_type}`],
              ["Date", form.event_date],
              ["Venue", `${form.venue_name}, ${form.city}`],
              ["Slots", String(form.slots_total)],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between items-center text-sm border-b border-white/5 pb-2 last:border-0 last:pb-0">
                <span className="text-text-muted">{k}</span>
                <span className="text-text font-semibold capitalize">{v}</span>
              </div>
            ))}
          </div>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => step === 0 ? router.back() : setStep(step - 1)}
          className="flex-1 py-4 px-6 border border-white/10 text-text-muted text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white/5 hover:text-text transition-all active:scale-95"
        >
          {step === 0 ? "Cancel" : "← Back"}
        </button>
        {step < STEPS.length - 1 ? (
          <button
            onClick={() => setStep(step + 1)}
            disabled={!canNext()}
            className="flex-1 py-4 px-6 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-[0_4px_20px_rgba(212,255,0,0.2)]"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !canNext()}
            className="flex-1 py-4 px-6 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-[0_4px_20px_rgba(212,255,0,0.2)]"
          >
            {submitting ? "Posting…" : "Post Gig"}
          </button>
        )}
      </div>
    </div>
  );
}
