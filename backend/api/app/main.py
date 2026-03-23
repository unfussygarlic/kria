from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import engine
from app.routers import applicants, chat, events, gigs, health, momentum, profiles, ratings, search


@asynccontextmanager
async def lifespan(app: FastAPI):
    yield
    await engine.dispose()


app = FastAPI(
    title="Kria API",
    version=settings.api_version,
    docs_url="/docs" if settings.environment != "production" else None,
    redoc_url="/redoc" if settings.environment != "production" else None,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"] if settings.environment == "development" else [],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(health.router)
app.include_router(gigs.router, prefix=f"/api/{settings.api_version}")
app.include_router(profiles.router, prefix=f"/api/{settings.api_version}")
app.include_router(applicants.router, prefix=f"/api/{settings.api_version}")
app.include_router(events.router, prefix=f"/api/{settings.api_version}")
app.include_router(chat.router, prefix=f"/api/{settings.api_version}")
app.include_router(momentum.router, prefix=f"/api/{settings.api_version}")
app.include_router(ratings.router, prefix=f"/api/{settings.api_version}")
app.include_router(search.router, prefix=f"/api/{settings.api_version}")
