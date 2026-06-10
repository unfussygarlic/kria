import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import engine
from app.momentum import router as momentum
from app.recommendations import router as recommendations
from app.routers import account, applicants, badges, chat, events, gigs, health, profiles, ratings, search, subscriptions


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Start async verification worker — single consumer serialises Inspector calls
    from app.services.verification_queue import worker
    task = asyncio.create_task(worker())
    try:
        yield
    finally:
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
]

# allow_credentials=True + allow_origins=["*"] is invalid per the CORS spec —
# browsers require the server to echo the exact origin when credentials are in
# play. Starlette ≥ 0.27 returns 400 on preflight for that combination.
# In dev we list the known local origins explicitly; in prod we use the real domains.
_DEV_ORIGINS = [
    "http://localhost:3000",   # Grid (Next.js dev)
    "http://localhost:8081",   # Expo Metro
    "exp://localhost:8081",    # Expo Go
    "http://127.0.0.1:3000",
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
