"""
TinyAGI Agent Service — pipeline-driven digital product factory
Targets worldwide English-speaking market on Gumroad
Verticals: Notion templates | Finance/Excel | Business/Freelance
Pipeline: RESEARCH → CREATION → COPYWRITING → QA → IMAGE_GEN → FILE_BUILDER → PUBLISHING → ANALYTICS → DONE
"""
import asyncio
import hashlib
import io
import json
import logging
import os
import re
import uuid
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional

import aiohttp
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from openai import AsyncOpenAI

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("agents")

app = FastAPI(title="TinyAGI Agents", docs_url="/agents/docs")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

OLLAMA_BASE    = os.getenv("OPENAI_BASE_URL",        "http://ollama:11434/v1")
OLLAMA_MODEL   = os.getenv("OLLAMA_MODEL",           "llama-3.1-8b-instant")
QUALITY_MODEL  = os.getenv("OLLAMA_QUALITY_MODEL",   "llama-3.3-70b-versatile")
LLM_API_KEY    = os.getenv("OPENAI_API_KEY",         "ollama")
GUMROAD_KEY    = os.getenv("GUMROAD_API_KEY",        "")
NOTION_KEY     = os.getenv("NOTION_API_KEY",         "")
SEARXNG_URL    = os.getenv("SEARXNG_BASE_URL",       "http://searxng:8080")
WORKSPACE      = Path("/root/workspace")
ETSY_API_KEY       = os.getenv("ETSY_API_KEY",       "")
ETSY_SHOP_ID       = os.getenv("ETSY_SHOP_ID",       "")
ETSY_ACCESS_TOKEN  = os.getenv("ETSY_ACCESS_TOKEN",  "")
ETSY_REFRESH_TOKEN = os.getenv("ETSY_REFRESH_TOKEN", "")

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=OLLAMA_BASE)

# ── Pipeline config ───────────────────────────────────────────────────────────
VERTICALS      = ["notion", "finance", "business"]
VERTICAL_AGENT = {"notion": "notion-creator", "finance": "finance-creator", "business": "business-creator"}
STAGE_SEQUENCE = [
    "RESEARCH", "CREATION", "COPYWRITING", "QA",
    "IMAGE_GEN", "FILE_BUILDER", "PUBLISHING", "ANALYTICS", "DONE",
]
STAGE_DATA_KEY = {
    "RESEARCH":    "research",
    "CREATION":    "creation",
    "COPYWRITING": "copy",
    "QA":          "qa",
    "IMAGE_GEN":   "image_gen",
    "FILE_BUILDER":"file_content",
    "PUBLISHING":  "publish",
    "ANALYTICS":   "analytics_data",
}
# Token budget per agent (output tokens)
AGENT_MAX_TOKENS = {
    "tinyagi":        250,
    "file-builder":  2500,
    "analytics":      500,
}

# ── Agent definitions ─────────────────────────────────────────────────────────
AGENTS: Dict[str, dict] = {
    "tinyagi": {
        "name": "TinyAGI Orchestrator", "xp": 0, "level": 1,
        "color": "#00ffff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": OLLAMA_MODEL,
        "system": (
            "You are the strategic orchestrator of an autonomous digital product pipeline on Gumroad. "
            "You receive the current pipeline state and make high-level decisions: which vertical to prioritize, "
            "whether to retry or skip stuck/errored products, and how to balance the pipeline across verticals. "
            "Output only a valid JSON object:\n"
            '{"priority_vertical":"notion|finance|business|all",'
            '"retry_products":["prod_id_if_any"],'
            '"skip_products":["prod_id_if_any"],'
            '"reasoning":"one sentence explaining the decision"}'
        ),
    },
    "market-analyst": {
        "name": "Market Analyst", "xp": 0, "level": 1,
        "color": "#00ff88", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": OLLAMA_MODEL,
        "system": (
            "You are a market analyst specialized in digital products for Gumroad and Etsy. "
            "Given a niche, target audience, and current catalog, you identify market gaps and demand signals. "
            "Output a structured JSON: product title, type, suggested price $9-$15, and 3 SEO keywords."
        ),
    },
    "notion-creator": {
        "name": "Notion Creator", "xp": 0, "level": 1,
        "color": "#ff6600", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": OLLAMA_MODEL,
        "system": (
            "You are a Notion template specialist for the English-speaking productivity market. "
            "Given a product idea, design a complete Notion template structure: pages, databases, "
            "properties, views, formulas and layout. Output only valid JSON."
        ),
    },
    "finance-creator": {
        "name": "Finance Creator", "xp": 0, "level": 1,
        "color": "#ffee00", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": OLLAMA_MODEL,
        "system": (
            "You are an Excel and Google Sheets template specialist for personal finance. "
            "Given a product idea, design a complete spreadsheet: sheets, columns, formulas, charts. "
            "Output a detailed JSON structure targeting the English-speaking market, priced $9-$15."
        ),
    },
    "business-creator": {
        "name": "Business Creator", "xp": 0, "level": 1,
        "color": "#aa44ff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": OLLAMA_MODEL,
        "system": (
            "You are a business and freelance template specialist. "
            "Given a product idea, design complete templates: proposals, invoices, client trackers, "
            "project plans or SOPs. Output valid JSON for English-speaking freelancers, priced $9-$15."
        ),
    },
    "copywriter": {
        "name": "Gumroad Copywriter", "xp": 0, "level": 1,
        "color": "#ff44aa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": QUALITY_MODEL,
        "system": (
            "You are a conversion copywriter for digital products on Gumroad. "
            "Given a product name and structure, write: SEO title (max 60 chars), "
            "persuasive description (200 words), 13 SEO tags. "
            "Output ONLY valid JSON. Target English-speaking buyers, $9-$15."
        ),
    },
    "qa-reviewer": {
        "name": "QA Reviewer", "xp": 0, "level": 1,
        "color": "#ffaa00", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": QUALITY_MODEL,
        "system": (
            "You are a QA specialist for Gumroad digital products. "
            "Review all product data for coherence, accuracy and persuasiveness. Fix any inconsistencies. "
            "Then generate a vivid, specific image prompt for the product cover art. "
            "Output ONLY valid JSON:\n"
            '{"approved":true,"quality_score":85,"title":"SEO title max 60 chars",'
            '"description":"200-word persuasive description","tags":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],'
            '"price":12,"image_prompt":"detailed cover art prompt with style, colors, subject","feedback":"one sentence"}'
        ),
    },
    "image-generator": {
        "name": "Image Generator", "xp": 0, "level": 1,
        "color": "#ff9900", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": None,
        "system": "Generates product cover images via Pollinations.ai. No LLM required.",
    },
    "file-builder": {
        "name": "File Builder", "xp": 0, "level": 1,
        "color": "#00ccff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": QUALITY_MODEL,
        "system": (
            "You are a professional digital product creator specializing in downloadable templates. "
            "You create detailed, actionable content that buyers can immediately use. "
            "Your content is SPECIFIC — real property names, real formulas, real column names, real examples. "
            "Never use generic placeholders. A buyer paying $9-$15 expects professional, immediately usable content. "
            "Output ONLY valid JSON."
        ),
    },
    "publisher": {
        "name": "Gumroad Publisher", "xp": 0, "level": 1,
        "color": "#00aaff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": None,
        "system": "Publishes products to Gumroad and Etsy via API. No LLM required.",
    },
    "analytics": {
        "name": "Sales Analytics", "xp": 0, "level": 1,
        "color": "#44ffaa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [], "model": OLLAMA_MODEL,
        "system": (
            "You are a daily sales analytics agent for a Gumroad digital products store. "
            "Receive product data and produce a structured report: daily summary, trend analysis, recommendation. "
            'Output ONLY valid JSON: {"daily_summary":"...","trend_analysis":"...","recommendation":"..."}'
        ),
    },
}

