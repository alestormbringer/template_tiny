"""Pipeline state manager — pipeline_v2.json inside the agents-data volume is
the single source of truth for every product. It survives container restarts."""
import json
import logging
import uuid
from datetime import datetime, timedelta
from typing import List, Optional

from . import config

log = logging.getLogger("factory.pipeline")


class Pipeline:
    def __init__(self):
        self.products: List[dict] = []
        self.load()

    # ── persistence ──────────────────────────────────────────────────────────
    def load(self):
        if config.PIPELINE_FILE.exists():
            try:
                self.products = json.loads(config.PIPELINE_FILE.read_text()).get("products", [])
                log.info("Loaded %d products from %s", len(self.products), config.PIPELINE_FILE)
            except Exception as e:
                log.error("Corrupt pipeline file, starting empty: %s", e)
                self.products = []

    def save(self):
        config.PIPELINE_FILE.parent.mkdir(parents=True, exist_ok=True)
        tmp = config.PIPELINE_FILE.with_suffix(".tmp")
        tmp.write_text(json.dumps({"products": self.products}, indent=2, default=str))
        tmp.replace(config.PIPELINE_FILE)

    # ── CRUD ─────────────────────────────────────────────────────────────────
    def create_product(self, vertical: str) -> dict:
        product = {
            "id": f"prod_{uuid.uuid4().hex[:10]}",
            "vertical": vertical,
            "stage": "RESEARCH",
            "created_at": datetime.now().isoformat(),
            "assigned": False,
            "build_attempts": 0,
            "publish_attempts": 0,
        }
        self.products.append(product)
        self.save()
        return product

    def get(self, product_id: str) -> Optional[dict]:
        return next((p for p in self.products if p["id"] == product_id), None)

    # ── stage transitions ────────────────────────────────────────────────────
    def advance(self, product_id: str, data_key: str, data: dict):
        """Store the stage output and move the product to the next stage."""
        p = self.get(product_id)
        if not p:
            return
        p[data_key] = data
        idx = config.STAGES.index(p["stage"])
        p["stage"] = config.STAGES[min(idx + 1, len(config.STAGES) - 1)]
        p["assigned"] = False
        p["stage_updated_at"] = datetime.now().isoformat()
        self.save()
        log.info("[%s] %s -> %s", product_id, config.STAGES[idx], p["stage"])

    def send_back(self, product_id: str, stage: str, reason: str):
        p = self.get(product_id)
        if not p:
            return
        p["stage"] = stage
        p["assigned"] = False
        p["last_error"] = reason
        p["stage_updated_at"] = datetime.now().isoformat()
        self.save()
        log.warning("[%s] sent back to %s: %s", product_id, stage, reason)

    def fail(self, product_id: str, error_stage: str, reason: str):
        p = self.get(product_id)
        if not p:
            return
        p["stage"] = error_stage
        p["assigned"] = False
        p["last_error"] = reason
        p["stage_updated_at"] = datetime.now().isoformat()
        self.save()
        log.error("[%s] -> %s: %s", product_id, error_stage, reason)

    def retry_later(self, product_id: str, minutes: float, reason: str):
        p = self.get(product_id)
        if not p:
            return
        p["assigned"] = False
        p["retry_after"] = (datetime.now() + timedelta(minutes=minutes)).isoformat()
        p["last_error"] = reason
        self.save()
        log.info("[%s] retry in %.0f min: %s", product_id, minutes, reason)

    # ── queries ──────────────────────────────────────────────────────────────
    def actionable(self) -> List[dict]:
        """Products with work to do right now (not done/errored/assigned/waiting)."""
        now = datetime.now().isoformat()
        out = []
        for p in self.products:
            if p["stage"] in ("DONE", *config.ERROR_STAGES):
                continue
            if p.get("assigned"):
                continue
            if p.get("retry_after") and p["retry_after"] > now:
                continue
            out.append(p)
        return out

    def unstick(self):
        """Free products stuck in 'assigned' longer than STUCK_MINUTES (e.g. after a crash)."""
        cutoff = (datetime.now() - timedelta(minutes=config.STUCK_MINUTES)).isoformat()
        changed = False
        for p in self.products:
            if p.get("assigned") and p.get("assigned_at", "") < cutoff:
                p["assigned"] = False
                changed = True
                log.warning("[%s] auto-unblocked (stuck > %d min)", p["id"], config.STUCK_MINUTES)
        if changed:
            self.save()

    def in_flight(self, vertical: str) -> int:
        return sum(1 for p in self.products
                   if p["vertical"] == vertical
                   and p["stage"] not in ("DONE", *config.ERROR_STAGES))

    def published_today(self, platform_key: str) -> int:
        today = datetime.now().strftime("%Y-%m-%d")
        return sum(1 for p in self.products
                   if (p.get("publish") or {}).get(platform_key)
                   and (p.get("publish") or {}).get("published_at", "").startswith(today))


pipeline = Pipeline()
