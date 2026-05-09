"""Revamp gig_category enum to India-focused grouped role taxonomy.

Old flat 14-value enum → new 17-value enum with logical groupings.
Existing rows are migrated to the closest new value before the type swap.

Revision ID: 0018
Revises: 0017
Create Date: 2026-05-09
"""

from alembic import op

revision = "0018"
down_revision = "0017"
branch_labels = None
depends_on = None

NEW_VALUES = (
    "event_registration", "usher", "booth_staff", "promoter",
    "sampling_promoter", "lead_collection", "event_helper",
    "hospitality_staff", "guest_management", "front_desk",
    "event_tech_support", "sound_light_assistant",
    "photographer", "videographer", "social_media_creator",
    "emcee", "other",
)

OLD_VALUES = (
    "registration_desk", "ushering", "booth_staff", "brand_ambassador",
    "sampling", "lead_generation", "hospitality", "tech_support",
    "photography", "social_media", "anchoring", "promotional",
    "general_support", "other",
)


def upgrade() -> None:
    # Drop trigger that blocks ALTER COLUMN TYPE (will recreate identically after)
    op.execute("DROP TRIGGER IF EXISTS trg_gigs_search_vector ON gigs")

    # 1. Detach column from old enum (CASCADE drops get_nearby_gigs function too)
    op.execute("ALTER TABLE gigs ALTER COLUMN category TYPE text USING category::text")
    op.execute("DROP TYPE IF EXISTS gig_category CASCADE")

    # 2. Remap old values to new ones
    op.execute("""
        UPDATE gigs SET category = CASE category
            WHEN 'registration_desk' THEN 'event_registration'
            WHEN 'ushering'          THEN 'usher'
            WHEN 'brand_ambassador'  THEN 'promoter'
            WHEN 'sampling'          THEN 'sampling_promoter'
            WHEN 'lead_generation'   THEN 'lead_collection'
            WHEN 'hospitality'       THEN 'hospitality_staff'
            WHEN 'tech_support'      THEN 'event_tech_support'
            WHEN 'photography'       THEN 'photographer'
            WHEN 'social_media'      THEN 'social_media_creator'
            WHEN 'anchoring'         THEN 'emcee'
            WHEN 'promotional'       THEN 'promoter'
            WHEN 'general_support'   THEN 'event_helper'
            ELSE category
        END
    """)

    # 3. Create new enum and restore column type
    enum_vals = ", ".join(f"'{v}'" for v in NEW_VALUES)
    op.execute(f"CREATE TYPE gig_category AS ENUM ({enum_vals})")
    op.execute(
        "ALTER TABLE gigs ALTER COLUMN category TYPE gig_category "
        "USING category::gig_category"
    )

    # Recreate get_nearby_gigs with new category type
    op.execute("""
        CREATE OR REPLACE FUNCTION public.get_nearby_gigs(
            p_location geography,
            p_radius_km numeric DEFAULT 50,
            p_category gig_category DEFAULT NULL::gig_category,
            p_city text DEFAULT NULL::text
        )
        RETURNS SETOF gigs
        LANGUAGE plpgsql STABLE AS $$
        BEGIN
          RETURN QUERY
          SELECT g.* FROM gigs g
          WHERE g.status = 'open'
            AND g.event_date >= CURRENT_DATE
            AND (p_city IS NULL OR g.city = p_city)
            AND (p_category IS NULL OR g.category = p_category)
            AND ST_DWithin(g.location_point, p_location, p_radius_km * 1000)
          ORDER BY g.momentum_boost DESC, g.event_date ASC, g.created_at DESC;
        END;
        $$
    """)

    # Recreate the search-vector trigger
    op.execute(
        "CREATE TRIGGER trg_gigs_search_vector "
        "BEFORE INSERT OR UPDATE OF title, description, category ON public.gigs "
        "FOR EACH ROW EXECUTE FUNCTION gigs_search_vector_update()"
    )


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS trg_gigs_search_vector ON gigs")
    op.execute("ALTER TABLE gigs ALTER COLUMN category TYPE text USING category::text")
    op.execute("DROP TYPE IF EXISTS gig_category CASCADE")

    # Reverse-map new → old (best-effort; promoter had two sources, pick brand_ambassador)
    op.execute("""
        UPDATE gigs SET category = CASE category
            WHEN 'event_registration'   THEN 'registration_desk'
            WHEN 'usher'                THEN 'ushering'
            WHEN 'promoter'             THEN 'brand_ambassador'
            WHEN 'sampling_promoter'    THEN 'sampling'
            WHEN 'lead_collection'      THEN 'lead_generation'
            WHEN 'event_helper'         THEN 'general_support'
            WHEN 'hospitality_staff'    THEN 'hospitality'
            WHEN 'guest_management'     THEN 'hospitality'
            WHEN 'front_desk'           THEN 'hospitality'
            WHEN 'event_tech_support'   THEN 'tech_support'
            WHEN 'sound_light_assistant' THEN 'tech_support'
            WHEN 'photographer'         THEN 'photography'
            WHEN 'videographer'         THEN 'photography'
            WHEN 'social_media_creator' THEN 'social_media'
            WHEN 'emcee'                THEN 'anchoring'
            ELSE category
        END
    """)

    enum_vals = ", ".join(f"'{v}'" for v in OLD_VALUES)
    op.execute(f"CREATE TYPE gig_category AS ENUM ({enum_vals})")
    op.execute(
        "ALTER TABLE gigs ALTER COLUMN category TYPE gig_category "
        "USING category::gig_category"
    )
    op.execute("""
        CREATE OR REPLACE FUNCTION public.get_nearby_gigs(
            p_location geography,
            p_radius_km numeric DEFAULT 50,
            p_category gig_category DEFAULT NULL::gig_category,
            p_city text DEFAULT NULL::text
        )
        RETURNS SETOF gigs
        LANGUAGE plpgsql STABLE AS $$
        BEGIN
          RETURN QUERY
          SELECT g.* FROM gigs g
          WHERE g.status = 'open'
            AND g.event_date >= CURRENT_DATE
            AND (p_city IS NULL OR g.city = p_city)
            AND (p_category IS NULL OR g.category = p_category)
            AND ST_DWithin(g.location_point, p_location, p_radius_km * 1000)
          ORDER BY g.momentum_boost DESC, g.event_date ASC, g.created_at DESC;
        END;
        $$
    """)
    op.execute(
        "CREATE TRIGGER trg_gigs_search_vector "
        "BEFORE INSERT OR UPDATE OF title, description, category ON public.gigs "
        "FOR EACH ROW EXECUTE FUNCTION gigs_search_vector_update()"
    )
