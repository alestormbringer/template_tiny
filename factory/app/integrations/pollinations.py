"""Pollinations.ai cover image generation (free, no key, model=flux).

CRITICAL (do not revert): the prompt must be encoded with
urllib.parse.quote(prompt, safe=",-") — Pollinations requires %20 encoding.
Do NOT use .replace(" ", "+").
"""
import asyncio
import logging
import urllib.parse
from typing import Optional

import aiohttp

from .. import config

log = logging.getLogger("factory.pollinations")


async def generate_cover_image(image_prompt: str, seed: int = 42) -> Optional[bytes]:
    encoded = urllib.parse.quote(image_prompt[:300].strip(), safe=",-")
    url = (f"https://image.pollinations.ai/prompt/{encoded}"
           f"?width=1200&height=800&nologo=true&seed={seed}&model=flux")
    for attempt in range(3):
        try:
            async with aiohttp.ClientSession() as sess:
                async with sess.get(url, timeout=aiohttp.ClientTimeout(total=90)) as r:
                    if r.status == 200:
                        data = await r.read()
                        if len(data) > config.MIN_IMAGE_BYTES:
                            return data
                        log.warning("response too small (%d bytes), retry", len(data))
                    else:
                        log.warning("HTTP %s (attempt %d/3)", r.status, attempt + 1)
        except asyncio.TimeoutError:
            log.warning("timeout (attempt %d/3)", attempt + 1)
        except Exception as e:
            log.warning("image generation failed: %s", e)
            break
        await asyncio.sleep(5)
    return None
