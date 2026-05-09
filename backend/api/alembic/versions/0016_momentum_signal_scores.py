"""Add signal_scores JSONB column to momentum_profiles.

Replaces individual signal columns as the storage layer for computed signal values.
The registry auto-discovers signals from momentum/signals/*.py — adding a column
per signal is no longer required when a new signal file is added.

Revision ID: 0016
Revises: 0015
Create Date: 2026-05-07
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects.postgresql import JSONB

revision = "0016"
down_revision = "0015"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "momentum_profiles",
        sa.Column(
            "signal_scores",
            JSONB,
            nullable=False,
            server_default="{}",
        ),
    )

    # Migrate existing individual signal column data into JSONB
    op.execute("""
        UPDATE momentum_profiles
        SET signal_scores = jsonb_strip_nulls(jsonb_build_object(
            'show_rate',             worker_show_rate,
            'on_time_rate',          worker_on_time_rate,
            'performance_score',     worker_performance_score,
            'communication_score',   worker_communication_score,
            'professionalism_score', worker_professionalism_score
        ))
        WHERE signal_scores = '{}'
    """)


def downgrade() -> None:
    op.drop_column("momentum_profiles", "signal_scores")
