"""Real Notion template creation via the Notion API.

Turns the DESIGN-stage JSON spec into an actual page tree in the configured
workspace (pages.create), and returns the created page id so VERIFY can prove
it exists. The sellable download for the notion vertical is a PDF setup guide
built separately by pdf_builder — this module covers the live-workspace half.

Note: the Notion API cannot enable public "Share to web" — after the pipeline
creates the master page, making it a public duplicate-able template is a
one-click manual step in the Notion UI.
"""
import logging
from typing import Optional

from ..integrations import notion

log = logging.getLogger("factory.notion_builder")


def _spec_to_blocks(spec: dict) -> list:
    """Flatten the design spec into Notion blocks (pages, databases, views...)."""
    blocks: list = []
    tagline = spec.get("tagline") or spec.get("description")
    if tagline:
        blocks.append(notion.paragraph(tagline))
        blocks.append(notion.divider())

    for page in (spec.get("pages") or []):
        blocks.append(notion.heading(page.get("title", "Untitled page"), 1))
        if page.get("description"):
            blocks.append(notion.paragraph(page["description"]))
        for db in (page.get("databases") or []):
            blocks.append(notion.heading(f"Database: {db.get('name', 'Untitled')}", 2))
            if db.get("description"):
                blocks.append(notion.paragraph(db["description"]))
            for prop in (db.get("properties") or []):
                if isinstance(prop, dict):
                    name = prop.get("name", "?")
                    ptype = prop.get("type", "text")
                    extra = f" — {prop.get('formula')}" if prop.get("formula") else ""
                    blocks.append(notion.bullet(f"{name} ({ptype}){extra}"))
                else:
                    blocks.append(notion.bullet(str(prop)))
            for view in (db.get("views") or []):
                blocks.append(notion.bullet(f"View: {view}"))
        for section in (page.get("sections") or []):
            if isinstance(section, dict):
                blocks.append(notion.heading(section.get("title", ""), 2))
                if section.get("content"):
                    blocks.append(notion.paragraph(section["content"]))
            else:
                blocks.append(notion.bullet(str(section)))

    for step in (spec.get("setup_steps") or []):
        blocks.append(notion.todo(str(step)))
    return blocks


async def build_notion_page(title: str, spec: dict) -> Optional[str]:
    """Create the real page. Returns the page id, or raises on API error."""
    if not notion.configured():
        return None  # optional half: PDF guide alone is still a valid deliverable
    blocks = _spec_to_blocks(spec)
    if not blocks:
        raise ValueError("design spec produced no Notion blocks")
    resp = await notion.create_page(title, blocks[:100])
    if resp.get("error"):
        raise RuntimeError(f"Notion pages.create failed: {resp['error']}")
    page_id = resp.get("id")
    if not page_id:
        raise RuntimeError("Notion pages.create returned no page id")
    # Push any overflow past the 100-block per-request API limit
    rest = blocks[100:]
    while rest:
        chunk, rest = rest[:100], rest[100:]
        append = await notion.append_blocks(page_id, chunk)
        if append.get("error"):
            log.warning("append_blocks failed (page still valid): %s", append["error"])
            break
    log.info("Notion page created: %s", page_id)
    return page_id
