"""RESEARCH — SearXNG demand signals + fast LLM -> product idea."""
import logging

from .. import llm
from ..integrations import searxng
from ..pipeline import pipeline

log = logging.getLogger("factory.research")

SYSTEM = (
    "You are a market analyst specialized in digital products (Gumroad/Etsy) for the "
    "English-speaking market. Given a niche and live search results, identify one product "
    "with clear demand. Output ONLY valid JSON:\n"
    '{"product_name": "...", "audience": "...", "pain_points": ["...", "..."],'
    ' "keywords": ["kw1", "kw2", "kw3"], "price_usd": 12}'
)

QUERIES = {
    "notion":   "best selling notion templates 2026 productivity",
    "finance":  "popular personal finance spreadsheet template budget tracker",
    "business": "digital business planner template freelancers small business",
}


async def run(product: dict) -> bool:
    from .. import analytics

    vertical = product["vertical"]
    results = await searxng.search(QUERIES[vertical])
    existing = [
        (p.get("research") or {}).get("product_name", "")
        for p in pipeline.products if p["vertical"] == vertical and p["id"] != product["id"]
    ]
    # Fase 5 of the diagram: yesterday's analytics decision steers today's ideas
    report = analytics.latest_report() or {}
    hints = [i.get("idea") for i in (report.get("next_ideas") or [])
             if i.get("vertical") == vertical]
    hint_line = f"Analytics suggestion for today: {hints[0]}\n" if hints else ""
    data = await llm.complete_json(
        SYSTEM,
        f"Niche: {vertical} templates.\nAlready in catalog (avoid duplicates): {existing[:15]}\n"
        f"{hint_line}Live search results:\n{results}",
        max_tokens=500,
    )
    if not data or not data.get("product_name"):
        pipeline.retry_later(product["id"], 10, "research returned no usable JSON")
        return False
    pipeline.advance(product["id"], "research", data)
    return True
