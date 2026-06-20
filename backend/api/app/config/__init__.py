from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase
    supabase_url: str
    supabase_service_key: str
    supabase_jwt_secret: str

    # Database
    database_url: str

    # App
    environment: str = "development"
    api_version: str = "v1"

    # Recommendations
    google_maps_api_key: str = ""

    # Subscriptions — change here to adjust the trial for NEW sign-ups only.
    # Existing users keep whatever trial_duration_days is stored in their subscriptions row.
    default_trial_days: int = 90

    # Email
    resend_api_key: str = ""
    email_webhook_secret: str = ""  # Shared secret for Supabase → FastAPI webhooks
    app_base_url: str = "https://grid.trykria.com"

    # Fast2SMS — API key only; template sender IDs and message IDs live in sms_notifications/templates.py
    fast2sms_api_key: str = ""
    gotrue_hook_secret: str = ""    # Format: "v1,whsec_<base64>" — must match GOTRUE_HOOK_SEND_SMS_SECRETS


settings = Settings()
