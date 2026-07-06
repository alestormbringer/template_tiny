"""Etsy API v3 client — fallback marketplace when Gumroad hits its daily limit."""
import logging
import time
from typing import Optional

import aiohttp

from .. import config

log = logging.getLogger("factory.etsy")

_access_token: str = config.ETSY_ACCESS_TOKEN
_token_expiry: float = 0.0


def configured() -> bool:
    return bool(config.ETSY_API_KEY and config.ETSY_SHOP_ID)


async def _ensure_token() -> str:
    global _access_token, _token_expiry
    if _access_token and time.time() < _token_expiry - 60:
        return _access_token
    if not config.ETSY_REFRESH_TOKEN:
        return _access_token
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(
                "https://api.etsy.com/v3/public/oauth/token",
                headers={"Content-Type": "application/x-www-form-urlencoded"},
                data={"grant_type": "refresh_token", "client_id": config.ETSY_API_KEY,
                      "refresh_token": config.ETSY_REFRESH_TOKEN},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                data = await r.json(content_type=None)
                _access_token = data.get("access_token", _access_token)
                _token_expiry = time.time() + data.get("expires_in", 3600)
                log.info("token refreshed")
    except Exception as e:
        log.warning("token refresh failed: %s", e)
    return _access_token


async def create_listing(title: str, description: str, price_usd: float, tags: list) -> dict:
    if not configured():
        return {"error": "Etsy not configured"}
    token = await _ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(
                f"https://openapi.etsy.com/v3/application/shops/{config.ETSY_SHOP_ID}/listings",
                headers={"x-api-key": config.ETSY_API_KEY, "Authorization": f"Bearer {token}",
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


async def upload_digital_file(listing_id: str, file_bytes: bytes, filename: str) -> dict:
    if not configured():
        return {"error": "Etsy not configured"}
    token = await _ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("file", file_bytes, filename=filename, content_type="application/pdf")
            async with sess.post(
                f"https://openapi.etsy.com/v3/application/shops/{config.ETSY_SHOP_ID}/listings/{listing_id}/files",
                headers={"x-api-key": config.ETSY_API_KEY, "Authorization": f"Bearer {token}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=120),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def upload_image(listing_id: str, img_bytes: bytes) -> dict:
    if not configured():
        return {"error": "Etsy not configured"}
    token = await _ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("image", img_bytes, filename="cover.jpg", content_type="image/jpeg")
            async with sess.post(
                f"https://openapi.etsy.com/v3/application/shops/{config.ETSY_SHOP_ID}/listings/{listing_id}/images",
                headers={"x-api-key": config.ETSY_API_KEY, "Authorization": f"Bearer {token}"},
                data=form,
                timeout=aiohttp.ClientTimeout(total=60),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def publish_listing(listing_id: str) -> dict:
    if not configured():
        return {"error": "Etsy not configured"}
    token = await _ensure_token()
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.patch(
                f"https://openapi.etsy.com/v3/application/shops/{config.ETSY_SHOP_ID}/listings/{listing_id}",
                headers={"x-api-key": config.ETSY_API_KEY, "Authorization": f"Bearer {token}",
                         "Content-Type": "application/json"},
                json={"state": "active"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}
