#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then echo "ERRORE: .env non trovato. Esegui: cp .env.example .env"; exit 1; fi

source .env
MODEL=${OLLAMA_MODEL:-llama3.1:8b}

echo "[1/3] Build e avvio container..."
docker compose up -d --build

echo "[2/3] Attesa avvio Ollama (30s)..."
sleep 30

echo "[3/3] Download modello $MODEL (prima esecuzione: ~5-10 min)..."
docker exec ollama ollama pull "$MODEL"

echo ""
echo "tinyAGI pronto su http://localhost:${TINYAGI_PORT:-8090}"
echo "Premi Ctrl+C per uscire dai log (i container restano attivi)."
docker compose logs -f tinyagi
