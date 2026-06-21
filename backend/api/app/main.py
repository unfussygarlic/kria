import asyncio
from contextlib import asynccontextmanager

from apscheduler.schedulers.asyncio import AsyncIOScheduler
from apscheduler.triggers.cron import CronTrigger
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import engine
from app.momentum import router as momentum
from app.recommendations import router as recommendations
from app.routers import account, admin as admin_router, applicants, badges, chat, email as email_router, events, gigs, health, profiles, ratings, search, subscriptions, support as support_router
from app.sms_notifications.hook import router as sms_hook_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Mark any pending/processing jobs as failed — they were in the in-memory queue
    # when the server last restarted and will never be processed now.
    from app.db.session import AsyncSessionLocal
    from sqlalchemy import text as _text
    async with AsyncSessionLocal() as db:
        await db.execute(_text("""
            UPDATE verification_jobs
            SET status = 'failed', error_code = 'service_unavailable', updated_at = now()
            WHERE status IN ('pending', 'processing')
        """))
        await db.commit()

    # Verification worker
    from app.services.verification_queue import worker
    task = asyncio.create_task(worker())

    # Scheduled jobs
    from app.email.notifications import send_profile_reminders
    from app.notifications.push import send_shift_reminders
    scheduler = AsyncIOScheduler()
    scheduler.add_job(send_profile_reminders, CronTrigger(hour=9, minute=0))
    scheduler.add_job(send_shift_reminders, "interval", minutes=5)
    scheduler.start()

    try:
        yield
    finally:
        scheduler.shutdown(wait=False)
        task.cancel()
        try:
            await task
        except asyncio.CancelledError:
            pass
        await engine.dispose()


app = FastAPI(
    title="Kria API",
    version=settings.api_version,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

_PROD_ORIGINS = [
    "https://trykria.com",
    "https://www.trykria.com",
    "https://grid.trykria.com",
    "https://admin.trykria.com",
]

# allow_credentials=True + allow_origins=["*"] is invalid per the CORS spec —
# browsers require the server to echo the exact origin when credentials are in
# play. Starlette ≥ 0.27 returns 400 on preflight for that combination.
# In dev we list the known local origins explicitly; in prod we use the real domains.
_DEV_ORIGINS = [
    "http://localhost:3000",   # Grid (Next.js dev)
    "http://localhost:3002",   # Admin dashboard
    "http://localhost:8081",   # Expo Metro
    "exp://localhost:8081",    # Expo Go
    "http://127.0.0.1:3000",
    "http://127.0.0.1:3002",
    "http://127.0.0.1:8081",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=_DEV_ORIGINS if settings.environment == "development" else _PROD_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(gigs.router,       prefix=f"/api/{settings.api_version}")
app.include_router(profiles.router,   prefix=f"/api/{settings.api_version}")
app.include_router(applicants.router, prefix=f"/api/{settings.api_version}")
app.include_router(events.router,     prefix=f"/api/{settings.api_version}")
app.include_router(chat.router,       prefix=f"/api/{settings.api_version}")
app.include_router(momentum.router,   prefix=f"/api/{settings.api_version}")
app.include_router(ratings.router,    prefix=f"/api/{settings.api_version}")
app.include_router(badges.router,     prefix=f"/api/{settings.api_version}")
app.include_router(search.router,          prefix=f"/api/{settings.api_version}")
app.include_router(recommendations.router, prefix=f"/api/{settings.api_version}")
app.include_router(account.router,         prefix=f"/api/{settings.api_version}")
app.include_router(subscriptions.router,   prefix=f"/api/{settings.api_version}")
app.include_router(email_router.router,    prefix=f"/api/{settings.api_version}")
app.include_router(sms_hook_router,        prefix=f"/api/{settings.api_version}")
app.include_router(admin_router.router,    prefix=f"/api/{settings.api_version}")
app.include_router(support_router.router,  prefix=f"/api/{settings.api_version}")
