# Processo 2 — Libri per bambini multi-piattaforma

Workflow **semi-automatico**: l'AI fa bozza, prompt e analisi; la produzione
print-ready e l'upload sulle piattaforme restano passaggi umani guidati da
checklist. A differenza del Processo 1 (template), qui non esiste un'unica
piattaforma con API comoda: KDP e Apple richiedono revisione editoriale, e il
tempo umano realistico è **10-15 minuti per piattaforma** al primo caricamento
di un titolo (meno per gli aggiornamenti).

## Le 5 fasi

```
Setup una tantum ─→ Fase 1 bozza (AI) ─→ Fase 2 print-ready ─→ Fase 3 pubblicazione
                         ↑                                            │
                         └────── Fase 5 decisione ←── Fase 4 analytics┘
```

### Setup iniziale (una tantum)
- Scegli fascia d'età e tema di partenza
- Account sui 5 canali: **Amazon KDP**, **Apple Books for Authors**,
  **Gumroad**, **Sellfy**, **Payhip**
- Tool AI: Gemini Storybook (bozza), Book Bolt (produzione KDP),
  eventualmente KDPEasy (solo copertina) o Midjourney `--cref` / Neolemon
  (coerenza personaggio con prompt propri)

### Fase 1 — bozza della storia (AI)
`bookctl.py new` + `bookctl.py concept` generano: concept completo, **character
sheet** (il blocco di riferimento visivo da incollare in ogni prompt), 10 pagine
con testo + prompt illustrazione, e un **prompt pronto per Gemini Storybook**.

> **Limite da conoscere prima di costruirci un business sopra:** Gemini
> Storybook produce solo storie digitali (10 pagine, illustrazioni
> personalizzate, narrazione audio, 45+ stili) **senza opzione di stampa**.
> Perfetto per validare un'idea in fretta e gratis; NON per uscire con un file
> a risoluzione e trim size corretti. La produzione vera è la Fase 2.

### Fase 2 — produzione print-ready
`bookctl.py spec` calcola la specifica KDP reale e stampa la checklist Book Bolt:

- **Trim size**: `6x9` (stampa + Kindle) o `8.5x8.5` (solo stampa, il classico
  quadrato illustrato)
- **Bleed** 0.125" per lato, margini KDP (Book Bolt li gestisce in automatico)
- **Dorso** calcolato da pagine × spessore carta (premium color: 0.002347"/pagina);
  niente testo sul dorso sotto ~100 pagine
- **Copertina full-wrap**: retro + dorso + fronte in un unico PDF
- Percorso guidato Book Bolt: *Story Parameters → Character Appearance →
  Generate Content* (blocca l'aspetto del personaggio su tutte le pagine)
- Deliverable: `interior.pdf`, `cover-fullwrap.pdf`, `cover-front.jpg`, `book.epub`

### Fase 3 — pubblicazione (manuale, per piattaforma)
`bookctl.py checklist --platform kdp|apple|gumroad|sellfy|payhip` e
`bookctl.py status` per tracciare lo stato.

> ⚠ **KDP: la disclosure AI è obbligatoria.** Amazon richiede di dichiarare
> esplicitamente il contenuto generato con AI (checkbox in fase di upload).
> Non è opzionale: esiste almeno un caso noto di account sospeso per non
> averla spuntata.

- KDP e Apple: passano da revisione (24-72h KDP; portale Apple Books for Authors)
- Gumroad / Sellfy / Payhip: pubblicazione istantanea, in parallelo

### Fase 4 — analytics multi-piattaforma (settimanale)
`bookctl.py sales` registra vendite settimanali per piattaforma (KDP e Apple
riportano con cadenza propria; gli store diretti sono in tempo reale).

### Fase 5 — decisione
`bookctl.py advise`: l'AI legge catalogo + vendite e consiglia — **nuova fascia
d'età/tema → nuovo libro** (torna a Fase 1), oppure **sequel/serie con lo
stesso personaggio** (il character sheet è già bloccato). Entrambi i rami
rientrano in Fase 1.

## Comandi

```bash
cd books
pip install -r requirements.txt
export OPENAI_API_KEY=...   # Groq key
export OPENAI_BASE_URL=https://api.groq.com/openai/v1

./bookctl.py new "Luna the Brave Firefly" --age 3-5 --theme courage --hero "a small firefly"
./bookctl.py concept luna-the-brave-firefly
./bookctl.py spec luna-the-brave-firefly --trim 8.5x8.5 --pages 24 --paper premium-color
./bookctl.py checklist luna-the-brave-firefly --platform kdp
./bookctl.py status luna-the-brave-firefly --platform kdp --set in_review
./bookctl.py sales luna-the-brave-firefly --week 2026-W27 --platform kdp --units 3 --revenue 20.97
./bookctl.py advise
```

Il catalogo vive in `data/books/*.json` (gitignored: è stato, non codice).
