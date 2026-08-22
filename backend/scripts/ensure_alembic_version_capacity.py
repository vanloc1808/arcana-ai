"""Ensure PostgreSQL can store all Alembic revision identifiers before upgrading."""

from sqlalchemy import create_engine, inspect, text

from config import settings


VERSION_COLUMN_LENGTH = 255


def ensure_alembic_version_capacity() -> None:
    """Widen the existing PostgreSQL Alembic version column when necessary.

    Alembic creates ``version_num`` as VARCHAR(32) by default, but this
    application's timestamped revision identifiers can exceed 32 characters.
    This repair must run before ``alembic upgrade head`` because Alembic needs
    to write the long revision while applying the migration chain.
    """
    engine = create_engine(settings.SQLALCHEMY_DATABASE_URL)
    try:
        with engine.begin() as connection:
            if connection.dialect.name != "postgresql":
                return

            inspector = inspect(connection)
            if not inspector.has_table("alembic_version"):
                return

            columns = inspector.get_columns("alembic_version")
            version_column = next(
                (column for column in columns if column["name"] == "version_num"),
                None,
            )
            if version_column is None:
                return
            current_length = getattr(version_column["type"], "length", None) if version_column else None
            if current_length is not None and current_length >= VERSION_COLUMN_LENGTH:
                return

            connection.execute(
                text(
                    "ALTER TABLE alembic_version "
                    f"ALTER COLUMN version_num TYPE VARCHAR({VERSION_COLUMN_LENGTH})"
                )
            )
    finally:
        engine.dispose()


if __name__ == "__main__":
    ensure_alembic_version_capacity()
