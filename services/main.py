"""
TinyAGI Agent Service — pipeline-driven digital product factory
Targets worldwide English-speaking market on Gumroad
Verticals: Notion templates | Finance/Excel | Business/Freelance
Pipeline: RESEARCH → CREATION → COPYWRITING → PUBLISHING → ANALYTICS → DONE
"""
import asyncio
import json
import logging
import os
import re
import uuid
from datetime import datetime
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

OLLAMA_BASE  = os.getenv("OPENAI_BASE_URL",  "http://ollama:11434/v1")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL",      "llama3.1:8b")
LLM_API_KEY  = os.getenv("OPENAI_API_KEY",   "ollama")
GUMROAD_KEY  = os.getenv("GUMROAD_API_KEY",  "")
NOTION_KEY   = os.getenv("NOTION_API_KEY",   "")
SEARXNG_URL  = os.getenv("SEARXNG_BASE_URL", "http://searxng:8080")
WORKSPACE    = Path("/root/workspace")

client = AsyncOpenAI(api_key=LLM_API_KEY, base_url=OLLAMA_BASE)

# ── Pipeline config ───────────────────────────────────────────────────────────
VERTICALS      = ["notion", "finance", "business"]
VERTICAL_AGENT = {"notion": "notion-creator", "finance": "finance-creator", "business": "business-creator"}
STAGE_SEQUENCE = ["RESEARCH", "CREATION", "COPYWRITING", "PUBLISHING", "ANALYTICS", "DONE"]
STAGE_DATA_KEY = {"RESEARCH": "research", "CREATION": "creation",
                  "COPYWRITING": "copy", "PUBLISHING": "publish", "ANALYTICS": "analytics_data"}

