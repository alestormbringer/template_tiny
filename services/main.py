"""
TinyAGI Agent Service — runs 8 AI agents 24/7 using local Ollama (zero cost)
"""
import asyncio
import json
import logging
import os
import re
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
log = logging.getLogger("agents")

app = FastAPI(title="TinyAGI Agents", docs_url="/agents/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# ── Environment ──────────────────────────────────────────────────────────────
OLLAMA_BASE   = os.getenv("OPENAI_BASE_URL",    "http://ollama:11434/v1")
OLLAMA_MODEL  = os.getenv("OLLAMA_MODEL",        "llama3.1:8b")
GUMROAD_KEY   = os.getenv("GUMROAD_API_KEY",    "")
NOTION_KEY    = os.getenv("NOTION_API_KEY",     "")
NOTION_WS_ID  = os.getenv("NOTION_WORKSPACE_ID","")
SEARXNG_URL   = os.getenv("SEARXNG_BASE_URL",   "http://searxng:8080")
WORKSPACE     = Path("/root/workspace")

client = AsyncOpenAI(api_key="ollama", base_url=OLLAMA_BASE)

# ── Agent definitions ────────────────────────────────────────────────────────
AGENTS: Dict[str, dict] = {
    "tinyagi": {
        "name": "TinyAGI Orchestrator", "xp": 0, "level": 1,
        "color": "#00ffff",  "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei il master orchestrator di un business di prodotti digitali su Gumroad. "
            "Genera task CONCRETI per gli agenti specializzati. "
            "Rispondi SOLO con un JSON array, esempio:\n"
            '[{"agent":"market-analyst","task":"Analizza le 3 nicchie più profittevoli per template Notion in Italia questa settimana"},'
            '{"agent":"notion-creator","task":"Progetta struttura database per un CRM freelance: clienti, progetti, invoice, follow-up"},'
            '{"agent":"copywriter","task":"Scrivi listing Gumroad per \'Freelance CRM Notion Template\': titolo, descrizione 400 parole, 5 benefit, 10 tag SEO"}]'
        ),
    },
    "market-analyst": {
        "name": "Market Analyst", "xp": 0, "level": 1,
        "color": "#00ff88", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei un analista di mercato per prodotti digitali su Gumroad ed Etsy. "
            "Ricerchi nicchie, analizzi concorrenti, identifichi gap di mercato. "
            "Produci report strutturati con: nicchia, volume stimato, prezzo medio, "
            "competizione (bassa/media/alta), raccomandazione concreta."
        ),
    },
    "notion-creator": {
        "name": "Notion Creator", "xp": 0, "level": 1,
        "color": "#ff6600", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei un esperto di template Notion. Progetti template professionali per "
            "produttività, CRM, project management, habit tracking. "
            "Produci: nome template, descrizione, struttura database (proprietà, tipi, relazioni), "
            "viste suggerite (Board/Calendar/Gallery/Table), istruzioni di utilizzo."
        ),
    },
    "finance-creator": {
        "name": "Finance Creator", "xp": 0, "level": 1,
        "color": "#ffee00", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei uno specialista di modelli finanziari. Crei template Excel/Google Sheets "
            "per budget personale, P&L, cashflow, pricing. "
            "Produci: nome template, fogli necessari, formule chiave, dati di esempio, "
            "istruzioni per l'utente."
        ),
    },
    "business-creator": {
        "name": "Business Creator", "xp": 0, "level": 1,
        "color": "#aa44ff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei uno specialista di business template. Crei business plan, kit onboarding, "
            "proposal freelance, SOP, playbook operativi. "
            "Produci documenti pratici, subito utilizzabili, con struttura chiara."
        ),
    },
    "copywriter": {
        "name": "Gumroad Copywriter", "xp": 0, "level": 1,
        "color": "#ff44aa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei un copywriter SEO per listing di prodotti digitali su Gumroad. "
            "Scrivi copy persuasivo che converte. "
            "Ogni output deve includere: titolo (max 60 char), descrizione (300-500 parole), "
            "5 bullet point benefici, prezzo suggerito (€), 10 tag SEO."
        ),
    },
    "publisher": {
        "name": "Gumroad Publisher", "xp": 0, "level": 1,
        "color": "#00aaff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei responsabile della pubblicazione su Gumroad. "
            "Ricevi la descrizione di un prodotto digitale e devi strutturarlo per la pubblicazione. "
            "Rispondi SOLO con un JSON valido con questi campi:\n"
            '{"name": "titolo prodotto (max 60 chars)", "price_cents": 1500, '
            '"description": "descrizione completa 300-500 parole", '
            '"tags": ["tag1", "tag2", "tag3", "tag4", "tag5"]}\n'
            "Il prezzo è in centesimi (€15 = 1500). Minimo €5 (500), massimo €49 (4900)."
        ),
    },
    "analytics": {
        "name": "Sales Analytics", "xp": 0, "level": 1,
        "color": "#44ffaa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "Sei uno specialista di analytics per prodotti digitali. "
            "Analizzi dati di vendita, calcoli metriche chiave (revenue, conversion, trend). "
            "Produci report actionable con raccomandazioni concrete per aumentare le vendite."
        ),
    },
}

