"""IMAGE — Pollinations.ai cover generation. Non-blocking: a missing cover
must never hold a verified product back from publishing."""
import logging
from datetime import datetime

from .. import config, llm
from ..integrations import pollinations
from ..pipeline import pipeline

log = logging.getLogger("factory.image")

SYSTEM = (
    "You write image-generation prompts for digital product cover art. "
    "Given a product, output ONLY valid JSON: "
    '{"image_prompt": "60-100 words: modern flat illustration, clear focal subject, '
    'product-appropriate colors, no text overlays"}'
)


async def run(product: dict) -> bool:
    copy = product.get("copy") or {}
    title = copy.get("title", "digital template")

    data = await llm.complete_json(
        SYSTEM, f"Product: {title}. Tagline: {copy.get('tagline', '')}", max_tokens=300)
    prompt = (data or {}).get("image_prompt") or (
        f"modern flat illustration cover for {title}, clean minimal design, "
        f"soft gradients, no text")

    img = await pollinations.generate_cover_image(prompt, seed=abs(hash(product["id"])) % 10000)
    result = {"image_prompt": prompt, "generated_at": datetime.now().isoformat()}
    if img:
        out = config.ARTIFACTS_DIR / product["id"] / "cover.jpg"
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_bytes(img)
        result["image_path"] = str(out)
        result["bytes"] = len(img)
    else:
        # Cover is optional by design — record the miss and move on.
        result["image_path"] = None
        log.warning("[%s] no cover generated, publishing without one", product["id"])
    pipeline.advance(product["id"], "image", result)
    return True