# ── Agent definitions ─────────────────────────────────────────────────────────
AGENTS: Dict[str, dict] = {
    "tinyagi": {
        "name": "TinyAGI Orchestrator", "xp": 0, "level": 1,
        "color": "#00ffff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are the strategic orchestrator of an autonomous digital product pipeline on Gumroad. "
            "You receive the current pipeline state and make high-level decisions: which vertical to prioritize, "
            "whether to retry or skip stuck/errored products, and how to balance the pipeline across verticals. "
            "The per-stage agent routing is handled automatically — your role is strategy, not micro-management. "
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
        "tasks_done": 0, "log": [],
        "system": (
            "You are a market analyst specialized in digital products for Gumroad and Etsy. "
            "Given a niche, target audience, language, and current product catalog, you analyze market trends, gaps, and potential. "
            "You output a structured idea with: product title, type (Notion template/Excel/PDF), suggested price, and 3 SEO keywords. "
            "If the catalog is empty, propose a new idea. If the catalog is full, propose a best-seller variant."
        ),
    },
    "notion-creator": {
        "name": "Notion Creator", "xp": 0, "level": 1,
        "color": "#ff6600", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a Notion template specialist for the English-speaking productivity market. "
            "Given a product idea, you design a complete Notion template structure: pages, databases, properties, views, formulas and layout. "
            "Output a detailed outline of the template ready to be built in Notion, priced between $9-$15."
        ),
    },
    "finance-creator": {
        "name": "Finance Creator", "xp": 0, "level": 1,
        "color": "#ffee00", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are an Excel and Google Sheets template specialist for personal finance. "
            "Given a product idea, you design a complete spreadsheet template: sheets, columns, formulas, charts and automations. "
            "Output a detailed structure ready to build, targeting the English-speaking market, priced between $9-$15."
        ),
    },
    "business-creator": {
        "name": "Business Creator", "xp": 0, "level": 1,
        "color": "#aa44ff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a business and freelance template specialist. "
            "Given a product idea, you design complete templates for: proposals, invoices, client trackers, project plans or SOPs. "
            "Output a detailed structure in Notion or Excel format, targeting English-speaking freelancers and small businesses, priced between $9-$15."
        ),
    },
    "copywriter": {
        "name": "Gumroad Copywriter", "xp": 0, "level": 1,
        "color": "#ff44aa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a conversion copywriter for digital products on Gumroad and Etsy. "
            "Given a product name and template structure, write: 1) SEO title (max 60 characters), "
            "2) persuasive product description (200 words), 3) 13 SEO tags comma-separated, "
            "4) post-purchase welcome email (150 words). "
            "Output each section with a clear label. Target: English-speaking buyers, price range $9-$15."
        ),
    },
    "publisher": {
        "name": "Gumroad Publisher", "xp": 0, "level": 1,
        "color": "#00aaff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a Gumroad publishing assistant. "
            "Given a product title, description, price and tags, prepare the complete JSON payload "
            "to create or update a product via the Gumroad API. "
            "Always set published=true and currency=usd. Output only valid JSON ready for the API call."
        ),
    },
    "analytics": {
        "name": "Sales Analytics", "xp": 0, "level": 1,
        "color": "#44ffaa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a daily sales analytics agent for a Gumroad digital products store. "
            "Every morning you receive sales data (revenue, units sold, product performance) and produce a structured report: "
            "1) daily summary, 2) top performing products, 3) underperforming products, "
            "4) trend analysis, 5) recommendation for today (new idea or best-seller variant). "
            "Be concise and actionable."
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
            "id": f"prod_{uuid.uuid4().hex[:8]}",
            "vertical": vertical,
            "stage": "RESEARCH",
            "assigned": False,
            "research": None, "creation": None,
            "copy": None, "publish": None, "analytics_data": None,
            "created_at": datetime.now().isoformat(),
            "updated_at": datetime.now().isoformat(),
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
        actions = []
        for vertical in VERTICALS:
            active = [p for p in self.products
                      if p["vertical"] == vertical and p["stage"] != "DONE" and not p.get("assigned")]
            in_progress = [p for p in self.products
                           if p["vertical"] == vertical and p["stage"] != "DONE"]
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
        return {
            "total": len(self.products),
            "done": len([p for p in self.products if p["stage"] == "DONE"]),
            "by_stage": {s: len([p for p in self.products if p["stage"] == s]) for s in STAGE_SEQUENCE},
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
    lv  = xp_to_level(xp)
    lo  = LEVEL_THRESHOLDS[lv - 1]
    hi  = LEVEL_THRESHOLDS[lv] if lv < len(LEVEL_THRESHOLDS) else lo + 200
    return min(100, int((xp - lo) / max(hi - lo, 1) * 100))


def load_xp():
    if XP_FILE.exists():
        try:
            for aid, xp in json.loads(XP_FILE.read_text()).items():
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


def agent_log(aid: str, msg: str):
    ts    = datetime.now().strftime("%H:%M:%S")
    entry = f"[{ts}] {msg}"
    AGENTS[aid]["log"].insert(0, entry)
    AGENTS[aid]["log"] = AGENTS[aid]["log"][:30]
    log.info(f"[{aid}] {msg}")


# ── LLM ──────────────────────────────────────────────────────────────────────
async def llm(system: str, user: str, max_tokens: int = 1000) -> str:
    try:
        resp = await asyncio.wait_for(
            client.chat.completions.create(
                model=OLLAMA_MODEL,
                messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
                max_tokens=max_tokens, temperature=0.7,
            ),
            timeout=90.0,
        )
        return resp.choices[0].message.content.strip()
    except asyncio.TimeoutError:
        log.error("LLM timeout after 90s")
        return "[LLM_TIMEOUT]"
    except Exception as e:
        log.error(f"LLM error: {e}")
        return f"[LLM_ERROR: {e}]"


def extract_json(text: str) -> Optional[dict]:
    # Strip markdown code fences (```json ... ```)
    text = re.sub(r'```(?:json)?\s*', '', text).strip()

    # Try direct parse
    try:
        return json.loads(text)
    except Exception:
        pass

    # Walk the string to find the outermost balanced { ... }
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


def recover_copy(raw: str) -> dict:
    """Best-effort field extraction when the LLM didn't return valid JSON."""
    # Title: JSON-style first, then labeled text (SEO TITLE: / TITLE: / 1) ...)
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

    # Price
    price = 12
    m = re.search(r'"price"\s*:\s*(\d+)', raw)
    if m:
        v = int(m.group(1))
        price = v if 5 <= v <= 200 else (v / 100 if v >= 500 else 12)

    # Description: JSON-style first, then labeled text
    desc = ""
    m = re.search(r'"description"\s*:\s*"(.*?)"(?=\s*,\s*")', raw, re.DOTALL)
    if m:
        desc = m.group(1).replace('\\n', '\n')
    if not desc:
        m = re.search(
            r'(?:PRODUCT\s+)?DESCRIPTION[:\s]+(.*?)(?=\n[A-Z0-9]|\Z)',
            raw, re.DOTALL | re.IGNORECASE,
        )
        if m:
            desc = m.group(1).strip()
    if not desc:
        desc = raw[:600]

    # Tags: labeled text first, then JSON-style quoted strings
    tags: list = []
    m = re.search(r'(?:SEO\s+)?TAGS?[:\s]+(.*?)(?:\n[A-Z]|\Z)', raw, re.DOTALL | re.IGNORECASE)
    if m:
        tags = [t.strip() for t in m.group(1).split(',') if t.strip()][:13]
    if not tags:
        tags = list(dict.fromkeys(re.findall(r'"([A-Za-z][A-Za-z0-9 \-]{2,25})"', raw)))[:13]

    return {
        "title":         title or "Digital Template",
        "price":         price,
        "description":   desc,
        "tags":          tags,
        "bullet_points": [],
        "_recovered":    True,
    }


def recover_research(raw: str) -> dict:
    """Extract research fields from raw LLM text when JSON parsing fails."""
    def find(patterns, text, default=""):
        for pat in patterns:
            m = re.search(pat, text, re.IGNORECASE | re.DOTALL)
            if m:
                return m.group(1).strip().strip('"').strip("'")
        return default

    name = find([
        r'"product_name"\s*:\s*"([^"]{3,80})"',
        r'product[_\s]name[:\s]+(.{3,80}?)(?:\n|$)',
        r'product[:\s]+(.{3,80}?)(?:\n|$)',
    ], raw, "Digital Template")

    audience = find([
        r'"target_audience"\s*:\s*"([^"]{3,80})"',
        r'target[_\s]audience[:\s]+(.{3,80}?)(?:\n|$)',
        r'audience[:\s]+(.{3,80}?)(?:\n|$)',
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

    return {
        "product_name":    name,
        "target_audience": audience,
        "price":           price,
        "keywords":        keywords,
        "rationale":       raw[:200],
        "_recovered":      True,
    }


def recover_creation(raw: str) -> dict:
    """Extract creation fields from raw LLM text when JSON parsing fails."""
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

    return {
        "template_name":     name,
        "tagline":           raw[:80],
        "target_user":       "professionals",
        "key_features":      features or ["Customizable", "Easy to use", "Professional"],
        "value_proposition": raw[:150],
        "_recovered":        True,
    }


# ── External APIs ─────────────────────────────────────────────────────────────
async def searxng_search(query: str) -> str:
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"{SEARXNG_URL}/search",
                params={"q": query, "format": "json", "language": "en"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                data    = await r.json()
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
                return await r.json()
    except Exception as e:
        return {"error": str(e)}


async def gumroad_create_product(title: str, description: str, price_cents: int, tags: list) -> dict:
    if not GUMROAD_KEY:
        return {"error": "No Gumroad key — product spec saved locally only"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(
                "https://api.gumroad.com/v2/products",
                headers={"Authorization": f"Bearer {GUMROAD_KEY}"},
                data={"name": title, "description": description,
                      "price": price_cents, "tags[]": tags[:5],
                      "published": "true"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                return await r.json()
    except Exception as e:
        return {"error": str(e)}


# ── Build task prompt for each pipeline stage ─────────────────────────────────
async def build_stage_task(product: dict):
    """Returns (agent_id, prompt, data_key) for the product's current stage."""
    stage    = product["stage"]
    vertical = product["vertical"]
    pid      = product["id"]

    # Recover data from previous stages if JSON parsing failed
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
        search_hint = (await searxng_search(f"best selling {vertical} templates Gumroad 2024"))[:300]
        prompt = (
            f"You are a market analyst. Find ONE profitable {vertical} digital template idea for Gumroad.\n"
            f"Market context: {search_hint}\n\n"
            f"Reply with ONLY this JSON (no other text):\n"
            f'{{"product_name":"<name>","target_audience":"<audience>","price":12,"keywords":["k1","k2","k3"],"rationale":"<reason>"}}'
        )
        return "market-analyst", prompt, "research"

    elif stage == "CREATION":
        agent = VERTICAL_AGENT[vertical]
        prompt = (
            f"Design a {vertical} digital template for Gumroad.\n"
            f"Product: {research.get('product_name', 'Professional Template')}\n"
            f"Audience: {research.get('target_audience', 'professionals')}\n"
            f"Keywords: {', '.join(research.get('keywords', []))}\n\n"
            f"Reply with ONLY this JSON (no other text):\n"
            f'{{"template_name":"<name>","tagline":"<tagline>","target_user":"<user>","key_features":["f1","f2","f3"],"value_proposition":"<value>"}}'
        )
        return agent, prompt, "creation"

    elif stage == "COPYWRITING":
        features = creation.get("key_features", creation.get("features", []))
        prod_name = creation.get("template_name") or research.get("product_name", "Template")
        prompt = (
            f"Write a Gumroad listing for: {prod_name}\n"
            f"Audience: {creation.get('target_user') or research.get('target_audience', 'professionals')}\n"
            f"Features: {', '.join(str(f) for f in features[:3])}\n\n"
            f"Reply with ONLY this JSON (no other text):\n"
            f'{{"title":"<SEO title max 60 chars>","description":"<200 word description>","tags":["t1","t2","t3","t4","t5"],"price":12}}'
        )
        return "copywriter", prompt, "copy"

    elif stage == "PUBLISHING":
        copy_title = copy.get("title") or research.get("product_name", "Digital Template")
        copy_desc  = copy.get("description", "")[:400]
        copy_tags  = copy.get("tags", [])[:5]
        copy_price = int(float(copy.get("price", 12)) * 100)
        prompt = (
            f"Create Gumroad API payload for: {copy_title}\n\n"
            f"Reply with ONLY this JSON (no other text):\n"
            f'{{"name":"{copy_title}","description":"{copy_desc[:200]}","price":{copy_price},"published":true,"currency":"usd","tags":{json.dumps(copy_tags)}}}'
        )
        return "publisher", prompt, "publish"

    elif stage == "ANALYTICS":
        gumroad_url = publish.get("gumroad_url", "pending")
        prompt = (
            f"Analyze this Gumroad product:\n"
            f"Title: {copy.get('title', 'Digital Template')}\n"
            f"Price: ${copy.get('price', 12)} | URL: {gumroad_url}\n\n"
            f"Reply with ONLY this JSON (no other text):\n"
            f'{{"daily_summary":"<summary>","trend_analysis":"<trend>","recommendation":"<next action>"}}'
        )
        return "analytics", prompt, "analytics_data"

    return None, None, None


# ── Pipeline task execution ───────────────────────────────────────────────────
async def execute_pipeline_task(aid: str, task: str, product_id: str, data_key: str):
    a = AGENTS[aid]
    a["status"]       = "working"
    a["current_task"] = task
    agent_log(aid, f"⚡ [{product_id}] {task[:55]}...")

    try:
        result_text = await llm(a["system"], task, max_tokens=1000)
        result_json = extract_json(result_text)
        if result_json is None:
            agent_log(aid, "⚠ JSON parse failed — saving raw output")
            result_json = {"raw": result_text, "parse_error": True}

        # Publisher: use own LLM output as primary payload, fall back to copy data
        if aid == "publisher":
            product = pipeline.get_product(product_id)
            if product:
                pub = result_json if not result_json.get("parse_error") else {}

                # LLM may use name/final_title/title interchangeably
                title = (pub.get("name") or pub.get("final_title") or pub.get("title") or "").strip()
                description = (pub.get("description") or "").strip()
                price_raw = pub.get("price") or pub.get("final_price") or 0
                # price_raw < 200 → dollars → convert to cents; else already cents
                price_cents = int(float(price_raw) * 100) if 0 < float(price_raw) < 200 else int(price_raw)
                tags = pub.get("tags") or []

                # Always supplement from copy stage (unconditional, not just when title missing)
                raw_copy = product.get("copy") or {}
                if raw_copy.get("parse_error") or raw_copy.get("_recovered"):
                    c = recover_copy(raw_copy.get("raw", str(raw_copy)))
                    agent_log(aid, f"🔧 Copy recovered: '{c['title']}'")
                else:
                    c = raw_copy
                copy_title = (c.get("title") or c.get("seo_title") or c.get("product_title") or c.get("name") or "").strip()
                if not title:
                    title = copy_title
                if not description:
                    description = c.get("description") or c.get("product_description") or ""
                if not price_cents:
                    price_cents = int(float(c.get("price", 12)) * 100)
                if not tags:
                    tags = c.get("tags") or c.get("keywords") or []

                if title and title != "Digital Template":
                    resp = await gumroad_create_product(
                        title       = title[:100],
                        description = description[:5000],
                        price_cents = int(price_cents),
                        tags        = tags,
                    )
                    if "product" in resp:
                        url = resp["product"].get("short_url", "")
                        result_json["gumroad_url"] = url
                        result_json["gumroad_id"]  = resp["product"].get("id", "")
                        result_json["ready_to_publish"] = True
                        agent_log(aid, f"🚀 Published → {url}")
                    else:
                        err = resp.get("message") or resp.get("error", "unknown error")
                        result_json["gumroad_error"] = err
                        agent_log(aid, f"⚠ Gumroad API: {err}")
                else:
                    agent_log(aid, "⚠ No valid title — skipping Gumroad publish")

        # Advance pipeline stage
        pipeline.advance(product_id, data_key, result_json)

        # Persist to workspace
        out_dir = WORKSPACE / aid
        out_dir.mkdir(parents=True, exist_ok=True)
        ts = datetime.now().strftime("%Y%m%d_%H%M%S")
        (out_dir / f"{ts}_{product_id}_{data_key}.json").write_text(
            json.dumps({"product_id": product_id, "stage": data_key,
                        "task": task[:200], "result": result_json}, indent=2, ensure_ascii=False)
        )

        xp_gain = 15 + min(35, len(result_text) // 60)
        a["xp"]        += xp_gain
        a["level"]      = xp_to_level(a["xp"])
        a["tasks_done"] += 1
        agent_log(aid, f"✓ [{product_id}] stage done +{xp_gain} XP")
        save_xp()

        DETAIL_LOGS[aid].insert(0, {
            "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "task": task[:300], "result": result_text,
            "product_id": product_id, "xp_gain": xp_gain,
        })
        DETAIL_LOGS[aid] = DETAIL_LOGS[aid][:20]

    except Exception as e:
        agent_log(aid, f"✗ Error: {e}")
        # Unblock product so orchestrator can retry
        pipeline.mark_assigned(product_id)
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
        result  = await llm(a["system"], task, max_tokens=900)
        xp_gain = 10
        a["xp"]        += xp_gain
        a["level"]      = xp_to_level(a["xp"])
        a["tasks_done"] += 1
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
    """Ask the LLM orchestrator to make strategic pipeline decisions."""
    stats = pipeline.stats()
    state = {
        "total": stats["total"], "done": stats["done"],
        "by_stage": stats["by_stage"], "by_vertical": stats["by_vertical"],
        "pending": [
            {"id": a["product"]["id"], "vertical": a["product"]["vertical"], "stage": a["product"]["stage"]}
            for a in actions
        ],
    }
    raw = await llm(
        AGENTS["tinyagi"]["system"],
        f"Pipeline state:\n{json.dumps(state)}\n\nDecide.",
        max_tokens=200,
    )
    decision = extract_json(raw)
    if not decision:
        decision = {"priority_vertical": "all", "retry_products": [], "skip_products": [], "reasoning": raw[:150]}
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
                agent_log("tinyagi", f"✓ Pipeline nominal — {stats['done']} done, {stats['total'] - stats['done']} active")
            else:
                # Strategic LLM decision: priority, retry, skip
                decision   = await orchestrator_decide(actions)
                priority   = decision.get("priority_vertical", "all")
                skip_ids   = set(decision.get("skip_products") or [])
                retry_ids  = set(decision.get("retry_products") or [])
                reasoning  = decision.get("reasoning", "")

                agent_log("tinyagi", f"🎯 {reasoning[:120]}")

                # Unblock products flagged for retry
                for pid in retry_ids:
                    for p in pipeline.products:
                        if p["id"] == pid:
                            p["assigned"] = False
                            pipeline.save()

                # Apply priority filter (only if a specific vertical is chosen)
                if priority != "all":
                    filtered = [a for a in actions if a["product"]["vertical"] == priority]
                    if filtered:
                        actions = filtered

                # Drop explicitly skipped products
                actions = [a for a in actions if a["product"]["id"] not in skip_ids]

                REASONING_LOG.insert(0, {
                    "ts": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                    "strategic_decision": decision,
                    "actions_count": len(actions),
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
                    await TASK_QUEUES[agent_id].put({
                        "task": prompt, "product_id": pid, "data_key": data_key
                    })

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

        await asyncio.sleep(300)  # re-check every 5 minutes


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

    log.info(f"TinyAGI pipeline factory online — {len(AGENTS)} agents, model={OLLAMA_MODEL}")
    log.info(f"Verticals: {VERTICALS} | Products in pipeline: {len(pipeline.products)}")


# ── API endpoints ─────────────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {"status": "ok", "agents": len(AGENTS),
            "model": OLLAMA_MODEL, "pipeline": pipeline.stats()}


@app.get("/agents/status")
async def agents_status():
    stats = pipeline.stats()
    return {
        "agents": {
            aid: {
                "name": a["name"], "xp": a["xp"], "level": a["level"],
                "xp_pct": xp_progress_pct(a["xp"]), "status": a["status"],
                "current_task": a["current_task"], "tasks_done": a["tasks_done"],
                "log": a["log"][:6], "color": a["color"],
                "queue_size": TASK_QUEUES[aid].qsize() if TASK_QUEUES else 0,
            }
            for aid, a in AGENTS.items()
        },
        "total_xp":    sum(a["xp"] for a in AGENTS.values()),
        "tasks_done":  sum(a["tasks_done"] for a in AGENTS.values()),
        "pipeline":    stats,
        "started_at":  STARTED_AT,
        "timestamp":   datetime.now().isoformat(),
    }


@app.get("/agents/{aid}/detail")
async def agent_detail(aid: str):
    if aid not in AGENTS:
        raise HTTPException(404, "Agent not found")
    a = AGENTS[aid]
    data = {
        "id": aid, "name": a["name"], "xp": a["xp"], "level": a["level"],
        "xp_pct": xp_progress_pct(a["xp"]), "status": a["status"],
        "current_task": a["current_task"], "tasks_done": a["tasks_done"],
        "color": a["color"], "queue_size": TASK_QUEUES[aid].qsize() if TASK_QUEUES else 0,
        "log": a["log"], "system_prompt": a["system"],
        "history": DETAIL_LOGS.get(aid, []),
    }
    if aid == "tinyagi":
        data["reasoning_log"] = REASONING_LOG
        data["pipeline"]      = pipeline.stats()
        data["recent_products"] = pipeline.recent(5)
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
