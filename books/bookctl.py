#!/usr/bin/env python3
"""bookctl — children's book pipeline CLI (Processo 2).

Fasi:  1 concept (AI draft)  ->  2 spec (print-ready production)
       ->  3 checklist/status (per-platform publishing)
       ->  4 sales (weekly log)  ->  5 advise (next book vs sequel)

Examples:
  ./bookctl.py new "Luna the Brave Firefly" --age 3-5 --theme courage --hero "a small firefly"
  ./bookctl.py concept luna-the-brave-firefly
  ./bookctl.py spec luna-the-brave-firefly --trim 8.5x8.5 --pages 24 --paper premium-color
  ./bookctl.py checklist luna-the-brave-firefly --platform kdp
  ./bookctl.py status luna-the-brave-firefly --platform kdp --set in_review
  ./bookctl.py sales luna-the-brave-firefly --week 2026-W27 --platform kdp --units 3 --revenue 20.97
  ./bookctl.py advise
"""
import argparse
import json
from datetime import datetime

import catalog
import concept as concept_mod
import platforms as platforms_mod
import production


def cmd_new(args):
    book = catalog.create(args.title, args.age, args.theme, args.hero)
    print(f"Created '{book['title']}' (slug: {book['slug']})")
    print(f"Next: ./bookctl.py concept {book['slug']}")


def cmd_list(_args):
    books = catalog.all_books()
    if not books:
        print("Catalog is empty. Start with: ./bookctl.py new \"Title\" --age 3-5 "
              "--theme ... --hero ...")
        return
    for b in books:
        pub = sum(1 for p in b["platforms"].values() if p["status"] == "published")
        print(f"  {b['slug']:<40} fase {b['phase']}  "
              f"published {pub}/{len(b['platforms'])}  {b['title']}")


def cmd_show(args):
    print(json.dumps(catalog.load(args.slug), indent=2, ensure_ascii=False))


def cmd_concept(args):
    book = catalog.load(args.slug)
    print("Generating story concept (quality LLM)...")
    book["concept"] = concept_mod.generate(book)
    book["phase"] = max(book["phase"], 1)
    catalog.save(book)
    md_path = catalog.DATA_DIR / f"{book['slug']}.concept.md"
    md_path.write_text(concept_mod.to_markdown(book))
    print(f"Concept saved. Readable version: {md_path}")
    print("\n── Gemini Storybook prompt (paste it for the Fase-1 validation draft) ──\n")
    print(book["concept"]["gemini_storybook_prompt"])
    print("\nRemember: Storybook output is digital-only — production happens in Fase 2.")


def cmd_spec(args):
    book = catalog.load(args.slug)
    s = production.spec(trim=args.trim, pages=args.pages, paper=args.paper)
    book["production"] = {"spec": s, "generated_at": datetime.now().isoformat()}
    book["phase"] = max(book["phase"], 2)
    catalog.save(book)
    print(f"── Production spec: {book['title']} ──")
    print(f"  Trim {s['trim']} ({s['trim_note']})")
    print(f"  {s['pages']} pages, {s['paper']}, {s['dpi']} DPI")
    print(f"  Spine: {s['spine_width_in']}\" "
          f"({'text allowed' if s['spine_text_allowed'] else 'no spine text'})")
    print(f"  Interior page: {s['interior_page_size_in']['w']}\" x "
          f"{s['interior_page_size_in']['h']}\" "
          f"= {s['interior_page_size_px']['w']}x{s['interior_page_size_px']['h']} px")
    print(f"  Cover full-wrap: {s['cover_fullwrap_in']['w']}\" x "
          f"{s['cover_fullwrap_in']['h']}\" "
          f"= {s['cover_fullwrap_px']['w']}x{s['cover_fullwrap_px']['h']} px")
    print("\n  Deliverables:")
    for d in s["deliverables"]:
        print(f"   • {d}")
    print("\n── Book Bolt checklist ──")
    for i, step in enumerate(production.book_bolt_checklist(book, s), 1):
        print(f"  {i}. {step}")


def cmd_checklist(args):
    book = catalog.load(args.slug)
    c = platforms_mod.checklist(args.platform)
    print(f"── {c['name']} — {book['title']} ──")
    print(f"  Review: {c['review']}")
    for i, step in enumerate(c["steps"], 1):
        print(f"  {i}. {step}")
    st = book["platforms"][args.platform]
    print(f"\n  Current status: {st['status']}"
          + (f" ({st['url']})" if st["url"] else ""))


