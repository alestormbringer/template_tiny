"""
recover_gumroad_drafts.py

Fetches all unpublished (draft) products from Gumroad and shows which ones
match products already tracked in pipeline.json.

Usage:
    GUMROAD_API_KEY=xxx python scripts/recover_gumroad_drafts.py

Options:
    --delete     Delete drafts from Gumroad after listing (USE WITH CAUTION)
    --repair     Call /pipeline/repair to reset PUBLISH_ERROR products for retry
    --base-url   Base URL of the running agents service (default: http://localhost:3778)
"""
import argparse
import json
import os
import sys
import urllib.request
import urllib.parse


GUMROAD_KEY = os.getenv("GUMROAD_API_KEY", "")
BASE_URL    = os.getenv("AGENTS_URL", "http://localhost:3778")


def gumroad_request(method: str, path: str, data: dict = None):
    url     = f"https://api.gumroad.com/v2{path}"
    headers = {"Authorization": f"Bearer {GUMROAD_KEY}"}
    body    = None
    if data:
        body    = urllib.parse.urlencode(data).encode()
        headers["Content-Type"] = "application/x-www-form-urlencoded"
    req  = urllib.request.Request(url, data=body, headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=20) as resp:
        return json.loads(resp.read())


def agents_request(method: str, path: str, data: dict = None):
    url     = f"{BASE_URL}{path}"
    headers = {"Content-Type": "application/json"}
    body    = json.dumps(data or {}).encode()
    req     = urllib.request.Request(url, data=body if method != "GET" else None,
                                      headers=headers, method=method)
    with urllib.request.urlopen(req, timeout=15) as resp:
        return json.loads(resp.read())


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--delete",   action="store_true", help="Delete drafts from Gumroad")
    parser.add_argument("--repair",   action="store_true", help="Trigger /pipeline/repair")
    parser.add_argument("--base-url", default=BASE_URL,    help="Agents base URL")
    args = parser.parse_args()

    if not GUMROAD_KEY:
        print("ERROR: set GUMROAD_API_KEY env var", file=sys.stderr)
        sys.exit(1)

    global BASE_URL
    BASE_URL = args.base_url

    print("=== Fetching Gumroad products ===")
    try:
        resp     = gumroad_request("GET", "/products")
        products = resp.get("products", [])
    except Exception as e:
        print(f"ERROR fetching Gumroad products: {e}", file=sys.stderr)
        sys.exit(1)

    drafts     = [p for p in products if not p.get("published")]
    published  = [p for p in products if p.get("published")]

    print(f"Total Gumroad products : {len(products)}")
    print(f"  Published            : {len(published)}")
    print(f"  Unpublished (drafts) : {len(drafts)}")
    print()

    if not drafts:
        print("No drafts found on Gumroad.")
    else:
        print("--- DRAFT PRODUCTS ---")
        for p in drafts:
            print(f"  id={p['id']}  name={p.get('name','?')!r:50s}  "
                  f"price={p.get('price',0)/100:.2f}  "
                  f"url={p.get('short_url','')}")
        print()

    # Try to cross-reference with pipeline
    try:
        diag = agents_request("GET", "/pipeline/diagnose")
        draft_only = diag.get("gumroad_draft_only", [])
        errors     = diag.get("publish_errors", [])
        stuck      = diag.get("stuck", [])

        print("=== Pipeline diagnosis ===")
        print(f"  Done             : {diag['summary']['done']}")
        print(f"  Active           : {len(diag['in_progress'])}")
        print(f"  Stuck assigned   : {len(stuck)}")
        print(f"  PUBLISH_ERROR    : {len(errors)}")
        print(f"  Gumroad draft    : {len(draft_only)}  (created on GR but never published)")
        print()

        if draft_only:
            print("--- Products with Gumroad draft but never published ---")
            for p in draft_only:
                print(f"  pipeline_id={p['id']}  gumroad_id={p['gumroad_id']}  "
                      f"title={p['title']!r:50s}  attempts={p['publish_attempts']}")
            print()

        if errors:
            print("--- PUBLISH_ERROR products (3 failed attempts) ---")
            for p in errors:
                print(f"  pipeline_id={p['id']}  gumroad_id={p.get('gumroad_id','none')}  "
                      f"title={p['title']!r}")
            print()

        if stuck:
            print("--- Stuck/assigned products ---")
            for p in stuck:
                print(f"  pipeline_id={p['id']}  stage={p['stage']}  "
                      f"updated_at={p['updated_at']}")
            print()

    except Exception as e:
        print(f"WARNING: Could not reach pipeline API at {BASE_URL}: {e}")
        print("(make sure the agents container is running)")
        print()

    # Repair
    if args.repair:
        print("=== Running /pipeline/repair ===")
        try:
            result = agents_request("POST", "/pipeline/repair")
            print(f"Repaired {result['count']} products:")
            for r in result["repaired"]:
                print(f"  {r['id']}: {r['action']}")
        except Exception as e:
            print(f"ERROR calling /pipeline/repair: {e}")
        print()

    # Delete drafts
    if args.delete:
        if not drafts:
            print("Nothing to delete.")
        else:
            confirm = input(f"Delete {len(drafts)} drafts from Gumroad? [yes/N]: ").strip()
            if confirm.lower() == "yes":
                for p in drafts:
                    try:
                        gumroad_request("DELETE", f"/products/{p['id']}")
                        print(f"  Deleted {p['id']} — {p.get('name','?')}")
                    except Exception as e:
                        print(f"  ERROR deleting {p['id']}: {e}")
            else:
                print("Deletion cancelled.")


if __name__ == "__main__":
    main()
