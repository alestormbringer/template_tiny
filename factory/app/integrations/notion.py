"""Minimal async Notion API client — real page creation + existence checks.

This is half of the fix for the old "draft but no document" bug: the model's
template design is actually written to Notion with pages.create, and VERIFY
later confirms the page exists with pages.retrieve before the product can be
marked ready.
"""
import logging
from typing import Optional

import aiohttp

from .. import config

log = logging.getLogger("factory.notion")

BASE = "https://api.notion.com/v1"
VERSION = "2022-06-28"


def configured() -> bool:
    return bool(config.NOTION_API_KEY and config.NOTION_PARENT_PAGE_ID)


def _headers() -> dict:
    return {
        "Authorization": f"Bearer {config.NOTION_API_KEY}",
        "Notion-Version": VERSION,
        "Content-Type": "application/json",
    }


async def create_page(title: str, blocks: list, parent_page_id: Optional[str] = None) -> dict:
    """POST /pages — creates a real page under the configured parent."""
    if not config.NOTION_API_KEY:
        return {"error": "Notion not configured"}
    parent = parent_page_id or config.NOTION_PARENT_PAGE_ID
    payload = {
        "parent": {"page_id": parent},
        "properties": {"title": {"title": [{"text": {"content": title[:200]}}]}},
        "children": blocks[:100],  # API limit: 100 blocks per request
    }
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.post(f"{BASE}/pages", headers=_headers(), json=payload,
                                 timeout=aiohttp.ClientTimeout(total=30)) as r:
                data = await r.json(content_type=None)
                log.info("create_page HTTP %s", r.status)
                if r.status != 200:
                    return {"error": data.get("message", f"HTTP {r.status}")}
                return data
    except Exception as e:
        return {"error": str(e)}


async def append_blocks(page_id: str, blocks: list) -> dict:
    """PATCH /blocks/{id}/children — for designs longer than 100 blocks."""
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.patch(f"{BASE}/blocks/{page_id}/children", headers=_headers(),
                                  json={"children": blocks[:100]},
                                  timeout=aiohttp.ClientTimeout(total=30)) as r:
                data = await r.json(content_type=None)
                if r.status != 200:
                    return {"error": data.get("message", f"HTTP {r.status}")}
                return data
    except Exception as e:
        return {"error": str(e)}


async def retrieve_page(page_id: str) -> dict:
    """GET /pages/{id} — VERIFY uses this to prove the page really exists."""
    if not config.NOTION_API_KEY:
        return {"error": "Notion not configured"}
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(f"{BASE}/pages/{page_id}", headers=_headers(),
                                timeout=aiohttp.ClientTimeout(total=15)) as r:
                data = await r.json(content_type=None)
                if r.status != 200:
                    return {"error": data.get("message", f"HTTP {r.status}")}
                return data
    except Exception as e:
        return {"error": str(e)}


# ── block helpers ─────────────────────────────────────────────────────────────
def _rt(text: str) -> list:
    return [{"type": "text", "text": {"content": str(text)[:2000]}}]


def heading(text: str, level: int = 2) -> dict:
    key = f"heading_{min(max(level, 1), 3)}"
    return {"object": "block", "type": key, key: {"rich_text": _rt(text)}}


def paragraph(text: str) -> dict:
    return {"object": "block", "type": "paragraph", "paragraph": {"rich_text": _rt(text)}}


def bullet(text: str) -> dict:
    return {"object": "block", "type": "bulleted_list_item",
            "bulleted_list_item": {"rich_text": _rt(text)}}


def divider() -> dict:
    return {"object": "block", "type": "divider", "divider": {}}


def todo(text: str) -> dict:
    return {"object": "block", "type": "to_do", "to_do": {"rich_text": _rt(text), "checked": False}}
