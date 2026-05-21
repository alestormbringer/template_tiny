import { useEffect, useRef, useCallback } from 'react'
import {
  AGENT_META, buildZones, drawBackground, drawConnections,
  drawZones, AgentSim, Particle,
} from '../simulation.js'

export default function ColonyCanvas({ agents }) {
  const canvasRef  = useRef(null)
  const stateRef   = useRef({
    agents:    {},  // id → AgentSim
    particles: [],
    zones:     [],
    frame:     0,
    raf:       null,
  })

  // ─── Init / resize ─────────────────────────────────────────────────────────
  const initSim = useCallback((canvas) => {
    const w = canvas.width  = canvas.offsetWidth
    const h = canvas.height = canvas.offsetHeight
    const zones = buildZones(w, h)
    const s     = stateRef.current
    s.zones = zones

    // Build zone lookup
    const zoneMap = Object.fromEntries(zones.map(z => [z.id, z]))

    // Create or reposition agent sims
    const meta = AGENT_META
    Object.entries(meta).forEach(([id, m]) => {
      const hz = zoneMap[m.zone]
      if (!hz) return
      if (!s.agents[id]) {
        // Use color from API data if available, else fallback
        const apiColor = agents?.agents?.[id]?.color
        s.agents[id] = new AgentSim(id, apiColor || '#ffffff', hz)
      } else {
        s.agents[id].homeZone = hz
      }
    })
  }, [agents])

  // ─── Sync agent status from API ────────────────────────────────────────────
  const syncAgents = useCallback(() => {
    const s = stateRef.current
    const zm = Object.fromEntries(s.zones.map(z => [z.id, z]))
    const apiAgents = agents?.agents || {}

    Object.entries(s.agents).forEach(([id, sim]) => {
      const api  = apiAgents[id]
      if (!api) return

      // Update color from API
      if (api.color) sim.color = api.color

      const newStatus = api.status === 'working' ? 'working' : 'idle'
      const meta = AGENT_META[id]
      const homeZone = meta ? zm[meta.zone] : null

      if (newStatus === 'working' && homeZone) {
        // When working, agent moves to its work zone
        sim.setStatus('working', homeZone)
      } else {
        sim.setStatus('idle', null)
      }
    })
  }, [agents])

  // ─── Main animation loop ────────────────────────────────────────────────────
  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s   = stateRef.current
    s.frame++
    const t = s.frame

    // Handle resize
    if (canvas.offsetWidth !== canvas.width || canvas.offsetHeight !== canvas.height) {
      initSim(canvas)
    }

    const w = canvas.width
    const h = canvas.height

    // ── Draw background ──────────────────────────────────────────────────
    drawBackground(ctx, w, h, t)
    drawConnections(ctx, s.zones, t)
    drawZones(ctx, s.zones, t)

    // ── Update + draw particles ──────────────────────────────────────────
    s.particles = s.particles.filter(p => {
      const done = p.update()
      if (!done) p.draw(ctx)
      return !done
    })

    // ── Update + draw agents ─────────────────────────────────────────────
    const zoneMap = Object.fromEntries(s.zones.map(z => [z.id, z]))
    Object.entries(s.agents).forEach(([id, sim]) => {
      sim.update()
      const meta = AGENT_META[id]
      sim.draw(ctx, meta)

      // Emit data particle toward NEXUS when working
      if (sim.shouldEmitParticle()) {
        const nexus = zoneMap['NEXUS']
        if (nexus && sim.homeZone.id !== 'NEXUS') {
          s.particles.push(new Particle(sim, nexus, sim.color))
        }
        // Also emit between current zone and a random connected zone
        const nearby = s.zones[Math.floor(Math.random() * s.zones.length)]
        if (nearby && nearby.id !== sim.homeZone.id) {
          s.particles.push(new Particle(sim, nearby, sim.color + 'aa'))
        }
      }

      // Idle agents occasionally emit a faint spark
      if (sim.status === 'idle' && sim.particleTimer > 200 + Math.random() * 200) {
        sim.particleTimer = 0
        const target = s.zones[Math.floor(Math.random() * s.zones.length)]
        if (target) s.particles.push(new Particle(sim, target, sim.color + '44'))
      }
    })

    // Cap particles
    if (s.particles.length > 200) {
      s.particles = s.particles.slice(-200)
    }

    // ── Zone labels (drawn on canvas for depth) ──────────────────────────
    s.zones.forEach(z => {
      const pulse = 0.5 + Math.sin(t * 0.012 + z.xFrac * 9) * 0.2
      ctx.save()
      ctx.globalAlpha = 0.45 * pulse
      ctx.fillStyle   = z.color
      ctx.font        = '9px monospace'
      ctx.textAlign   = 'center'
      ctx.letterSpacing = '2px'
      ctx.fillText(z.label, z.x, z.y + z.radius + 14)
      ctx.restore()
    })

    s.raf = requestAnimationFrame(loop)
  }, [initSim])

  // ─── Mount / unmount ────────────────────────────────────────────────────────
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ro = new ResizeObserver(() => initSim(canvas))
    ro.observe(canvas)
    initSim(canvas)

    stateRef.current.raf = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      if (stateRef.current.raf) cancelAnimationFrame(stateRef.current.raf)
    }
  }, [initSim, loop])

  // ─── Sync API data whenever it changes ─────────────────────────────────────
  useEffect(() => {
    syncAgents()
  }, [syncAgents])

  return (
    <canvas
      ref={canvasRef}
      className="colony-canvas"
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
