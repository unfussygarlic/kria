// Generated types for Supabase
// Run: supabase gen types typescript --local > types/database.ts

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type WorkExperience = {
  company: string;
  role: string;
  from_year: number;
  to_year: number | null; // null = currently working
};

export type EducationEntry = {
  college: string;
  degree: string;
  field: string;
  passing_year: number;
};

export type GigCategory =
  | "event_registration" | "usher" | "booth_staff" | "promoter"
  | "sampling_promoter" | "lead_collection" | "event_helper"
  | "hospitality_staff" | "guest_management" | "front_desk"
  | "event_tech_support" | "sound_light_assistant"
  | "photographer" | "videographer" | "social_media_creator"
  | "emcee" | "other";

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
          phone: string | null;
          email: string | null;
          default_role: "runner" | "host" | null;
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
          streak_count: number;
          longest_streak: number;
          last_active_date: string | null;
          first_name: string | null;
          last_name: string | null;
          state: string | null;
          id_type: string | null;
          id_value: string | null;
          id_verified: boolean;
          id_verified_at: string | null;
          verified_id_types: string[];
          experience_summary: string | null;
          work_experience: WorkExperience[];
          education_entries: EducationEntry[];
          is_verified: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          phone?: string | null;
          email?: string | null;
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
          work_experience?: WorkExperience[];
          education_entries?: EducationEntry[];
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
          venue_lat: number | null;
          venue_lng: number | null;
          venue_formatted_address: string | null;
          cover_image_url: string | null;
          cover_image_square_url: string | null;
          created_at: string;
          updated_at: string;
          application_deadline: string | null;
          event_id: string | null;
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
          venue_lat?: number | null;
          venue_lng?: number | null;
          venue_formatted_address?: string | null;
          event_id?: string | null;
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
          otp: string | null;
          otp_verified_at: string | null;
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
      momentum_profiles: {
        Row: {
          id: string;
          user_id: string;
          // Computed FICO-style scores (300–850)
          worker_score: number;
          poster_score: number;
          // Worker signals (internal, normalized 0–1 except performance which is 0–5)
          worker_show_rate: number;
          worker_on_time_rate: number;
          worker_performance_score: number;
          worker_response_rate: number;
          worker_consistency_score: number;
          worker_penalty_points: number;
          worker_gig_count: number;
          // Host signals
          poster_payment_rate: number;
          poster_rating: number;
          poster_accuracy_rate: number;
          poster_resolution_speed: number;
          poster_penalty_points: number;
          poster_gig_count: number;
          last_calculated_at: string;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          user_id: string;
        };
        Update: {
          worker_score?: number;
          poster_score?: number;
          worker_show_rate?: number;
          worker_on_time_rate?: number;
          worker_performance_score?: number;
          worker_response_rate?: number;
          worker_consistency_score?: number;
          worker_penalty_points?: number;
          worker_gig_count?: number;
          poster_payment_rate?: number;
          poster_rating?: number;
          poster_accuracy_rate?: number;
          poster_resolution_speed?: number;
          poster_penalty_points?: number;
          poster_gig_count?: number;
          last_calculated_at?: string;
        };
      };
      conversations: {
        Row: {
          id: string;
          type: string;
          title: string | null;
          created_at: string;
          updated_at: string;
          last_message_at: string | null;
        };
        Insert: {
          type?: string;
          title?: string | null;
        };
        Update: {
          last_message_at?: string | null;
          updated_at?: string;
        };
      };
      messages: {
        Row: {
          id: string;
          conversation_id: string;
          sender_id: string;
          content: string;
          type: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          conversation_id: string;
          sender_id: string;
          content: string;
          type?: string;
          metadata?: Json | null;
        };
        Update: {
          // messages are immutable
        };
      };
    };
  };
}

export type RatingType = "worker_rating" | "poster_rating";

// Convenience types
export type MomentumProfile = Database["public"]["Tables"]["momentum_profiles"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type Gig = Database["public"]["Tables"]["gigs"]["Row"];
export type GigApplication =
  Database["public"]["Tables"]["gig_applications"]["Row"];
export type GigAssignment =
  Database["public"]["Tables"]["gig_assignments"]["Row"];
export type MomentumWallet =
  Database["public"]["Tables"]["momentum_wallets"]["Row"];

// Chat convenience types
export type Conversation = Database["public"]["Tables"]["conversations"]["Row"];
// ConversationParticipant is not in the Database type (composite PK table, not directly queried by client)
export interface ConversationParticipant {
  conversation_id: string;
  user_id: string;
  joined_at: string;
  last_read_at: string | null;
}
export type Message = Database["public"]["Tables"]["messages"]["Row"];

// Chat types from FastAPI responses
export interface ConversationSummary {
  id: string;
  type: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  last_message_content: string | null;
  last_message_sender_id: string | null;
  last_message_at: string | null;
  unread_count: number;
  created_at: string;
}

export interface ConversationCreatedResponse {
  id: string;
  type: string;
  other_user_id: string;
  other_user_name: string;
  other_user_avatar: string | null;
  created_at: string;
  is_new: boolean;
}

export interface MessagesPage {
  messages: Message[];
  has_more: boolean;
}

// Event types (from FastAPI — not stored in Supabase client schema)
export interface EventJobSummary {
  id: string;
  title: string;
  category: GigCategory;
  pay_amount: number;
  pay_type: PayType;
  slots_total: number;
  slots_filled: number;
  status: GigStatus;
  application_count: number;
  shift_start_time: string;
  shift_end_time: string;
}

export interface EventResponse {
  id: string;
  poster_id: string;
  title: string;
  description: string | null;
  venue_name: string;
  city: string;
  state: string | null;
  event_date: string;
  event_end_date: string | null;
  is_multi_day: boolean;
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
  total_applicants: number;
  created_at: string;
}
