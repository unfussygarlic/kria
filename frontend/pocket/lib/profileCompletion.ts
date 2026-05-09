/**
 * Profile completion calculator — frontend mirror of
 * backend/api/app/services/profile_completion.py
 *
 * Design rule: to start tracking a new field, add ONE entry to
 * PROFILE_FIELDS. calculateCompletion() never needs to change.
 */

import { Profile } from "@/types/database";

interface ProfileField {
  key: keyof Profile;
  label: string;
  weight?: number;
}

// ---------------------------------------------------------------------------
// Field registry — add new fields here, nowhere else.
// ---------------------------------------------------------------------------
const PROFILE_FIELDS: ProfileField[] = [
  // Core identity (weight 1 each)
  { key: "first_name", label: "First name" },
  { key: "last_name", label: "Last name" },
  { key: "date_of_birth", label: "Date of birth" },
  { key: "gender", label: "Gender" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  // Optional enrichment (weight 0.5 each)
  { key: "bio", label: "Bio", weight: 0.5 },
  { key: "languages", label: "Languages", weight: 0.5 },
  { key: "skills", label: "Skills", weight: 0.5 },
  { key: "education_entries", label: "Education", weight: 0.5 },
  { key: "work_experience", label: "Work experience", weight: 0.5 },
  // Trust signal (weight 2)
  { key: "id_verified", label: "Identity", weight: 2 },
];

function isComplete(value: unknown): boolean {
  if (value === null || value === undefined || value === false) return false;
  if (Array.isArray(value) || typeof value === "string") return value.length > 0;
  return true;
}

export interface CompletionResult {
  percentage: number;
  missing: string[];
  completedCount: number;
  totalCount: number;
}

export function calculateCompletion(profile: Profile): CompletionResult {
  const totalWeight = PROFILE_FIELDS.reduce((s, f) => s + (f.weight ?? 1), 0);
  const completed = PROFILE_FIELDS.filter((f) => isComplete(profile[f.key]));
  const completedWeight = completed.reduce((s, f) => s + (f.weight ?? 1), 0);
  const percentage = Math.min(
    Math.round((completedWeight / totalWeight) * 100),
    100
  );
  const missing = PROFILE_FIELDS.filter(
    (f) => !isComplete(profile[f.key])
  ).map((f) => f.label);

  return {
    percentage,
    missing,
    completedCount: completed.length,
    totalCount: PROFILE_FIELDS.length,
  };
}
