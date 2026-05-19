# tinyAGI — OVHcloud VPS Setup

Setup standalone di [tinyAGI](https://github.com/alaeddine-13/thinkgpt) su VPS OVHcloud.
Gira in isolamento completo rispetto ad altri servizi sulla stessa macchina.

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
│   ├── setup.sh               # Installazione dipendenze sul VPS
│   └── start.sh               # Avvio container
├── .env.example               # Template variabili d'ambiente
├── .gitignore
├── docker-compose.yml
├── requirements.txt
└── README.md
```

## Quick Start

```bash
# 1. Clona la repository
git clone https://github.com/alestormbringer/template_tiny.git
cd template_tiny

# 2. Esegui il setup (come root sul VPS)
sudo bash scripts/setup.sh

# 3. Configura le variabili d'ambiente
cp .env.example .env
nano .env   # inserisci la tua OPENAI_API_KEY

# 4. Avvia il container
docker compose up -d
```

## Porte

| Servizio     | Porta | Note                              |
|--------------|-------|-----------------------------------|
| Trading Bot  | 8080  | Servizio separato, non condiviso  |
| tinyAGI      | 8090  | Rete Docker: `tinyagi-net`        |

I due servizi non condividono reti Docker, volumi o risorse.

## Variabili d'ambiente

| Variabile              | Default    | Descrizione                        |
|------------------------|------------|------------------------------------|
| `TINYAGI_PORT`         | `8090`     | Porta esposta dal container        |
| `OPENAI_API_KEY`       | —          | Chiave API OpenAI (obbligatoria)   |
| `ANTHROPIC_API_KEY`    | —          | Chiave API Anthropic (opzionale)   |
| `AGENT_NAME`           | `tinyagi`  | Nome dell'agent                    |
| `AGENT_MAX_ITERATIONS` | `10`       | Iterazioni massime per task        |
| `AGENT_VERBOSE`        | `true`     | Output dettagliato                 |
| `LOG_LEVEL`            | `INFO`     | Livello di logging                 |

## Comandi utili

```bash
# Avviare (build + detached)
docker compose up -d --build

# Fermare
docker compose down

# Vedere i log in tempo reale
docker compose logs -f tinyagi

# Riavviare il solo container
docker compose restart tinyagi

# Entrare nel container
docker exec -it tinyagi bash

# Verificare lo stato
docker compose ps
```