# XP thresholds per level
LEVEL_THRESHOLDS = [0, 50, 150, 300, 500]

# Per-agent task queues and XP persistence
TASK_QUEUES: Dict[str, asyncio.Queue] = {}
XP_FILE = WORKSPACE / "agents_xp.json"
STARTED_AT = datetime.now().isoformat()


# ── XP helpers ───────────────────────────────────────────────────────────────
def xp_to_level(xp: int) -> int:
    for lv in range(len(LEVEL_THRESHOLDS) - 1, -1, -1):
        if xp >= LEVEL_THRESHOLDS[lv]:
            return lv + 1
    return 1


def xp_progress_pct(xp: int) -> int:
    lv = xp_to_level(xp)
    lo = LEVEL_THRESHOLDS[lv - 1]
    hi = LEVEL_THRESHOLDS[lv] if lv < len(LEVEL_THRESHOLDS) else lo + 200
    return min(100, int((xp - lo) / max(hi - lo, 1) * 100))


def load_xp():
    if XP_FILE.exists():
        try:
            data = json.loads(XP_FILE.read_text())
            for aid, xp in data.items():
                if aid in AGENTS:
                    AGENTS[aid]["xp"] = xp
                    AGENTS[aid]["level"] = xp_to_level(xp)
        except Exception as e:
            log.warning(f"XP load error: {e}")


def save_xp():
    try:
        XP_FILE.parent.mkdir(parents=True, exist_ok=True)
        XP_FILE.write_text(json.dumps({aid: a["xp"] for aid, a in AGENTS.items()}))
    except Exception as e:
        log.warning(f"XP save error: {e}")


# ── Logging helper ────────────────────────────────────────────────────────────
def agent_log(aid: str, msg: str):
    ts = datetime.now().strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    AGENTS[aid]["log"].insert(0, entry)
    AGENTS[aid]["log"] = AGENTS[aid]["log"][:30]
    log.info(f"[{aid}] {msg}")


# ── LLM call ─────────────────────────────────────────────────────────────────
async def llm(system: str, user: str, max_tokens: int = 1000) -> str:
    try:
        resp = await client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[
                {"role": "system", "content": system},
                {"role": "user",   "content": user},
            ],
            max_tokens=max_tokens,
            temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
    except Exception as e:
        log.error(f"LLM error: {e}")
        return f"[LLM_ERROR: {e}]"


# ── External API helpers ──────────────────────────────────────────────────────
async def gumroad_get_sales() -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                "https://api.gumroad.com/v2/sales",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                return await r.json()
    except Exception as e:
        return {"error": str(e)}


async def gumroad_get_products() -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                "https://api.gumroad.com/v2/products",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                return await r.json()
    except Exception as e:
        return {"error": str(e)}


