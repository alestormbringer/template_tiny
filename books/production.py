"""Fase 2 — produzione print-ready.

Gemini Storybook stops at a digital draft: no print-order option, no
print-resolution export, no trim-size control. This module computes the real
KDP production spec (trim, bleed, spine, full-wrap cover) and emits the
Book Bolt step checklist plus the deliverables list (interior PDF, cover PDF,
EPUB) needed before Phase 3.
"""

# KDP paper thickness per page (inches) — official KDP cover calculator values
PAPER_THICKNESS_IN = {
    "bw-white":       0.002252,
    "bw-cream":       0.0025,
    "standard-color": 0.002252,
    "premium-color":  0.002347,   # the usual choice for picture books
}

TRIM_SIZES = {
    # (width, height) inches, and where the format can be sold
    "6x9":     {"w": 6.0, "h": 9.0,  "note": "compatible with BOTH print and Kindle ebook"},
    "8.5x8.5": {"w": 8.5, "h": 8.5,  "note": "print only — the classic square picture-book look"},
    "8x10":    {"w": 8.0, "h": 10.0, "note": "print only — large illustrated format"},
}

BLEED_IN = 0.125          # KDP bleed on each outside edge
MIN_PAGES = 24            # KDP paperback minimum
SPINE_TEXT_MIN_PAGES = 100  # KDP allows spine text only from ~100 pages
DPI = 300                 # minimum print resolution


def spec(trim: str = "8.5x8.5", pages: int = 24, paper: str = "premium-color") -> dict:
    if trim not in TRIM_SIZES:
        raise SystemExit(f"Unknown trim '{trim}'. Options: {', '.join(TRIM_SIZES)}")
    if paper not in PAPER_THICKNESS_IN:
        raise SystemExit(f"Unknown paper '{paper}'. Options: {', '.join(PAPER_THICKNESS_IN)}")
    if pages < MIN_PAGES:
        raise SystemExit(f"KDP paperbacks need at least {MIN_PAGES} pages (got {pages}).")
    if pages % 2:
        pages += 1  # page count must be even; KDP adds a blank page anyway

    t = TRIM_SIZES[trim]
    spine = round(pages * PAPER_THICKNESS_IN[paper], 4)
    cover_w = round(BLEED_IN + t["w"] + spine + t["w"] + BLEED_IN, 4)
    cover_h = round(t["h"] + 2 * BLEED_IN, 4)
    interior_w = round(t["w"] + BLEED_IN, 4)          # bleed on outside edge only
    interior_h = round(t["h"] + 2 * BLEED_IN, 4)

    return {
        "trim": trim, "trim_note": t["note"],
        "pages": pages, "paper": paper, "dpi": DPI,
        "spine_width_in": spine,
        "spine_text_allowed": pages >= SPINE_TEXT_MIN_PAGES,
        "interior_page_size_in": {"w": interior_w, "h": interior_h},
        "interior_page_size_px": {"w": round(interior_w * DPI), "h": round(interior_h * DPI)},
        "cover_fullwrap_in": {"w": cover_w, "h": cover_h},
        "cover_fullwrap_px": {"w": round(cover_w * DPI), "h": round(cover_h * DPI)},
        "deliverables": [
            "interior.pdf — full-bleed interior, fonts embedded, images 300 DPI",
            "cover-fullwrap.pdf — back + spine + front in one PDF (print)",
            "cover-front.jpg — front only, for ebook stores and thumbnails",
            "book.epub — reflowable or fixed-layout, for Apple Books and direct stores",
        ],
    }


def book_bolt_checklist(book: dict, s: dict) -> list:
    """Book Bolt guided path: Story Parameters -> Character Appearance -> Generate."""
    ch = ((book.get("concept") or {}).get("character_sheet") or {})
    return [
        f"Book Bolt > Create > Story Parameters: age {book['brief']['age_range']}, "
        f"theme '{book['brief']['theme']}', {s['pages']} pages, trim {s['trim']}",
        f"Character Appearance: paste the character sheet for '{ch.get('name', 'the hero')}' "
        f"so the face/colors stay LOCKED on every page",
        "Generate Content: review page by page against the Fase-1 concept "
        "(keep the arc, fix any vocabulary above the age range)",
        f"Layout: verify bleed {BLEED_IN}\" and KDP safe margins are on "
        f"(Book Bolt handles them automatically — just don't override)",
        f"Export interior PDF at {DPI} DPI "
        f"({s['interior_page_size_px']['w']}x{s['interior_page_size_px']['h']} px per page)",
        f"Cover: full-wrap {s['cover_fullwrap_in']['w']}\" x {s['cover_fullwrap_in']['h']}\" "
        f"(spine {s['spine_width_in']}\"" +
        (", spine text allowed)" if s["spine_text_allowed"]
         else f" — NO spine text under {SPINE_TEXT_MIN_PAGES} pages)"),
        "Alternative for the cover only: KDPEasy (original AI artwork, "
        "full-wrap PDF ready for upload, avoids Book Bolt's recycled templates)",
        "Alternative for character consistency with your own prompts: "
        "Midjourney --cref with a fixed reference image, or Neolemon",
        "Export EPUB (fixed-layout) for Apple Books / direct stores",
    ]
