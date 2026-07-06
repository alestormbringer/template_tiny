"""Two-tier LLM access (Groq, OpenAI-compatible) + robust JSON extraction."""
import json
import logging
import re
from typing import Optional

from openai import AsyncOpenAI

from . import config

log = logging.getLogger("factory.llm")

client = AsyncOpenAI(api_key=config.LLM_API_KEY or "missing", base_url=config.LLM_BASE_URL)


async def complete(system: str, user: str, *, quality: bool = False, max_tokens: int = 1500) -> str:
    model = config.QUALITY_MODEL if quality else config.FAST_MODEL
    resp = await client.chat.completions.create(
        model=model,
        messages=[{"role": "system", "content": system},
                  {"role": "user", "content": user}],
        max_tokens=max_tokens,
        temperature=0.7,
    )
    return (resp.choices[0].message.content or "").strip()


def extract_json(text: str) -> Optional[dict]:
    """Pull the first JSON object out of an LLM reply (handles ``` fences and prose)."""
    if not text:
        return None
    text = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    # Fall back to the outermost {...} block
    depth, start = 0, -1
    for i, ch in enumerate(text):
        if ch == "{":
            if depth == 0:
                start = i
            depth += 1
        elif ch == "}":
            depth -= 1
            if depth == 0 and start >= 0:
                try:
                    return json.loads(text[start:i + 1])
                except json.JSONDecodeError:
                    start = -1
    return None


async def complete_json(system: str, user: str, *, quality: bool = False,
                        max_tokens: int = 1500, retries: int = 2) -> Optional[dict]:
    """complete() + extract_json() with retries; returns None if the model never yields JSON."""
    for attempt in range(retries + 1):
        raw = await complete(system, user, quality=quality, max_tokens=max_tokens)
        data = extract_json(raw)
        if data:
            return data
        log.warning("JSON extraction failed (attempt %d/%d): %.120s", attempt + 1, retries + 1, raw)
    return None
