"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, Plus, Trash2 } from "lucide-react";
import { createEvent } from "@/lib/api/events";
import type { GigCategory, PayType, JobInEventCreate } from "@/types";

const CATEGORIES: { value: GigCategory; label: string }[] = [
  { value: "event_registration",    label: "Event Registration" },
  { value: "usher",                 label: "Usher / Crowd Assistance" },
  { value: "booth_staff",           label: "Booth Staff" },
  { value: "promoter",              label: "Promoter / Brand Promotion" },
  { value: "sampling_promoter",     label: "Sampling & Product Promotion" },
  { value: "lead_collection",       label: "Lead Collection" },
  { value: "event_helper",          label: "General Event Helper" },
  { value: "hospitality_staff",     label: "Hospitality Staff" },
  { value: "guest_management",      label: "Guest Management" },
  { value: "front_desk",            label: "Front Desk / Reception" },
  { value: "event_tech_support",    label: "Event Tech Support" },
  { value: "sound_light_assistant", label: "Sound & Light Assistant" },
  { value: "photographer",          label: "Photographer" },
  { value: "videographer",          label: "Videographer" },
  { value: "social_media_creator",  label: "Social Media Creator" },
  { value: "emcee",                 label: "Emcee / Host" },
  { value: "other",                 label: "Other" },
];

const INDIAN_CITIES = [
  "Bangalore", "Mumbai", "Delhi", "Chennai", "Hyderabad",
  "Pune", "Kolkata", "Ahmedabad", "Jaipur", "Surat",
  "Kochi", "Chandigarh", "Lucknow", "Nagpur", "Indore",
];

interface EventForm {
  title: string;
  venue_name: string;
  city: string;
  event_date: string;
  is_multi_day: boolean;
  event_end_date: string;
  description: string;
}

const BLANK_JOB: JobInEventCreate = {
  title: "", description: "", category: "event_helper",
  pay_amount: 0, pay_type: "fixed",
  shift_start_time: "09:00", shift_end_time: "18:00",
  slots_total: 1,
};

const STEPS = ["Event Details", "Roles"];

const inputCls = "w-full bg-[#201f1f] border border-white/10 rounded-lg px-4 py-3 text-text text-sm focus:outline-none focus:border-primary transition-colors placeholder:text-text-muted";
const labelCls = "block text-[10px] font-bold uppercase tracking-wider text-text-muted mb-1.5";

