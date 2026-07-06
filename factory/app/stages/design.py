"""DESIGN — quality LLM turns the research idea into a buildable spec.

The output of this stage is the INPUT for BUILD: it must be structured JSON a
builder can consume mechanically, not marketing prose.
"""
import json
import logging

from .. import llm
from ..pipeline import pipeline

log = logging.getLogger("factory.design")

SYSTEMS = {
    "finance": (
        "You are an Excel/Google Sheets template architect. Design a complete, buildable "
        "spreadsheet for the given product. Output ONLY valid JSON:\n"
        '{"tagline": "...", "key_features": ["..."],'
        ' "sheets": [{"name": "...", "description": "...",'
        ' "columns": [{"header": "...", "example": "...", "formula": null}]}]}\n'
        "Rules: 3-6 sheets, 4-10 columns each. Use real Excel formulas where useful "
        '(e.g. "=SUM(B2:B100)") in the formula field, otherwise null. Examples must be '
        "realistic values."
    ),
    "notion": (
        "You are a Notion template architect. Design a complete, buildable Notion template. "
        "Output ONLY valid JSON:\n"
        '{"tagline": "...", "key_features": ["..."],'
        ' "pages": [{"title": "...", "description": "...",'
        ' "databases": [{"name": "...", "description": "...",'
        ' "properties": [{"name": "...", "type": "text|number|select|date|formula|relation",'
        ' "formula": null}], "views": ["Table", "Board"]}],'
        ' "sections": [{"title": "...", "content": "..."}]}],'
        ' "setup_steps": ["step 1", "step 2"]}\n'
        "Rules: 2-5 pages, realistic database properties, concrete setup steps."
    ),
    "business": (
        "You are a business/freelance toolkit architect. Design a complete, buildable PDF "
        "workbook for the given product. Output ONLY valid JSON:\n"
        '{"tagline": "...", "key_features": ["..."],'
        ' "sections": [{"heading": "...", "content": "..."}]}\n'
        "Rules: 6-9 sections, each with 150-400 words of genuinely useful content "
        "(frameworks, checklists, fill-in worksheets), plain text with • bullets."
    ),
}


async def run(product: dict) -> bool:
    research = product.get("research") or {}
    data = await llm.complete_json(
        SYSTEMS[product["vertical"]],
        f"Product: {json.dumps(research)[:1500]}",
        quality=True,
        max_tokens=3000,
    )
    if not data:
        pipeline.retry_later(product["id"], 10, "design returned no usable JSON")
        return False
    pipeline.advance(product["id"], "design", data)
    return True
