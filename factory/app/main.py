"""Template factory — FastAPI app + orchestrator loop.

Pipeline: RESEARCH -> DESIGN -> COPYWRITING -> BUILD -> VERIFY -> IMAGE
          -> PUBLISH -> RELEASE -> DONE
Errors:   BUILD_ERROR / PUBLISH_ERROR (after MAX attempts)
"""
import asyncio
import logging
from contextlib import asynccontextmanager
from datetime import datetime

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from . import analytics, config
from .pipeline import pipeline
from .stages import HANDLERS

logging.basicConfig(level=logging.INFO,
                    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s")
log = logging.getLogger("factory")


async def _run_stage(product: dict):
    handler = HANDLERS.get(product["stage"])
    if not handler:
        return
    p = pipeline.get(product["id"])
    if not p:
        return
    p["assigned"] = True
    p["assigned_at"] = datetime.now().isoformat()
    pipeline.save()
    try:
        await handler(p)
    except Exception as e:
        log.exception("[%s] stage %s crashed", p["id"], p["stage"])
        pipeline.retry_later(p["id"], 10, f"stage crashed: {e}")
    finally:
        fresh = pipeline.get(product["id"])
        if fresh and fresh.get("assigned"):
            fresh["assigned"] = False
            pipeline.save()


async def orchestrator_loop():
    log.info("orchestrator started (every %ds, auto_publish=%s)",
             config.ORCHESTRATOR_INTERVAL, config.AUTO_PUBLISH)
    while True:
        try:
            pipeline.unstick()

            # Fase 4/5: daily analytics + build decision (first tick of the day)
            if analytics.due():
                try:
                    await analytics.run_daily()
                except Exception:
                    log.exception("daily analytics failed")

            # Keep each vertical fed
            for vertical in config.VERTICALS:
                if pipeline.in_flight(vertical) < config.MAX_WIP_PER_VERTICAL:
                    p = pipeline.create_product(vertical)
                    log.info("new product %s (%s)", p["id"], vertical)

            # Advance everything actionable, one stage step per product per tick
            tasks = [_run_stage(p) for p in pipeline.actionable()]
            if tasks:
                await asyncio.gather(*tasks)
        except Exception:
            log.exception("orchestrator tick failed")
        await asyncio.sleep(config.ORCHESTRATOR_INTERVAL)


@asynccontextmanager
async def lifespan(app: FastAPI):
    config.WORKSPACE.mkdir(parents=True, exist_ok=True)
    config.ARTIFACTS_DIR.mkdir(parents=True, exist_ok=True)
    task = asyncio.create_task(orchestrator_loop())
    yield
    task.cancel()


app = FastAPI(title="Template Factory", docs_url="/agents/docs", lifespan=lifespan)
app.add_middleware(CORSMiddleware, allow_origins=["*"],
                   allow_methods=["*"], allow_headers=["*"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "products": len(pipeline.products),
        "auto_publish": config.AUTO_PUBLISH,
        "stages": {s: sum(1 for p in pipeline.products if p["stage"] == s)
                   for s in (*config.STAGES, *config.ERROR_STAGES)},
    }


@app.get("/pipeline/status")
async def pipeline_status():
    return {"products": pipeline.products}


@app.get("/pipeline/diagnose")
async def pipeline_diagnose():
    now = datetime.now().isoformat()
    issues = []
    for p in pipeline.products:
        if p["stage"] in config.ERROR_STAGES:
            issues.append({"id": p["id"], "issue": p["stage"],
                           "error": p.get("last_error", "")})
        elif p.get("assigned"):
            issues.append({"id": p["id"], "issue": "assigned",
                           "since": p.get("assigned_at", "")})
        elif p.get("retry_after", "") > now:
            issues.append({"id": p["id"], "issue": "waiting_retry",
                           "until": p["retry_after"], "error": p.get("last_error", "")})
        elif p["stage"] == "RELEASE" and not config.AUTO_PUBLISH and not p.get("approved"):
            issues.append({"id": p["id"], "issue": "awaiting_approval",
                           "url": (p.get("publish") or {}).get("gumroad_url", "")})
    return {"issues": issues, "total_products": len(pipeline.products),
            "latest_report": analytics.latest_report()}


@app.post("/pipeline/repair")
async def pipeline_repair():
    """Reset all errored products back one stage so they retry."""
    reset = []
    for p in pipeline.products:
        if p["stage"] == "PUBLISH_ERROR":
            p.update({"stage": "PUBLISH", "publish_attempts": 0,
                      "assigned": False, "retry_after": None})
            reset.append(p["id"])
        elif p["stage"] == "BUILD_ERROR":
            p.update({"stage": "BUILD", "build_attempts": 0,
                      "assigned": False, "retry_after": None})
            reset.append(p["id"])
    pipeline.save()
    return {"reset": reset}


@app.post("/pipeline/reset_product/{product_id}")
async def reset_product(product_id: str, body: dict = {}):
    stage = body.get("stage", "RESEARCH")
    if stage not in config.STAGES:
        raise HTTPException(400, f"unknown stage {stage}")
    p = pipeline.get(product_id)
    if not p:
        raise HTTPException(404, "product not found")
    p.update({"stage": stage, "assigned": False, "retry_after": None,
              "build_attempts": 0, "publish_attempts": 0})
    pipeline.save()
    return {"id": product_id, "stage": stage}


@app.post("/pipeline/approve/{product_id}")
async def approve_product(product_id: str):
    """The ~60s human step when AUTO_PUBLISH=false: check the draft, then approve."""
    p = pipeline.get(product_id)
    if not p:
        raise HTTPException(404, "product not found")
    if p["stage"] != "RELEASE":
        raise HTTPException(409, f"product is in {p['stage']}, not RELEASE")
    p["approved"] = True
    pipeline.save()
    return {"id": product_id, "approved": True,
            "note": "will go live on the next orchestrator tick"}


@app.post("/pipeline/new_product")
async def new_product(body: dict = {}):
    vertical = body.get("vertical", "notion")
    if vertical not in config.VERTICALS:
        raise HTTPException(400, f"unknown vertical {vertical}")
    return pipeline.create_product(vertical)


@app.post("/analytics/run")
async def analytics_run():
    return await analytics.run_daily()
