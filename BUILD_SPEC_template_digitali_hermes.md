# BUILD SPEC — Progetto "Template Digitali" su Hermes Agent
### Prompt operativo per Claude Code, da eseguire sulla nuova VPS (VPS-3 2027, 6 vCore / 12GB RAM / 100GB)

> Questo è il primo dei due progetti (Template Digitali e Libri per Bambini). Si parte da questo, in formato PDF, per validare l'intero ciclo end-to-end prima di espandere a Notion/Sheets/Canva e prima di configurare il secondo profilo Hermes per i libri.

---

## 0. Regole operative per Claude Code

- Ogni comando che modifica lo stato del sistema, crea/cancella risorse su GitHub, spende crediti API reali, o pubblica qualsiasi cosa online richiede **approvazione esplicita dell'utente prima di essere eseguito**. Riepiloga cosa stai per fare e attendi conferma.
- Non pubblicare mai un listing Gumroad in stato "live" senza revisione umana esplicita — resta sempre in bozza fino a conferma manuale (~60 secondi umani, come da workflow originale).
- Se trovi processi, tunnel, container o cron job non riconducibili a questo setup, segnalali e chiedi come procedere prima di rimuoverli.
- Bug da non ripetere: nella versione precedente il bot creava la bozza su Gumroad ma non generava mai un file reale da allegare, quindi tutto restava in bozza. **Nessuno step può considerarsi "completato" se non ha prodotto un file verificabile su disco.** Ogni fase di generazione contenuto deve terminare con un controllo esplicito di esistenza/validità del file prima di passare alla fase successiva.

---

## 1. Verifica ambiente e pulizia iniziale

1. Controlla OS, risorse (conferma 6 vCore / 12GB RAM / 100GB), rete, porte già in uso.
2. Verifica se Ollama è già installato (`ollama --version`, `ollama list`).
   - Se non installato: installalo.
   - Verifica se è già presente un modello utilizzabile come fallback locale (contesto ≥64k richiesto da Hermes, footprint compatibile con 12GB RAM — es. `llama3.1:8b` o `qwen2.5:7b`). Se manca, scaricane uno.
3. **Repo GitHub `alestormbringer/template_tiny`**:
   - Clonala in locale.
   - Copia tutto il contenuto attuale in una cartella di backup locale fuori da git (es. `~/backup_template_tiny_<data>/`) — non buttare via nulla, solo archiviare.
   - Solo dopo la conferma dell'utente, svuota completamente il branch principale (rimuovi tutti i file, mantieni al massimo un README minimo). La repo deve essere vuota prima di iniziare la nuova struttura.

---

## 2. Installazione Hermes Agent + profilo dedicato

```bash
curl -fsSL https://hermes-agent.nousresearch.com/install.sh | bash
hermes profile create template-digitali --description "Pipeline automatica template digitali su Gumroad"
```

Ogni comando successivo va lanciato come `template-digitali <comando>` (alias generato automaticamente dal profilo) oppure `hermes -p template-digitali <comando>`.

### Modello primario: OpenRouter, tier gratuito

I modelli `:free` disponibili su OpenRouter cambiano nel tempo — **non fissarne uno staticamente**. Verifica dal vivo con:

```bash
template-digitali model
```

