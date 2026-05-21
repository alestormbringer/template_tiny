#!/bin/bash
set -e

echo "[1/4] Aggiornamento sistema..."
apt-get update && apt-get upgrade -y

echo "[2/4] Installazione Docker..."
if ! command -v docker &> /dev/null; then
  curl -fsSL https://get.docker.com | sh
  systemctl enable docker && systemctl start docker
else
  echo "Docker già installato, skip."
fi

echo "[3/4] Installazione Docker Compose plugin..."
apt-get install -y docker-compose-plugin

echo "[4/4] Creazione .env..."
if [ ! -f .env ]; then cp .env.example .env; fi

echo "Setup completato. Ora: 1) modifica .env  2) docker compose up -d"