# ── Pipeline manager ──────────────────────────────────────────────────────────
class PipelineManager:
    def __init__(self):
        self.file = WORKSPACE / "pipeline.json"
        self.products: List[dict] = []
        self.load()

    def load(self):
        if self.file.exists():
            try:
                self.products = json.loads(self.file.read_text()).get("products", [])
            except Exception as e:
                log.warning(f"Pipeline load error: {e}")

    def save(self):
        try:
            self.file.parent.mkdir(parents=True, exist_ok=True)
            self.file.write_text(json.dumps({"products": self.products}, indent=2, ensure_ascii=False))
        except Exception as e:
            log.warning(f"Pipeline save error: {e}")

    def create_product(self, vertical: str) -> dict:
        p = {
            "id":             f"prod_{uuid.uuid4().hex[:8]}",
            "vertical":       vertical,
            "stage":          "RESEARCH",
            "assigned":       False,
            "research":       None,
            "creation":       None,
            "copy":           None,
            "qa":             None,
            "image_gen":      None,
            "file_content":   None,
            "publish":        None,
            "analytics_data": None,
            "publish_attempts": 0,
            "created_at":     datetime.now().isoformat(),
            "updated_at":     datetime.now().isoformat(),
        }
        self.products.append(p)
        self.save()
        return p

    def advance(self, product_id: str, data_key: str, data: dict):
        for p in self.products:
            if p["id"] == product_id:
                p[data_key] = data
                idx = STAGE_SEQUENCE.index(p["stage"])
                if idx < len(STAGE_SEQUENCE) - 1:
                    p["stage"] = STAGE_SEQUENCE[idx + 1]
                p["assigned"] = False
                p["updated_at"] = datetime.now().isoformat()
                self.save()
                return p
        return None

    def mark_assigned(self, product_id: str):
        for p in self.products:
            if p["id"] == product_id:
                p["assigned"] = True
                self.save()
                return

    def get_pending_actions(self) -> List[dict]:
        # Auto-unblock products stuck as assigned for more than 20 minutes
        cutoff = (datetime.now() - timedelta(minutes=20)).isoformat()
        for p in self.products:
            if (p.get("assigned") and p.get("updated_at", "") < cutoff
                    and p["stage"] not in ("DONE", "PUBLISH_ERROR")):
                p["assigned"] = False
                log.info(f"Auto-unblocked {p['id']} at stage {p['stage']}")
        self.save()

        now = datetime.now().isoformat()
        actions = []
        for vertical in VERTICALS:
            # Products actively in progress (not terminal)
            in_progress = [
                p for p in self.products
                if p["vertical"] == vertical
                and p["stage"] not in ("DONE", "PUBLISH_ERROR")
            ]
            # Products ready to work on
            active = [
                p for p in in_progress
                if not p.get("assigned") and p.get("retry_after", "0") <= now
            ]
            if not in_progress:
                new_p = self.create_product(vertical)
                actions.append({"product": new_p})
            elif active:
                actions.append({"product": active[0]})
        return actions

    def get_product(self, product_id: str) -> Optional[dict]:
        return next((p for p in self.products if p["id"] == product_id), None)

    def recent(self, n: int = 10) -> List[dict]:
        return sorted(self.products, key=lambda p: p["updated_at"], reverse=True)[:n]

    def stats(self) -> dict:
        all_stages = STAGE_SEQUENCE + ["PUBLISH_ERROR"]
        return {
            "total":          len(self.products),
            "done":           len([p for p in self.products if p["stage"] == "DONE"]),
            "publish_errors": len([p for p in self.products if p["stage"] == "PUBLISH_ERROR"]),
            "by_stage":    {s: len([p for p in self.products if p["stage"] == s]) for s in all_stages},
            "by_vertical": {v: len([p for p in self.products if p["vertical"] == v]) for v in VERTICALS},
        }


pipeline = PipelineManager()

# ── XP, queues, logs ──────────────────────────────────────────────────────────
LEVEL_THRESHOLDS = [0, 50, 150, 300, 500]
TASK_QUEUES: Dict[str, asyncio.Queue] = {}
XP_FILE     = WORKSPACE / "agents_xp.json"
STARTED_AT  = datetime.now().isoformat()
DETAIL_LOGS: Dict[str, list] = {aid: [] for aid in AGENTS}
REASONING_LOG: list = []


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
            for aid, xp in json.loads(XP_FILE.read_text()).items():
                if aid in AGENTS:
                    AGENTS[aid]["xp"]   = xp
                    AGENTS[aid]["level"] = xp_to_level(xp)
        except Exception as e:
            log.warning(f"XP load error: {e}")


def save_xp():
    try:
        XP_FILE.parent.mkdir(parents=True, exist_ok=True)
        XP_FILE.write_text(json.dumps({aid: a["xp"] for aid, a in AGENTS.items()}))
    except Exception as e:
        log.warning(f"XP save error: {e}")


def agent_log(aid: str, msg: str):
    ts    = datetime.now().strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    AGENTS[aid]["log"].insert(0, entry)
    AGENTS[aid]["log"] = AGENTS[aid]["log"][:30]
    log.info(f"[{aid}] {msg}")


# ── LLM ──────────────────────────────────────────────────────────────────────
async def llm(system: str, user: str, max_tokens: int = 1000, model: str = None) -> str:
    _model = model or OLLAMA_MODEL
    for attempt in range(3):
        try:
            resp = await asyncio.wait_for(
                client.chat.completions.create(
                    model=_model,
                    messages=[
                        {"role": "system", "content": system},
                        {"role": "user",   "content": user},
                    ],
                    max_tokens=max_tokens,
                    temperature=0.7,
                ),
                timeout=120.0,
            )
            return resp.choices[0].message.content.strip()
        except asyncio.TimeoutError:
            log.error(f"LLM timeout (model={_model})")
            return "[LLM_TIMEOUT]"
        except Exception as e:
            err = str(e)
            if "429" in err or "rate" in err.lower() or "limit" in err.lower():
                wait = (attempt + 1) * 15
                log.warning(f"LLM rate-limited (model={_model}) — waiting {wait}s (attempt {attempt+1}/3)")
                await asyncio.sleep(wait)
                continue
            log.error(f"LLM error (model={_model}): {e}")
            return f"[LLM_ERROR: {e}]"
    return "[LLM_RATE_LIMITED]"


def extract_json(text: str) -> Optional[dict]:
    text = re.sub(r'```(?:json)?\s*', '', text).strip()
    try:
        return json.loads(text)
    except Exception:
        pass
    start = text.find('{')
    if start != -1:
        depth = 0
        for i, ch in enumerate(text[start:], start):
            if ch == '{':
                depth += 1
            elif ch == '}':
                depth -= 1
                if depth == 0:
                    try:
                        return json.loads(text[start:i + 1])
                    except Exception:
                        pass
                    break
    return None


