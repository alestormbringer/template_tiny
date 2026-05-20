import { useEffect, useRef, useCallback } from 'react'

// ─── Room config ──────────────────────────────────────────────────────────────
const ROOM_META = {
  'tinyagi':          { label: 'NEXUS',     sub: 'Command Center', color: '#99bbff', type: 'command' },
  'market-analyst':   { label: 'MARKET',    sub: 'Research Lab',   color: '#ffbb88', type: 'lab'     },
  'notion-creator':   { label: 'DOC FORGE', sub: 'Studio',         color: '#88ddaa', type: 'studio'  },
  'finance-creator':  { label: 'FINANCE',   sub: 'Data Vault',     color: '#ffee88', type: 'vault'   },
  'business-creator': { label: 'STRATEGY',  sub: 'War Room',       color: '#cc99ff', type: 'conf'    },
  'copywriter':       { label: 'CONTENT',   sub: 'Mill',           color: '#ffaacc', type: 'write'   },
  'publisher':        { label: 'PUBLISH',   sub: 'Bay',            color: '#ffcc77', type: 'bay'     },
  'analytics':        { label: 'ANALYTICS', sub: 'Grid',           color: '#77ddff', type: 'server'  },
}

// Grid position [col, row] — 3×3 grid, center-bottom empty
const GRID_POS = {
  'market-analyst':   [0, 0],
  'tinyagi':          [1, 0],
  'notion-creator':   [2, 0],
  'finance-creator':  [0, 1],
  'business-creator': [1, 1],
  'copywriter':       [2, 1],
  'publisher':        [0, 2],
  'analytics':        [2, 2],
}

const CORRIDOR_PAIRS = [
  ['market-analyst', 'tinyagi'],
  ['tinyagi', 'notion-creator'],
  ['finance-creator', 'business-creator'],
  ['business-creator', 'copywriter'],
  ['market-analyst', 'finance-creator'],
  ['tinyagi', 'business-creator'],
  ['notion-creator', 'copywriter'],
  ['finance-creator', 'publisher'],
  ['copywriter', 'analytics'],
]

// ─── Layout builder ───────────────────────────────────────────────────────────
function buildLayout(W, H) {
  const PAD = 20, GAP = 22
  const rw = Math.floor((W - PAD * 2 - GAP * 2) / 3)
  const rh = Math.floor((H - PAD * 2 - GAP * 2) / 3)

  const rooms = {}
  for (const [id, [col, row]] of Object.entries(GRID_POS)) {
    const x = PAD + col * (rw + GAP)
    const y = PAD + row * (rh + GAP)
    rooms[id] = { id, col, row, x, y, w: rw, h: rh, cx: x + rw / 2, cy: y + rh / 2 }
  }
  return { rooms, rw, rh, PAD, GAP }
}

// ─── Data particle ────────────────────────────────────────────────────────────
class Particle {
  constructor(fromRoom, toRoom, color) {
    this.x = fromRoom.cx
    this.y = fromRoom.cy
    this.tx = toRoom.cx
    this.ty = toRoom.cy
    this.color = color
    this.t = 0
    this.speed = 0.008 + Math.random() * 0.008
    this.size = 2 + Math.random() * 1.5
  }
  update() {
    this.t = Math.min(1, this.t + this.speed)
    this.x = lerp(this.x, this.tx, this.speed * 3)
    this.y = lerp(this.y, this.ty, this.speed * 3)
    return this.t >= 0.98
  }
  draw(ctx) {
    const a = Math.sin(this.t * Math.PI) * 0.9
    ctx.save()
    ctx.globalAlpha = a
    ctx.fillStyle = this.color
    ctx.shadowColor = this.color
    ctx.shadowBlur = 6
    ctx.beginPath()
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2)
    ctx.fill()
    ctx.restore()
  }
}

