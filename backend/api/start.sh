#!/bin/bash
set -e

# Wait for the database to accept connections before running migrations.
# Uses psycopg2 (available via requirements.txt) since pg_isready is not in the image.
echo "=== Waiting for database ==="
python3 - <<'PYEOF'
import os, sys, time
import psycopg2

url = os.environ["DATABASE_URL"].replace("postgresql+asyncpg://", "postgresql://")
for attempt in range(30):
    try:
        conn = psycopg2.connect(url)
        conn.close()
        print("Database is ready.")
        sys.exit(0)
    except psycopg2.OperationalError as exc:
        print(f"  [{attempt + 1}/30] Not ready yet: {exc}")
        time.sleep(2)

print("ERROR: Database not available after 60s.")
sys.exit(1)
PYEOF

echo "=== Running Alembic migrations ==="
alembic upgrade head

echo "=== Starting application ==="
exec "$@"
