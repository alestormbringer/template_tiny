#!/bin/bash
# Scarica o aggiorna un modello Ollama.
# Uso: ./scripts/pull_model.sh [nome_modello]
# Esempio: ./scripts/pull_model.sh mistral:7b
set -e

cd "$(dirname "$0")/.."

MODEL=${1:-${OLLAMA_MODEL:-llama3.1:8b}}

echo "Download modello: $MODEL"
docker exec ollama ollama pull "$MODEL"
echo "Modello $MODEL pronto."
