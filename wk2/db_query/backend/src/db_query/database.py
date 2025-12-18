"""Database connection and session management using SQLAlchemy."""

from collections.abc import Generator

from sqlalchemy import create_engine
from sqlalchemy.orm import Session, declarative_base, sessionmaker

from db_query.config import settings

# Create SQLAlchemy engine with connection pooling
engine_kwargs = {
    "echo": settings.log_level == "DEBUG",
    "pool_pre_ping": True,  # Verify connections before using them
}

# SQLite-specific configuration
if "sqlite" in settings.database_url:
    engine_kwargs["connect_args"] = {"check_same_thread": False}
# Connection pooling for other databases (MySQL, PostgreSQL, etc.)
else:
    engine_kwargs.update({
        "pool_size": 10,  # Number of connections to keep in the pool
        "max_overflow": 20,  # Maximum number of connections that can be created beyond pool_size
        "pool_recycle": 3600,  # Recycle connections after 1 hour
        "pool_timeout": 30,  # Timeout for getting a connection from the pool
    })

engine = create_engine(settings.database_url, **engine_kwargs)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for ORM models
Base = declarative_base()


def get_db() -> Generator[Session, None, None]:
    """
    Get database session for dependency injection.

    Yields:
        SQLAlchemy database session

    Example:
        @app.get("/items")
        def read_items(db: Session = Depends(get_db)):
            return db.query(Item).all()
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db() -> None:
    """
    Initialize database by creating all tables.

    Should be called on application startup.
    """
    Base.metadata.create_all(bind=engine)
