"""Real PDF generation with reportlab, written to disk.

CRITICAL (do not revert): every piece of LLM-generated text passed to
reportlab.Paragraph() must go through pdf_safe() — raw LLM output often
contains &, <, > and silently breaks PDF generation otherwise.
"""
import io
import logging
from pathlib import Path
from typing import Optional

log = logging.getLogger("factory.pdf")


def pdf_safe(text: str) -> str:
    return (str(text)
            .replace("&", "&amp;")
            .replace("<", "&lt;")
            .replace(">", "&gt;"))


def build_pdf(path: Path, *, title: str, tagline: str = "", description: str = "",
              sections: Optional[list] = None, features: Optional[list] = None,
              image_bytes: Optional[bytes] = None) -> Path:
    """Render the document and WRITE IT TO DISK. Raises on failure — the caller
    (BUILD stage) must treat any exception as a failed build, never as a warning."""
    from reportlab.lib import colors
    from reportlab.lib.pagesizes import letter
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import inch
    from reportlab.platypus import (HRFlowable, Image as RLImage, Paragraph,
                                    SimpleDocTemplate, Spacer)

    buf = io.BytesIO()
    doc = SimpleDocTemplate(buf, pagesize=letter,
                            rightMargin=72, leftMargin=72, topMargin=72, bottomMargin=72)
    styles = getSampleStyleSheet()
    accent = ParagraphStyle("accent", parent=styles["Normal"],
                            textColor=colors.HexColor("#2D3A8C"), fontSize=11)
    bullet = ParagraphStyle("bullet", parent=styles["Normal"], leftIndent=20, fontSize=10)
    story = []

    if image_bytes:
        try:
            story.append(RLImage(io.BytesIO(image_bytes), width=6 * inch, height=3.5 * inch))
            story.append(Spacer(1, 16))
        except Exception:
            pass  # cover is decorative; the document itself must still build

    story.append(Paragraph(pdf_safe(title), styles["Title"]))
    if tagline:
        story.append(Paragraph(pdf_safe(tagline), styles["Italic"]))
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#2D3A8C")))
    story.append(Spacer(1, 14))

    if sections:
        for section in sections:
            head = pdf_safe((section.get("heading") or "").strip())
            content = (section.get("content") or "").strip()
            if head:
                story.append(Paragraph(head, styles["Heading1"]))
            for line in content.split("\n"):
                line = line.strip()
                if not line:
                    story.append(Spacer(1, 4))
                elif line.startswith(("•", "-", "*")):
                    story.append(Paragraph(pdf_safe(line), bullet))
                else:
                    story.append(Paragraph(pdf_safe(line), styles["Normal"]))
            story.append(Spacer(1, 14))
    else:
        story.append(Paragraph("Overview", styles["Heading1"]))
        story.append(Paragraph(
            pdf_safe(description[:1200]) if description else "Professional digital template.",
            styles["Normal"]))
        story.append(Spacer(1, 14))
        if features:
            story.append(Paragraph("What's Included", styles["Heading1"]))
            for f in features:
                story.append(Paragraph(pdf_safe(f"• {f}"), accent))
            story.append(Spacer(1, 14))

    story.append(Spacer(1, 20))
    story.append(HRFlowable(width="100%", thickness=1, color=colors.lightgrey))
    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "Thank you for your purchase! Download and start using your template immediately.",
        styles["Normal"]))

    doc.build(story)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_bytes(buf.getvalue())
    log.info("PDF written: %s (%d bytes)", path, path.stat().st_size)
    return path
