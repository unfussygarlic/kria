#!/bin/bash
# Kria production deploy — run from /home/ubuntu/kria on the EC2 server
# Usage: bash infra/deploy.sh
set -e

COMPOSE="docker compose --env-file .env.prod -f docker-compose.prod.yml"

echo "==> Pulling latest code"
git pull origin main

echo "==> Rebuilding and restarting containers"
$COMPOSE up -d --build --remove-orphans

echo "==> Running database migrations"
$COMPOSE exec kria-api alembic upgrade head

echo "==> Cleaning up unused Docker resources"
docker image prune -f
docker volume prune -f
docker network prune -f
docker builder prune -f

echo "==> Deploy complete"
$COMPOSE ps
