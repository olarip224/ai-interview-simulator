import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.routers import auth as auth_router
from app.api.v1.routers import health as health_router
from app.api.v1.routers import resumes as resumes_router
from app.config import settings
from app.database.redis import close_redis
from app.middleware.error_handler import register_exception_handlers
from app.middleware.logging import LoggingMiddleware

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    yield
    await close_redis()


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        debug=settings.DEBUG,
        lifespan=lifespan,
    )

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
    app.include_router(
        auth_router.router,
        prefix=f"{settings.API_PREFIX}/auth",
    )
    app.include_router(resumes_router.router, prefix=f"{settings.API_PREFIX}/resumes")

    return app


app = create_app()
