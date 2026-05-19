#!/bin/bash
set -e

cd "$(dirname "$0")/.."

if [ ! -f .env ]; then echo "ERRORE: .env non trovato."; exit 1; fi

MODEL=${OLLAMA_MODEL:-llama3.1:8b}

echo "[1/3] Avvio servizi Docker..."
docker compose up -d --build

echo "[2/3] Attesa avvio Ollama (30s)..."
sleep 30

echo "[3/3] Download modello $MODEL (prima esecuzione: potrebbe richiedere alcuni minuti)..."
docker exec ollama ollama pull "$MODEL"

echo "Pronto. tinyAGI in ascolto su :${TINYAGI_PORT:-8090}"
docker compose logs -f tinyagi
