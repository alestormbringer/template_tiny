"""PUBLISH + RELEASE.

PUBLISH creates the marketplace draft and uploads the VERIFIED artifact from
disk. Two invariants fix the old "draft without document" bug:

1. It refuses to run at all unless VERIFY signed off and the file is still on
   disk (re-checked here — no trust without verification).
2. A failed file upload is a FAILED publish. The old code logged a warning and
   flipped published=true anyway; now the product never goes live file-less.

RELEASE flips the draft live. With AUTO_PUBLISH=false it waits for a human
POST /pipeline/approve/{id} (the ~60s manual step in the workflow diagram).
After flipping, it re-fetches the product to confirm it is really live.
"""
import logging
from datetime import datetime
from pathlib import Path

from .. import config
from ..integrations import etsy, gumroad
from ..pipeline import pipeline

log = logging.getLogger("factory.publish")


def _fail(product_id: str, reason: str):
    p = pipeline.get(product_id)
    if not p:
        return
    attempts = p.get("publish_attempts", 0) + 1
    p["publish_attempts"] = attempts
    pipeline.save()
    if attempts >= config.MAX_PUBLISH_ATTEMPTS:
        pipeline.fail(product_id, "PUBLISH_ERROR", f"{attempts}x: {reason}")
    else:
        pipeline.retry_later(product_id, 2 ** attempts, reason)


def _load_artifact(product: dict):
    """Re-verify on the spot: verified flag + file still present and non-trivial."""
    if not (product.get("verify") or {}).get("verified"):
        return None, "product has no verified artifact — refusing to publish"
    artifacts = (product.get("build") or {}).get("artifacts") or []
    if not artifacts:
        return None, "no artifacts recorded"
    art = artifacts[0]
    path = Path(art["path"])
    if not path.is_file() or path.stat().st_size < config.MIN_ARTIFACT_BYTES:
        return None, f"artifact vanished or truncated: {path}"
    return {"bytes": path.read_bytes(), "filename": art["filename"],
            "content_type": art["content_type"]}, ""


def _listing_fields(product: dict):
    copy = product.get("copy") or {}
    research = product.get("research") or {}
    title = (copy.get("title") or research.get("product_name") or "").strip()
    desc = copy.get("description") or ""
    tags = copy.get("tags") or research.get("keywords") or []
    price = copy.get("price_usd") or research.get("price_usd") or 12
    price_cents = int(float(price) * 100) if float(price) < 200 else int(price)
    return title, desc, tags, price_cents


async def run(product: dict) -> bool:
    title, desc, tags, price_cents = _listing_fields(product)
    if not title:
        _fail(product["id"], "no valid title")
        return False

    artifact, reason = _load_artifact(product)
    if not artifact:
        # Broken invariant: send it back through BUILD/VERIFY instead of retrying blind.
        pipeline.send_back(product["id"], "BUILD", reason)
        return False

    img_path = (product.get("image") or {}).get("image_path")
    img_bytes = Path(img_path).read_bytes() if img_path and Path(img_path).is_file() else None

    use_gumroad = bool(config.GUMROAD_API_KEY) and \
        pipeline.published_today("gumroad_id") < config.GUMROAD_DAILY_LIMIT
    use_etsy = not use_gumroad and etsy.configured()

    if not use_gumroad and not use_etsy:
        pipeline.retry_later(product["id"], 12 * 60, "daily publish limit reached on all platforms")
        return False

    existing = product.get("publish") or {}
    result = dict(existing)

    if use_gumroad:
        gumroad_id = existing.get("gumroad_id", "")
        if not gumroad_id:
            resp = await gumroad.create_product(title[:100], desc[:5000], price_cents, tags)
            if not (resp.get("success") and resp.get("product")):
                _fail(product["id"],
                      f"gumroad create failed: {resp.get('message') or resp.get('error')}")
                return False
            gumroad_id = resp["product"].get("id", "")
            result.update({"platform": "gumroad", "gumroad_id": gumroad_id,
                           "gumroad_url": resp["product"].get("short_url", "")})
        else:
            log.info("[%s] reusing gumroad product %s", product["id"], gumroad_id)

        up = await gumroad.upload_file(gumroad_id, artifact["bytes"],
                                       artifact["filename"], artifact["content_type"])
        if not up.get("success"):
            # Keep the id for idempotent retry, but this attempt FAILED.
            p = pipeline.get(product["id"])
            if p:
                p["publish"] = result
                pipeline.save()
            _fail(product["id"], f"file upload failed: {str(up)[:200]}")
            return False

        if img_bytes:
            cover = await gumroad.upload_cover_image(gumroad_id, img_bytes)
            if not cover.get("success"):
                log.warning("[%s] cover upload failed (non-blocking)", product["id"])

    else:  # Etsy fallback
        listing = await etsy.create_listing(title[:140], desc, price_cents / 100, tags)
        listing_id = listing.get("listing_id") or listing.get("id")
        if not listing_id:
            _fail(product["id"], f"etsy create failed: {str(listing)[:200]}")
            return False
        result.update({"platform": "etsy", "etsy_listing_id": str(listing_id),
                       "etsy_url": f"https://www.etsy.com/listing/{listing_id}"})
        up = await etsy.upload_digital_file(str(listing_id), artifact["bytes"],
                                            artifact["filename"])
        if not up.get("file_id"):
            _fail(product["id"], f"etsy file upload failed: {str(up)[:200]}")
            return False
        if img_bytes:
            await etsy.upload_image(str(listing_id), img_bytes)

    result["draft_ready_at"] = datetime.now().isoformat()
    pipeline.advance(product["id"], "publish", result)
    return True


async def run_release(product: dict) -> bool:
    """Flip the draft live, then confirm it really is."""
    if not config.AUTO_PUBLISH and not product.get("approved"):
        return False  # waiting for the human ~60s approval step

    publish = product.get("publish") or {}
    platform = publish.get("platform")

    if platform == "gumroad":
        gumroad_id = publish.get("gumroad_id")
        resp = await gumroad.update_product(gumroad_id, {"published": "true"})
        if not (resp.get("success") and resp.get("product")):
            _fail(product["id"], f"release failed: {str(resp)[:200]}")
            return False
        check = await gumroad.get_product(gumroad_id)
        live = (check.get("product") or {}).get("published") is True
        if not live:
            _fail(product["id"], "gumroad reports product still unpublished after release")
            return False
        url = publish.get("gumroad_url", gumroad_id)
    elif platform == "etsy":
        resp = await etsy.publish_listing(publish.get("etsy_listing_id", ""))
        if not (resp.get("state") == "active" or resp.get("listing_id")):
            _fail(product["id"], f"etsy release failed: {str(resp)[:200]}")
            return False
        url = publish.get("etsy_url", "")
    else:
        _fail(product["id"], f"unknown platform in publish data: {platform}")
        return False

    pipeline.advance(product["id"], "release",
                     {"published_at": datetime.now().isoformat(), "url": url,
                      "confirmed_live": True})
    log.info("[%s] LIVE -> %s", product["id"], url)
    return True
