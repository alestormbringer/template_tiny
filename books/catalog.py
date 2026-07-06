"""Book catalog storage — one JSON file per book under data/books/."""
import json
import re
from datetime import datetime
from pathlib import Path

DATA_DIR = Path(__file__).resolve().parent.parent / "data" / "books"

PLATFORMS = ["kdp", "apple", "gumroad", "sellfy", "payhip"]
PLATFORM_STATUSES = ["todo", "draft", "in_review", "published", "rejected"]


def slugify(title: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", title.lower()).strip("-")
    return slug[:60] or "untitled"


def _path(slug: str) -> Path:
    return DATA_DIR / f"{slug}.json"


def create(title: str, age_range: str, theme: str, hero: str) -> dict:
    slug = slugify(title)
    if _path(slug).exists():
        raise SystemExit(f"A book with slug '{slug}' already exists.")
    book = {
        "slug": slug,
        "title": title,
        "brief": {"age_range": age_range, "theme": theme, "hero": hero},
        "created_at": datetime.now().isoformat(),
        "phase": 1,
        "concept": None,
        "production": None,
        "platforms": {p: {"status": "todo", "url": "", "updated_at": ""}
                      for p in PLATFORMS},
        "sales_log": [],   # weekly entries: {"week", "platform", "units", "revenue"}
        "series": {"is_sequel_of": None, "character_locked": False},
    }
    save(book)
    return book


def load(slug: str) -> dict:
    p = _path(slug)
    if not p.exists():
        raise SystemExit(f"No book '{slug}'. Run 'bookctl.py list' to see the catalog.")
    return json.loads(p.read_text())


def save(book: dict):
    DATA_DIR.mkdir(parents=True, exist_ok=True)
    _path(book["slug"]).write_text(json.dumps(book, indent=2, ensure_ascii=False))


def all_books() -> list:
    if not DATA_DIR.exists():
        return []
    return sorted((json.loads(f.read_text()) for f in DATA_DIR.glob("*.json")),
                  key=lambda b: b.get("created_at", ""))
