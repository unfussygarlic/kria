-- Fix handle_new_user trigger to support email-based dev auth.
-- In development, users are created with email+password (not phone) to avoid
-- real SMS. The phone is passed via raw_user_meta_data instead of NEW.phone.

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
