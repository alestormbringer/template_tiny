import { useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import AgentRoom from './AgentRoom.jsx'

const AGENT_ORDER = [
  'tinyagi', 'market-analyst', 'notion-creator', 'finance-creator',
  'business-creator', 'copywriter', 'publisher', 'analytics',
]

// ─── Starfield canvas ─────────────────────────────────────────────────────────
function useStarfield(ref) {
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    let raf

    const stars = Array.from({ length: 220 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      r: Math.random() * 1.4 + 0.2,
      a: Math.random(),
      speed: Math.random() * 0.003 + 0.001,
    }))

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      stars.forEach(s => {
        s.x = Math.random() * canvas.width
        s.y = Math.random() * canvas.height
      })
    }
    resize()
    window.addEventListener('resize', resize)

    const draw = () => {
      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      // Nebula blobs — deep purple/blue
      const blobs = [
        { x: w * 0.20, y: h * 0.30, r: w * 0.35, c: 'rgba(70,30,120,' },
        { x: w * 0.85, y: h * 0.70, r: w * 0.30, c: 'rgba(40,30,140,' },
        { x: w * 0.55, y: h * 0.50, r: w * 0.40, c: 'rgba(100,30,140,' },
        { x: w * 0.10, y: h * 0.85, r: w * 0.25, c: 'rgba(30,40,110,' },
      ]
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        g.addColorStop(0,   b.c + '0.38)')
        g.addColorStop(0.5, b.c + '0.15)')
        g.addColorStop(1,   b.c + '0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Stars
      const t = Date.now() * 0.001
      stars.forEach(s => {
        const alpha = (Math.sin(t * s.speed * 100 + s.a * 10) * 0.4 + 0.5) * s.a
        ctx.fillStyle = `rgba(200,210,255,${alpha})`
        ctx.beginPath()
        ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
        ctx.fill()
      })

      raf = requestAnimationFrame(draw)
    }

    draw()
    return () => {
      window.removeEventListener('resize', resize)
      cancelAnimationFrame(raf)
    }
  }, [])
}

// ─── AgentGrid ───────────────────────────────────────────────────────────────
export default function AgentGrid({ agents }) {
  const starRef = useRef(null)
  useStarfield(starRef)

  const apiAgents = agents?.agents || {}

  return (
    <div className="colony-world">
      {/* Starfield */}
      <canvas ref={starRef} className="starfield" />

      {/* Grid 4×2 */}
      <motion.div
        className="agent-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {AGENT_ORDER.map((id, i) => (
          <AgentRoom key={id} id={id} agent={apiAgents[id] || null} />
        ))}
      </motion.div>
    </div>
  )
}
