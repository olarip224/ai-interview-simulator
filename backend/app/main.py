import logging
import os
import sys
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.middleware import SlowAPIMiddleware

from app.api.v1.routers import analytics as analytics_router
from app.api.v1.routers import auth as auth_router
from app.api.v1.routers import challenges as challenges_router
from app.api.v1.routers import health as health_router
from app.api.v1.routers import interviews as interviews_router
from app.api.v1.routers import resumes as resumes_router
from app.config import settings
from app.core.rate_limit import limiter
from app.database.redis import close_redis
from app.middleware.error_handler import register_exception_handlers
from app.middleware.logging import LoggingMiddleware
from app.middleware.security_headers import SecurityHeadersMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)

logger = logging.getLogger(__name__)

_PLACEHOLDER_SECRET_KEYS = {
    "change-me-generate-a-real-secret-before-use",
    "your-secret-key-here",
    "changeme",
}


def _validate_settings() -> None:
    if os.getenv("SKIP_STARTUP_VALIDATION", "").lower() in {"1", "true", "yes"}:
        return
    errors: list[str] = []
    if settings.SECRET_KEY in _PLACEHOLDER_SECRET_KEYS:
        errors.append("SECRET_KEY is a placeholder — set a real secret before deploying")
    if settings.ANTHROPIC_API_KEY.startswith("sk-ant-your"):
        errors.append("ANTHROPIC_API_KEY is a placeholder — set a real key before deploying")
    if errors:
        for err in errors:
            logger.critical("Startup configuration error: %s", err)
        sys.exit(1)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    _validate_settings()
    yield
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

    app.state.limiter = limiter
    app.add_middleware(SlowAPIMiddleware)
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.add_middleware(LoggingMiddleware)

    register_exception_handlers(app)

    app.include_router(health_router.router, prefix=settings.API_PREFIX)
    app.include_router(auth_router.router, prefix=f"{settings.API_PREFIX}/auth")
    app.include_router(resumes_router.router, prefix=f"{settings.API_PREFIX}/resumes")
    app.include_router(interviews_router.router, prefix=f"{settings.API_PREFIX}/interviews")
    app.include_router(analytics_router.router, prefix=f"{settings.API_PREFIX}/analytics")
    app.include_router(challenges_router.router, prefix=f"{settings.API_PREFIX}/challenges")

    return app


app = create_app()
