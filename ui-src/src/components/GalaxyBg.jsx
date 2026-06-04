import { useEffect, useRef } from 'react'

const STARS = Array.from({ length: 260 }, () => ({
  x: Math.random(),
  y: Math.random(),
  r: Math.random() * 1.2 + 0.2,
  phase: Math.random() * Math.PI * 2,
  speed: Math.random() * 0.35 + 0.08,
}))

const NEBULAE = [
  { x: 0.15, y: 0.22, r: 0.38, c: '65,18,115' },
  { x: 0.82, y: 0.68, r: 0.32, c: '25,25,140' },
  { x: 0.50, y: 0.42, r: 0.42, c: '90,18,125' },
  { x: 0.08, y: 0.78, r: 0.28, c: '18,45,115' },
  { x: 0.88, y: 0.12, r: 0.24, c: '75,10,85' },
  { x: 0.40, y: 0.85, r: 0.20, c: '30,60,120' },
]

export default function GalaxyBg() {
  const ref = useRef(null)

  useEffect(() => {
    const canvas = ref.current
    const ctx = canvas.getContext('2d')
    let raf
    let lastTime = 0
    const FRAME_MS = 1000 / 24  // 24 fps cap

    const resize = () => {
      canvas.width  = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
    }
    resize()

    const ro = new ResizeObserver(resize)
    ro.observe(canvas)

    const draw = (t) => {
      raf = requestAnimationFrame(draw)
      if (t - lastTime < FRAME_MS) return
      lastTime = t

      const { width: w, height: h } = canvas
      ctx.clearRect(0, 0, w, h)

      // Nebulae (static — only redraw changes via star alpha)
      NEBULAE.forEach(({ x, y, r, c }) => {
        const cx = x * w, cy = y * h, rad = r * Math.min(w, h)
        const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad)
        g.addColorStop(0,   `rgba(${c},0.30)`)
        g.addColorStop(0.5, `rgba(${c},0.10)`)
        g.addColorStop(1,   `rgba(${c},0)`)
        ctx.fillStyle = g
        ctx.beginPath()
        ctx.arc(cx, cy, rad, 0, Math.PI * 2)
        ctx.fill()
      })

      // Twinkling stars
      const sec = t * 0.001
      STARS.forEach(s => {
        const a = (Math.sin(sec * s.speed + s.phase) * 0.38 + 0.55) * 0.85
        ctx.fillStyle = `rgba(210,220,255,${a})`
        ctx.beginPath()
        ctx.arc(s.x * w, s.y * h, s.r, 0, Math.PI * 2)
        ctx.fill()
      })
    }

    draw(0)
    return () => { cancelAnimationFrame(raf); ro.disconnect() }
  }, [])

  return <canvas ref={ref} className="galaxy-canvas" />
}