// ─── Agent simulation ─────────────────────────────────────────────────────────
class AgentSim {
  constructor(id, room) {
    this.id = id
    this.room = room
    this.x = room.cx + (Math.random() - 0.5) * room.w * 0.3
    this.y = room.cy + (Math.random() - 0.5) * room.h * 0.3
    this.tx = this.x
    this.ty = this.y
    this.status = 'idle'
    this.frame = Math.floor(Math.random() * 100)
    this.idleTimer = Math.random() * 120
    this.dir = 1
    this.walkFrame = 0
    this.moving = false
    this.particleTimer = Math.random() * 60
  }

  setRoom(room) { this.room = room }
  setStatus(s) { this.status = s }

  update() {
    this.frame++
    this.particleTimer++
    const r = this.room

    if (this.status === 'idle') {
      // Slow pacing back and forth
      this.idleTimer++
      if (!this.moving && this.idleTimer > 80 + Math.random() * 120) {
        this.idleTimer = 0
        const margin = r.w * 0.28
        this.tx = r.x + margin + Math.random() * (r.w - margin * 2)
        this.ty = r.y + r.h * 0.4 + Math.random() * r.h * 0.3
        this.moving = true
      }
    } else {
      // Working: stand at workstation (bottom-center of room)
      this.tx = r.cx + Math.sin(this.frame * 0.02) * 4
      this.ty = r.y + r.h * 0.6
    }

    // Smooth move toward target
    const dx = this.tx - this.x
    const dy = this.ty - this.y
    const dist = Math.hypot(dx, dy)
    const speed = this.status === 'idle' ? 0.5 : 1.2

    if (dist > 1) {
      this.x += (dx / dist) * Math.min(speed, dist)
      this.y += (dy / dist) * Math.min(speed, dist)
      this.dir = dx < 0 ? -1 : 1
      this.walkFrame++
    } else {
      this.moving = false
      if (this.status === 'working') this.walkFrame += 0.5
    }

    return this.particleTimer > 60 + Math.random() * 40 && this.status === 'working'
      ? (this.particleTimer = 0, true) : false
  }

  shouldEmit() {
    if (this.status !== 'working') return false
    if (this.particleTimer > 55 + Math.random() * 40) {
      this.particleTimer = 0
      return true
    }
    return false
  }
}

function lerp(a, b, t) { return a + (b - a) * t }

// ─── Drawing helpers ──────────────────────────────────────────────────────────

function hexToRgb(hex) {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return `${r},${g},${b}`
}

function darken(hex, amt) {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amt)
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amt)
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amt)
  return `rgb(${r},${g},${b})`
}

// ─── Background ───────────────────────────────────────────────────────────────
function drawBackground(ctx, W, H, stars) {
  ctx.fillStyle = '#070710'
  ctx.fillRect(0, 0, W, H)

  // Subtle tile grid
  ctx.strokeStyle = 'rgba(255,255,255,0.022)'
  ctx.lineWidth = 0.5
  const TILE = 24
  for (let x = 0; x < W; x += TILE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke()
  }
  for (let y = 0; y < H; y += TILE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke()
  }

  // Stars
  stars.forEach(s => {
    ctx.fillStyle = `rgba(200,210,255,${s.a})`
    ctx.beginPath()
    ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2)
    ctx.fill()
  })
}

