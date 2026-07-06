"""Self-hosted SearXNG search (RESEARCH stage demand signals)."""
import aiohttp

from .. import config


async def search(query: str) -> str:
    try:
        async with aiohttp.ClientSession() as sess:
            async with sess.get(
                f"{config.SEARXNG_URL}/search",
                params={"q": query, "format": "json", "language": "en"},
                timeout=aiohttp.ClientTimeout(total=15),
            ) as r:
                data = await r.json(content_type=None)
                results = data.get("results", [])[:5]
                return "\n".join(
                    f"- {res.get('title', '')}: {res.get('content', '')[:150]}"
                    for res in results
                ) or "No results found."
    except Exception as e:
        return f"[Search error: {e}]"