def cmd_status(args):
    book = catalog.load(args.slug)
    if args.set:
        if args.set not in catalog.PLATFORM_STATUSES:
            raise SystemExit(f"Status must be one of: {', '.join(catalog.PLATFORM_STATUSES)}")
        entry = book["platforms"][args.platform]
        entry["status"] = args.set
        entry["updated_at"] = datetime.now().isoformat()
        if args.url:
            entry["url"] = args.url
        if args.set == "published":
            book["phase"] = max(book["phase"], 3)
        catalog.save(book)
    for p, entry in book["platforms"].items():
        print(f"  {p:<10} {entry['status']:<12} {entry.get('url', '')}")


def cmd_sales(args):
    book = catalog.load(args.slug)
    book["sales_log"].append({
        "week": args.week, "platform": args.platform,
        "units": args.units, "revenue": args.revenue,
        "logged_at": datetime.now().isoformat(),
    })
    book["phase"] = max(book["phase"], 4)
    catalog.save(book)
    total = sum(e["revenue"] for e in book["sales_log"])
    print(f"Logged. {book['title']}: {len(book['sales_log'])} entries, "
          f"total revenue {total:.2f}")


def cmd_advise(_args):
    """Fase 5 — decisione: nuovo libro (nuova fascia/tema) o sequel/serie?"""
    books = catalog.all_books()
    if not books:
        raise SystemExit("Catalog is empty — nothing to analyze yet.")
    client = concept_mod._llm_client()
    import os
    payload = [{"title": b["title"], "brief": b["brief"],
                "platforms": {p: e["status"] for p, e in b["platforms"].items()},
                "sales_log": b["sales_log"][-12:]} for b in books]
    resp = client.chat.completions.create(
        model=os.getenv("QUALITY_MODEL", "llama-3.3-70b-versatile"),
        messages=[
            {"role": "system", "content":
                "You advise a children's book micro-publisher. Given the catalog with "
                "weekly sales per platform, recommend the next move: a NEW book "
                "(new age band or theme) or a SEQUEL/series with an existing character. "
                "Be concrete: name the character or the new theme, and say why in "
                "under 120 words."},
            {"role": "user", "content": json.dumps(payload, ensure_ascii=False)[:6000]},
        ],
        max_tokens=400,
    )
    print(resp.choices[0].message.content)


def main():
    ap = argparse.ArgumentParser(description=__doc__,
                                 formatter_class=argparse.RawDescriptionHelpFormatter)
    sub = ap.add_subparsers(dest="cmd", required=True)

    p = sub.add_parser("new", help="Fase 0: create a book from a brief")
    p.add_argument("title")
    p.add_argument("--age", required=True, help="e.g. 3-5")
    p.add_argument("--theme", required=True)
    p.add_argument("--hero", required=True)
    p.set_defaults(fn=cmd_new)

    p = sub.add_parser("list", help="show the catalog")
    p.set_defaults(fn=cmd_list)

    p = sub.add_parser("show", help="dump one book's full JSON")
    p.add_argument("slug")
    p.set_defaults(fn=cmd_show)

    p = sub.add_parser("concept", help="Fase 1: AI story concept + Gemini Storybook prompt")
    p.add_argument("slug")
    p.set_defaults(fn=cmd_concept)

    p = sub.add_parser("spec", help="Fase 2: print-ready production spec + Book Bolt checklist")
    p.add_argument("slug")
    p.add_argument("--trim", default="8.5x8.5", choices=list(production.TRIM_SIZES))
    p.add_argument("--pages", type=int, default=24)
    p.add_argument("--paper", default="premium-color",
                   choices=list(production.PAPER_THICKNESS_IN))
    p.set_defaults(fn=cmd_spec)

    p = sub.add_parser("checklist", help="Fase 3: publishing checklist for one platform")
    p.add_argument("slug")
    p.add_argument("--platform", required=True, choices=catalog.PLATFORMS)
    p.set_defaults(fn=cmd_checklist)

    p = sub.add_parser("status", help="Fase 3: view/update per-platform status")
    p.add_argument("slug")
    p.add_argument("--platform", choices=catalog.PLATFORMS)
    p.add_argument("--set", choices=catalog.PLATFORM_STATUSES)
    p.add_argument("--url", default="")
    p.set_defaults(fn=cmd_status)

    p = sub.add_parser("sales", help="Fase 4: log weekly sales")
    p.add_argument("slug")
    p.add_argument("--week", required=True, help="e.g. 2026-W27")
    p.add_argument("--platform", required=True, choices=catalog.PLATFORMS)
    p.add_argument("--units", type=int, required=True)
    p.add_argument("--revenue", type=float, required=True)
    p.set_defaults(fn=cmd_sales)

    p = sub.add_parser("advise", help="Fase 5: AI decision — new book or sequel/series")
    p.set_defaults(fn=cmd_advise)

    args = ap.parse_args()
    if args.cmd == "status" and args.set and not args.platform:
        ap.error("--set requires --platform")
    args.fn(args)


if __name__ == "__main__":
    main()
