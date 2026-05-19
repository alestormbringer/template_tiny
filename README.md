# tinyAGI — OVHcloud VPS Setup

Setup standalone di tinyAGI su VPS OVHcloud con LLM locale tramite **Ollama**.
Nessun costo API: i modelli girano direttamente sul VPS.
Isolato dal trading bot che gira sulla porta 8080.

## Struttura del progetto

```
template_tiny/
├── config/
│   └── tinyagi_config.yaml   # Configurazione agent, LLM, server, logging
├── data/                      # Dati persistenti (ignorata da git)
├── docker/
│   └── Dockerfile
├── logs/                      # Log runtime (ignorata da git)
├── scripts/
│   ├── setup.sh               # Installazione Docker sul VPS
│   ├── start.sh               # Avvio stack + download modello
│   └── pull_model.sh          # Download/aggiornamento modello Ollama
├── .env.example               # Template variabili d'ambiente
├── .gitignore
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Architettura

```
VPS OVHcloud
├── [porta 8080]  trading-bot    (rete separata, nessuna relazione)
└── [porta 8090]  tinyagi        ──┐  rete: tinyagi-net
                  ollama  :11434 ──┘  (interno, non esposto)
```

Ollama non è esposto all'esterno: tinyAGI lo raggiunge internamente via `http://ollama:11434`.

## Quick Start

```bash
# 1. Clona la repository
git clone https://github.com/alestormbringer/template_tiny.git tinyagi
cd tinyagi

# 2. Installa Docker (se non presente)
sudo bash scripts/setup.sh

# 3. Configura le variabili d'ambiente
cp .env.example .env
nano .env   # opzionale: cambia TINYAGI_PORT o OLLAMA_MODEL

# 4. Avvia stack + scarica il modello (prima volta: ~5 minuti)
sudo bash scripts/start.sh
```

## Porte

| Servizio      | Porta | Visibilità    | Note                              |
|---------------|-------|---------------|-----------------------------------|
| Trading Bot   | 8080  | Esterna       | Servizio separato, rete diversa   |
| tinyAGI       | 8090  | Esterna       | Rete Docker: `tinyagi-net`        |
| Ollama        | 11434 | Solo interna  | Accessibile solo da tinyAGI       |

## Variabili d'ambiente

| Variabile              | Default          | Descrizione                     |
|------------------------|------------------|---------------------------------|
| `TINYAGI_PORT`         | `8090`           | Porta esposta da tinyAGI        |
| `OLLAMA_MODEL`         | `llama3.1:8b`    | Modello da usare con Ollama     |
| `AGENT_NAME`           | `tinyagi`        | Nome dell'agent                 |
| `AGENT_MAX_ITERATIONS` | `10`             | Iterazioni massime per task     |
| `AGENT_VERBOSE`        | `true`           | Output dettagliato              |
| `LOG_LEVEL`            | `INFO`           | Livello di logging              |

## Modelli consigliati (4 vCPU / 8GB RAM)

| Modello              | RAM richiesta | Velocità | Qualità  |
|----------------------|---------------|----------|----------|
| `llama3.1:8b`        | ~5 GB         | ★★★★     | ★★★★     |
| `mistral:7b`         | ~4.5 GB       | ★★★★     | ★★★★     |
| `phi3:mini`          | ~2.3 GB       | ★★★★★    | ★★★      |
| `llama3.2:3b`        | ~2 GB         | ★★★★★    | ★★★      |

Per cambiare modello: `./scripts/pull_model.sh mistral:7b` e aggiorna `OLLAMA_MODEL` nel `.env`.

## Comandi utili

```bash
# Avviare (build + download modello)
sudo bash scripts/start.sh

# Solo avviare senza rebuild
docker compose up -d

# Fermare tutto
docker compose down

# Log tinyAGI in tempo reale
docker compose logs -f tinyagi

# Log Ollama in tempo reale
docker compose logs -f ollama

# Cambiare modello
./scripts/pull_model.sh mistral:7b

# Elenco modelli scaricati
docker exec ollama ollama list

# Riavviare solo tinyAGI
docker compose restart tinyagi

# Stato container
docker compose ps

# Spazio disco usato dai modelli
docker volume inspect template_tiny_ollama-data
```
