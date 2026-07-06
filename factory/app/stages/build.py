"""BUILD — the first amber box of the workflow diagram: "genera file reale".

This is THE stage the old pipeline was missing. The model's design used to
stay text inside the LLM response; nothing ever called notion.pages.create()
or wb.save(), so Gumroad ended up with drafts that had no document attached.

Here every vertical produces a REAL file on disk (and, for notion, a real page
in the workspace via the API). Any failure is a hard failure with retries —
never a warning that lets the product continue empty-handed.
"""
import logging
from datetime import datetime

from .. import config
from ..builders import notion_builder, pdf_builder, xlsx_builder
from ..pipeline import pipeline

log = logging.getLogger("factory.build")


def _artifact_dir(product: dict):
    d = config.ARTIFACTS_DIR / product["id"]
    d.mkdir(parents=True, exist_ok=True)
    return d


def _safe_filename(title: str, ext: str) -> str:
    import re
    stem = re.sub(r"[^a-zA-Z0-9_\-]", "_", title[:40]).strip("_") or "template"
    return f"{stem}.{ext}"


async def run(product: dict) -> bool:
    design = product.get("design") or {}
    copy = product.get("copy") or {}
    title = (copy.get("title")
             or (product.get("research") or {}).get("product_name")
             or "Digital Template").strip()
    out_dir = _artifact_dir(product)
    artifacts = []
    notion_page_id = None

    try:
        if product["vertical"] == "finance":
            path = xlsx_builder.build_xlsx(
                out_dir / _safe_filename(title, "xlsx"), title=title, spec=design)
            artifacts.append({
                "path": str(path), "kind": "xlsx", "filename": path.name,
                "content_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            })

        elif product["vertical"] == "notion":
            # Real page in the Notion workspace (when the integration is configured)
            notion_page_id = await notion_builder.build_notion_page(title, design)
            # The sellable download: PDF setup guide with the full structure
            sections = [{"heading": "Template structure & setup guide",
                         "content": _notion_guide_text(design)}]
            for page in (design.get("pages") or []):
                sections.append({"heading": page.get("title", ""),
                                 "content": page.get("description", "")})
            path = pdf_builder.build_pdf(
                out_dir / _safe_filename(title, "pdf"),
                title=title, tagline=design.get("tagline", ""),
                sections=sections, features=design.get("key_features"))
            artifacts.append({"path": str(path), "kind": "pdf", "filename": path.name,
                              "content_type": "application/pdf"})

        else:  # business
            sections = design.get("sections") or []
            if not sections:
                raise ValueError("design spec has no sections")
            path = pdf_builder.build_pdf(
                out_dir / _safe_filename(title, "pdf"),
                title=title, tagline=design.get("tagline", ""),
                sections=sections, features=design.get("key_features"))
            artifacts.append({"path": str(path), "kind": "pdf", "filename": path.name,
                              "content_type": "application/pdf"})

    except Exception as e:
        p = pipeline.get(product["id"])
        attempts = (p.get("build_attempts", 0) if p else 0) + 1
        if p:
            p["build_attempts"] = attempts
            pipeline.save()
        if attempts >= config.MAX_BUILD_ATTEMPTS:
            pipeline.fail(product["id"], "BUILD_ERROR",
                          f"build failed {attempts}x: {e}")
        else:
            pipeline.retry_later(product["id"], 5 * attempts, f"build failed: {e}")
        return False

    pipeline.advance(product["id"], "build", {
        "artifacts": artifacts,
        "notion_page_id": notion_page_id,
        "built_at": datetime.now().isoformat(),
    })
    return True


def _notion_guide_text(design: dict) -> str:
    lines = ["This template includes the following structure. "
             "Duplicate the shared Notion link (or rebuild in minutes with this guide)."]
    for step in (design.get("setup_steps") or []):
        lines.append(f"• {step}")
    return "\n".join(lines)
