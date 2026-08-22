from unittest.mock import MagicMock, patch

from sqlalchemy import String

from scripts.ensure_alembic_version_capacity import ensure_alembic_version_capacity


def test_widens_short_postgres_alembic_version_column():
    engine = MagicMock()
    connection = engine.begin.return_value.__enter__.return_value
    connection.dialect.name = "postgresql"
    inspector = MagicMock()
    inspector.has_table.return_value = True
    inspector.get_columns.return_value = [{"name": "version_num", "type": String(32)}]

    with (
        patch("scripts.ensure_alembic_version_capacity.create_engine", return_value=engine),
        patch("scripts.ensure_alembic_version_capacity.inspect", return_value=inspector),
    ):
        ensure_alembic_version_capacity()

    statement = str(connection.execute.call_args.args[0])
    assert "VARCHAR(255)" in statement


def test_does_not_alter_sufficient_postgres_alembic_version_column():
    engine = MagicMock()
    connection = engine.begin.return_value.__enter__.return_value
    connection.dialect.name = "postgresql"
    inspector = MagicMock()
    inspector.has_table.return_value = True
    inspector.get_columns.return_value = [{"name": "version_num", "type": String(255)}]

    with (
        patch("scripts.ensure_alembic_version_capacity.create_engine", return_value=engine),
        patch("scripts.ensure_alembic_version_capacity.inspect", return_value=inspector),
    ):
        ensure_alembic_version_capacity()

    connection.execute.assert_not_called()
