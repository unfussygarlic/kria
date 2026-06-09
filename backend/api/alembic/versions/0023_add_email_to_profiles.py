"""Add email column to profiles and update handle_new_user trigger

Revision ID: 0023
Revises: 0022
Create Date: 2026-06-09
"""

from alembic import op

revision = "0023"
down_revision = "0022"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # Add email column (nullable — existing rows have no email)
    op.execute("ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT")
    op.execute("CREATE UNIQUE INDEX IF NOT EXISTS profiles_email_key ON profiles (email) WHERE email IS NOT NULL")

    # Update handle_new_user to store email and use EXCEPTION block so a
    # wallet-insert failure never blocks user creation.
    op.execute("""
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, email, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone'),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User')
  )
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.momentum_wallets (profile_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (profile_id) DO NOTHING;

  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Log but never block user creation
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    """)


def downgrade() -> None:
    op.execute("""
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, phone, display_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.phone, NEW.raw_user_meta_data->>'phone', ''),
    COALESCE(NEW.raw_user_meta_data->>'display_name', 'New User')
  );

  INSERT INTO public.momentum_wallets (profile_id, balance)
  VALUES (NEW.id, 0);

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    """)

    op.execute("DROP INDEX IF EXISTS profiles_email_key")
    op.execute("ALTER TABLE profiles DROP COLUMN IF EXISTS email")