export default function NewEventPage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<EventForm>({
    title: "", venue_name: "", city: "", event_date: "",
    is_multi_day: false, event_end_date: "", description: "",
  });
  const [jobs, setJobs] = useState<JobInEventCreate[]>([{ ...BLANK_JOB }]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const patchForm = (p: Partial<EventForm>) => setForm((f) => ({ ...f, ...p }));
  const patchJob = (i: number, p: Partial<JobInEventCreate>) =>
    setJobs((js) => js.map((j, idx) => idx === i ? { ...j, ...p } : j));
  const addJob = () => setJobs((js) => [...js, { ...BLANK_JOB }]);
  const removeJob = (i: number) => setJobs((js) => js.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    setError("");
    setSubmitting(true);
    const res = await createEvent({
      title: form.title,
      venue_name: form.venue_name,
      city: form.city,
      event_date: form.event_date,
      is_multi_day: form.is_multi_day,
      event_end_date: form.is_multi_day && form.event_end_date ? form.event_end_date : undefined,
      description: form.description || undefined,
      jobs,
    });
    setSubmitting(false);
    if (res.error) { setError(res.error); return; }
    router.replace(`/events/${res.data!.id}`);
  };

  const step0Valid = !!form.title && !!form.venue_name && !!form.city && !!form.event_date;
  const step1Valid = jobs.every((j) => j.title && j.pay_amount > 0 && j.slots_total > 0);

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
      <div className="relative flex items-start justify-around mb-12 max-w-xs">
        <div className="absolute top-5 left-0 w-full h-px bg-white/10 -z-10" />
        {STEPS.map((label, i) => {
          const done = i < step;
          const active = i === step;
          return (
            <div key={label} className="flex flex-col items-center gap-3">
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold ring-4 ring-bg transition-all ${
                done || active ? "bg-primary text-text-inv" : "bg-surface-2 border border-white/10 text-text-muted"
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

      {/* Step 0: Event details */}
      {step === 0 && (
        <div className="space-y-5">
          <h2 className="text-xl font-bold text-text mb-6">Event Details</h2>
          <div className="bg-surface-1 border border-white/10 rounded-xl p-6 space-y-5">
            <div>
              <label className={labelCls}>Event Name *</label>
              <input className={inputCls} placeholder="e.g. Bangalore Tech Summit 2026" value={form.title} onChange={(e) => patchForm({ title: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Venue *</label>
              <input className={inputCls} placeholder="e.g. KTPO Convention Center" value={form.venue_name} onChange={(e) => patchForm({ venue_name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>City *</label>
              <select className={inputCls} value={form.city} onChange={(e) => patchForm({ city: e.target.value })}>
                <option value="">Select city</option>
                {INDIAN_CITIES.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Event Date *</label>
              <input className={inputCls} type="date" value={form.event_date} onChange={(e) => patchForm({ event_date: e.target.value })} min={new Date().toISOString().split("T")[0]} />
            </div>
            <label className="flex items-center gap-3 cursor-pointer group">
              <div className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-colors flex-shrink-0 ${form.is_multi_day ? "bg-primary border-primary" : "border-white/20 group-hover:border-white/40"}`}>
                {form.is_multi_day && <Check size={12} className="text-text-inv" />}
              </div>
              <input type="checkbox" className="sr-only" checked={form.is_multi_day} onChange={(e) => patchForm({ is_multi_day: e.target.checked })} />
              <span className="text-sm text-text">Multi-day event</span>
            </label>
            {form.is_multi_day && (
              <div>
                <label className={labelCls}>End Date</label>
                <input className={inputCls} type="date" value={form.event_end_date} onChange={(e) => patchForm({ event_end_date: e.target.value })} min={form.event_date || new Date().toISOString().split("T")[0]} />
              </div>
            )}
            <div>
              <label className={labelCls}>Description</label>
              <textarea className={`${inputCls} resize-none`} placeholder="Brief overview of the event…" value={form.description} onChange={(e) => patchForm({ description: e.target.value })} rows={3} />
            </div>
          </div>
        </div>
      )}

      {/* Step 1: Roles */}
      {step === 1 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-bold text-text">Roles</h2>
            <span className="text-xs text-text-muted">
              For <span className="text-text font-semibold">{form.title}</span>
            </span>
          </div>

          {jobs.map((job, i) => (
            <div key={i} className="bg-surface-1 border border-white/10 rounded-xl p-5 space-y-4">
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-widest text-text-muted">Role {i + 1}</p>
                {jobs.length > 1 && (
                  <button onClick={() => removeJob(i)} className="text-text-muted hover:text-error transition-colors">
                    <Trash2 size={14} />
                  </button>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Role Title *</label>
                  <input className={inputCls} placeholder="e.g. Booth Staff" value={job.title} onChange={(e) => patchJob(i, { title: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Category</label>
                  <select className={inputCls} value={job.category} onChange={(e) => patchJob(i, { category: e.target.value as GigCategory })}>
                    {CATEGORIES.map(({ value, label }) => <option key={value} value={value}>{label}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Pay (₹) *</label>
                  <input className={inputCls} type="number" placeholder="0" value={job.pay_amount || ""} onChange={(e) => patchJob(i, { pay_amount: Number(e.target.value) })} />
                </div>
                <div>
                  <label className={labelCls}>Type</label>
                  <select className={inputCls} value={job.pay_type} onChange={(e) => patchJob(i, { pay_type: e.target.value as PayType })}>
                    <option value="fixed">Fixed</option>
                    <option value="hourly">Per Hour</option>
                    <option value="per_day">Per Day</option>
                  </select>
                </div>
                <div>
                  <label className={labelCls}>Slots *</label>
                  <input className={inputCls} type="number" min={1} value={job.slots_total} onChange={(e) => patchJob(i, { slots_total: Number(e.target.value) })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Shift Start</label>
                  <input className={inputCls} type="time" value={job.shift_start_time} onChange={(e) => patchJob(i, { shift_start_time: e.target.value })} />
                </div>
                <div>
                  <label className={labelCls}>Shift End</label>
                  <input className={inputCls} type="time" value={job.shift_end_time} onChange={(e) => patchJob(i, { shift_end_time: e.target.value })} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Role Description</label>
                <textarea className={`${inputCls} resize-none`} placeholder="What will runners in this role do?" value={job.description} onChange={(e) => patchJob(i, { description: e.target.value })} rows={2} />
              </div>
            </div>
          ))}

          <button
            onClick={addJob}
            className="w-full flex items-center justify-center gap-2 border border-dashed border-white/20 rounded-xl py-4 text-xs font-bold uppercase tracking-wider text-text-muted hover:text-text hover:border-white/40 transition-colors"
          >
            <Plus size={14} /> Add Another Role
          </button>

          {error && <p className="text-error text-sm">{error}</p>}
        </div>
      )}

      {/* Navigation */}
      <div className="flex items-center gap-3 mt-8">
        <button
          onClick={() => step === 0 ? router.back() : setStep(0)}
          className="flex-1 py-4 px-6 border border-white/10 text-text-muted text-xs font-bold uppercase tracking-widest rounded-lg hover:bg-white/5 hover:text-text transition-all active:scale-95"
        >
          {step === 0 ? "Cancel" : "← Back"}
        </button>
        {step === 0 ? (
          <button
            onClick={() => setStep(1)}
            disabled={!step0Valid}
            className="flex-1 py-4 px-6 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-[0_4px_20px_rgba(212,255,0,0.2)]"
          >
            Next Step
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={submitting || !step1Valid}
            className="flex-1 py-4 px-6 bg-primary text-text-inv text-xs font-black uppercase tracking-widest rounded-lg hover:brightness-110 transition-all active:scale-95 disabled:opacity-40 disabled:pointer-events-none shadow-[0_4px_20px_rgba(212,255,0,0.2)]"
          >
            {submitting ? "Creating…" : "Create Event"}
          </button>
        )}
      </div>
    </div>
  );
}