# ── Recovery functions ────────────────────────────────────────────────────────
def recover_copy(raw: str) -> dict:
    title = ""
    m = re.search(r'"(?:title|seo_title|product_title|final_title|name)"\s*:\s*"([^"]{3,80})"', raw)
    if m:
        title = m.group(1)
    if not title:
        m = re.search(r'(?:SEO\s+)?TITLE[:\s]+(.{3,80}?)(?:\n|$)', raw, re.IGNORECASE)
        if m:
            title = m.group(1).strip().strip('"')
    if not title:
        m = re.search(r'1\)\s*(.{3,80}?)(?:\n|$)', raw)
        if m:
            title = m.group(1).strip().strip('"')

    price = 12
    m = re.search(r'"price"\s*:\s*(\d+)', raw)
    if m:
        v = int(m.group(1))
        price = v if 5 <= v <= 200 else (v / 100 if v >= 500 else 12)

    desc = ""
    m = re.search(r'"description"\s*:\s*"(.*?)"(?=\s*,\s*")', raw, re.DOTALL)
    if m:
        desc = m.group(1).replace('\\n', '\n')
    if not desc:
        m = re.search(r'(?:PRODUCT\s+)?DESCRIPTION[:\s]+(.*?)(?=\n[A-Z0-9]|\Z)', raw, re.DOTALL | re.IGNORECASE)
        if m:
            desc = m.group(1).strip()
    if not desc:
        desc = raw[:600]

    tags: list = []
    m = re.search(r'(?:SEO\s+)?TAGS?[:\s]+(.*?)(?:\n[A-Z]|\Z)', raw, re.DOTALL | re.IGNORECASE)
    if m:
        tags = [t.strip() for t in m.group(1).split(',') if t.strip()][:13]
    if not tags:
        tags = list(dict.fromkeys(re.findall(r'"([A-Za-z][A-Za-z0-9 \-]{2,25})"', raw)))[:13]

    return {"title": title or "Digital Template", "price": price,
            "description": desc, "tags": tags, "bullet_points": [], "_recovered": True}


def recover_research(raw: str) -> dict:
    def find(patterns, text, default=""):
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
            if m:
                return m.group(1).strip().strip('"').strip("'")
        return default

    name = find([
        r'"product_name"\s*:\s*"([^"]{3,80})"',
        r'product[_\s]name[:\s]+(.{3,80}?)(?:\n|$)',
    ], raw, "Digital Template")

    audience = find([
        r'"target_audience"\s*:\s*"([^"]{3,80})"',
        r'target[_\s]audience[:\s]+(.{3,80}?)(?:\n|$)',
    ], raw, "professionals")

    keywords: list = []
    m = re.findall(r'"([A-Za-z][A-Za-z0-9 \-]{2,25})"', raw)
    if m:
        keywords = list(dict.fromkeys(m))[:5]

    price = 12
    m = re.search(r'\$?(\d{1,2})(?:\.\d{2})?', raw)
    if m:
        v = int(m.group(1))
        if 5 <= v <= 50:
            price = v

    return {"product_name": name, "target_audience": audience, "price": price,
            "keywords": keywords, "rationale": raw[:200], "_recovered": True}


def recover_creation(raw: str) -> dict:
    def find(patterns, text, default=""):
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE)
            if m:
                return m.group(1).strip().strip('"')
        return default

    name = find([
        r'"template_name"\s*:\s*"([^"]{3,80})"',
        r'template[_\s]name[:\s]+(.{3,80}?)(?:\n|$)',
    ], raw, "Professional Template")

    features = re.findall(r'[-•*]\s*(.{5,80}?)(?:\n|$)', raw)
    if not features:
        features = re.findall(r'"([A-Za-z].{5,60})"', raw)
    features = features[:5]

    return {"template_name": name, "tagline": raw[:80], "target_user": "professionals",
            "key_features": features or ["Customizable", "Easy to use", "Professional"],
            "value_proposition": raw[:150], "_recovered": True}


