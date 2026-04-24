from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker, Session
from sqlalchemy.pool import NullPool
import os
import logging

logger = logging.getLogger("supplychain.database")

DATABASE_URL = os.getenv("DATABASE_URL", "")

# SQLite fallback for hackathon portability (no external DB needed)
if not DATABASE_URL:
    SQLITE_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "supplychain.db")
    DATABASE_URL = f"sqlite:///{SQLITE_PATH}"
    logger.info(f"No DATABASE_URL set, using SQLite: {SQLITE_PATH}")

is_sqlite = DATABASE_URL.startswith("sqlite")

if os.getenv("ENVIRONMENT") == "test" or is_sqlite:
    engine_kwargs = {"poolclass": NullPool, "echo": False}
    if is_sqlite:
        engine_kwargs["connect_args"] = {"check_same_thread": False}
    engine = create_engine(DATABASE_URL, **engine_kwargs)
else:
    engine = create_engine(
        DATABASE_URL,
        pool_size=20,
        max_overflow=10,
        pool_pre_ping=True,
        pool_recycle=300,
        echo=False
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


def get_db() -> Session:
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Create all tables using the models' Base metadata."""
    # Import Base from models (the ONLY source of truth for table definitions)
    from models import Base
    Base.metadata.create_all(bind=engine)
    logger.info("Database tables initialized successfully.")


def check_db_health() -> bool:
    """Check if the database is reachable."""
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


@event.listens_for(engine, "connect")
def set_sqlite_pragma(dbapi_conn, connection_record):
    if "sqlite" in str(dbapi_conn):
        cursor = dbapi_conn.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()
