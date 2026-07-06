# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

Two digital-product processes sharing one repo:

1. **`factory/` — Template factory (Process 1)**: fully automated pipeline on an
   OVHcloud VPS that researches demand, designs digital templates (Notion,
   Excel/Finance, Business PDF), **builds real files**, verifies them, and
   publishes to Gumroad (Etsy fallback). FastAPI + asyncio orchestrator, Docker.
2. **`books/` — Children's books (Process 2)**: semi-automated CLI toolkit for
   AI-drafted picture books published manually across KDP, Apple Books,
   Gumroad, Sellfy, Payhip. No 24/7 service — human-in-the-loop by design
   (KDP/Apple require editorial review and the KDP AI disclosure).

## The core invariant (Process 1) — never weaken it

The old system's defining bug: the LLM's template design stayed **text in the
model response**; no code ever wrote a real file, and the publisher pushed
products live even when the PDF was missing → Gumroad drafts with no document.

The fix is structural, two dedicated stages:

- **BUILD** (`factory/app/stages/build.py`) makes the real API/library call that
  writes the artifact: `openpyxl` workbook saved to disk, `notion.pages.create`,
  reportlab PDF. Build exceptions are failures with retry/backoff → `BUILD_ERROR`.
- **VERIFY** (`factory/app/stages/verify.py`) independently proves the artifact
  exists: file on disk, min size, magic bytes (`%PDF-` / `PK\x03\x04`), workbook
  opens, Notion page retrievable via `pages.retrieve`. Failure sends the product
  back to BUILD.
- **PUBLISH** re-checks the verified artifact on disk and treats a failed file
  upload as a failed publish (never "publish anyway").
- **RELEASE** flips `published=true` and re-fetches the product to confirm it is
  actually live. With `AUTO_PUBLISH=false` it waits for
  `POST /pipeline/approve/{id}` (the ~60s human step).

Any change that lets a product reach PUBLISH/RELEASE without a verified artifact
reintroduces the old bug. Don't.

## Pipeline (Process 1)

```
RESEARCH → DESIGN → COPYWRITING → BUILD → VERIFY → IMAGE → PUBLISH → RELEASE → DONE
```

Error states: `BUILD_ERROR`, `PUBLISH_ERROR` (both after 3 attempts).
Stage handlers live in `factory/app/stages/`, one module per stage, registered
in `stages/__init__.py`. The orchestrator (`app/main.py`) ticks every 300s:
unsticks stale products, runs the daily analytics report (Gumroad sales → LLM →
new-niche-vs-variant decision that seeds RESEARCH), tops up each vertical to
`MAX_WIP_PER_VERTICAL`, then advances every actionable product one stage.

**Two LLM tiers** (both Groq, OpenAI-compatible): fast `llama-3.1-8b-instant`
(research, image prompts), quality `llama-3.3-70b-versatile` (design, copy,
analytics). See `factory/app/llm.py`.

## VPS & infrastructure

- **VPS**: OVHcloud Ubuntu, `ssh ubuntu@<IP>`
- **External port** `8090` (host) → `3778` (container) — set `FACTORY_PORT` in `.env`
- **All docker commands use `docker compose` (v2, no hyphen)**
- The `agents-data` volume at `/root/workspace` persists state. It still holds
  the legacy `pipeline.json` (untouched); the new pipeline writes
  `pipeline_v2.json`. **Never delete this volume.**

```bash
docker compose up -d --build          # rebuild after code changes
docker compose logs -f factory

curl -s http://localhost:8090/health | python3 -m json.tool
curl -s http://localhost:8090/pipeline/diagnose | python3 -m json.tool
curl -s -X POST http://localhost:8090/pipeline/repair | python3 -m json.tool
curl -s -X POST http://localhost:8090/pipeline/reset_product/<prod_id> \
  -H "Content-Type: application/json" -d '{"stage":"BUILD"}'
curl -s -X POST http://localhost:8090/pipeline/approve/<prod_id>   # AUTO_PUBLISH=false
```

## Critical integration fixes (do not revert)

1. **Gumroad writes must use `aiohttp.FormData()`** with
   `form.add_field(k, str(v))` (`factory/app/integrations/gumroad.py`). A plain
   dict as `data=` sends the wrong content-type and Gumroad silently ignores
   `published=true` — products stay drafts forever.
2. **Pollinations.ai URL encoding**: `urllib.parse.quote(prompt, safe=",-")`
   (`integrations/pollinations.py`). Never `.replace(" ", "+")` — %20 required.
   Retries 3x with 5s gap, validates response > 2KB.
3. **reportlab HTML escaping**: all LLM text through `pdf_safe()`
   (`builders/pdf_builder.py`) which escapes `&`, `<`, `>` — raw LLM output
   breaks Paragraph() silently otherwise.

## Process 2 — children's books (`books/`)

CLI: `books/bookctl.py` (argparse, one JSON per book in `data/books/`).
Phases map to modules: `concept.py` (Fase 1: story + character sheet + Gemini
Storybook prompt), `production.py` (Fase 2: KDP trim/bleed/spine/full-wrap
calculator + Book Bolt checklist), `platforms.py` (Fase 3: per-platform
checklists — the KDP one includes the **mandatory AI-content disclosure**),
sales log + `advise` (Fasi 4-5) in `bookctl.py`.

Hard constraints baked into the docs — keep them accurate:
- Gemini Storybook is digital-only (no print files) → Phase 1 validation only.
- KDP paperback ≥ 24 pages; spine text only ≥ ~100 pages; bleed 0.125";
  premium color paper 0.002347"/page for spine width; 300 DPI.
- Trim 6x9 works for print + Kindle; 8.5x8.5 print only.

## Development workflow

**Develop on a feature branch, merge to main without force-push:**
```bash
git checkout -B claude/<branch-name>
# ... commit ...
git checkout main
git merge --no-ff claude/<branch-name> -m "merge: description"
git push origin main
```

**After pushing to main, on the VPS:**
```bash
git pull origin main
docker compose up -d --build
```

## Limits (Process 1)

- Gumroad: 10 published/day (`GUMROAD_DAILY_LIMIT`); overflow retries in 12h,
  Etsy fallback if configured.
- Orchestrator tick: 300s. Auto-unblock after 20 min stuck as `assigned`.
- Build/verify: 3 attempts → `BUILD_ERROR`. Publish: 3 attempts with 2^n min
  backoff → `PUBLISH_ERROR`.

## Recovering Gumroad orphan drafts

```bash
GUMROAD_API_KEY=$(grep GUMROAD_API_KEY .env | cut -d= -f2) python3 scripts/recover_gumroad_drafts.py
# --delete removes orphan drafts from Gumroad
```
