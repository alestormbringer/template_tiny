"""Central configuration for the template factory (Process 1)."""
import os
from pathlib import Path

# ── LLM (Groq cloud, OpenAI-compatible) ──────────────────────────────────────
LLM_BASE_URL  = os.getenv("OPENAI_BASE_URL", "https://api.groq.com/openai/v1")
LLM_API_KEY   = os.getenv("OPENAI_API_KEY", "")
FAST_MODEL    = os.getenv("FAST_MODEL",    os.getenv("OLLAMA_MODEL",         "llama-3.1-8b-instant"))
QUALITY_MODEL = os.getenv("QUALITY_MODEL", os.getenv("OLLAMA_QUALITY_MODEL", "llama-3.3-70b-versatile"))

# ── Marketplaces ─────────────────────────────────────────────────────────────
GUMROAD_API_KEY    = os.getenv("GUMROAD_API_KEY", "")
ETSY_API_KEY       = os.getenv("ETSY_API_KEY", "")
ETSY_SHOP_ID       = os.getenv("ETSY_SHOP_ID", "")
ETSY_ACCESS_TOKEN  = os.getenv("ETSY_ACCESS_TOKEN", "")
ETSY_REFRESH_TOKEN = os.getenv("ETSY_REFRESH_TOKEN", "")

# ── Notion (optional) ────────────────────────────────────────────────────────
# When both are set, notion-vertical products also create a REAL page tree in
# the workspace via the API (in addition to the PDF setup guide that is always
# built and sold as the downloadable file).
NOTION_API_KEY        = os.getenv("NOTION_API_KEY", "")
NOTION_PARENT_PAGE_ID = os.getenv("NOTION_PARENT_PAGE_ID", "")

# ── Search ───────────────────────────────────────────────────────────────────
SEARXNG_URL = os.getenv("SEARXNG_BASE_URL", "http://searxng:8080")

# ── Persistent state (agents-data docker volume) ─────────────────────────────
WORKSPACE     = Path(os.getenv("WORKSPACE_DIR", "/root/workspace"))
ARTIFACTS_DIR = WORKSPACE / "artifacts"
REPORTS_DIR   = WORKSPACE / "reports"
PIPELINE_FILE = WORKSPACE / "pipeline_v2.json"   # v2: never clobber the legacy pipeline.json

# ── Pipeline shape ───────────────────────────────────────────────────────────
VERTICALS = ["notion", "finance", "business"]

# BUILD and VERIFY are the two stages the old pipeline was missing: the LLM
# design used to stay text-only until publish time, where a PDF was generated
# best-effort and the product was published even when the file was missing.
# Now nothing reaches PUBLISH without a verified artifact on disk.
# PUBLISH creates the marketplace draft + uploads the verified file;
# RELEASE flips it live (automatically, or after human approval — see AUTO_PUBLISH).
STAGES = ["RESEARCH", "DESIGN", "COPYWRITING", "BUILD", "VERIFY", "IMAGE",
          "PUBLISH", "RELEASE", "DONE"]
ERROR_STAGES = ["BUILD_ERROR", "PUBLISH_ERROR"]

# Fase 3 of the workflow diagram is a ~60s human step. With AUTO_PUBLISH=false
# the pipeline stops at RELEASE with a ready draft (file + cover + copy already
# uploaded) and waits for POST /pipeline/approve/{id}. Default: fully automatic.
AUTO_PUBLISH = os.getenv("AUTO_PUBLISH", "true").lower() in ("1", "true", "yes")

# ── Limits & cadence ─────────────────────────────────────────────────────────
ORCHESTRATOR_INTERVAL = int(os.getenv("ORCHESTRATOR_INTERVAL", "300"))  # seconds
MAX_WIP_PER_VERTICAL  = int(os.getenv("MAX_WIP_PER_VERTICAL", "1"))
GUMROAD_DAILY_LIMIT   = int(os.getenv("GUMROAD_DAILY_LIMIT", "10"))
MAX_BUILD_ATTEMPTS    = 3
MAX_PUBLISH_ATTEMPTS  = 3
STUCK_MINUTES         = 20      # auto-unblock products assigned for longer than this
MIN_ARTIFACT_BYTES    = 1024    # anything smaller is treated as a failed build
MIN_IMAGE_BYTES       = 2048
