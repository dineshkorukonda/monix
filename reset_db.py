#!/usr/bin/env python3
"""
Reset all application data in the Monix database.

Clears all scans, reports, targets, users, and axes login-attempt records
while keeping the schema and migrations intact.

Usage:
    python reset_db.py
    python reset_db.py --hard   # also drops and recreates all tables (full schema reset)
"""

import os
import sys
import argparse
import urllib.parse

import dotenv

dotenv.load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

DATABASE_URL = os.environ.get(
    "DATABASE_URL", "postgresql://postgres:postgres@localhost:5432/monix"
)

_parsed = urllib.parse.urlparse(DATABASE_URL)
DB_CONFIG = {
    "dbname": _parsed.path.lstrip("/") or "monix",
    "user": _parsed.username or "postgres",
    "password": _parsed.password or "postgres",
    "host": _parsed.hostname or "127.0.0.1",
    "port": str(_parsed.port or 5432),
}


def reset_data(conn):
    """Delete all rows from app tables, preserving schema."""
    with conn.cursor() as cur:
        tables = [
            "reports_scan",
            "reports_target",
            "axes_accessattempt",
            "axes_accessfailure",
            "axes_accesslog",
            "django_session",
            "auth_user",
        ]
        print("Truncating tables (CASCADE)...")
        for table in tables:
            cur.execute(f'TRUNCATE TABLE "{table}" RESTART IDENTITY CASCADE;')
            print(f"  ✓ {table}")
        conn.commit()
    print("\nAll data cleared. Schema and migrations are intact.")


def hard_reset(conn):
    """Drop and recreate all tables — requires running migrations after."""
    with conn.cursor() as cur:
        cur.execute("""
            SELECT tablename FROM pg_tables
            WHERE schemaname = 'public'
        """)
        tables = [row[0] for row in cur.fetchall()]
        if tables:
            table_list = ", ".join(f'"{t}"' for t in tables)
            print(f"Dropping {len(tables)} tables...")
            cur.execute(f"DROP TABLE IF EXISTS {table_list} CASCADE;")
            conn.commit()
            print("All tables dropped.")
        else:
            print("No tables found.")
    print("\nRun './setup.sh dev' or 'python manage.py migrate' to recreate the schema.")


def main():
    parser = argparse.ArgumentParser(description="Reset Monix database")
    parser.add_argument(
        "--hard",
        action="store_true",
        help="Drop and recreate all tables instead of just clearing rows",
    )
    args = parser.parse_args()

    try:
        import psycopg2
    except ImportError:
        print("ERROR: psycopg2 not installed. Run: pip install psycopg2-binary")
        sys.exit(1)

    print(f"Connecting to {DB_CONFIG['host']}:{DB_CONFIG['port']}/{DB_CONFIG['dbname']}...")
    try:
        conn = psycopg2.connect(**DB_CONFIG)
    except Exception as e:
        print(f"ERROR: Could not connect to database: {e}")
        sys.exit(1)

    if args.hard:
        confirm = input(
            "\n⚠️  HARD RESET: This will DROP ALL TABLES. You must run migrations after.\n"
            "Type 'yes' to confirm: "
        )
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            conn.close()
            sys.exit(0)
        hard_reset(conn)
    else:
        confirm = input(
            "\nThis will DELETE ALL USERS, TARGETS, SCANS, and REPORTS.\n"
            "Type 'yes' to confirm: "
        )
        if confirm.strip().lower() != "yes":
            print("Aborted.")
            conn.close()
            sys.exit(0)
        reset_data(conn)

    conn.close()


if __name__ == "__main__":
    main()
