"""Add verification_jobs table for async ID verification queue."""

from alembic import op

revision = "0015"
down_revision = "0014"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        CREATE TABLE IF NOT EXISTS verification_jobs (
            id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     uuid        NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            id_type     text        NOT NULL,
            status      text        NOT NULL DEFAULT 'pending',
            error_code  text,
            created_at  timestamptz NOT NULL DEFAULT now(),
            updated_at  timestamptz NOT NULL DEFAULT now()
        );

        CREATE INDEX IF NOT EXISTS idx_vj_user_type_created
            ON verification_jobs (user_id, id_type, created_at DESC);
    """)


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS verification_jobs;")
