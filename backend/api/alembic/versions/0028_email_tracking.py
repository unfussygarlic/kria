"""Email notification tracking tables and columns.

Revision ID: 0028
Revises: 0027
Create Date: 2026-06-10
"""

from alembic import op

revision = "0028"
down_revision = "0027"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("""
        -- Track whether a gig's first-application email has been sent
        ALTER TABLE gigs
            ADD COLUMN IF NOT EXISTS first_application_notified BOOLEAN NOT NULL DEFAULT FALSE;

        -- Track the last time a burst email was sent for a gig
        ALTER TABLE gigs
            ADD COLUMN IF NOT EXISTS last_burst_email_at TIMESTAMPTZ;

        -- User-level email unsubscribe registry
        CREATE TABLE IF NOT EXISTS email_unsubscribes (
            id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id     UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
            email       TEXT NOT NULL,
            category    TEXT NOT NULL DEFAULT 'reminders',
            unsubscribed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (user_id, category)
        );

        -- Prevent spamming profile-incomplete reminders
        CREATE TABLE IF NOT EXISTS profile_reminder_log (
            user_id     UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
            last_sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            send_count  INT NOT NULL DEFAULT 1
        );
    """)


def downgrade() -> None:
    op.execute("""
        DROP TABLE IF EXISTS profile_reminder_log;
        DROP TABLE IF EXISTS email_unsubscribes;
        ALTER TABLE gigs DROP COLUMN IF EXISTS last_burst_email_at;
        ALTER TABLE gigs DROP COLUMN IF EXISTS first_application_notified;
    """)
