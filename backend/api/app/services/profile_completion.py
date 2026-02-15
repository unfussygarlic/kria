"""Profile completion calculator.

Design principle: data-driven. To start tracking a new profile field,
add ONE entry to PROFILE_FIELDS. The calculate_completion() function
never needs to change.
"""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class ProfileField:
    key: str
    label: str
    weight: float = 1.0


# ---------------------------------------------------------------------------
# Field registry — add new fields here, nowhere else.
# ---------------------------------------------------------------------------
PROFILE_FIELDS: list[ProfileField] = [
    # Core identity (weight 1.0 each → 6 pts total)
    ProfileField("first_name", "First name"),
    ProfileField("last_name", "Last name"),
    ProfileField("date_of_birth", "Date of birth"),
    ProfileField("gender", "Gender"),
    ProfileField("city", "City"),
    ProfileField("state", "State"),
    # Optional enrichment (weight 0.5 each → 2.5 pts total)
    ProfileField("bio", "Bio", weight=0.5),
    ProfileField("languages", "Languages", weight=0.5),
    ProfileField("skills", "Skills", weight=0.5),
    ProfileField("college_name", "Education", weight=0.5),
    ProfileField("experience_summary", "Work experience", weight=0.5),
    # Trust signal (weight 2.0 → 2 pts)
    ProfileField("id_verified", "Identity verified", weight=2.0),
]
# Total possible weight: 10.5


def _is_complete(value: Any) -> bool:
    """Return True if a profile field has a meaningful value."""
    if value is None or value is False:
        return False
    if isinstance(value, (list, str)) and len(value) == 0:
        return False
    return True


def calculate_completion(profile: dict) -> dict:
    """
    Calculate profile completion from a raw profile dict.

    Returns:
        percentage      — 0–100 integer
        missing_fields  — list of human-readable labels for unfilled fields
        completed_fields — count of completed fields
        total_fields    — total number of tracked fields
    """
    total_weight = sum(f.weight for f in PROFILE_FIELDS)
    completed = [f for f in PROFILE_FIELDS if _is_complete(profile.get(f.key))]
    completed_weight = sum(f.weight for f in completed)
    percentage = min(round(completed_weight / total_weight * 100), 100)
    missing = [
        f.label for f in PROFILE_FIELDS if not _is_complete(profile.get(f.key))
    ]
    return {
        "percentage": percentage,
        "missing_fields": missing,
        "completed_fields": len(completed),
        "total_fields": len(PROFILE_FIELDS),
    }
