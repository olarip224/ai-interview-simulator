import asyncio
from logging.config import fileConfig

from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from alembic import context

# Import ALL models here so Alembic autogenerate detects them
from app.models.base import Base
from app.models.user import User  # noqa: F401
from app.models.auth import RefreshToken  # noqa: F401
from app.config import settings

config = context.config
config.set_main_option("sqlalchemy.url", settings.DATABASE_URL)

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    url = config.get_main_option("sqlalchemy.url")
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    print("DIAG: do_run_migrations entered — connection object received", flush=True)
    context.configure(connection=connection, target_metadata=target_metadata)
    print("DIAG: context.configure() done, entering begin_transaction()", flush=True)
    with context.begin_transaction():
        print("DIAG: transaction started, calling run_migrations()", flush=True)
        context.run_migrations()
        print("DIAG: run_migrations() returned", flush=True)
    print("DIAG: transaction block exited", flush=True)


async def run_async_migrations() -> None:
    url = config.get_main_option("sqlalchemy.url")
    safe_url = url.split("@")[-1] if url and "@" in url else url
    print(f"DIAG: building engine for host/db: {safe_url}", flush=True)

    connectable = async_engine_from_config(
        config.get_section(config.config_ini_section, {}),
        prefix="sqlalchemy.",
        poolclass=pool.NullPool,
        connect_args={
            "timeout": 10,
            "server_settings": {"lock_timeout": "15000", "statement_timeout": "20000"},
        },
    )
    try:
        print("DIAG: calling connectable.connect() ...", flush=True)
        async with connectable.connect() as connection:
            print("DIAG: connect() returned successfully, running migrations", flush=True)
            await connection.run_sync(do_run_migrations)
            print("DIAG: run_sync(do_run_migrations) returned", flush=True)
    except Exception as exc:
        print(f"DIAG: FAILED — {type(exc).__name__}: {exc}", flush=True)
        raise
    finally:
        print("DIAG: disposing engine", flush=True)
        await connectable.dispose()
        print("DIAG: engine disposed, run_async_migrations complete", flush=True)


def run_migrations_online() -> None:
    asyncio.run(run_async_migrations())


print(f"DIAG: is_offline_mode() = {context.is_offline_mode()}", flush=True)
if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
print("DIAG: env.py module finished executing", flush=True)
