# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this project is

An autonomous digital product factory deployed on an OVHcloud VPS. It runs a multi-agent pipeline that researches market demand, creates digital templates (Notion, Excel/Finance, Business), generates PDFs and cover images, and publishes them to Gumroad — fully automated, 24/7.

## VPS & infrastructure

- **VPS**: OVHcloud Ubuntu, accessed via `ssh ubuntu@<IP>`
- **External port**: `8090` (mapped to internal `3778`) — the agents API
- **Dashboard**: port `3000` (nginx serving the React UI as static assets)
- **All docker commands use `docker compose` (v2, no hyphen)**
- The `agents-data` Docker volume at `/root/workspace` persists pipeline state across restarts

```bash
# Start / stop
docker compose up -d --build   # rebuild after code changes
docker compose down

# Logs
docker compose logs -f agents
docker compose logs --tail=50 agents

# Pipeline health check
curl -s http://localhost:8090/health | python3 -m json.tool

# Pipeline diagnosis (stuck, errors, draft-only products)
curl -s http://localhost:8090/pipeline/diagnose | python3 -m json.tool

# Reset all PUBLISH_ERROR products back to PUBLISHING
curl -s -X POST http://localhost:8090/pipeline/repair | python3 -m json.tool

# Reset a specific product to a given stage
curl -s -X POST http://localhost:8090/pipeline/reset_product/<prod_id> \
  -H "Content-Type: application/json" -d '{"stage":"FILE_BUILDER"}'
```

## Architecture

```
services/main.py        ← entire backend: FastAPI + all agents + pipeline logic
services/Dockerfile     ← python:3.11-slim, installs requirements, runs uvicorn on :3778
services/requirements.txt
nginx/default.conf      ← proxies /agents/ and /health to agents container
ui/                     ← pre-built React dashboard (static, served by nginx)
ui-src/                 ← React source (Vite). Build output goes to ui/
scripts/
  recover_gumroad_drafts.py  ← diagnose + delete Gumroad orphan drafts
config/settings.json    ← legacy tinyAGI config (not used by main.py)
```

### Pipeline stages (in order)

`RESEARCH → CREATION → COPYWRITING → QA → IMAGE_GEN → FILE_BUILDER → PUBLISHING → ANALYTICS → DONE`

Terminal error state: `PUBLISH_ERROR` (after 3 failed publish attempts).

### Agent roles in `services/main.py`

| Agent | Model tier | Role |
|---|---|---|
| `tinyagi` | fast | Orchestrator — scans pipeline every 5 min, assigns tasks |
| `market-analyst` | fast | RESEARCH stage — searches SearXNG for demand signals |
| `notion-creator` / `finance-creator` / `business-creator` | fast | CREATION stage |
| `copywriter` | quality | COPYWRITING stage — SEO title, description, 13 tags |
| `qa-reviewer` | quality | QA stage — scores quality, generates image prompt |
| `image-generator` | API-only | IMAGE_GEN — calls Pollinations.ai |
| `file-builder` | quality | FILE_BUILDER — generates 7-section PDF content as JSON |
| `publisher` | API-only | PUBLISHING — generates PDF with reportlab, uploads to Gumroad |
| `analytics` | fast | ANALYTICS — LLM summary of product performance |

**Two LLM tiers** (both via Groq API, OpenAI-compatible):
- Fast: `llama-3.1-8b-instant` (orchestrator, creators, research)
- Quality: `llama-3.3-70b-versatile` (copywriter, QA, file-builder)

### Key external services

- **Groq API** — LLM inference (`OPENAI_API_KEY` + `OPENAI_BASE_URL=https://api.groq.com/openai/v1`)
- **Gumroad API v2** — product creation and publishing (`GUMROAD_API_KEY`)
- **Pollinations.ai** — free cover image generation (no key needed, model=flux)
- **SearXNG** — self-hosted search container (`http://searxng:8080`)

## Critical bugs fixed (do not revert)

### 1. `gumroad_update_product` must use `aiohttp.FormData()`
All Gumroad API calls must use `FormData` with `form.add_field(k, str(v))`. Passing a plain Python dict as `data=` to `aiohttp.put()` sends the wrong content-type and the API silently ignores the `published=true` field — products stay as drafts forever.

### 2. Pollinations.ai URL encoding
Use `urllib.parse.quote(prompt, safe=",-")` for the image prompt. Do **not** use `.replace(" ", "+")` — Pollinations.ai requires `%20` encoding. The function retries 3 times with 5s gap and validates response size > 2KB.

### 3. reportlab HTML escaping
All LLM-generated text passed to `reportlab.Paragraph()` must go through `_pdf_safe()` which escapes `&`, `<`, `>`. Raw LLM output often contains these characters and causes silent PDF generation failures.

## Development workflow

**Always develop on the feature branch, merge to main without force-push:**
```bash
git checkout -B claude/<branch-name>
# ... make changes, commit ...
git checkout main
git merge --no-ff claude/<branch-name> -m "merge: description"
git push origin main
```

**After pushing to main, on the VPS:**
```bash
git pull origin main
docker compose up -d --build
```

If `git pull` fails due to local UI asset conflicts (built files in `ui/assets/`):
```bash
git checkout -- ui/assets/ ui/index.html
git pull origin main
```

## Pipeline data

`/root/workspace/pipeline.json` (inside the `agents-data` Docker volume) is the source of truth for all product state. It survives container restarts. Never delete this volume.

### Recovering Gumroad orphan drafts

If Gumroad has unpublished drafts not tracked in the pipeline:
```bash
GUMROAD_API_KEY=$(grep GUMROAD_API_KEY .env | cut -d= -f2) python3 scripts/recover_gumroad_drafts.py
# add --delete to remove orphan drafts from Gumroad
# add --repair to reset PUBLISH_ERROR products in the pipeline
```

## Limits

- **Gumroad**: 10 published products/day (enforced in code). Overflow attempts retry at midnight.
- **Orchestrator loop**: runs every 300 seconds.
- **Auto-unblock**: products stuck as `assigned` for >20 minutes are automatically unblocked.
- **QA gate**: products scoring <50/100 are sent back to COPYWRITING.
- **Publisher retries**: 3 attempts before PUBLISH_ERROR, with exponential backoff (2^n minutes).

## Dashboard UI

The React dashboard (`ui-src/`) is built with Vite and the output committed to `ui/`. To rebuild after UI changes:
```bash
cd ui-src && npm install && npm run build
# output goes to ui/ — commit the built files
```
