"""Pydantic models for profile-related endpoints."""

import re
from enum import Enum

from pydantic import BaseModel, model_validator


class IDType(str, Enum):
    AADHAAR = "aadhaar"
    PAN = "pan"
    DRIVING_LICENCE = "driving_licence"
    VOTER_ID = "voter_id"
    PASSPORT = "passport"


# Human-readable format hints surfaced to the frontend
ID_FORMAT_HINTS: dict[IDType, str] = {
    IDType.AADHAAR: "12-digit number (e.g. 1234 5678 9012)",
    IDType.PAN: "10-character alphanumeric (e.g. ABCDE1234F)",
    IDType.DRIVING_LICENCE: "State code + number, min 10 characters",
    IDType.VOTER_ID: "3 letters + 7 digits (e.g. ABC1234567)",
    IDType.PASSPORT: "1 letter + 7 digits (e.g. A1234567)",
}


class IdentityVerificationRequest(BaseModel):
    id_type: IDType
    id_value: str

    @model_validator(mode="after")
    def validate_and_normalise(self) -> "IdentityVerificationRequest":
        value = self.id_value.strip().replace(" ", "").upper()

        if self.id_type == IDType.AADHAAR:
            if not re.match(r"^\d{12}$", value):
                raise ValueError("Aadhaar number must be exactly 12 digits")

        elif self.id_type == IDType.PAN:
            if not re.match(r"^[A-Z]{5}[0-9]{4}[A-Z]$", value):
                raise ValueError(
                    "PAN must be 10 characters: 5 letters, 4 digits, 1 letter "
                    "(e.g. ABCDE1234F)"
                )

        elif self.id_type == IDType.DRIVING_LICENCE:
            if len(value) < 10:
                raise ValueError(
                    "Driving licence number must be at least 10 characters"
                )

        elif self.id_type == IDType.VOTER_ID:
            if not re.match(r"^[A-Z]{3}[0-9]{7}$", value):
                raise ValueError(
                    "Voter ID must be 3 letters followed by 7 digits (e.g. ABC1234567)"
                )

        elif self.id_type == IDType.PASSPORT:
            if not re.match(r"^[A-Z][0-9]{7}$", value):
                raise ValueError(
                    "Passport number must be 1 letter followed by 7 digits (e.g. A1234567)"
                )

        self.id_value = value
        return self


class IdentityVerificationResponse(BaseModel):
    verified: bool
    id_type: str
    message: str
