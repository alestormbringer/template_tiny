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
GUMROAD_KEY  = os.getenv("GUMROAD_API_KEY",  "")
NOTION_KEY   = os.getenv("NOTION_API_KEY",   "")
SEARXNG_URL  = os.getenv("SEARXNG_BASE_URL", "http://searxng:8080")
WORKSPACE    = Path("/root/workspace")

client = AsyncOpenAI(api_key="ollama", base_url=OLLAMA_BASE)

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
            "You are the master orchestrator of an autonomous digital product business on Gumroad. "
            "You manage a pipeline that produces Notion templates, Finance/Excel templates, and Business "
            "templates for the worldwide English-speaking market (US, UK, Canada, Australia). "
            "You follow a strict pipeline: market-analyst → creator → copywriter → publisher → analytics. "
            "You analyze pipeline state and assign the correct next step to the right agent. "
            "Be decisive and revenue-focused."
        ),
    },
    "market-analyst": {
        "name": "Market Analyst", "xp": 0, "level": 1,
        "color": "#00ff88", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a market research specialist for digital products on Gumroad and Etsy. "
            "You research worldwide trends targeting the English-speaking market (US, UK, Canada, Australia). "
            "Find niches with high demand, low competition, and $15-49 price range. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"niche":"string","product_name":"string","tagline":"string (1 sentence)",'
            '"target_audience":"string","price":29,"keywords":["k1","k2","k3","k4","k5"],'
            '"competition":"low|medium|high","rationale":"why this will sell now"}'
        ),
    },
    "notion-creator": {
        "name": "Notion Creator", "xp": 0, "level": 1,
        "color": "#ff6600", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a professional Notion template designer creating premium products for the global English-speaking market. "
            "You design templates that are immediately usable, visually polished, and solve real problems "
            "for freelancers, startups, and knowledge workers. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"template_name":"string","tagline":"string","target_user":"string",'
            '"databases":[{"name":"string","properties":[{"name":"string","type":"string"}]}],'
            '"views":["Board","Calendar","Table","Gallery"],"pages":["page1","page2"],'
            '"key_features":["feature1","feature2","feature3","feature4","feature5"],'
            '"setup_instructions":"string","value_proposition":"string"}'
        ),
    },
    "finance-creator": {
        "name": "Finance Creator", "xp": 0, "level": 1,
        "color": "#ffee00", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a financial template specialist creating Excel/Google Sheets products for the global English-speaking market. "
            "You build professional templates for personal budgeting, business P&L, cashflow forecasting, and pricing. "
            "Templates must be accurate, professional, and immediately usable with clear instructions. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"template_name":"string","tagline":"string","target_user":"string",'
            '"sheets":[{"name":"string","purpose":"string","key_formulas":["formula1","formula2"]}],'
            '"key_features":["feature1","feature2","feature3","feature4","feature5"],'
            '"data_inputs":["input1","input2"],"outputs":["output1","output2"],'
            '"instructions":"string","value_proposition":"string"}'
        ),
    },
    "business-creator": {
        "name": "Business Creator", "xp": 0, "level": 1,
        "color": "#aa44ff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a business template specialist creating professional documents for freelancers and SMBs worldwide. "
            "You create business plans, client onboarding kits, freelance proposals, SOPs, and operational playbooks. "
            "All output must be in professional English, immediately usable, and highly practical. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"template_name":"string","tagline":"string","target_user":"string",'
            '"documents":[{"name":"string","purpose":"string","sections":["s1","s2","s3"]}],'
            '"key_features":["feature1","feature2","feature3","feature4","feature5"],'
            '"use_cases":["case1","case2","case3"],'
            '"instructions":"string","value_proposition":"string"}'
        ),
    },
    "copywriter": {
        "name": "Gumroad Copywriter", "xp": 0, "level": 1,
        "color": "#ff44aa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are an expert Gumroad copywriter targeting the worldwide English-speaking market. "
            "You write compelling, SEO-optimized product listings that convert browsers into buyers. "
            "Your copy is benefit-focused, specific, and professional. No fluff. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"title":"string (max 60 chars, keyword-rich)","subtitle":"string (max 100 chars)",'
            '"description":"string (400-500 words, use newlines for paragraphs)",'
            '"bullet_points":["benefit 1","benefit 2","benefit 3","benefit 4","benefit 5"],'
            '"price":29,"tags":["t1","t2","t3","t4","t5","t6","t7","t8","t9","t10"],'
            '"thumbnail_concept":"string (visual concept for thumbnail)"}'
        ),
    },
    "publisher": {
        "name": "Gumroad Publisher", "xp": 0, "level": 1,
        "color": "#00aaff", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are the Gumroad publishing manager. "
            "You review product specifications and copy to verify everything is ready for publication. "
            "You ensure quality standards: clear title, compelling description, correct pricing, relevant tags. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"ready_to_publish":true,"product_summary":"string (2 sentences)",'
            '"final_title":"string","final_price":29,'
            '"checklist":{"has_title":true,"has_description":true,"has_price":true,"has_tags":true},'
            '"quality_score":85,"publish_notes":"string","suggested_improvements":"string"}'
        ),
    },
    "analytics": {
        "name": "Sales Analytics", "xp": 0, "level": 1,
        "color": "#44ffaa", "status": "idle", "current_task": None,
        "tasks_done": 0, "log": [],
        "system": (
            "You are a sales analytics specialist for digital products on Gumroad. "
            "You analyze product performance, calculate key metrics, and provide actionable recommendations. "
            "You identify what to optimize to increase conversion and revenue. "
            "ALWAYS output a single valid JSON object — no extra text:\n"
            '{"performance":"above_average|average|below_average",'
            '"estimated_monthly_sales":5,"estimated_monthly_revenue":145,'
            '"top_insight":"string","optimization":["action1","action2","action3"],'
            '"price_recommendation":29,'
            '"next_vertical_recommendation":"notion|finance|business"}'
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
        resp = await client.chat.completions.create(
            model=OLLAMA_MODEL,
            messages=[{"role": "system", "content": system}, {"role": "user", "content": user}],
            max_tokens=max_tokens, temperature=0.7,
        )
        return resp.choices[0].message.content.strip()
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
    title = ""
    m = re.search(r'"title"\s*:\s*"([^"]{3,80})"', raw)
    if m:
        title = m.group(1)

    price = 29
    m = re.search(r'"price"\s*:\s*(\d+)', raw)
    if m:
        v = int(m.group(1))
        price = v if 5 <= v <= 200 else (v / 100 if v >= 500 else 29)

    desc = ""
    m = re.search(r'"description"\s*:\s*"(.*?)"(?=\s*,\s*")', raw, re.DOTALL)
    if m:
        desc = m.group(1).replace('\\n', '\n')
    if not desc:
        desc = raw[:600]

    tags = re.findall(r'"([A-Za-z][A-Za-z0-9 \-]{2,25})"', raw)
    tags = list(dict.fromkeys(tags))[:10]

    return {
        "title":         title or "Digital Template",
        "price":         price,
        "description":   desc,
        "tags":          tags,
        "bullet_points": [],
        "_recovered":    True,
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
                      "price": price_cents, "tags[]": tags[:5]},
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
    research = product.get("research") or {}
    creation = product.get("creation") or {}
    copy     = product.get("copy")     or {}
    publish  = product.get("publish")  or {}

    if stage == "RESEARCH":
        search_hint = await searxng_search(
            f"best selling {vertical} templates Gumroad site:gumroad.com 2024"
        )
        prompt = (
            f"Research the worldwide {vertical} digital template market on Gumroad and Etsy.\n"
            f"Find ONE highly profitable niche right now for English-speaking customers.\n"
            f"Web context:\n{search_hint}\n\n"
            f"Output a complete JSON research report. Focus on $15-49 price range, low-medium competition."
        )
        return "market-analyst", prompt, "research"

    elif stage == "CREATION":
        agent  = VERTICAL_AGENT[vertical]
        prompt = (
            f"Design a complete professional {vertical} template based on this market research:\n\n"
            f"Product: {research.get('product_name', 'Professional Template')}\n"
            f"Target audience: {research.get('target_audience', 'professionals')}\n"
            f"Keywords: {', '.join(research.get('keywords', []))}\n"
            f"Price point: ${research.get('price', 29)}\n"
            f"Why it will sell: {research.get('rationale', '')}\n\n"
            f"Create a detailed, professional English template specification ready for sale. Output JSON."
        )
        return agent, prompt, "creation"

    elif stage == "COPYWRITING":
        features = creation.get("key_features", creation.get("features", []))
        prompt   = (
            f"Write a complete Gumroad product listing in English for this {vertical} template:\n\n"
            f"Product name: {creation.get('template_name', research.get('product_name', 'Template'))}\n"
            f"Tagline: {creation.get('tagline', '')}\n"
            f"Target user: {creation.get('target_user', research.get('target_audience', ''))}\n"
            f"Key features: {', '.join(features[:5])}\n"
            f"Value proposition: {creation.get('value_proposition', '')}\n"
            f"SEO keywords: {', '.join(research.get('keywords', []))}\n"
            f"Suggested price: ${research.get('price', 29)}\n\n"
            f"Write SEO-optimized copy for the worldwide English-speaking market. Output JSON."
        )
        return "copywriter", prompt, "copy"

    elif stage == "PUBLISHING":
        prompt = (
            f"Review and finalize this {vertical} product for Gumroad publication:\n\n"
            f"Title: {copy.get('title', '')}\n"
            f"Description length: {len(copy.get('description', ''))} chars\n"
            f"Price: ${copy.get('price', 29)}\n"
            f"Tags: {', '.join(copy.get('tags', []))}\n"
            f"Bullet points: {len(copy.get('bullet_points', []))} items\n"
            f"Value proposition: {creation.get('value_proposition', '')}\n\n"
            f"Verify quality, approve for publication, output JSON checklist."
        )
        return "publisher", prompt, "publish"

    elif stage == "ANALYTICS":
        gumroad_url  = publish.get("gumroad_url", "pending")
        sales_context = ""
        if GUMROAD_KEY:
            sales_data = await gumroad_get_sales()
            if "error" not in sales_data:
                sales_context = f"\nGumroad sales data: {json.dumps(sales_data.get('sales', [])[:3])}"
        prompt = (
            f"Analyze the performance and optimization potential of this published product:\n\n"
            f"Title: {copy.get('title', 'Digital Template')}\n"
            f"Vertical: {vertical}\n"
            f"Price: ${copy.get('price', 29)}\n"
            f"URL: {gumroad_url}\n"
            f"Tags: {', '.join(copy.get('tags', []))}\n"
            f"Quality score: {publish.get('quality_score', 'N/A')}{sales_context}\n\n"
            f"Provide performance analysis and 3 concrete optimization actions. Output JSON."
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

        # Publisher: resolve copy (with fallback) and create on Gumroad
        if aid == "publisher":
            product = pipeline.get_product(product_id)
            if product:
                raw_copy = product.get("copy") or {}
                # If copy had a parse_error, recover what we can
                if raw_copy.get("parse_error") or raw_copy.get("_recovered"):
                    raw_text = raw_copy.get("raw", str(raw_copy))
                    c = recover_copy(raw_text)
                    agent_log(aid, f"🔧 Copy recovered from raw text: '{c['title']}'")
                else:
                    c = raw_copy

                # Publisher always attempts Gumroad if we have a title
                if c.get("title") and c["title"] != "Digital Template":
                    resp = await gumroad_create_product(
                        title       = c.get("title", "Digital Template")[:100],
                        description = c.get("description", "")[:5000],
                        price_cents = int(float(c.get("price", 29)) * 100),
                        tags        = c.get("tags", []),
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
