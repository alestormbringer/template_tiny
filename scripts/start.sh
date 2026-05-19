#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then echo "ERRORE: .env non trovato."; exit 1; fi

docker compose up -d --build
docker compose logs -f
