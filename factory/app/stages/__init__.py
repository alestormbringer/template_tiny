"""Stage registry — maps each pipeline stage to its handler coroutine."""
from . import build, copywriting, design, image, publish, research, verify

HANDLERS = {
    "RESEARCH":    research.run,
    "DESIGN":      design.run,
    "COPYWRITING": copywriting.run,
    "BUILD":       build.run,
    "VERIFY":      verify.run,
    "IMAGE":       image.run,
    "PUBLISH":     publish.run,
    "RELEASE":     publish.run_release,
}
