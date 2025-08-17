"""Enable RLS on all tables

Revision ID: 6a67726cf266
Revises: f311fba5275a
Create Date: 2025-06-03 15:50:31.811597+00:00

"""
from alembic import op
import sqlalchemy as sa
from sqlalchemy import text

# revision identifiers, used by Alembic.
revision = '6a67726cf266'
down_revision = 'f311fba5275a'
branch_labels = None
depends_on = None

def upgrade():
    # Get the database dialect
    connection = op.get_bind()
    dialect = connection.dialect.name

    if dialect == 'postgresql':
        # PostgreSQL-specific RLS enablement
        op.execute(text("""
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
                LOOP
                    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', r.tablename);
                END LOOP;
            END $$;
        """))
    else:
        # For SQLite, we'll just pass through as RLS is not supported
        pass

def downgrade():
    # Get the database dialect
    connection = op.get_bind()
    dialect = connection.dialect.name

    if dialect == 'postgresql':
        # PostgreSQL-specific RLS disablement
        op.execute(text("""
            DO $$
            DECLARE
                r RECORD;
            BEGIN
                FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public')
                LOOP
                    EXECUTE format('ALTER TABLE public.%I DISABLE ROW LEVEL SECURITY', r.tablename);
                END LOOP;
            END $$;
        """))
    else:
        # For SQLite, we'll just pass through as RLS is not supported
        pass