// ─── Corridor ─────────────────────────────────────────────────────────────────
function drawCorridor(ctx, r1, r2) {
  const WALL_COLOR = '#12122a'
  const FLOOR_COLOR = '#0c0c1e'
  const CW = 18 // corridor width

  const isH = r1.row === r2.row
  if (isH) {
    const left  = Math.min(r1.x + r1.w, r2.x + r2.w)
    const right = Math.max(r1.x, r2.x)
    const cy = r1.cy
    // Floor
    ctx.fillStyle = FLOOR_COLOR
    ctx.fillRect(left, cy - CW / 2, right - left, CW)
    // Walls
    ctx.fillStyle = WALL_COLOR
    ctx.fillRect(left, cy - CW / 2, right - left, 2)
    ctx.fillRect(left, cy + CW / 2 - 2, right - left, 2)
    // Doorway gap on room walls
    ctx.fillStyle = FLOOR_COLOR
    ctx.fillRect(r1.x + r1.w - 1, cy - CW / 2 + 2, 3, CW - 4)
    ctx.fillRect(r2.x - 2, cy - CW / 2 + 2, 3, CW - 4)
  } else {
    const top    = Math.min(r1.y + r1.h, r2.y + r2.h)
    const bottom = Math.max(r1.y, r2.y)
    const cx = r1.cx
    ctx.fillStyle = FLOOR_COLOR
    ctx.fillRect(cx - CW / 2, top, CW, bottom - top)
    ctx.fillStyle = WALL_COLOR
    ctx.fillRect(cx - CW / 2, top, 2, bottom - top)
    ctx.fillRect(cx + CW / 2 - 2, top, 2, bottom - top)
    ctx.fillStyle = FLOOR_COLOR
    ctx.fillRect(cx - CW / 2 + 2, r1.y + r1.h - 1, CW - 4, 3)
    ctx.fillRect(cx - CW / 2 + 2, r2.y - 2, CW - 4, 3)
  }
}

// ─── Room base ────────────────────────────────────────────────────────────────
function drawRoom(ctx, room, meta, isWorking, frame) {
  const { x, y, w, h } = room
  const col = meta.color
  const rgb = hexToRgb(col)

  // Floor
  ctx.fillStyle = '#0e0e20'
  ctx.fillRect(x, y, w, h)

  // Working glow overlay
  if (isWorking) {
    const g = ctx.createRadialGradient(room.cx, room.cy, 0, room.cx, room.cy, Math.max(w, h) * 0.7)
    const pulse = 0.06 + Math.sin(frame * 0.05) * 0.02
    g.addColorStop(0, `rgba(${rgb},${pulse})`)
    g.addColorStop(1, `rgba(${rgb},0)`)
    ctx.fillStyle = g
    ctx.fillRect(x, y, w, h)
  }

  // Floor tile pattern
  ctx.strokeStyle = isWorking
    ? `rgba(${rgb},0.06)`
    : 'rgba(255,255,255,0.025)'
  ctx.lineWidth = 0.5
  const TS = 16
  for (let tx = x; tx < x + w; tx += TS) {
    ctx.beginPath(); ctx.moveTo(tx, y); ctx.lineTo(tx, y + h); ctx.stroke()
  }
  for (let ty = y; ty < y + h; ty += TS) {
    ctx.beginPath(); ctx.moveTo(x, ty); ctx.lineTo(x + w, ty); ctx.stroke()
  }

  // Walls
  ctx.strokeStyle = isWorking
    ? `rgba(${rgb},0.85)`
    : `rgba(${rgb},0.45)`
  ctx.lineWidth = 2
  ctx.shadowColor = col
  ctx.shadowBlur = isWorking ? 10 : 4
  ctx.strokeRect(x + 1, y + 1, w - 2, h - 2)
  ctx.shadowBlur = 0

  // Corner brackets
  const CS = 8
  ctx.strokeStyle = isWorking ? col : `rgba(${rgb},0.7)`
  ctx.lineWidth = 2
  ;[[x, y], [x + w, y], [x, y + h], [x + w, y + h]].forEach(([bx, by], i) => {
    ctx.beginPath()
    ctx.moveTo(bx + (i % 2 === 0 ? CS : -CS), by)
    ctx.lineTo(bx, by)
    ctx.lineTo(bx, by + (i < 2 ? CS : -CS))
    ctx.stroke()
  })

  // Room label at top
  ctx.save()
  ctx.font = `bold 9px 'Orbitron', monospace`
  ctx.letterSpacing = '2px'
  ctx.fillStyle = isWorking ? col : `rgba(${rgb},0.7)`
  ctx.textAlign = 'center'
  ctx.fillText(meta.label, room.cx, y + 13)
  ctx.restore()
}