async def gumroad_create_product(name: str, price_cents: int, description: str, tags: list = None) -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            payload = {"name": name, "price": price_cents, "description": description}
            if tags:
                payload["tags"] = ",".join(tags[:10])
            async with sess.post(
                "https://api.gumroad.com/v2/products",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                data=payload,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                return await r.json()
    except Exception as e:
        return {"error": str(e)}


async def searxng_search(query: str) -> str:
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"{SEARXNG_URL}/search",
                params={"q": query, "format": "json", "language": "it"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                data = await r.json()
                results = data.get("results", [])[:5]
                return "\n".join(
                    f"- {r.get('title','')}: {r.get('content','')[:150]}"
                    for r in results
                ) or "Nessun risultato."
    except Exception as e:
        return f"[Search error: {e}]"


async def notion_create_page(title: str, content: str) -> dict:
    if not NOTION_KEY:
        return {"error": "No Notion key"}
    try:
        async with aiohttp.ClientSession() as sess:
            payload = {
                "parent": {"workspace": True},
                "properties": {
                    "title": {"title": [{"text": {"content": title}}]}
                },
                "children": [
                    {
                        "object": "block",
                        "type": "paragraph",
                        "paragraph": {
                            "rich_text": [{"type": "text", "text": {"content": content[:2000]}}]
                        },
                    }
                ],
            }
            async with sess.post(
                "https://api.notion.com/v1/pages",
                headers={
                    "Authorization": f"Bearer {NOTION_KEY}",
                    "Notion-Version": "2022-06-28",
                    "Content-Type": "application/json",
                },
                json=payload,
                timeout=aiohttp.ClientTimeout(total=10),
            ) as r:
                return await r.json()
    except Exception as e:
        return {"error": str(e)}


# ── Task execution ────────────────────────────────────────────────────────────
async def execute_task(aid: str, task: str):
    a = AGENTS[aid]
    a["status"] = "working"
    a["current_task"] = task
    agent_log(aid, f"⚡ {task[:70]}...")

    user_prompt = task
    enrichment = ""

    # Enrich context with real data where relevant
    if aid == "analytics" and GUMROAD_KEY:
        sales_data = await gumroad_get_sales()
        if "error" not in sales_data:
            sales_json = json.dumps(sales_data.get("sales", [])[:10], ensure_ascii=False)
            enrichment = f"\n\nDati vendite Gumroad (ultimi 10):\n{sales_json}"
        products_data = await gumroad_get_products()
        if "error" not in products_data:
            prods_json = json.dumps(products_data.get("products", []), ensure_ascii=False)
            enrichment += f"\n\nProdotti Gumroad:\n{prods_json}"

    if aid == "market-analyst":
        search_results = await searxng_search(task[:80])
        enrichment = f"\n\nRicerca web pertinente:\n{search_results}"

    try:
        result = await llm(a["system"], user_prompt + enrichment, max_tokens=900)

        # Publish to Gumroad if publisher
        if aid == "publisher" and GUMROAD_KEY:
            try:
                json_match = re.search(r"\{.*?\}", result, re.DOTALL)
                if json_match:
                    prod = json.loads(json_match.group())
                    gum_resp = await gumroad_create_product(
                        name=prod.get("name", task[:60]),
                        price_cents=int(prod.get("price_cents", 1500)),
                        description=prod.get("description", result[:1000]),
                        tags=prod.get("tags", []),
                    )
                    if "product" in gum_resp:
                        url = gum_resp["product"].get("short_url", "")
                        agent_log(aid, f"🚀 Pubblicato su Gumroad: {url}")
                    else:
                        agent_log(aid, f"⚠ Gumroad error: {gum_resp.get('message', str(gum_resp))}")
                else:
                    agent_log(aid, "⚠ JSON prodotto non trovato nella risposta LLM")
            except Exception as e:
                agent_log(aid, f"⚠ Errore pubblicazione: {e}")

        # Persist to Notion if notion-creator
        if aid == "notion-creator" and NOTION_KEY:
            title = task[:60]
            notion_resp = await notion_create_page(title, result)
            if "id" in notion_resp:
                agent_log(aid, f"📝 Salvato su Notion: {notion_resp.get('url','')}")

        # Save to workspace
        out_dir = WORKSPACE / aid
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        slug = re.sub(r"[^a-z0-9]+", "_", task[:30].lower())
        (out_dir / f"{ts}_{slug}.txt").write_text(
            f"TASK:\n{task}\n\nRISULTATO:\n{result}\n", encoding="utf-8"
        )

        xp_gain = 10 + min(40, len(result) // 80)
        a["xp"] += xp_gain
        a["level"] = xp_to_level(a["xp"])
        a["tasks_done"] += 1
        agent_log(aid, f"✓ Completato +{xp_gain} XP | {result[:80]}...")
        save_xp()

    except Exception as e:
        agent_log(aid, f"✗ Errore: {e}")
    finally:
        a["status"] = "idle"
        a["current_task"] = None


# ── Orchestrator loop ─────────────────────────────────────────────────────────
async def orchestrator_loop():
    await asyncio.sleep(8)  # let other services come up

    while True:
        agent_log("tinyagi", "🧠 Generando nuovo batch di task...")

        prompt = (
            "Genera esattamente 6 task concreti per produrre e vendere template digitali su Gumroad. "
            "Distribuisci tra gli agenti: market-analyst, notion-creator, finance-creator, "
            "business-creator, copywriter, publisher, analytics. "
            "Per il publisher assegna task del tipo: 'Pubblica su Gumroad: [nome prodotto], "
            "prezzo €[X], [breve descrizione del prodotto e del suo pubblico target]'. "
            "I task devono essere specifici, pratici, orientati al business. "
            "Rispondi SOLO con un JSON array valido."
        )

        try:
            raw = await llm(AGENTS["tinyagi"]["system"], prompt, max_tokens=600)
            json_match = re.search(r"\[.*?\]", raw, re.DOTALL)
            if not json_match:
                agent_log("tinyagi", "⚠ JSON non trovato nella risposta, riprovo al prossimo ciclo")
            else:
                tasks = json.loads(json_match.group())
                dispatched = 0
                for item in tasks:
                    aid = item.get("agent", "")
                    task = item.get("task", "")
                    if aid in AGENTS and aid != "tinyagi" and task:
                        await TASK_QUEUES[aid].put(task)
                        dispatched += 1

                xp_gain = 15 + dispatched
                AGENTS["tinyagi"]["xp"] += xp_gain
                AGENTS["tinyagi"]["level"] = xp_to_level(AGENTS["tinyagi"]["xp"])
                AGENTS["tinyagi"]["tasks_done"] += 1
                agent_log("tinyagi", f"📋 Dispatched {dispatched} task (+{xp_gain} XP)")
                save_xp()

        except Exception as e:
            agent_log("tinyagi", f"✗ Errore orchestrazione: {e}")

        await asyncio.sleep(600)  # new batch every 10 minutes


# ── Agent worker loops ────────────────────────────────────────────────────────
async def agent_worker(aid: str):
    idx = list(AGENTS.keys()).index(aid)
    await asyncio.sleep(15 + idx * 5)  # stagger startup

    while True:
        try:
            task = await asyncio.wait_for(TASK_QUEUES[aid].get(), timeout=30)
            await execute_task(aid, task)
            TASK_QUEUES[aid].task_done()
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            log.error(f"Worker {aid} unhandled: {e}")
            await asyncio.sleep(5)


async def analytics_auto_loop():
    """Analytics runs autonomously every hour."""
    await asyncio.sleep(45)
    while True:
        task = (
            "Analizza lo stato del sistema: quanti task completati, "
            "performance degli agenti, trend di produzione template. "
            "Produci report con KPI e raccomandazioni per la prossima settimana."
        )
        await execute_task("analytics", task)
        await asyncio.sleep(3600)


# ── FastAPI lifecycle ─────────────────────────────────────────────────────────
@app.on_event("startup")
async def startup():
    global TASK_QUEUES
    WORKSPACE.mkdir(parents=True, exist_ok=True)
    load_xp()

    for aid in AGENTS:
        TASK_QUEUES[aid] = asyncio.Queue()

    asyncio.create_task(orchestrator_loop())
    for aid in AGENTS:
        if aid not in ("tinyagi", "analytics"):
            asyncio.create_task(agent_worker(aid))
    asyncio.create_task(analytics_auto_loop())

    log.info(f"TinyAGI Agents online — {len(AGENTS)} agents, model={OLLAMA_MODEL}")


# ── API endpoints ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "agents": len(AGENTS), "model": OLLAMA_MODEL}


@app.get("/agents/status")
async def agents_status():
    return {
        "agents": {
            aid: {
                "name":        a["name"],
                "xp":          a["xp"],
                "level":       a["level"],
                "xp_pct":      xp_progress_pct(a["xp"]),
                "status":      a["status"],
                "current_task": a["current_task"],
                "tasks_done":  a["tasks_done"],
                "log":         a["log"][:6],
                "color":       a["color"],
                "queue_size":  TASK_QUEUES[aid].qsize() if TASK_QUEUES else 0,
            }
            for aid, a in AGENTS.items()
        },
        "total_xp":    sum(a["xp"] for a in AGENTS.values()),
        "tasks_done":  sum(a["tasks_done"] for a in AGENTS.values()),
        "started_at":  STARTED_AT,
        "timestamp":   datetime.now().isoformat(),
    }


@app.post("/agents/{aid}/trigger")
async def trigger_agent(aid: str, body: dict):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    task = body.get("task") or "Esegui un'analisi generale e produci un report."
    asyncio.create_task(execute_task(aid, task))
    return {"status": "triggered", "agent": aid, "task": task}


@app.get("/agents/{aid}/logs")
async def agent_logs(aid: str):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    return {"agent": aid, "logs": AGENTS[aid]["log"]}


@app.get("/agents/{aid}/outputs")
async def agent_outputs(aid: str):
    """List recent output files for an agent."""
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    out_dir = WORKSPACE / aid
    if not out_dir.exists():
        return {"files": []}
    files = sorted(out_dir.glob("*.txt"), reverse=True)[:10]
    return {
        "files": [
            {"name": f.name, "content": f.read_text(encoding="utf-8", errors="replace")[:500]}
            for f in files
        ]
    }
