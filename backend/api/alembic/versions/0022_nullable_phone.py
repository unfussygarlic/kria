"""Make profiles.phone nullable for email-auth (Grid) users

Revision ID: 0022
Revises: 0021
Create Date: 2026-06-06
"""
from typing import Sequence, Union

from alembic import op

revision: str = "0022"
down_revision: Union[str, None] = "0021"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.execute("ALTER TABLE profiles ALTER COLUMN phone DROP NOT NULL")


def downgrade() -> None:
    op.execute("UPDATE profiles SET phone = '' WHERE phone IS NULL")
    op.execute("ALTER TABLE profiles ALTER COLUMN phone SET NOT NULL")
