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

    const stars = Array.from({ length: 200 }, () => ({
      x: Math.random() * 2000,
      y: Math.random() * 2000,
      r: Math.random() * 1.2 + 0.2,
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

      // Nebula blobs
      const blobs = [
        { x: w * 0.3, y: h * 0.4, r: w * 0.3, c: 'rgba(30,10,70,' },
        { x: w * 0.75, y: h * 0.6, r: w * 0.25, c: 'rgba(0,20,60,' },
      ]
      blobs.forEach(b => {
        const g = ctx.createRadialGradient(b.x, b.y, 0, b.x, b.y, b.r)
        g.addColorStop(0, b.c + '0.18)')
        g.addColorStop(1, b.c + '0)')
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(b.x, b.y, b.r, 0, Math.PI * 2)
        ctx.fill()
      })

      // Stars
      const t = Date.now() * 0.001
      stars.forEach(s => {
        const alpha = (Math.sin(t * s.speed * 100 + s.a * 10) * 0.4 + 0.5) * s.a
        ctx.fillStyle = `rgba(180,200,255,${alpha})`
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

      {/* Grid */}
      <motion.div
        className="agent-grid"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.8, delay: 0.2 }}
      >
        {AGENT_ORDER.map((id, i) => (
          <motion.div key={id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.05 * i }}
          >
            <AgentRoom id={id} agent={apiAgents[id] || null} />
          </motion.div>
        ))}
      </motion.div>
    </div>
  )
}