# ── External APIs ─────────────────────────────────────────────────────────────
async def searxng_search(query: str) -> str:
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"{SEARXNG_URL}/search",
                params={"q": query, "format": "json", "language": "en"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                data    = await r.json(content_type=None)
                results = data.get("results", [])[:5]
                return "\n".join(
                    f"- {r.get('title','')}: {r.get('content','')[:150]}" for r in results
                ) or "No results found."
    except Exception as e:
        return f"[Search error: {e}]"


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
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def gumroad_create_product(title: str, description: str, price_cents: int, tags: list) -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("name", title)
            form.add_field("description", description)
            form.add_field("price", str(price_cents))
            form.add_field("published", "false")
            for tag in tags[:5]:
                form.add_field("tags[]", tag[:20])
            async with sess.post(
                "https://api.gumroad.com/v2/products",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                log.info(f"Gumroad create_product HTTP {r.status}")
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def gumroad_upload_file(product_id: str, file_bytes: bytes, filename: str, content_type: str) -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("file", file_bytes, filename=filename, content_type=content_type)
            async with sess.post(
                f"https://api.gumroad.com/v2/products/{product_id}/product_files",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as r:
                log.info(f"Gumroad upload_file HTTP {r.status}")
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def gumroad_upload_cover_image(product_id: str, img_bytes: bytes) -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("preview", img_bytes, filename="cover.jpg", content_type="image/jpeg")
            async with sess.put(
                f"https://api.gumroad.com/v2/products/{product_id}",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as r:
                log.info(f"Gumroad upload_cover HTTP {r.status}")
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def gumroad_update_product(product_id: str, fields: dict) -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.put(
                f"https://api.gumroad.com/v2/products/{product_id}",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                data=fields,
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                log.info(f"Gumroad update_product HTTP {r.status}")
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


# ── Etsy API ──────────────────────────────────────────────────────────────────
import time as _time
_etsy_access_token: str = ETSY_ACCESS_TOKEN
_etsy_token_expiry: float = 0.0


async def etsy_ensure_token() -> str:
    global _etsy_access_token, _etsy_token_expiry
    if _etsy_access_token and _time.time() < _etsy_token_expiry - 60:
        return _etsy_access_token
    if not ETSY_REFRESH_TOKEN:
        return _etsy_access_token
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(
                "https://api.etsy.com/v3/public/oauth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={"grant_type": "refresh_token", "client_id": ETSY_API_KEY,
                      "refresh_token": ETSY_REFRESH_TOKEN},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                data = await r.json(content_type=None)
                _etsy_access_token = data.get("access_token", _etsy_access_token)
                _etsy_token_expiry = _time.time() + data.get("expires_in", 3600)
                log.info("Etsy token refreshed")
    except Exception as e:
        log.warning(f"Etsy token refresh failed: {e}")
    return _etsy_access_token


async def etsy_create_listing(title: str, description: str, price_usd: float, tags: list) -> dict:
    if not (ETSY_API_KEY and ETSY_SHOP_ID):
        return {"error": "Etsy not configured"}
    token = await etsy_ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(
                f"https://openapi.etsy.com/v3/application/shops/{ETSY_SHOP_ID}/listings",
                headers={"x-api-key": ETSY_API_KEY, "Authorization": f"Bearer {token}",
                         "Content-Type": "application/json"},
                json={"title": title[:140], "description": description[:70000],
                      "price": round(float(price_usd), 2), "quantity": 999,
                      "who_made": "i_did", "when_made": "2020_2025",
                      "taxonomy_id": 2078, "type": "digital", "state": "draft",
                      "tags": [t[:20] for t in tags[:13]]},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def etsy_upload_digital_file(listing_id: str, file_bytes: bytes, filename: str) -> dict:
    if not (ETSY_API_KEY and ETSY_SHOP_ID):
        return {"error": "Etsy not configured"}
    token = await etsy_ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("file", file_bytes, filename=filename, content_type="application/pdf")
            async with sess.post(
                f"https://openapi.etsy.com/v3/application/shops/{ETSY_SHOP_ID}/listings/{listing_id}/files",
                headers={"x-api-key": ETSY_API_KEY, "Authorization": f"Bearer {token}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def etsy_upload_image(listing_id: str, img_bytes: bytes) -> dict:
    if not (ETSY_API_KEY and ETSY_SHOP_ID):
        return {"error": "Etsy not configured"}
    token = await etsy_ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("image", img_bytes, filename="cover.jpg", content_type="image/jpeg")
            async with sess.post(
                f"https://openapi.etsy.com/v3/application/shops/{ETSY_SHOP_ID}/listings/{listing_id}/images",
                headers={"x-api-key": ETSY_API_KEY, "Authorization": f"Bearer {token}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def etsy_publish_listing(listing_id: str) -> dict:
    if not (ETSY_API_KEY and ETSY_SHOP_ID):
        return {"error": "Etsy not configured"}
    token = await etsy_ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.patch(
                f"https://openapi.etsy.com/v3/application/shops/{ETSY_SHOP_ID}/listings/{listing_id}",
                headers={"x-api-key": ETSY_API_KEY, "Authorization": f"Bearer {token}",
                         "Content-Type": "application/json"},
                json={"state": "active"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


# ── Image & PDF generation ────────────────────────────────────────────────────
async def generate_cover_image(image_prompt: str, seed: int = 42) -> Optional[bytes]:
    safe = re.sub(r"[^a-zA-Z0-9 ,\-]", "", image_prompt)[:200].strip().replace(" ", "+")
    url  = (f"https://image.pollinations.ai/prompt/{safe}"
            f"?width=1200&height=800&nologo=true&seed={seed}")
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(url, timeout=aiohttp.ClientTimeout(total=60)) as r:
                if r.status == 200:
                    return await r.read()
    except Exception as e:
        log.warning(f"Image generation failed: {e}")
    return None


def generate_product_pdf(
    title: str, description: str, features: list,
    tagline: str = "", image_bytes: Optional[bytes] = None,
    sections: Optional[list] = None,
) -> bytes:
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.lib import colors
    from reportlab.lib.units import inch
    from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, HRFlowable, Image as RLImage

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    accent = ParagraphStyle("accent", parent=styles["Normal"],
                            textColor=colors.HexColor("#2D3A8C"), fontSize=11)
    bullet = ParagraphStyle("bullet", parent=styles["Normal"], leftIndent=20, fontSize=10)
    story  = []

    if image_bytes:
        try:
            story.append(RLImage(io.BytesIO(image_bytes), width=6 * inch, height=3.5 * inch))
            story.append(Spacer(1, 16))
        except Exception:
            pass

    story.append(Paragraph(title, styles["Title"]))
    if tagline:
        story.append(Paragraph(tagline, styles["Italic"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2D3A8C")))
    story.append(Spacer(1, 14))

    if sections:
        for section in sections:
            heading = (section.get("heading") or "").strip()
            content = (section.get("content") or "").strip()
            if heading:
                story.append(Paragraph(heading, styles["Heading1"]))
            for line in content.split("\n"):
                line = line.strip()
                if not line:
                    story.append(Spacer(1, 4))
                elif line.startswith(("•", "-", "*")):
                    story.append(Paragraph(line, bullet))
                else:
                    story.append(Paragraph(line, styles["Normal"]))
            story.append(Spacer(1, 14))
    else:
        story.append(Paragraph("Overview", styles["Heading1"]))
        story.append(Paragraph(
            description[:1200] if description else "Professional digital template.",
            styles["Normal"]
        ))
        story.append(Spacer(1, 14))
        if features:
            story.append(Paragraph("What's Included", styles["Heading1"]))
            for f in features:
                story.append(Paragraph(f"• {f}", accent))
            story.append(Spacer(1, 14))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Thank you for your purchase! Download and start using your template immediately.",
        styles["Normal"]
    ))

    doc.build(story)
    buf.seek(0)
    return buf.getvalue()


# ── Build stage task ──────────────────────────────────────────────────────────
async def build_stage_task(product: dict):
    """Returns (agent_id, prompt, data_key) for the product's current stage."""
    stage    = product["stage"]
    vertical = product["vertical"]

    raw_research = product.get("research") or {}
    research = (recover_research(raw_research.get("raw", str(raw_research)))
                if raw_research.get("parse_error") else raw_research)

    raw_creation = product.get("creation") or {}
    creation = (recover_creation(raw_creation.get("raw", str(raw_creation)))
                if raw_creation.get("parse_error") else raw_creation)

    raw_copy = product.get("copy") or {}
    copy = (recover_copy(raw_copy.get("raw", str(raw_copy)))
            if (raw_copy.get("parse_error") or raw_copy.get("_recovered")) else raw_copy)

    publish = product.get("publish") or {}

    if stage == "RESEARCH":
        reddit_hits, etsy_hits, gumroad_hits, trends_hits = await asyncio.gather(
            searxng_search(f"site:reddit.com {vertical} template need looking for help 2024"),
            searxng_search(f"etsy best selling {vertical} digital template 2024"),
            searxng_search(f"gumroad {vertical} template bestseller popular 2024"),
            searxng_search(f'"{vertical} template" buyers demand trend 2024'),
        )
        existing = [
            (p.get("research") or {}).get("product_name", "")
            for p in pipeline.products
            if p.get("vertical") == vertical and (p.get("research") or {}).get("product_name")
        ]
        existing_str = ", ".join(existing[-10:]) if existing else "none yet"
        prompt = (
            f"You are a market analyst for digital products on Gumroad and Etsy.\n"
            f"Find ONE highly profitable {vertical} digital template for English-speaking customers. Price $9-$15.\n\n"
            f"Already created (DO NOT repeat): {existing_str}\n\n"
            f"=== REAL MARKET DATA ===\n"
            f"Reddit pain points:\n{reddit_hits}\n\n"
            f"Etsy bestsellers:\n{etsy_hits}\n\n"
            f"Gumroad trending:\n{gumroad_hits}\n\n"
            f"Demand signals:\n{trends_hits}\n\n"
            f"Output ONLY valid JSON (no markdown):\n"
            f'{{"product_name":"string","target_audience":"string","price":12,'
            f'"keywords":["k1","k2","k3"],"rationale":"string",'
            f'"demand_evidence":"specific quote proving demand"}}'
        )
        return "market-analyst", prompt, "research"

    elif stage == "CREATION":
        agent  = VERTICAL_AGENT[vertical]
        prompt = (
            f"You are a {vertical} template specialist for the English-speaking productivity market.\n"
            f"Design a complete {vertical} template based on this research:\n\n"
            f"Product: {research.get('product_name', 'Professional Template')}\n"
            f"Target audience: {research.get('target_audience', 'professionals')}\n"
            f"Keywords: {', '.join(research.get('keywords', []))}\n"
            f"Price: ${research.get('price', 12)}\n"
            f"Rationale: {research.get('rationale', '')}\n\n"
            f"Output ONLY valid JSON (no markdown):\n"
            f'{{"template_name":"string","tagline":"string","target_user":"string",'
            f'"key_features":["f1","f2","f3","f4","f5"],"value_proposition":"string"}}'
        )
        return agent, prompt, "creation"

    elif stage == "COPYWRITING":
        features  = creation.get("key_features", creation.get("features", []))
        prod_name = creation.get("template_name") or research.get("product_name", "Template")
        prompt = (
            f"You are a conversion copywriter for digital products on Gumroad.\n"
            f"Write a complete product listing for this {vertical} template:\n\n"
            f"Product: {prod_name}\n"
            f"Tagline: {creation.get('tagline', '')}\n"
            f"Target audience: {creation.get('target_user') or research.get('target_audience', 'professionals')}\n"
            f"Key features: {', '.join(str(f) for f in features[:5])}\n"
            f"Value proposition: {creation.get('value_proposition', '')}\n"
            f"SEO keywords: {', '.join(research.get('keywords', []))}\n\n"
            f"Output ONLY valid JSON (no markdown):\n"
            f'{{"title":"SEO title max 60 chars","description":"200 words persuasive",'
            f'"tags":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10","t11","t12","t13"],"price":12}}'
        )
        return "copywriter", prompt, "copy"

    elif stage == "QA":
        qa_title = copy.get("title") or research.get("product_name", "Template")
        qa_desc  = copy.get("description", "")
        qa_tags  = copy.get("tags", [])
        qa_price = copy.get("price", research.get("price", 12))
        features = creation.get("key_features", creation.get("features", []))
        prompt = (
            f"You are a QA specialist for Gumroad digital products.\n"
            f"Review ALL product data below for coherence, accuracy and persuasiveness. Fix any issues.\n\n"
            f"=== RESEARCH ===\n"
            f"Concept: {research.get('product_name', '')}\n"
            f"Audience: {research.get('target_audience', '')}\n"
            f"Keywords: {', '.join(research.get('keywords', []))}\n\n"
            f"=== TEMPLATE STRUCTURE ===\n"
            f"Name: {creation.get('template_name', '')}\n"
            f"Tagline: {creation.get('tagline', '')}\n"
            f"Features: {', '.join(str(f) for f in features[:5])}\n\n"
            f"=== COPYWRITING ===\n"
            f"Title: {qa_title}\n"
            f"Description: {qa_desc[:500]}\n"
            f"Tags: {', '.join(qa_tags[:10])}\n"
            f"Price: ${qa_price}\n\n"
            f"Output ONLY valid JSON (no markdown):\n"
            f'{{"approved":true,"quality_score":85,"title":"string","description":"string",'
            f'"tags":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],'
            f'"price":12,"image_prompt":"detailed cover art prompt","feedback":"string"}}'
        )
        return "qa-reviewer", prompt, "qa"

    elif stage == "IMAGE_GEN":
        qa = product.get("qa") or {}
        img_prompt = qa.get("image_prompt",
                            f"{vertical} digital template professional clean minimal modern")
        prompt = f"Generate cover image: {img_prompt[:100]}"
        return "image-generator", prompt, "image_gen"

    elif stage == "FILE_BUILDER":
        qa        = product.get("qa") or {}
        title     = (qa.get("title") or creation.get("template_name") or
                     research.get("product_name", "Professional Template"))
        features  = creation.get("key_features", creation.get("features", []))
        tagline   = creation.get("tagline", "")
        value_prop= creation.get("value_proposition", "")
        target    = creation.get("target_user") or research.get("target_audience", "professionals")

        if vertical == "notion":
            section_guide = (
                "Generate exactly 7 sections with SPECIFIC, ACTIONABLE content:\n"
                "1. 'How to Set Up' — step-by-step instructions to duplicate and configure in Notion\n"
                "2. 'Main Database' — list EVERY property with: Name, Type (Title/Select/Date/Formula/etc), Purpose\n"
                "3. 'Views & Filters' — every view included (Table/Board/Calendar/Gallery) with filter/sort settings\n"
                "4. 'Formulas & Relations' — write out each formula with explanation, list all relations\n"
                "5. 'Sample Entries' — 3 complete, realistic records with ALL fields filled in\n"
                "6. 'Daily Workflow' — step-by-step how to use this template every day and every week\n"
                "7. 'Customization Tips' — how to add properties, change colors, create new views\n"
            )
        elif vertical == "finance":
            section_guide = (
                "Generate exactly 7 sections with SPECIFIC, ACTIONABLE content:\n"
                "1. 'Template Overview' — what financial problem it solves and the exact workflow\n"
                "2. 'Sheet Structure' — EVERY sheet listed with: name, purpose, exact column headers\n"
                "3. 'Key Formulas' — write out every important formula with cell references and explanation\n"
                "4. 'How to Enter Data' — step-by-step first setup and ongoing data entry instructions\n"
                "5. 'Sample Month' — a complete realistic example with actual numbers filled in every field\n"
                "6. 'Charts & Dashboard' — describe each chart type, what data it shows, how to read it\n"
                "7. 'Monthly Routine' — exact checklist of what to do at start and end of each month\n"
            )
        else:  # business
            section_guide = (
                "Generate exactly 7 sections with SPECIFIC, ACTIONABLE content:\n"
                "1. 'What's Included' — list every document, template section and component with purpose\n"
                "2. 'Main Template' — full template text with realistic [PLACEHOLDER] for customizable fields\n"
                "3. 'Customization Guide' — every placeholder explained with 2-3 realistic example values\n"
                "4. 'Professional Tips' — 5 specific tips used by top professionals in this field\n"
                "5. 'Completed Example' — full document filled with realistic fictional data\n"
                "6. 'Email Templates' — 2-3 related email templates (follow-up, intro, confirmation)\n"
                "7. 'Best Practices' — 5 proven practices backed by real-world experience\n"
            )

        prompt = (
            f"Create the complete downloadable content guide for this digital product.\n\n"
            f"Product: {title}\n"
            f"Type: {vertical} template\n"
            f"Target user: {target}\n"
            f"Tagline: {tagline}\n"
            f"Key features: {', '.join(str(f) for f in features[:5])}\n"
            f"Value proposition: {value_prop}\n\n"
            f"{section_guide}\n"
            f"CRITICAL: Be SPECIFIC. Use real property names, real formula syntax, real column names, real numbers.\n"
            f"This is what a buyer pays $9-$15 to download. Make it genuinely useful.\n\n"
            f"Output ONLY valid JSON (no markdown):\n"
            f'{{"sections":[{{"heading":"string","content":"detailed multi-line content"}}],"total_pages":7}}'
        )
        return "file-builder", prompt, "file_content"

    elif stage == "PUBLISHING":
        qa    = product.get("qa") or {}
        title = qa.get("title") or copy.get("title") or research.get("product_name", "Digital Template")
        prompt = f"Publish '{title}' to Gumroad"
        return "publisher", prompt, "publish"

    elif stage == "ANALYTICS":
        gumroad_url = publish.get("gumroad_url", "pending")
        prompt = (
            f"Analyze this Gumroad product:\n"
            f"Title: {copy.get('title', 'Digital Template')}\n"
            f"Price: ${copy.get('price', 12)} | URL: {gumroad_url}\n\n"
            f'Reply with ONLY this JSON: {{"daily_summary":"...","trend_analysis":"...","recommendation":"..."}}'
        )
        return "analytics", prompt, "analytics_data"

    return None, None, None


# ── Image-generator handler ───────────────────────────────────────────────────
async def _run_image_generator(aid: str, product_id: str, data_key: str):
    a       = AGENTS[aid]
    product = pipeline.get_product(product_id)
    if not product:
        return

    qa         = product.get("qa") or {}
    vertical   = product.get("vertical", "notion")
    img_prompt = qa.get("image_prompt",
                        f"{vertical} digital template professional clean minimal modern")

    agent_log(aid, f"🎨 {img_prompt[:70]}...")

    # Unique reproducible seed per product
    seed      = int(hashlib.md5(product_id.encode()).hexdigest()[:8], 16) % 2_147_483_647
    img_bytes = await generate_cover_image(img_prompt, seed=seed)

    result: dict = {"image_prompt": img_prompt, "success": False}

    if img_bytes:
        img_dir  = WORKSPACE / "images"
        img_dir.mkdir(parents=True, exist_ok=True)
        img_path = img_dir / f"{product_id}.jpg"
        img_path.write_bytes(img_bytes)
        result.update({"success": True, "image_path": str(img_path),
                        "size_bytes": len(img_bytes)})
        agent_log(aid, f"✓ Image saved ({len(img_bytes):,} bytes)")
    else:
        agent_log(aid, "⚠ Image generation failed — pipeline continues without cover")

    pipeline.advance(product_id, data_key, result)

    xp_gain = 20
    a["xp"] += xp_gain; a["level"] = xp_to_level(a["xp"]); a["tasks_done"] += 1
    agent_log(aid, f"✓ [{product_id}] image_gen done +{xp_gain} XP")
    save_xp()

    DETAIL_LOGS[aid].insert(0, {
        "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
        "task": f"Generate: {img_prompt[:100]}", "result": f"success={result['success']}",
        "product_id": product_id, "xp_gain": xp_gain,
    })
    DETAIL_LOGS[aid] = DETAIL_LOGS[aid][:20]


# ── Publisher helpers ─────────────────────────────────────────────────────────
def _publisher_fail(product_id: str, result_json: dict, aid: str, reason: str):
    """Increment publish_attempts; move to PUBLISH_ERROR after 3 failures."""
    for p in pipeline.products:
        if p["id"] == product_id:
            # Preserve gumroad_id if we got one
            if result_json.get("gumroad_id") and not (p.get("publish") or {}).get("gumroad_id"):
                p.setdefault("publish", {})
                p["publish"].update({
                    "gumroad_id":  result_json["gumroad_id"],
                    "gumroad_url": result_json.get("gumroad_url", ""),
                    "platform":    "gumroad",
                })
            attempts = p.get("publish_attempts", 0) + 1
            p["publish_attempts"] = attempts
            p["assigned"] = False
            if attempts >= 3:
                p["stage"] = "PUBLISH_ERROR"
                agent_log(aid, f"✗ {attempts}/3 attempts → PUBLISH_ERROR ({reason})")
            else:
                delay = 2 ** attempts
                p["retry_after"] = (datetime.now() + timedelta(minutes=delay)).isoformat()
                agent_log(aid, f"⚠ Attempt {attempts}/3 failed ({reason}) — retry in {delay}min")
            pipeline.save()
            break


async def _publish_to_gumroad(
    aid: str, product_id: str,
    title: str, desc: str, price_cents: int, tags: list,
    pdf_bytes: Optional[bytes], img_bytes: Optional[bytes], safe_filename: str,
    gumroad_today: int, result_json: dict,
) -> bool:
    agent_log(aid, f"📦 Gumroad ({gumroad_today}/10 today)...")

    # Idempotency: reuse existing product id if already created
    existing    = (pipeline.get_product(product_id) or {}).get("publish") or {}
    gumroad_id  = existing.get("gumroad_id", "")

    if gumroad_id:
        agent_log(aid, f"♻ Reusing Gumroad product {gumroad_id}")
        result_json.update({"gumroad_id": gumroad_id,
                            "gumroad_url": existing.get("gumroad_url", ""),
                            "platform": "gumroad"})
    else:
        resp = await gumroad_create_product(
            title=title[:100], description=desc[:5000],
            price_cents=price_cents, tags=tags,
        )
        if resp.get("success") and resp.get("product"):
            gumroad_id = resp["product"].get("id", "")
            result_json.update({"gumroad_id": gumroad_id,
                                "gumroad_url": resp["product"].get("short_url", ""),
                                "platform": "gumroad"})
            agent_log(aid, f"✓ Product created (id={gumroad_id})")
        else:
            err = resp.get("message") or resp.get("error") or json.dumps(resp)[:120]
            result_json["gumroad_error"] = err
            agent_log(aid, f"✗ Create failed: {err}")
            return False

    if not gumroad_id:
        agent_log(aid, "✗ No gumroad_id — abort")
        return False

    if pdf_bytes:
        up = await gumroad_upload_file(gumroad_id, pdf_bytes, safe_filename, "application/pdf")
        if up.get("success"):
            agent_log(aid, "📎 PDF uploaded")
        else:
            agent_log(aid, f"⚠ PDF upload: {json.dumps(up)[:200]}")
    else:
        agent_log(aid, "⚠ No PDF available")

    if img_bytes:
        cr = await gumroad_upload_cover_image(gumroad_id, img_bytes)
        if cr.get("success"):
            agent_log(aid, "🖼 Cover uploaded")
        else:
            agent_log(aid, f"⚠ Cover: {json.dumps(cr)[:200]}")

    pub = await gumroad_update_product(gumroad_id, {"published": "true"})
    if pub.get("success") and pub.get("product"):
        result_json["published_at"] = datetime.now().isoformat()
        agent_log(aid, f"🚀 Published → {result_json.get('gumroad_url', gumroad_id)}")
        return True
    else:
        agent_log(aid, f"✗ Publish update failed: {json.dumps(pub)[:200]}")
        return False


async def _publish_to_etsy(
    aid: str, product_id: str,
    title: str, desc: str, price_usd: float, tags: list,
    pdf_bytes: Optional[bytes], img_bytes: Optional[bytes], safe_filename: str,
    result_json: dict,
) -> bool:
    today      = datetime.now().strftime("%Y-%m-%d")
    etsy_today = sum(
        1 for p in pipeline.products
        if (p.get("publish") or {}).get("etsy_listing_id")
        and (p.get("publish") or {}).get("published_at", "").startswith(today)
    )
    agent_log(aid, f"🛍 Etsy ({etsy_today} today)...")

    listing    = await etsy_create_listing(title=title[:140], description=desc,
                                           price_usd=price_usd, tags=tags)
    listing_id = listing.get("listing_id") or listing.get("id")
    if not listing_id:
        agent_log(aid, f"✗ Etsy create failed: {json.dumps(listing)[:200]}")
        return False

    result_json.update({"etsy_listing_id": str(listing_id), "platform": "etsy"})

    if pdf_bytes:
        fu = await etsy_upload_digital_file(str(listing_id), pdf_bytes, safe_filename)
        agent_log(aid, "📎 File uploaded to Etsy" if fu.get("file_id")
                  else f"⚠ Etsy file: {json.dumps(fu)[:150]}")

    if img_bytes:
        iu = await etsy_upload_image(str(listing_id), img_bytes)
        agent_log(aid, "🖼 Image uploaded to Etsy" if iu.get("listing_image_id")
                  else f"⚠ Etsy image: {json.dumps(iu)[:150]}")

    pub = await etsy_publish_listing(str(listing_id))
    if pub.get("state") == "active" or pub.get("listing_id"):
        result_json["published_at"] = datetime.now().isoformat()
        result_json["etsy_url"]     = f"https://www.etsy.com/listing/{listing_id}"
        agent_log(aid, f"🚀 Etsy published → {result_json['etsy_url']}")
        return True
    else:
        agent_log(aid, f"✗ Etsy publish: {json.dumps(pub)[:200]}")
        return False


# ── Publisher handler ─────────────────────────────────────────────────────────
async def _run_publisher(aid: str, product_id: str, data_key: str):
    a       = AGENTS[aid]
    product = pipeline.get_product(product_id)
    if not product:
        return

    qa       = product.get("qa") or {}
    raw_copy = product.get("copy") or {}
    c = (recover_copy(raw_copy.get("raw", str(raw_copy)))
         if (raw_copy.get("parse_error") or raw_copy.get("_recovered")) else raw_copy)

    title    = (qa.get("title") or c.get("title") or
                (product.get("research") or {}).get("product_name", "")).strip()
    desc     = qa.get("description") or c.get("description") or ""
    tags     = qa.get("tags") or c.get("tags") or []
    price_v  = qa.get("price") or c.get("price") or 12
    price_cents = int(float(price_v) * 100) if float(price_v) < 200 else int(price_v)

    features  = (product.get("creation") or {}).get("key_features", [])
    tagline   = (product.get("creation") or {}).get("tagline", "")
    sections  = (product.get("file_content") or {}).get("sections") or None

    # Read image from image-generator output
    img_bytes: Optional[bytes] = None
    img_path = (product.get("image_gen") or {}).get("image_path")
    if img_path:
        try:
            img_bytes = Path(img_path).read_bytes()
        except Exception:
            pass

    if not title or title in ("Digital Template", ""):
        agent_log(aid, "⚠ No valid title — skip publish")
        _publisher_fail(product_id, {}, aid, "no valid title")
        return

    # Daily platform limits
    today        = datetime.now().strftime("%Y-%m-%d")
    gumroad_today = sum(
        1 for p in pipeline.products
        if (p.get("publish") or {}).get("gumroad_id")
        and (p.get("publish") or {}).get("published_at", "").startswith(today)
    )
    use_gumroad = gumroad_today < 10 and bool(GUMROAD_KEY)
    use_etsy    = not use_gumroad and bool(ETSY_API_KEY and ETSY_SHOP_ID)

    if not use_gumroad and not use_etsy:
        tomorrow = (datetime.now() + timedelta(days=1)).replace(hour=1, minute=0, second=0, microsecond=0)
        agent_log(aid, f"⏳ Daily limit — retry after {tomorrow.strftime('%Y-%m-%d %H:%M')}")
        for p in pipeline.products:
            if p["id"] == product_id:
                p["assigned"]    = False
                p["retry_after"] = tomorrow.isoformat()
                pipeline.save()
        return

    # Generate PDF
    agent_log(aid, "📄 Generating PDF...")
    pdf_bytes: Optional[bytes] = None
    try:
        pdf_bytes = generate_product_pdf(
            title=title, description=desc, features=features,
            tagline=tagline, image_bytes=img_bytes, sections=sections,
        )
        agent_log(aid, f"✓ PDF ready ({len(pdf_bytes):,} bytes)")
    except Exception as pdf_err:
        agent_log(aid, f"⚠ PDF error: {pdf_err}")

    safe_filename = re.sub(r"[^a-zA-Z0-9_\-]", "_", title[:40]).strip("_") + ".pdf"
    result_json: dict = {}

    if use_gumroad:
        ok = await _publish_to_gumroad(
            aid, product_id, title, desc, price_cents, tags,
            pdf_bytes, img_bytes, safe_filename, gumroad_today, result_json,
        )
    else:
        ok = await _publish_to_etsy(
            aid, product_id, title, desc, float(price_cents) / 100, tags,
            pdf_bytes, img_bytes, safe_filename, result_json,
        )

    if result_json.get("published_at"):
        pipeline.advance(product_id, data_key, result_json)
        xp_gain = 50
        a["xp"] += xp_gain; a["level"] = xp_to_level(a["xp"]); a["tasks_done"] += 1
        agent_log(aid, f"✓ [{product_id}] published +{xp_gain} XP")
        save_xp()
        DETAIL_LOGS[aid].insert(0, {
            "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "task": f"Publish: {title}", "result": json.dumps(result_json)[:300],
            "product_id": product_id, "xp_gain": xp_gain,
        })
        DETAIL_LOGS[aid] = DETAIL_LOGS[aid][:20]
    else:
        _publisher_fail(product_id, result_json, aid, "publish API failed")


# ── Pipeline task execution ───────────────────────────────────────────────────
async def execute_pipeline_task(aid: str, task: str, product_id: str, data_key: str):
    a = AGENTS[aid]
    a["status"]       = "working"
    a["current_task"] = task
    agent_log(aid, f"⚡ [{product_id}] {task[:55]}...")

    try:
        # ── Non-LLM agents ────────────────────────────────────────────────────
        if aid == "image-generator":
            await _run_image_generator(aid, product_id, data_key)
            return

        if aid == "publisher":
            await _run_publisher(aid, product_id, data_key)
            return

        # ── LLM-based agents ──────────────────────────────────────────────────
        max_tok     = AGENT_MAX_TOKENS.get(aid, 1000)
        result_text = await llm(a["system"], task, max_tokens=max_tok, model=a.get("model"))
        result_json = extract_json(result_text)

        if result_json is None:
            agent_log(aid, "⚠ JSON parse failed — saving raw")
            result_json = {"raw": result_text, "parse_error": True}

        # ── QA special handling ───────────────────────────────────────────────
        if aid == "qa-reviewer":
            if result_json.get("parse_error"):
                product  = pipeline.get_product(product_id)
                raw_copy = (product.get("copy") or {}) if product else {}
                recovered = (recover_copy(raw_copy.get("raw", str(raw_copy)))
                             if raw_copy.get("parse_error") else raw_copy)
                result_json = {
                    "approved": True, "quality_score": 60,
                    "title":       recovered.get("title", "Digital Template"),
                    "description": recovered.get("description", ""),
                    "tags":        recovered.get("tags", []),
                    "price":       recovered.get("price", 12),
                    "image_prompt": (
                        f"{(product or {}).get('vertical','notion')} "
                        "digital template professional clean minimal"
                    ),
                    "feedback": "QA JSON parse failed — recovered from copy",
                    "_qa_recovered": True,
                }
                agent_log(aid, "⚠ QA parse failed — recovered, advancing")
            else:
                score = result_json.get("quality_score", 0)
                if score < 50:
                    for p in pipeline.products:
                        if p["id"] == product_id:
                            p["stage"]      = "COPYWRITING"
                            p["copy"]       = None
                            p["assigned"]   = False
                            p["updated_at"] = datetime.now().isoformat()
                            pipeline.save()
                    agent_log(aid, f"✗ Quality {score}/100 — back to COPYWRITING")
                    a["xp"] += 10; a["level"] = xp_to_level(a["xp"]); a["tasks_done"] += 1
                    save_xp()
                    return
                else:
                    agent_log(aid, f"✓ Quality {score}/100 — {result_json.get('feedback','')[:80]}")

        # ── Advance pipeline ──────────────────────────────────────────────────
        pipeline.advance(product_id, data_key, result_json)

        out_dir = WORKSPACE / aid
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        (out_dir / f"{ts}_{product_id}_{data_key}.json").write_text(
            json.dumps({"product_id": product_id, "stage": data_key,
                        "task": task[:200], "result": result_json},
                       indent=2, ensure_ascii=False)
        )

        xp_gain = 15 + min(35, len(result_text) // 60)
        a["xp"] += xp_gain; a["level"] = xp_to_level(a["xp"]); a["tasks_done"] += 1
        agent_log(aid, f"✓ [{product_id}] {data_key} done +{xp_gain} XP")
        save_xp()

        DETAIL_LOGS[aid].insert(0, {
            "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "task": task[:300], "result": result_text,
            "product_id": product_id, "xp_gain": xp_gain,
        })
        DETAIL_LOGS[aid] = DETAIL_LOGS[aid][:20]

    except Exception as e:
        agent_log(aid, f"✗ Error: {e}")
        for p in pipeline.products:
            if p["id"] == product_id:
                p["assigned"] = False
                pipeline.save()
    finally:
        a["status"]       = "idle"
        a["current_task"] = None


async def execute_task(aid: str, task: str):
    """Standalone (manual) task — not part of pipeline."""
    a = AGENTS[aid]
    a["status"]       = "working"
    a["current_task"] = task
    agent_log(aid, f"⚡ [manual] {task[:55]}...")
    try:
        result  = await llm(a["system"], task, max_tokens=900, model=a.get("model"))
        xp_gain = 10
        a["xp"] += xp_gain; a["level"] = xp_to_level(a["xp"]); a["tasks_done"] += 1
        agent_log(aid, f"✓ [manual] done +{xp_gain} XP")
        save_xp()
        DETAIL_LOGS[aid].insert(0, {"ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                                    "task": task, "result": result, "xp_gain": xp_gain})
        DETAIL_LOGS[aid] = DETAIL_LOGS[aid][:20]
    except Exception as e:
        agent_log(aid, f"✗ Error: {e}")
    finally:
        a["status"]       = "idle"
        a["current_task"] = None


# ── Orchestrator strategic decision ──────────────────────────────────────────
async def orchestrator_decide(actions: list) -> dict:
    stats = pipeline.stats()
    state = {
        "total": stats["total"], "done": stats["done"],
        "publish_errors": stats["publish_errors"],
        "by_stage": stats["by_stage"], "by_vertical": stats["by_vertical"],
        "pending": [
            {"id": a["product"]["id"], "vertical": a["product"]["vertical"],
             "stage": a["product"]["stage"]}
            for a in actions
        ],
    }
    raw = await llm(
        AGENTS["tinyagi"]["system"],
        f"Pipeline state:\n{json.dumps(state)}\n\nDecide.",
        max_tokens=AGENT_MAX_TOKENS["tinyagi"],
        model=AGENTS["tinyagi"].get("model"),
    )
    decision = extract_json(raw)
    if not decision:
        decision = {"priority_vertical": "all", "retry_products": [],
                    "skip_products": [], "reasoning": raw[:150]}
    return decision


# ── Orchestrator loop ─────────────────────────────────────────────────────────
async def orchestrator_loop():
    await asyncio.sleep(8)

    while True:
        agent_log("tinyagi", "🧠 Scanning pipeline...")

        try:
            actions = pipeline.get_pending_actions()

            if not actions:
                stats = pipeline.stats()
                agent_log("tinyagi",
                    f"✓ Pipeline nominal — {stats['done']} done, "
                    f"{stats['publish_errors']} errors, "
                    f"{stats['total'] - stats['done'] - stats['publish_errors']} active"
                )
            else:
                decision  = await orchestrator_decide(actions)
                priority  = decision.get("priority_vertical", "all")
                skip_ids  = set(decision.get("skip_products") or [])
                retry_ids = set(decision.get("retry_products") or [])
                reasoning = decision.get("reasoning", "")

                agent_log("tinyagi", f"🎯 {reasoning[:120]}")

                for pid in retry_ids:
                    for p in pipeline.products:
                        if p["id"] == pid:
                            p["assigned"] = False
                            pipeline.save()

                if priority != "all":
                    filtered = [a for a in actions if a["product"]["vertical"] == priority]
                    if filtered:
                        actions = filtered

                actions = [a for a in actions if a["product"]["id"] not in skip_ids]

                REASONING_LOG.insert(0, {
                    "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "strategic_decision": decision, "actions_count": len(actions),
                })
                REASONING_LOG[:] = REASONING_LOG[:20]

                for action in actions:
                    product  = action["product"]
                    pid      = product["id"]
                    vertical = product["vertical"]
                    stage    = product["stage"]

                    agent_id, prompt, data_key = await build_stage_task(product)
                    if not agent_id:
                        continue

                    pipeline.mark_assigned(pid)
                    await TASK_QUEUES[agent_id].put(
                        {"task": prompt, "product_id": pid, "data_key": data_key}
                    )

                    AGENTS["tinyagi"]["xp"]        += 5
                    AGENTS["tinyagi"]["level"]      = xp_to_level(AGENTS["tinyagi"]["xp"])
                    AGENTS["tinyagi"]["tasks_done"] += 1
                    agent_log("tinyagi", f"📋 [{vertical}] {stage} → {agent_id} ({pid})")
                    save_xp()

                    REASONING_LOG.insert(0, {
                        "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "product_id": pid, "vertical": vertical, "stage": stage,
                        "assigned_to": agent_id, "task_preview": prompt[:250],
                    })
                    REASONING_LOG[:] = REASONING_LOG[:20]

                    DETAIL_LOGS["tinyagi"].insert(0, {
                        "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                        "task": f"[{vertical}] {stage} → {agent_id}",
                        "result": prompt, "xp_gain": 5,
                    })
                    DETAIL_LOGS["tinyagi"] = DETAIL_LOGS["tinyagi"][:20]

        except Exception as e:
            agent_log("tinyagi", f"✗ Orchestration error: {e}")

        await asyncio.sleep(300)


# ── Agent workers ─────────────────────────────────────────────────────────────
async def agent_worker(aid: str):
    idx = list(AGENTS.keys()).index(aid)
    await asyncio.sleep(15 + idx * 3)

    while True:
        try:
            item = await asyncio.wait_for(TASK_QUEUES[aid].get(), timeout=30)
            if isinstance(item, dict) and "product_id" in item:
                await execute_pipeline_task(aid, item["task"], item["product_id"], item["data_key"])
            else:
                await execute_task(aid, item if isinstance(item, str) else item.get("task", ""))
            TASK_QUEUES[aid].task_done()
        except asyncio.TimeoutError:
            pass
        except Exception as e:
            log.error(f"Worker {aid} unhandled: {e}")
            await asyncio.sleep(5)


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
        if aid != "tinyagi":
            asyncio.create_task(agent_worker(aid))

    log.info(f"TinyAGI pipeline factory online — {len(AGENTS)} agents")
    log.info(f"Fast model: {OLLAMA_MODEL} | Quality model: {QUALITY_MODEL}")
    log.info(f"Verticals: {VERTICALS} | Products in pipeline: {len(pipeline.products)}")


# ── API endpoints ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "agents": len(AGENTS),
            "fast_model": OLLAMA_MODEL, "quality_model": QUALITY_MODEL,
            "pipeline": pipeline.stats()}


@app.get("/agents/status")
async def agents_status():
    stats = pipeline.stats()
    return {
        "agents": {
            aid: {
                "name":         a["name"],
                "xp":           a["xp"],
                "level":        a["level"],
                "xp_pct":       xp_progress_pct(a["xp"]),
                "status":       a["status"],
                "current_task": a["current_task"],
                "tasks_done":   a["tasks_done"],
                "log":          a["log"][:6],
                "color":        a["color"],
                "model":        a.get("model") or "API only",
                "queue_size":   TASK_QUEUES[aid].qsize() if TASK_QUEUES else 0,
            }
            for aid, a in AGENTS.items()
        },
        "total_xp":   sum(a["xp"] for a in AGENTS.values()),
        "tasks_done": sum(a["tasks_done"] for a in AGENTS.values()),
        "pipeline":   stats,
        "started_at": STARTED_AT,
        "timestamp":  datetime.now().isoformat(),
    }


@app.get("/agents/{aid}/detail")
async def agent_detail(aid: str):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    a    = AGENTS[aid]
    data = {
        "id": aid, "name": a["name"], "xp": a["xp"], "level": a["level"],
        "xp_pct": xp_progress_pct(a["xp"]), "status": a["status"],
        "current_task": a["current_task"], "tasks_done": a["tasks_done"],
        "color": a["color"], "model": a.get("model") or "API only",
        "queue_size": TASK_QUEUES[aid].qsize() if TASK_QUEUES else 0,
        "log": a["log"], "system_prompt": a["system"],
        "history": DETAIL_LOGS.get(aid, []),
    }
    if aid == "tinyagi":
        data["reasoning_log"]    = REASONING_LOG
        data["pipeline"]         = pipeline.stats()
        data["recent_products"]  = pipeline.recent(5)
    return data


@app.get("/pipeline/status")
async def pipeline_status():
    return {"products": pipeline.recent(20), "summary": pipeline.stats()}


@app.post("/agents/{aid}/trigger")
async def trigger_agent(aid: str, body: dict):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    task = body.get("task") or "Analyze the current market and provide recommendations."
    asyncio.create_task(execute_task(aid, task))
    return {"status": "triggered", "agent": aid, "task": task}


@app.get("/agents/{aid}/logs")
async def agent_logs(aid: str):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    return {"agent": aid, "logs": AGENTS[aid]["log"]}


@app.get("/agents/{aid}/outputs")
async def agent_outputs(aid: str):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    out_dir = WORKSPACE / aid
    if not out_dir.exists():
        return {"files": []}
    files = sorted(out_dir.glob("*.json"), reverse=True)[:10]
    return {"files": [{"name": f.name,
                        "content": f.read_text(encoding="utf-8", errors="replace")[:800]}
                       for f in files]}
