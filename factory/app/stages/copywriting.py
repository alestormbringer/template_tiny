"""COPYWRITING — quality LLM writes the Gumroad listing copy."""
import json
import logging

from .. import llm
from ..pipeline import pipeline

log = logging.getLogger("factory.copywriting")

SYSTEM = (
    "You are a conversion copywriter for digital products on Gumroad. "
    "Write listing copy for the given product. Output ONLY valid JSON:\n"
    '{"title": "SEO title, max 80 chars", "tagline": "one-line hook",'
    ' "description": "300-500 words, markdown, benefits-first, with bullet lists",'
    ' "tags": ["13 SEO tags"], "price_usd": 12}\n'
    "Rules: concrete outcomes over hype, address the audience pain points directly."
)


async def run(product: dict) -> bool:
    payload = {
        "research": product.get("research") or {},
        "design_summary": {
            "tagline": (product.get("design") or {}).get("tagline"),
            "key_features": (product.get("design") or {}).get("key_features"),
        },
        "vertical": product["vertical"],
    }
    data = await llm.complete_json(
        SYSTEM, json.dumps(payload)[:3000], quality=True, max_tokens=1500,
    )
    if not data or not data.get("title"):
        pipeline.retry_later(product["id"], 10, "copywriting returned no usable JSON")
        return False
    pipeline.advance(product["id"], "copy", data)
    return True
