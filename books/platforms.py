"""Fase 3 — pubblicazione manuale per piattaforma.

Unlike the template factory there is no single convenient API here: KDP and
Apple Books require editorial review, the direct stores publish instantly.
Realistic human time: 10-15 minutes per platform for a new title, less for
updates. The KDP AI-content disclosure is a MANDATORY checkbox — accounts
have been suspended for skipping it.
"""

CHECKLISTS = {
    "kdp": {
        "name": "Amazon KDP",
        "review": "editorial review, typically 24-72h",
        "steps": [
            "kdp.amazon.com > Create > Paperback (and/or Kindle ebook for 6x9)",
            "Title, subtitle, author, description (use the Fase-1 logline + moral)",
            "⚠ MANDATORY: AI-content disclosure checkbox — declare that text and/or "
            "images are AI-generated. NOT optional: skipping it risks account suspension.",
            "Categories: Children's Books > age band; 7 backend keywords",
            "Upload interior.pdf and cover-fullwrap.pdf from Fase 2",
            "Launch Previewer: check bleed, margins, spine alignment page by page",
            "Price (check the printing-cost floor for color), territories, submit for review",
        ],
    },
    "apple": {
        "name": "Apple Books",
        "review": "Apple review via Apple Books for Authors portal",
        "steps": [
            "authors.apple.com (Apple Books for Authors) — requires Apple ID + tax/bank setup",
            "Upload book.epub (fixed-layout recommended for picture books)",
            "Cover: cover-front.jpg, min 1400px on the short side",
            "Metadata: title, series name if sequel, age range, description",
            "Submit for review and track status in the portal",
        ],
    },
    "gumroad": {
        "name": "Gumroad",
        "review": "instant, no editorial review",
        "steps": [
            "New product > Digital product; upload PDF (digital edition) + EPUB bundle",
            "Cover: cover-front.jpg; price tier $4-$8 typical for a single digital picture book",
            "Description from Fase-1 copy; enable 'pay what you want' above minimum if desired",
            "Publish — live immediately",
        ],
    },
    "sellfy": {
        "name": "Sellfy",
        "review": "instant, no editorial review",
        "steps": [
            "Products > Add new > Digital product; upload PDF + EPUB",
            "Cover image, description, price; assign to a 'Children's books' category",
            "Publish — live immediately",
        ],
    },
    "payhip": {
        "name": "Payhip",
        "review": "instant, no editorial review",
        "steps": [
            "Add product > Digital download; upload PDF + EPUB",
            "Cover, description, price; optional EU VAT handled by Payhip",
            "Publish — live immediately",
        ],
    },
}


def checklist(platform: str) -> dict:
    if platform not in CHECKLISTS:
        raise SystemExit(f"Unknown platform '{platform}'. "
                         f"Options: {', '.join(CHECKLISTS)}")
    return CHECKLISTS[platform]
