// Generated types for Supabase
// Run: supabase gen types typescript --local > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type GigCategory =
  | "registration_desk"
  | "ushering"
  | "booth_staff"
  | "brand_ambassador"
  | "sampling"
  | "lead_generation"
  | "hospitality"
  | "tech_support"
  | "photography"
  | "social_media"
  | "anchoring"
  | "promotional"
  | "general_support"
  | "other";

export type PayType = "fixed" | "hourly" | "per_day";

export type GigStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "completed"
  | "cancelled";

export type ApplicationStatus =
  | "pending"
  | "accepted"
  | "rejected"
  | "withdrawn";

export type AssignmentStatus =
  | "assigned"
  | "checked_in"
  | "completed"
  | "no_show"
  | "left_early"
  | "disputed";

export type GenderType = "male" | "female" | "other" | "prefer_not_to_say" | "non_binary";

export type GenderPreference = "any" | "male" | "female";

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          phone: string;
          display_name: string;
          avatar_url: string | null;
          bio: string | null;
          date_of_birth: string | null;
          gender: GenderType | null;
          location_label: string | null;
          city: string | null;
          is_student: boolean;
          college_name: string | null;
          college_year: number | null;
          course: string | null;
          college_id_verified: boolean;
          languages: string[];
          skills: string[];
          worker_reputation: number | null;
          poster_reputation: number | null;
          total_gigs_completed: number;
          total_gigs_posted: number;
          reliability_score: number;
          no_show_count: number;
          first_name: string | null;
          last_name: string | null;
          state: string | null;
          id_type: string | null;
          id_value: string | null;
          id_verified: boolean;
          id_verified_at: string | null;
          experience_summary: string | null;
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone: string;
          display_name: string;
          avatar_url?: string | null;
          bio?: string | null;
          date_of_birth?: string | null;
          gender?: GenderType | null;
          location_label?: string | null;
          city?: string | null;
          is_student?: boolean;
          college_name?: string | null;
          college_year?: number | null;
          course?: string | null;
          languages?: string[];
          skills?: string[];
          first_name?: string | null;
          last_name?: string | null;
          state?: string | null;
          id_type?: string | null;
          id_value?: string | null;
          id_verified?: boolean;
          id_verified_at?: string | null;
          experience_summary?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
      };
      gigs: {
        Row: {
          id: string;
          poster_id: string;
          title: string;
          description: string | null;
          category: GigCategory;
          company_name: string | null;
          event_name: string | null;
          pay_amount: number;
          pay_type: PayType;
          venue_name: string;
          location_label: string | null;
          city: string;
          event_date: string;
          event_end_date: string | null;
          shift_start_time: string;
          shift_end_time: string;
          report_time: string | null;
          is_multi_day: boolean;
          slots_total: number;
          slots_filled: number;
          gender_preference: GenderPreference;
          min_age: number | null;
          max_age: number | null;
          dress_code: string | null;
          languages_required: string[];
          skills_required: string[];
          experience_required: boolean;
          requirements_note: string | null;
          status: GigStatus;
          momentum_boost: number;
          created_at: string;
          updated_at: string;
          application_deadline: string | null;
        };
        Insert: {
          poster_id: string;
          title: string;
          category: GigCategory;
          pay_amount: number;
          venue_name: string;
          city: string;
          event_date: string;
          shift_start_time: string;
          shift_end_time: string;
          description?: string | null;
          company_name?: string | null;
          event_name?: string | null;
          pay_type?: PayType;
          location_label?: string | null;
          event_end_date?: string | null;
          report_time?: string | null;
          is_multi_day?: boolean;
          slots_total?: number;
          gender_preference?: GenderPreference;
          min_age?: number | null;
          max_age?: number | null;
          dress_code?: string | null;
          languages_required?: string[];
          skills_required?: string[];
          experience_required?: boolean;
          requirements_note?: string | null;
          status?: GigStatus;
        };
        Update: Partial<Database["public"]["Tables"]["gigs"]["Insert"]>;
      };
      gig_applications: {
        Row: {
          id: string;
          gig_id: string;
          applicant_id: string;
          message: string | null;
          status: ApplicationStatus;
          applied_at: string;
          responded_at: string | null;
        };
        Insert: {
          gig_id: string;
          applicant_id: string;
          message?: string | null;
        };
        Update: {
          status?: ApplicationStatus;
          responded_at?: string;
        };
      };
      gig_assignments: {
        Row: {
          id: string;
          gig_id: string;
          worker_id: string;
          status: AssignmentStatus;
          assigned_at: string;
          checked_in_at: string | null;
          completed_at: string | null;
          worker_confirmed: boolean;
          poster_confirmed: boolean;
        };
        Insert: {
          gig_id: string;
          worker_id: string;
        };
        Update: {
          status?: AssignmentStatus;
          checked_in_at?: string;
          completed_at?: string;
          worker_confirmed?: boolean;
          poster_confirmed?: boolean;
        };
      };
      momentum_wallets: {
        Row: {
          id: string;
          profile_id: string;
          balance: number;
          lifetime_earned: number;
          lifetime_spent: number;
          updated_at: string;
        };
        Insert: {
          profile_id: string;
          balance?: number;
        };
        Update: {
          balance?: number;
          lifetime_earned?: number;
          lifetime_spent?: number;
        };
      };
    };
  };
}

// Convenience types
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Gig = Database["public"]["Tables"]["gigs"]["Row"];
export type GigApplication =
  Database["public"]["Tables"]["gig_applications"]["Row"];
export type GigAssignment =
  Database["public"]["Tables"]["gig_assignments"]["Row"];
export type MomentumWallet =
  Database["public"]["Tables"]["momentum_wallets"]["Row"];
