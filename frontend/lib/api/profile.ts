import { apiPost } from "./client";

export type IDType =
  | "aadhaar"
  | "pan"
  | "driving_licence"
  | "voter_id"
  | "passport";

export interface IDTypeOption {
  value: IDType;
  label: string;
  hint: string;
  placeholder: string;
}

export const ID_TYPE_OPTIONS: IDTypeOption[] = [
  {
    value: "aadhaar",
    label: "Aadhaar",
    hint: "12-digit number",
    placeholder: "1234 5678 9012",
  },
  {
    value: "pan",
    label: "PAN Card",
    hint: "5 letters, 4 digits, 1 letter",
    placeholder: "ABCDE1234F",
  },
  {
    value: "driving_licence",
    label: "Driving Licence",
    hint: "State code + licence number (min 10 chars)",
    placeholder: "KA0120210001234",
  },
  {
    value: "voter_id",
    label: "Voter ID",
    hint: "3 letters followed by 7 digits",
    placeholder: "ABC1234567",
  },
  {
    value: "passport",
    label: "Passport",
    hint: "1 letter followed by 7 digits",
    placeholder: "A1234567",
  },
];

interface VerifyIdentityResponse {
  verified: boolean;
  id_type: string;
  message: string;
}

export async function verifyIdentity(idType: IDType, idValue: string) {
  return apiPost<VerifyIdentityResponse>("/api/v1/profiles/verify-identity", {
    id_type: idType,
    id_value: idValue,
  });
}
