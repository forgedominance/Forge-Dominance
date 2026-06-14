#!/bin/bash

set -e

echo ""
echo "Bladesmith - Supabase + Docker Startup"
echo "======================================"
echo ""

if ! command -v docker >/dev/null 2>&1; then
  echo "ERROR: Docker is not installed or not in PATH."
  exit 1
fi

if ! docker info >/dev/null 2>&1; then
  echo "ERROR: Docker daemon is not running. Start Docker and run again."
  exit 1
fi

if [ ! -f .env ]; then
  echo "ERROR: .env file is missing in project root."
  echo "Create .env with SUPABASE_URL and SUPABASE_KEY, then run again."
  exit 1
fi

if ! grep -q '^SUPABASE_URL=' .env; then
  echo "ERROR: SUPABASE_URL is missing in .env"
  exit 1
fi

if ! grep -q '^SUPABASE_KEY=' .env; then
  echo "ERROR: SUPABASE_KEY is missing in .env"
  exit 1
fi

echo "Starting all services (redis, backend x3, frontend, nginx)..."
docker compose up -d --build

echo ""
echo "Services started."
echo "- App: http://localhost"
echo "- Frontend direct: http://localhost:3000"
echo "- Backend health: http://localhost:5000/health"
echo ""
echo "To stop everything: docker compose down"
echo ""
