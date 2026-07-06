# Digital Product Factory

Due processi per prodotti digitali, ripartiti da zero su base pulita:

| | Processo 1 — `factory/` | Processo 2 — `books/` |
|---|---|---|
| Prodotto | Template digitali (Notion, Excel, Business PDF) | Libri illustrati per bambini |
| Automazione | Completa, 24/7 su VPS | Semi-automatica (AI + checklist guidate) |
| Piattaforme | Gumroad (API), Etsy fallback | KDP, Apple Books, Gumroad, Sellfy, Payhip |
| Tempo umano | ~0 (o ~60s/prodotto con approvazione attiva) | 10-15 min/piattaforma per titolo |

## Processo 1 — Template factory (`factory/`)

Pipeline autonoma:

```
RESEARCH → DESIGN → COPYWRITING → BUILD → VERIFY → IMAGE → PUBLISH → RELEASE → DONE
```

I due stage **BUILD** e **VERIFY** sono la correzione del difetto storico del
vecchio sistema ("si crea la bozza ma non il documento"): prima l'output del
modello restava testo nella risposta LLM e nessuna riga di codice lo passava a
`openpyxl.save()` o `notion.pages.create()`. Ora:

- **BUILD** esegue la chiamata reale che scrive il file: `.xlsx` vero con
  openpyxl (fogli, colonne, formule), pagina Notion vera via API, PDF
  multi-sezione con reportlab. Un errore di build è un errore, non un warning.
- **VERIFY** controlla che l'artefatto esista davvero (file su disco, dimensione
  minima, magic bytes, workbook apribile, pagina Notion recuperabile via API)
  prima di segnare il prodotto come pronto. Niente artefatto verificato =
  niente pubblicazione, mai.
- **PUBLISH** carica il file verificato: se l'upload fallisce, la pubblicazione
  fallisce (il vecchio codice pubblicava comunque).
- **RELEASE** mette live e ri-legge il prodotto da Gumroad per confermare che
  sia davvero pubblicato. Con `AUTO_PUBLISH=false` si ferma in bozza pronta e
  aspetta `POST /pipeline/approve/{id}` (il passaggio umano da ~60 secondi).

In più: report analytics giornaliero (vendite Gumroad → LLM → decisione
"nuova nicchia o variante del best seller") che alimenta la ricerca del giorno.

### Avvio

```bash
cp .env.example .env   # compila OPENAI_API_KEY (Groq) e GUMROAD_API_KEY
docker compose up -d --build

curl -s http://localhost:8090/health | python3 -m json.tool
curl -s http://localhost:8090/pipeline/diagnose | python3 -m json.tool
```

## Processo 2 — Libri per bambini (`books/`)

Fase 1 bozza AI (concept + prompt Gemini Storybook) → Fase 2 produzione
print-ready (spec KDP: trim, bleed, dorso, copertina full-wrap + checklist
Book Bolt) → Fase 3 pubblicazione multi-piattaforma con checklist (inclusa la
**disclosure AI obbligatoria su KDP**) → Fase 4 log vendite settimanale →
Fase 5 decisione AI (nuovo libro vs sequel/serie).

Vedi [books/README.md](books/README.md) per il workflow completo e i comandi.

## Struttura

```
factory/            Processo 1 — FastAPI + orchestratore (Docker, VPS)
  app/stages/       uno stage = un modulo (build.py e verify.py sono la fix)
  app/builders/     generazione file reale: pdf, xlsx, notion
  app/integrations/ gumroad, etsy, pollinations, notion, searxng
books/              Processo 2 — CLI bookctl.py + moduli per fase
scripts/            recover_gumroad_drafts.py (bozze orfane), setup.sh (VPS)
searxng/            config del container di ricerca self-hosted
data/               cataloghi e stato locale (gitignored)
```

Lo storico del vecchio sistema (dashboard React, monolite `services/main.py`,
config tinyAGI) è stato rimosso: resta recuperabile nella history git.
