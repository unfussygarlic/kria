"""Defer profile creation to onboarding; move wallet creation to profiles trigger

Previously, handle_new_user created a profile row the moment auth.users was
inserted — which happens when signInWithOtp() sends the email/phone OTP, before
the user has verified anything. This meant:
  1. Abandoned sign-ups left ghost rows in profiles.
  2. Grid's onboarding check found the auto-created row and skipped onboarding.

Fix:
  - handle_new_user becomes a no-op (profile is created explicitly at onboarding).
  - New on_profile_created trigger on public.profiles auto-creates the
    momentum_wallet when the profile row is first inserted.

Revision ID: 0024
Revises: 0023
Create Date: 2026-06-10
"""

from alembic import op

revision = "0024"
down_revision = "0023"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # handle_new_user no longer touches profiles or wallets.
    # Profile is created explicitly at onboarding completion.
    op.execute("""
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    """)

    # Wallet is created automatically when a profile row is first inserted.
    op.execute("""
CREATE OR REPLACE FUNCTION create_wallet_for_profile()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.momentum_wallets (profile_id, balance)
  VALUES (NEW.id, 0)
  ON CONFLICT (profile_id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    """)

    op.execute("""
CREATE TRIGGER on_profile_created
  AFTER INSERT ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION create_wallet_for_profile();
    """)


def downgrade() -> None:
    op.execute("DROP TRIGGER IF EXISTS on_profile_created ON public.profiles")
    op.execute("DROP FUNCTION IF EXISTS create_wallet_for_profile()")

    # Restore original handle_new_user
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
  RAISE WARNING 'handle_new_user failed for user %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
    """)
