"""Fase 1 — bozza della storia (AI).

Generates the full story concept: character sheet (the anchor for visual
consistency across every page), 10-page breakdown with text + illustration
prompts, and a paste-ready Gemini Storybook prompt for the fast/free
validation draft.

Gemini Storybook is deliberately Phase-1-only: it produces a 10-page
illustrated digital story with audio narration in 45+ styles, but it cannot
export print-ready files — production happens in Phase 2 with other tools.
"""
import json
import os
import re
from datetime import datetime

SYSTEM = """You are a children's book author and art director.
Given a brief (age range, theme, hero), produce a complete book concept.
Output ONLY valid JSON:
{
  "title": "...",
  "logline": "one sentence",
  "moral": "what the child learns",
  "character_sheet": {
    "name": "...",
    "species_or_type": "...",
    "visual_description": "80-120 words: exact colors, proportions, clothing, distinguishing marks. This is the reference block pasted into EVERY illustration prompt to keep the character identical on all pages.",
    "personality": "..."
  },
  "art_style": "one of the classic children's illustration styles, described in 15-25 words",
  "pages": [
    {"page": 1, "text": "2-4 sentences, age-appropriate", "illustration_prompt": "scene description WITHOUT the character description (it gets prepended automatically)"}
  ]
}
Rules: exactly 10 pages, a clear arc (setup, small problem, attempts, resolution, warm ending), vocabulary matched to the age range."""


def _llm_client():
    try:
        from openai import OpenAI
    except ImportError:
        raise SystemExit("Run: pip install openai")
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise SystemExit("Set OPENAI_API_KEY (Groq key works, with "
                         "OPENAI_BASE_URL=https://api.groq.com/openai/v1).")
    return OpenAI(api_key=api_key,
                  base_url=os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1"))


def _extract_json(text: str) -> dict:
    text = re.sub(r"```(?:json)?", "", text).strip()
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        m = re.search(r"\{.*\}", text, re.DOTALL)
        if m:
            return json.loads(m.group(0))
        raise SystemExit(f"Model did not return JSON:\n{text[:400]}")


def generate(book: dict) -> dict:
    client = _llm_client()
    model = os.getenv("QUALITY_MODEL", "llama-3.3-70b-versatile")
    brief = book["brief"]
    resp = client.chat.completions.create(
        model=model,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content":
                f"Age range: {brief['age_range']}. Theme: {brief['theme']}. "
                f"Hero: {brief['hero']}. Working title: {book['title']}."},
        ],
        max_tokens=3500,
        temperature=0.8,
    )
    concept = _extract_json(resp.choices[0].message.content or "")
    concept["generated_at"] = datetime.now().isoformat()
    concept["gemini_storybook_prompt"] = gemini_prompt(book, concept)
    return concept


def gemini_prompt(book: dict, concept: dict) -> str:
    """Paste-ready brief for Gemini Storybook (Phase 1 validation draft)."""
    ch = concept.get("character_sheet", {})
    return (
        f"Create a children's storybook for ages {book['brief']['age_range']}.\n"
        f"Title: {concept.get('title', book['title'])}\n"
        f"Hero: {ch.get('name', '')} — {ch.get('visual_description', '')}\n"
        f"Story: {concept.get('logline', '')} The child should learn: "
        f"{concept.get('moral', '')}\n"
        f"Art style: {concept.get('art_style', 'soft watercolor')}\n"
        f"Tone: warm, gentle, age-appropriate."
    )


def consistent_prompt(concept: dict, page: dict) -> str:
    """Full illustration prompt for one page: character reference block +
    scene. Use with Midjourney --cref, Neolemon, or Book Bolt's Character
    Appearance step to keep the hero identical on every page."""
    ch = concept.get("character_sheet", {})
    return (f"{ch.get('visual_description', '')}. "
            f"Art style: {concept.get('art_style', '')}. "
            f"Scene: {page.get('illustration_prompt', '')}")


def to_markdown(book: dict) -> str:
    """Human-readable concept dump (concept.md next to the catalog entry)."""
    c = book.get("concept") or {}
    ch = c.get("character_sheet", {})
    lines = [
        f"# {c.get('title', book['title'])}",
        "",
        f"*{c.get('logline', '')}*",
        "",
        f"**Age range:** {book['brief']['age_range']}  ",
        f"**Moral:** {c.get('moral', '')}  ",
        f"**Art style:** {c.get('art_style', '')}",
        "",
        "## Character sheet (paste into every illustration prompt)",
        "",
        f"**{ch.get('name', '')}** ({ch.get('species_or_type', '')})",
        "",
        ch.get("visual_description", ""),
        "",
        "## Gemini Storybook prompt (Fase 1 — validation draft)",
        "",
        "```",
        c.get("gemini_storybook_prompt", ""),
        "```",
        "",
        "## Pages",
        "",
    ]
    for page in c.get("pages", []):
        lines += [
            f"### Page {page.get('page')}",
            "",
            page.get("text", ""),
            "",
            f"> **Illustration:** {consistent_prompt(c, page)}",
            "",
        ]
    return "\n".join(lines)
