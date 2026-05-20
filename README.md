# tinyAGI — OVHcloud VPS Setup

Setup standalone di [tinyAGI](https://github.com/TinyAGI/tinyagi) su VPS OVHcloud con LLM locale tramite **Ollama**.
Nessun costo API: i modelli girano direttamente sul VPS.
Isolato dal trading bot che gira sulla porta 8080.

## Architettura

```
VPS OVHcloud
├── [porta 8080]  trading-bot    (rete Docker separata, nessuna relazione)
└── [porta 8090]  tinyagi :3777  ─┐  rete: tinyagi-net
                  ollama  :11434 ─┘  (porta interna, non esposta)
```

tinyAGI e Ollama comunicano internamente via `http://ollama:11434/v1`.
Ollama non e' mai raggiungibile dall'esterno.

## Struttura del progetto

```
template_tiny/
├── config/
│   └── settings.json          # Configurazione tinyAGI (agent, provider Ollama)
├── docker/
│   └── Dockerfile             # Build Node.js multi-stage da GitHub
├── scripts/
│   ├── setup.sh               # Installa Docker sul VPS
│   ├── start.sh               # Avvio stack + download modello
│   └── pull_model.sh          # Cambia/aggiorna modello Ollama
├── data/
├── logs/
├── .env.example
├── .gitignore
├── docker-compose.yml
└── README.md
```

## Quick Start

```bash
# 1. Clona la repository
git clone https://github.com/alestormbringer/template_tiny.git tinyagi
cd tinyagi

# 2. Installa Docker (se non presente)
sudo bash scripts/setup.sh

# 3. Configura variabili d'ambiente
cp .env.example .env
# nano .env  # opzionale: cambia porta o modello

# 4. Avvia tutto (prima volta: ~10-15 min per build + download modello)
sudo bash scripts/start.sh
```

tinyAGI sara' raggiungibile su `http://<IP_VPS>:8090`.

## Porte

| Servizio      | Porta  | Visibilita'   | Note                              |
|---------------|--------|---------------|-----------------------------------|
| Trading Bot   | 8080   | Esterna       | Rete Docker separata              |
| tinyAGI       | 8090   | Esterna       | Mappa su container :3777          |
| Ollama API    | 11434  | Solo interna  | Accessibile solo da tinyAGI       |

## Variabili d'ambiente

| Variabile        | Default        | Descrizione                   |
|------------------|----------------|-------------------------------|
| `TINYAGI_PORT`   | `8090`         | Porta esposta da tinyAGI      |
| `OLLAMA_MODEL`   | `llama3.1:8b`  | Modello da usare con Ollama   |
| `LOG_LEVEL`      | `INFO`         | Livello di logging            |

## Modelli consigliati (4 vCPU / 8GB RAM)

| Modello           | RAM richiesta | Qualita' |
|-------------------|---------------|----------|
| `llama3.1:8b`     | ~5 GB         | Ottima   |
| `mistral:7b`      | ~4.5 GB       | Ottima   |
| `llama3.2:3b`     | ~2 GB         | Buona    |
| `phi3:mini`       | ~2.3 GB       | Buona    |

## Comandi utili

```bash
# Avvio completo (build + download modello)
sudo bash scripts/start.sh

# Solo avviare senza rebuild
docker compose up -d

# Fermare tutto
docker compose down

# Log tinyAGI
docker compose logs -f tinyagi

# Log Ollama
docker compose logs -f ollama

# Cambiare modello
./scripts/pull_model.sh mistral:7b
# poi aggiorna OLLAMA_MODEL in .env e config/settings.json

# Elenco modelli scaricati
docker exec ollama ollama list

# Stato container
docker compose ps

# Riavviare solo tinyAGI
docker compose restart tinyagi
```
