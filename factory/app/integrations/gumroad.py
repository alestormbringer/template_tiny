"""Gumroad API v2 client.

CRITICAL (do not revert): every write call MUST use aiohttp.FormData with
form.add_field(k, str(v)). Passing a plain dict as data= sends the wrong
content-type and Gumroad silently ignores fields like published=true —
products then stay as drafts forever.
"""
import json
import logging
from typing import Optional

import aiohttp

from .. import config

log = logging.getLogger("factory.gumroad")
BASE = "https://api.gumroad.com/v2"


def _auth() -> dict:
    return {"Authorization": f"Bearer {config.GUMROAD_API_KEY}"}


async def create_product(title: str, description: str, price_cents: int, tags: list) -> dict:
    if not config.GUMROAD_API_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("name", title)
            form.add_field("description", description)
            form.add_field("price", str(price_cents))
            form.add_field("published", "false")
            for tag in tags[:5]:
                form.add_field("tags[]", str(tag)[:20])
            async with sess.post(f"{BASE}/products", headers=_auth(), data=form,
                                 timeout=aiohttp.ClientTimeout(total=15)) as r:
                log.info("create_product HTTP %s", r.status)
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def upload_file(product_id: str, file_bytes: bytes, filename: str, content_type: str) -> dict:
    if not config.GUMROAD_API_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("file", file_bytes, filename=filename, content_type=content_type)
            async with sess.post(f"{BASE}/products/{product_id}/product_files",
                                 headers=_auth(), data=form,
                                 timeout=aiohttp.ClientTimeout(total=120)) as r:
                log.info("upload_file HTTP %s", r.status)
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def upload_cover_image(product_id: str, img_bytes: bytes) -> dict:
    if not config.GUMROAD_API_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            form.add_field("preview", img_bytes, filename="cover.jpg", content_type="image/jpeg")
            async with sess.put(f"{BASE}/products/{product_id}", headers=_auth(), data=form,
                                timeout=aiohttp.ClientTimeout(total=60)) as r:
                log.info("upload_cover HTTP %s", r.status)
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def update_product(product_id: str, fields: dict) -> dict:
    if not config.GUMROAD_API_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            form = aiohttp.FormData()
            for k, v in fields.items():
                form.add_field(k, str(v))
            async with sess.put(f"{BASE}/products/{product_id}", headers=_auth(), data=form,
                                timeout=aiohttp.ClientTimeout(total=15)) as r:
                log.info("update_product HTTP %s", r.status)
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def get_product(product_id: str) -> dict:
    """Used by PUBLISH to confirm the product is really live after published=true."""
    if not config.GUMROAD_API_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(f"{BASE}/products/{product_id}", headers=_auth(),
                                timeout=aiohttp.ClientTimeout(total=15)) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}


async def get_sales() -> dict:
    if not config.GUMROAD_API_KEY:
        return {"error": "No Gumroad key"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(f"{BASE}/sales", headers=_auth(),
                                timeout=aiohttp.ClientTimeout(total=10)) as r:
                return await r.json(content_type=None)
    except Exception as e:
        return {"error": str(e)}
