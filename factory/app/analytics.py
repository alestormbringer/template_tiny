"""Fase 4/5 of the workflow diagram — daily catalog analytics + decision.

Every morning: read real sales from the Gumroad API, have the LLM find
patterns, and decide what to build next (new niche vs variant of the best
seller). The decision seeds the next RESEARCH runs and the report is saved
under workspace/reports/.
"""
import json
import logging
from datetime import datetime

from . import config, llm
from .integrations import gumroad
from .pipeline import pipeline

log = logging.getLogger("factory.analytics")

SYSTEM = (
    "You are the analytics brain of a digital template factory. Given real sales data "
    "and the current catalog, produce a daily report and a build decision. "
    "Output ONLY valid JSON:\n"
    '{"summary": "3-5 sentences on patterns and trends",'
    ' "best_seller": "product name or null",'
    ' "decision": "new_niche" or "variant",'
    ' "next_ideas": [{"vertical": "notion|finance|business", "idea": "one sentence"}]}'
)

_state = {"last_run_date": None, "latest_report": None}


def latest_report():
    return _state["latest_report"]


def due() -> bool:
    return _state["last_run_date"] != datetime.now().strftime("%Y-%m-%d")


async def run_daily():
    today = datetime.now().strftime("%Y-%m-%d")
    _state["last_run_date"] = today

    sales = await gumroad.get_sales()
    sales_slim = [
        {"product": s.get("product_name"), "price": s.get("price"),
         "created_at": s.get("created_at")}
        for s in (sales.get("sales") or [])[:100]
    ] if isinstance(sales, dict) else []

    catalog = [
        {"title": ((p.get("copy") or {}).get("title")
                   or (p.get("research") or {}).get("product_name")),
         "vertical": p["vertical"], "stage": p["stage"]}
        for p in pipeline.products
    ]

    report = await llm.complete_json(
        SYSTEM,
        json.dumps({"date": today, "sales": sales_slim, "catalog": catalog[:50]})[:6000],
        quality=True, max_tokens=800,
    ) or {"summary": "no report generated", "decision": "new_niche", "next_ideas": []}

    report["date"] = today
    report["sales_count"] = len(sales_slim)
    _state["latest_report"] = report

    config.REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (config.REPORTS_DIR / f"{today}.json").write_text(json.dumps(report, indent=2))
    log.info("daily report saved (%d sales, decision=%s)",
             len(sales_slim), report.get("decision"))
    return report