// ─── Furniture ────────────────────────────────────────────────────────────────
function drawFurniture(ctx, room, meta, frame) {
  const { x, y, w, h, cx, cy } = room
  const col = meta.color
  const rgb = hexToRgb(col)
  const dim = `rgba(${rgb},0.15)`
  const mid = `rgba(${rgb},0.4)`
  const hi  = `rgba(${rgb},0.7)`

  ctx.save()

  switch (meta.type) {
    case 'command': {
      // Curved central desk (arc shape)
      ctx.strokeStyle = mid; ctx.lineWidth = 2; ctx.fillStyle = dim
      ctx.beginPath()
      ctx.arc(cx, cy + 10, w * 0.28, Math.PI * 1.15, Math.PI * 1.85)
      ctx.stroke()
      // 3 screens
      for (let i = -1; i <= 1; i++) {
        const sx = cx + i * 24, sy = cy - 12
        ctx.fillStyle = dim
        ctx.fillRect(sx - 10, sy - 8, 20, 13)
        ctx.strokeStyle = mid; ctx.lineWidth = 1; ctx.strokeRect(sx - 10, sy - 8, 20, 13)
        // Screen glow
        ctx.fillStyle = hi
        const screenBlink = Math.sin(frame * 0.04 + i) > 0
        if (screenBlink) {
          ctx.fillStyle = `rgba(${rgb},0.55)`
          ctx.fillRect(sx - 8, sy - 6, 16, 3)
          ctx.fillRect(sx - 8, sy - 1, 10, 2)
        }
      }
      // Central terminal
      ctx.fillStyle = mid
      ctx.beginPath()
      ctx.arc(cx, cy + 5, 6, 0, Math.PI * 2)
      ctx.fill()
      ctx.fillStyle = hi
      ctx.beginPath()
      ctx.arc(cx, cy + 5, 3, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'lab': {
      // Data terminal against back wall
      ctx.fillStyle = dim; ctx.strokeStyle = mid; ctx.lineWidth = 1.5
      ctx.fillRect(x + 12, y + 20, w - 24, 18)
      ctx.strokeRect(x + 12, y + 20, w - 24, 18)
      // Screen content: bar chart
      const bars = [0.4, 0.9, 0.6, 0.75, 0.5, 0.85]
      bars.forEach((v, i) => {
        const bh = v * 12
        ctx.fillStyle = hi
        ctx.fillRect(x + 16 + i * 9, y + 36 - bh, 6, bh)
      })
      // Desk
      ctx.fillStyle = dim
      ctx.fillRect(x + w * 0.2, cy + 8, w * 0.6, 8)
      ctx.strokeStyle = mid; ctx.strokeRect(x + w * 0.2, cy + 8, w * 0.6, 8)
      // Small terminal
      ctx.fillStyle = dim
      ctx.fillRect(cx - 10, cy - 2, 20, 14)
      ctx.strokeStyle = mid; ctx.strokeRect(cx - 10, cy - 2, 20, 14)
      ctx.fillStyle = `rgba(${rgb},${0.4 + Math.sin(frame * 0.06) * 0.2})`
      ctx.fillRect(cx - 8, cy, 16, 4)
      break
    }

    case 'studio': {
      // Bookshelf on left wall
      ctx.strokeStyle = mid; ctx.lineWidth = 1; ctx.fillStyle = dim
      ctx.fillRect(x + 6, y + 18, 12, h - 32)
      ctx.strokeRect(x + 6, y + 18, 12, h - 32)
      for (let i = 0; i < 5; i++) {
        ctx.fillStyle = `rgba(${rgb},${0.2 + i * 0.06})`
        ctx.fillRect(x + 8, y + 22 + i * 10, 8, 6)
      }
      // Writing desk
      ctx.fillStyle = dim; ctx.strokeStyle = mid
      ctx.fillRect(cx - 20, cy + 5, 40, 10)
      ctx.strokeRect(cx - 20, cy + 5, 40, 10)
      // Screen
      ctx.fillRect(cx - 10, cy - 10, 22, 14)
      ctx.strokeRect(cx - 10, cy - 10, 22, 14)
      ctx.fillStyle = hi
      for (let r = 0; r < 3; r++) {
        ctx.fillRect(cx - 8, cy - 8 + r * 4, 8 + Math.sin(frame * 0.05 + r) * 4, 2)
      }
      break
    }

    case 'vault': {
      // Safe door (circle with handle)
      ctx.strokeStyle = mid; ctx.lineWidth = 2; ctx.fillStyle = dim
      ctx.beginPath()
      ctx.arc(x + w * 0.25, cy, 18, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      ctx.beginPath()
      ctx.arc(x + w * 0.25, cy, 10, 0, Math.PI * 2)
      ctx.stroke()
      // Safe handle
      ctx.fillStyle = hi
      ctx.fillRect(x + w * 0.25 + 8, cy - 3, 8, 6)
      // Spreadsheet terminal
      ctx.fillStyle = dim; ctx.strokeStyle = mid; ctx.lineWidth = 1
      ctx.fillRect(cx + 5, cy - 20, w * 0.35, h * 0.45)
      ctx.strokeRect(cx + 5, cy - 20, w * 0.35, h * 0.45)
      // Grid lines inside terminal
      for (let r = 0; r < 4; r++) {
        ctx.strokeStyle = `rgba(${rgb},0.25)`
        ctx.beginPath()
        ctx.moveTo(cx + 5, cy - 14 + r * 9)
        ctx.lineTo(cx + 5 + w * 0.35, cy - 14 + r * 9)
        ctx.stroke()
      }
      // Highlighted cell
      const hCol = Math.floor(frame / 40) % 3
      ctx.fillStyle = `rgba(${rgb},0.35)`
      ctx.fillRect(cx + 10 + hCol * 14, cy - 13, 12, 7)
      break
    }

    case 'conf': {
      // Round table
      ctx.strokeStyle = mid; ctx.lineWidth = 2; ctx.fillStyle = dim
      ctx.beginPath()
      ctx.ellipse(cx, cy + 8, w * 0.3, h * 0.22, 0, 0, Math.PI * 2)
      ctx.fill(); ctx.stroke()
      // Seats
      for (let i = 0; i < 5; i++) {
        const a = (i / 5) * Math.PI * 2 - Math.PI / 2
        const sx = cx + Math.cos(a) * w * 0.38
        const sy = cy + 8 + Math.sin(a) * h * 0.3
        ctx.fillStyle = `rgba(${rgb},0.3)`
        ctx.beginPath()
        ctx.arc(sx, sy, 5, 0, Math.PI * 2)
        ctx.fill()
      }
      // Wall display
      ctx.fillStyle = dim; ctx.strokeStyle = mid
      ctx.fillRect(cx - 22, y + 14, 44, 20)
      ctx.strokeRect(cx - 22, y + 14, 44, 20)
      ctx.fillStyle = hi
      ctx.fillRect(cx - 18, y + 18, 36, 3)
      ctx.fillRect(cx - 18, y + 24, 22, 2)
      break
    }

    case 'write': {
      // Long desk
      ctx.fillStyle = dim; ctx.strokeStyle = mid; ctx.lineWidth = 1
      ctx.fillRect(x + 10, cy, w - 20, 10)
      ctx.strokeRect(x + 10, cy, w - 20, 10)
      // Keyboard
      ctx.fillStyle = `rgba(${rgb},0.25)`
      ctx.fillRect(cx - 14, cy + 1, 28, 6)
      for (let i = 0; i < 7; i++) {
        ctx.fillStyle = hi
        ctx.fillRect(cx - 12 + i * 4, cy + 2, 3, 3)
      }
      // Screen with scrolling text
      ctx.fillStyle = dim
      ctx.fillRect(cx - 16, cy - 20, 32, 18)
      ctx.strokeStyle = mid; ctx.strokeRect(cx - 16, cy - 20, 32, 18)
      const scrollOffset = (frame * 0.5) % 14
      for (let r = 0; r < 4; r++) {
        ctx.fillStyle = `rgba(${rgb},${0.3 + (r === 1 ? 0.3 : 0)})`
        const lw = 12 + (r * 7) % 14
        ctx.fillRect(cx - 14, cy - 18 + r * 4 + scrollOffset % 4, lw, 2)
      }
      // Coffee mug
      ctx.strokeStyle = mid; ctx.lineWidth = 1
      ctx.beginPath()
      ctx.arc(x + 20, cy + 5, 5, 0, Math.PI * 2)
      ctx.stroke()
      ctx.fillStyle = `rgba(${rgb},0.3)`
      ctx.beginPath()
      ctx.arc(x + 20, cy + 5, 3, 0, Math.PI * 2)
      ctx.fill()
      break
    }

    case 'bay': {
      // Stacked boxes (left side)
      ;[[0, 0], [1, 0], [0.5, -1]].forEach(([bx, by]) => {
        ctx.fillStyle = dim
        ctx.fillRect(x + 10 + bx * 18, cy + by * 14, 16, 12)
        ctx.strokeStyle = mid; ctx.lineWidth = 1
        ctx.strokeRect(x + 10 + bx * 18, cy + by * 14, 16, 12)
        // Cross mark on box
        ctx.strokeStyle = `rgba(${rgb},0.3)`
        ctx.beginPath()
        ctx.moveTo(x + 12 + bx * 18, cy + by * 14 + 6)
        ctx.lineTo(x + 24 + bx * 18, cy + by * 14 + 6)
        ctx.stroke()
      })
      // Upload terminal (right side)
      ctx.fillStyle = dim
      ctx.fillRect(cx + 8, cy - 16, 26, 32)
      ctx.strokeStyle = mid; ctx.lineWidth = 1.5
      ctx.strokeRect(cx + 8, cy - 16, 26, 32)
      // Upload arrow
      const arrowY = cy - 8 + Math.sin(frame * 0.1) * 3
      ctx.strokeStyle = hi; ctx.lineWidth = 2
      ctx.beginPath()
      ctx.moveTo(cx + 21, arrowY + 10)
      ctx.lineTo(cx + 21, arrowY - 2)
      ctx.moveTo(cx + 16, arrowY + 4)
      ctx.lineTo(cx + 21, arrowY - 2)
      ctx.lineTo(cx + 26, arrowY + 4)
      ctx.stroke()
      // Progress bar
      const prog = ((frame * 0.4) % 26)
      ctx.fillStyle = `rgba(${rgb},0.2)`
      ctx.fillRect(cx + 10, cy + 10, 22, 5)
      ctx.fillStyle = hi
      ctx.fillRect(cx + 10, cy + 10, prog, 5)
      break
    }

    case 'server': {
      // Server racks
      for (let r = 0; r < 2; r++) {
        const rx = x + 10 + r * (w * 0.42)
        ctx.fillStyle = dim
        ctx.fillRect(rx, y + 16, w * 0.35, h * 0.62)
        ctx.strokeStyle = mid; ctx.lineWidth = 1
        ctx.strokeRect(rx, y + 16, w * 0.35, h * 0.62)
        // Rack units with blinking lights
        for (let u = 0; u < 5; u++) {
          ctx.fillStyle = `rgba(${rgb},0.08)`
          ctx.fillRect(rx + 2, y + 20 + u * (h * 0.11), w * 0.35 - 4, h * 0.1)
          // Status lights
          const lit = Math.sin(frame * 0.07 + r * 3 + u * 1.5) > 0.3
          ctx.fillStyle = lit ? hi : `rgba(${rgb},0.15)`
          ctx.beginPath()
          ctx.arc(rx + 5, y + 24 + u * (h * 0.11), 2, 0, Math.PI * 2)
          ctx.fill()
        }
      }
      // Monitoring screen bottom
      ctx.fillStyle = dim
      ctx.fillRect(cx - 16, y + h - 26, 32, 18)
      ctx.strokeStyle = mid; ctx.lineWidth = 1; ctx.strokeRect(cx - 16, y + h - 26, 32, 18)
      // Waveform on screen
      ctx.strokeStyle = hi; ctx.lineWidth = 1
      ctx.beginPath()
      for (let i = 0; i < 30; i++) {
        const sx = cx - 14 + i
        const sy = y + h - 17 + Math.sin((i + frame * 0.3) * 0.6) * 4
        i === 0 ? ctx.moveTo(sx, sy) : ctx.lineTo(sx, sy)
      }
      ctx.stroke()
      break
    }
  }

  ctx.restore()
}

// ─── Pixel pawn ───────────────────────────────────────────────────────────────
function drawPawn(ctx, sim, meta) {
  const { x, y, walkFrame, status, dir } = sim
  const col = meta.color
  const rgb = hexToRgb(col)
  const working = status === 'working'
  const wf = walkFrame

  ctx.save()
  ctx.shadowColor = col
  ctx.shadowBlur = working ? 10 : 5

  // Body bob when working
  const bob = working ? Math.sin(wf * 0.25) * 1.5 : 0

  // Scale direction
  ctx.save()
  ctx.translate(x, y + bob)
  if (dir < 0) { ctx.scale(-1, 1) }

  // Head
  ctx.fillStyle = col
  ctx.beginPath()
  ctx.arc(0, -10, 3.5, 0, Math.PI * 2)
  ctx.fill()

  // Body
  ctx.fillStyle = `rgba(${rgb},0.85)`
  ctx.fillRect(-2.5, -6.5, 5, 6)

  // Arms
  const armL = working ? Math.sin(wf * 0.3) * 3 : 0
  const armR = working ? -armL : 0
  ctx.fillStyle = col
  ctx.fillRect(-4.5, -5.5 + armL, 2, 4)
  ctx.fillRect(2.5, -5.5 + armR, 2, 4)

  // Legs
  const legSwing = working ? 0 : Math.sin(wf * 0.22) * 2
  ctx.fillStyle = `rgba(${rgb},0.9)`
  ctx.fillRect(-2.5, -0.5, 2.2, 3 + legSwing)
  ctx.fillRect(0.3, -0.5, 2.2, 3 - legSwing)

  ctx.restore()
  ctx.restore()
}

// ─── Task label ───────────────────────────────────────────────────────────────
function drawLabel(ctx, sim, meta, task) {
  if (!task) return
  const col = meta.color
  const rgb = hexToRgb(col)
  const text = task.length > 24 ? task.slice(0, 24) + '…' : task

  ctx.save()
  ctx.font = '8px Rajdhani, sans-serif'
  const tw = ctx.measureText(text).width
  const px = sim.x - tw / 2 - 4
  const py = sim.y - 26

  // Bubble bg
  ctx.fillStyle = `rgba(10,10,24,0.85)`
  ctx.strokeStyle = `rgba(${rgb},0.6)`
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.roundRect(px, py, tw + 8, 12, 2)
  ctx.fill()
  ctx.stroke()

  // Text
  ctx.fillStyle = col
  ctx.textAlign = 'left'
  ctx.fillText(text, px + 4, py + 9)
  ctx.restore()
}

// ─── Data flow line ───────────────────────────────────────────────────────────
function drawFlowLine(ctx, r1, r2, frame, color) {
  const rgb = hexToRgb(color)
  const isH = r1.row === r2.row

  ctx.save()
  ctx.strokeStyle = `rgba(${rgb},0.25)`
  ctx.lineWidth = 1
  ctx.setLineDash([4, 6])
  ctx.lineDashOffset = -(frame * 0.3)
  ctx.beginPath()
  ctx.moveTo(r1.cx, r1.cy)
  ctx.lineTo(r2.cx, r2.cy)
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()
}

// ─── Main canvas component ────────────────────────────────────────────────────
export default function ColonyWorld({ agents }) {
  const canvasRef = useRef(null)
  const stateRef  = useRef({
    sims: {},
    particles: [],
    stars: [],
    layout: null,
    frame: 0,
    raf: null,
    apiAgents: {},
  })

  // Build stars once
  const buildStars = (W, H) =>
    Array.from({ length: 80 }, () => ({
      x: Math.random() * W,
      y: Math.random() * H,
      r: Math.random() * 0.8 + 0.2,
      a: Math.random() * 0.3 + 0.05,
    }))

  const init = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width  = canvas.offsetWidth
    canvas.height = canvas.offsetHeight
    const { W, H } = { W: canvas.width, H: canvas.height }
    const s = stateRef.current
    s.stars  = buildStars(W, H)
    s.layout = buildLayout(W, H)

    // Create agent sims
    for (const [id, room] of Object.entries(s.layout.rooms)) {
      if (!s.sims[id]) s.sims[id] = new AgentSim(id, room)
      else s.sims[id].setRoom(room)
    }
  }, [])

  const syncAgents = useCallback(() => {
    const s = stateRef.current
    s.apiAgents = agents?.agents || {}
    for (const [id, sim] of Object.entries(s.sims)) {
      const a = s.apiAgents[id]
      sim.setStatus(a?.status === 'working' ? 'working' : 'idle')
    }
  }, [agents])

  const loop = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    const s   = stateRef.current

    // Resize guard
    if (canvas.offsetWidth !== canvas.width || canvas.offsetHeight !== canvas.height) {
      init()
    }

    const W = canvas.width, H = canvas.height
    if (!s.layout) return

    s.frame++
    const f  = s.frame
    const { rooms } = s.layout

    // ── Draw ──────────────────────────────────────────────────────────────
    drawBackground(ctx, W, H, s.stars)

    // Corridors (below rooms)
    for (const [idA, idB] of CORRIDOR_PAIRS) {
      const rA = rooms[idA], rB = rooms[idB]
      if (rA && rB) drawCorridor(ctx, rA, rB)
    }

    // Rooms + furniture
    for (const [id, room] of Object.entries(rooms)) {
      const meta    = ROOM_META[id]
      const api     = s.apiAgents[id]
      const working = api?.status === 'working'
      drawRoom(ctx, room, meta, working, f)
      drawFurniture(ctx, room, meta, f)
    }

    // Active data flow lines
    for (const [id, sim] of Object.entries(s.sims)) {
      if (sim.status !== 'working') continue
      const sourceRoom = rooms[id]
      // Send flow line to nexus (tinyagi)
      const nexus = rooms['tinyagi']
      if (nexus && id !== 'tinyagi') {
        drawFlowLine(ctx, sourceRoom, nexus, f, ROOM_META[id].color)
      }
    }

    // Particles
    s.particles = s.particles.filter(p => {
      const done = p.update()
      if (!done) p.draw(ctx)
      return !done
    })

    // Agents
    for (const [id, sim] of Object.entries(s.sims)) {
      const room = rooms[id]
      if (!room) continue

      const emit = sim.update()
      const meta = ROOM_META[id]

      // Emit particle toward nexus when working
      if (emit && id !== 'tinyagi' && rooms['tinyagi']) {
        s.particles.push(new Particle(room, rooms['tinyagi'], meta.color))
      }

      // Draw pawn
      drawPawn(ctx, sim, meta)

      // Draw task label
      const api = s.apiAgents[id]
      if (api?.status === 'working' && api?.current_task) {
        drawLabel(ctx, sim, meta, api.current_task)
      }
    }

    if (s.particles.length > 120) s.particles = s.particles.slice(-120)

    s.raf = requestAnimationFrame(loop)
  }, [init])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ro = new ResizeObserver(init)
    ro.observe(canvas)
    init()
    stateRef.current.raf = requestAnimationFrame(loop)
    return () => {
      ro.disconnect()
      cancelAnimationFrame(stateRef.current.raf)
    }
  }, [init, loop])

  useEffect(() => { syncAgents() }, [syncAgents])

  return (
    <canvas
      ref={canvasRef}
      style={{ display: 'block', width: '100%', height: '100%' }}
    />
  )
}
