export type MomentumBand = "newcomer" | "building" | "reliable" | "trusted" | "elite" | "legend";

export function getBand(score: number | null): { band: MomentumBand; color: string; label: string } {
  if (score === null || score < 100) return { band: "newcomer", color: "#777575", label: "Newcomer" };
  if (score < 300) return { band: "building", color: "#ff7351", label: "Building" };
  if (score < 500) return { band: "reliable", color: "#8097ff", label: "Reliable" };
  if (score < 700) return { band: "trusted",  color: "#FFC83D", label: "Trusted" };
  if (score < 900) return { band: "elite",    color: "#D4FF00", label: "Elite" };
  return              { band: "legend",    color: "#ffffff", label: "Legend" };
}

export interface AdminProfile {
  id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  email: string | null;
  phone: string | null;
  city: string | null;
  state: string | null;
  default_role: "runner" | "host" | null;
  is_verified: boolean | null;
  is_active: boolean | null;
  is_admin: boolean | null;
  created_at: string;
  worker_score: number | null;
  poster_score: number | null;
  total_gigs_completed: number | null;
  total_gigs_posted: number | null;
}

export interface SupportTicket {
  id: string;
  user_id: string | null;
  category: string;
  subject: string;
  message: string;
  email: string;
  status: "open" | "in_progress" | "resolved";
  admin_note: string | null;
  created_at: string;
  updated_at: string;
  submitter_name?: string | null;
}

export interface VerificationJob {
  id: string;
  user_id: string;
  id_type: string;
  status: "pending" | "processing" | "approved" | "failed";
  error_code: string | null;
  created_at: string;
  updated_at: string;
  user_name?: string;
}

export interface OverviewStats {
  total_users: number;
  total_runners: number;
  total_hosts: number;
  active_gigs: number;
  open_tickets: number;
  pending_verifications: number;
  trials_expiring_soon: number;
  applications_7d: number;
  user_growth_7d: number[];
  gig_growth_7d: number[];
}
