// ── Profile sub-types ─────────────────────────────────────────────────────────

export interface WorkExperience {
  company: string;
  role: string;
  from_year: number;
  to_year: number | null;
}

export interface EducationEntry {
  college: string;
  degree: string;
  field: string;
  passing_year: number;
}

// ── Momentum ──────────────────────────────────────────────────────────────────

export interface BreakdownItem {
  key: string;
  label: string;
  description: string;
  bar_value: number;
  contribution: number;
  has_data: boolean;
}

export interface ProfileSignalItem {
  key: string;
  label: string;
  description: string;
  points: number;
  earned: boolean;
}

export interface MomentumBreakdownResponse {
  score: {
    score: number;
    band_key: string;
    band_label: string;
    band_color: string;
    gig_count: number;
    profile_points: number;
  };
  signals: BreakdownItem[];
  profile_signals: ProfileSignalItem[];
}

// ── Enums ─────────────────────────────────────────────────────────────────────

export type GigCategory =
  | "event_registration" | "usher" | "booth_staff" | "promoter"
  | "sampling_promoter" | "lead_collection" | "event_helper"
  | "hospitality_staff" | "guest_management" | "front_desk"
  | "event_tech_support" | "sound_light_assistant"
  | "photographer" | "videographer" | "social_media_creator"
  | "emcee" | "other";

export type GigStatus = "draft" | "open" | "in_progress" | "completed" | "cancelled";
export type PayType = "fixed" | "hourly" | "per_day";
export type ApplicationStatus = "pending" | "accepted" | "rejected" | "withdrawn";
export type AssignmentStatus = "assigned" | "checked_in" | "completed" | "no_show" | "left_early" | "disputed";
export type GenderPreference = "any" | "male" | "female";

// ── Core models ───────────────────────────────────────────────────────────────

export interface Profile {
  id: string;
  phone: string | null;
  phone_verified: boolean;
  email: string | null;
  default_role: "runner" | "host" | null;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  location_label: string | null;
  city: string | null;
  state: string | null;
  gender: string | null;
  date_of_birth: string | null;
  is_student: boolean;
  college_name: string | null;
  college_year: number | null;
  course: string | null;
  college_id_verified: boolean;
  languages: string[];
  skills: string[];
  worker_reputation: number;
  poster_reputation: number;
  total_gigs_completed: number;
  total_gigs_posted: number;
  reliability_score: number;
  no_show_count: number;
  streak_count: number;
  longest_streak: number;
  last_active_date: string | null;
  is_verified: boolean;
  id_verified: boolean;
  id_type: string | null;
  id_value: string | null;
  id_verified_at: string | null;
  verified_id_types: string[];
  experience_summary: string | null;
  created_at: string;
  updated_at: string;
}

export interface Gig {
  id: string;
  poster_id: string;
  event_id: string | null;
  title: string;
  description: string;
  category: GigCategory;
  company_name: string | null;
  pay_amount: number;
  pay_type: PayType;
  venue_name: string;
  city: string;
  event_date: string;
  event_end_date: string | null;
  shift_start_time: string;
  shift_end_time: string;
  report_time: string | null;
  is_multi_day: boolean;
  slots_total: number;
  slots_filled: number;
  gender_preference: GenderPreference | null;
  dress_code: string | null;
  languages_required: string[];
  skills_required: string[];
  experience_required: boolean;
  requirements_note: string | null;
  status: GigStatus;
  is_paused: boolean;
  momentum_boost: number;
  cover_image_url: string | null;
  cover_image_square_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApplicantProfile {
  id: string;
  display_name: string;
  first_name: string | null;
  last_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  city: string | null;
  gender: string | null;
  worker_reputation: number;
  total_gigs_completed: number;
  reliability_score: number;
  is_verified: boolean;
  id_verified: boolean;
  languages: string[];
  skills: string[];
  work_experience: WorkExperience[];
  education_entries: EducationEntry[];
}

export interface ApplicantListItem {
  application_id: string;
  status: ApplicationStatus;
  applied_at: string;
  responded_at: string | null;
  message: string | null;
  applicant: ApplicantProfile;
  assignment_id: string | null;
  assignment_status: AssignmentStatus | null;
  assignment_otp: string | null;
  has_been_rated: boolean;
  momentum_score: number | null;
}

export interface ApplicantListResponse {
  gig_id: string;
  total: number;
  applicants: ApplicantListItem[];
}

export interface ApplicationActionResponse {
  ok: boolean;
  application_id: string;
  new_status: string;
  message: string;
}

export interface GlobalApplicantItem extends ApplicantListItem {
  momentum_score: number | null;
  gig_id: string;
  gig_title: string;
  gig_date: string;
  gig_city: string;
  gig_slots_filled: number;
  gig_slots_total: number;
}

export interface GlobalApplicantListResponse {
  total: number;
  pending_count: number;
  applicants: GlobalApplicantItem[];
}

// ── Events ────────────────────────────────────────────────────────────────────

export interface EventJobSummary {
  id: string;
  title: string;
  category: GigCategory;
  shift_start_time: string;
  shift_end_time: string;
  pay_amount: number;
  pay_type: PayType;
  slots_total: number;
  slots_filled: number;
  application_count: number;
  status: GigStatus;
  is_paused: boolean;
}

export interface EventResponse {
  id: string;
  poster_id: string;
  title: string;
  venue_name: string;
  city: string;
  event_date: string;
  event_end_date: string | null;
  is_multi_day: boolean;
  description: string | null;
  status: string;
  created_at: string;
  jobs: EventJobSummary[];
}

export interface MyEventSummary {
  id: string;
  title: string;
  venue_name: string;
  city: string;
  event_date: string;
  status: string;
  job_count: number;
  total_slots: number;
  slots_filled: number;
  total_applicants: number;
  created_at: string;
}

export interface JobInEventCreate {
  title: string;
  description: string;
  category: GigCategory;
  pay_amount: number;
  pay_type: PayType;
  shift_start_time: string;
  shift_end_time: string;
  report_time?: string;
  slots_total: number;
  dress_code?: string;
  gender_preference?: GenderPreference;
  languages_required?: string[];
  requirements_note?: string;
  experience_required?: boolean;
}

export interface EventCreatePayload {
  title: string;
  venue_name: string;
  city: string;
  event_date: string;
  event_end_date?: string;
  is_multi_day?: boolean;
  description?: string;
  jobs: JobInEventCreate[];
}
