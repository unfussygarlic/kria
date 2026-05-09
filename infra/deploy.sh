#!/bin/bash
# Kria production deploy — run from /home/ubuntu/kriya on the EC2 server
# Usage: bash infra/deploy.sh
set -e

echo "==> Pulling latest code"
git pull origin main

echo "==> Rebuilding and restarting containers"
docker compose -f docker-compose.prod.yml up -d --build --remove-orphans

echo "==> Running database migrations"
docker compose -f docker-compose.prod.yml exec kria-api alembic upgrade head

echo "==> Cleaning up unused images"
docker image prune -f

echo "==> Deploy complete"
docker compose -f docker-compose.prod.yml ps