Scegli un modello free con: contesto ≥64k, supporto tool-calling. (A titolo di esempio nella documentazione Hermes compare `inclusionai/ring-2.6-1t:free`, ma va confermato al momento dell'esecuzione.)

### Fallback locale su Ollama

In `~/.hermes/profiles/template-digitali/config.yaml`:

```yaml
model:
  provider: openrouter
  default: <modello-free-scelto>

fallback_providers:
  - provider: custom
    model: <tag-modello-ollama-locale>       # es. llama3.1:8b
    base_url: http://localhost:11434/v1      # endpoint OpenAI-compatible di Ollama
    key_env: OLLAMA_DUMMY_KEY                # Ollama non richiede auth reale, basta una var non vuota
```

Il fallback si attiva automaticamente su rate limit (429), errori server (500/502/503) o auth failure, mantenendo cronologia e contesto della sessione. Verifica che funzioni davvero (es. esaurendo temporaneamente la quota free o bloccando la chiave) prima di considerare il setup concluso.

---

## 3. Market research (Agent-Reach)

Repo: `github.com/Panniantong/Agent-Reach` — non è un wrapper, installa e instrada verso gli strumenti upstream migliori disponibili per leggere Reddit, Twitter/X, GitHub, LinkedIn, ecc.

```bash
pipx install https://github.com/Panniantong/agent-reach/archive/main.zip
agent-reach install --env=auto --safe   # --safe evita di installare pacchetti di sistema senza conferma
agent-reach doctor                       # verifica lo stato di ogni canale
```

Punti da rispettare (indicati dallo stesso progetto):
- Per i canali che richiedono login (Reddit, Twitter/X, LinkedIn) chiedi all'utente credenziali di **account secondari dedicati**, non l'account principale — rischio di ban su chiamate stile-script.
- Le credenziali restano solo in locale (`~/.agent-reach/config.yaml`, permessi 600) — non vanno esposte né loggate.
- Uso previsto: lettura di contenuti pubblici per individuare nicchie/richieste ricorrenti, non raccolta massiva o profilazione di persone.

Crea uno skill/subagente `market-research` nel profilo `template-digitali` che: interroga i canali su nicchie di template digitali (produttività, finanza personale, project management, content creator, ecc.), individua gap ricorrenti, e produce un report con 3-5 idee di template PDF con prezzo suggerito.

---

## 4. Pipeline di generazione — PDF end-to-end (primo formato)

Struttura la pipeline come subagenti/skill dentro il profilo `template-digitali` (usa il cron di Hermes per l'esecuzione giornaliera):

1. **Agente Ricerca/Trend** — usa `market-research` (Agent-Reach) per proporre nicchia, idea, prezzo.
2. **Agente Prompt Builder** — costruisce il prompt di generazione contenuto dalla nicchia scelta.
3. **Agente Struttura** — genera sezioni e logica del template.
4. **Agente Testi Gumroad** — genera titolo, descrizione, tag SEO (in inglese).
5. **Agente Generazione File — FIX CRITICO** — genera realmente il PDF (valuta `weasyprint` per layout via HTML/CSS se il template ha un design elaborato, o `reportlab`/`fpdf2` per layout più semplici e programmatici) e lo salva su un path noto.
6. **Agente Verifica — FIX CRITICO** — controlla che il file esista, non sia vuoto/corrotto, e che la struttura (numero di pagine/sezioni) corrisponda a quanto pianificato nello step 3. **Se il controllo fallisce, il flusso si ferma e segnala l'errore — non deve mai proseguire verso la pubblicazione senza questo controllo superato.**
7. Solo dopo il controllo superato, notifica l'utente (log o, se già collegato, Telegram) che il file è pronto per la pubblicazione manuale su Gumroad (~60 secondi umani, resta bozza finché non confermi tu).

---

## 5. Analytics e loop decisionale

1. Cron giornaliero (`hermes cron` nel profilo) che legge le vendite via API Gumroad.
2. Un agente "analisi" confronta vendite/trend e propone: nuova idea (torna al punto 4.1) oppure variante del best seller.
3. Resta tutto in formato PDF fino a validazione (prime vendite reali). Solo dopo si valuta l'espansione a Notion/Sheets/Canva, replicando lo stesso schema: nuovo "Agente Generazione File" specifico per formato, stesso "Agente Verifica" come gate obbligatorio.

---

## Nota per il prossimo prompt (non ora)

Il progetto "Libri per Bambini" seguirà la stessa logica su un secondo profilo Hermes (`hermes profile create libri-bambini`), pipeline dedicata (bozza storia AI, produzione print-ready con blocco personaggio, pubblicazione multi-piattaforma su KDP/Apple Books/Gumroad/Sellfy/Payhip). Verrà specificato in un prompt separato una volta validato questo primo progetto.
