"""Add performance indexes for momentum signal queries

Revision ID: 0020
Revises: 0019
Create Date: 2026-05-30
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0020"
down_revision: Union[str, None] = "0019"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Composite index on gig_assignments(worker_id, status).
    # Every momentum signal query filters by both columns — without this,
    # each signal compute does a full table scan.
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_gig_assignments_worker_status
        ON gig_assignments(worker_id, status)
    """)

    # Composite index on ratings(ratee_id, rating_type).
    # The performance, communication, and professionalism signals all filter
    # by both columns on every recalculation.
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ratings_ratee_type
        ON ratings(ratee_id, rating_type)
    """)

    # Index on user_badges(profile_id) for the one-time badge sync COUNT check.
    op.execute("""
        CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_badges_profile_id
        ON user_badges(profile_id)
    """)


def downgrade() -> None:
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_gig_assignments_worker_status")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_ratings_ratee_type")
    op.execute("DROP INDEX CONCURRENTLY IF EXISTS idx_user_badges_profile_id")
