import { motion } from 'framer-motion'
import { useState } from 'react'

export const ROOM_CONFIG = {
  'tinyagi':          { color: '#88ccff', label: 'NEXUS'    },
  'market-analyst':   { color: '#ffaa77', label: 'MARKET'   },
  'notion-creator':   { color: '#88ddaa', label: 'NOTION'   },
  'finance-creator':  { color: '#ffdd77', label: 'FINANCE'  },
  'business-creator': { color: '#cc88ff', label: 'STRATEGY' },
  'copywriter':       { color: '#ff99cc', label: 'CONTENT'  },
  'publisher':        { color: '#ff8877', label: 'PUBLISH'  },
  'analytics':        { color: '#77eedd', label: 'ANALYTICS'},
}

// idle position = at desk (front-center of isometric room)
// busy position = near screens (back-left wall)
const CHAR_POS = {
  idle: { bottom: '16%', left: '42%' },
  busy: { bottom: '40%', left: '22%' },
}

const CHAR_THEMES = {
  'tinyagi':          { hair: '#44ddff', shirt: '#1a3366', pant: '#0d1a33' },
  'market-analyst':   { hair: '#ff9933', shirt: '#cc5522', pant: '#1a1a33' },
  'notion-creator':   { hair: '#dd44ff', shirt: '#33aa77', pant: '#112233' },
  'finance-creator':  { hair: '#887755', shirt: '#3355aa', pant: '#111133' },
  'business-creator': { hair: '#885533', shirt: '#884499', pant: '#221133' },
  'copywriter':       { hair: '#ff44aa', shirt: '#bb2277', pant: '#330033' },
  'publisher':        { hair: '#ff4444', shirt: '#aa2222', pant: '#330011' },
  'analytics':        { hair: '#44aaff', shirt: '#115577', pant: '#111133' },
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

// ─── Animated pixel-art character ────────────────────────────────────────────
// SVG viewBox 0 0 28 48  (28px wide, 48px tall in SVG units)
function RoomChar({ id, working }) {
  const t    = CHAR_THEMES[id] || CHAR_THEMES['tinyagi']
  const skin = '#f5c5a3'
  const pos  = working ? CHAR_POS.busy : CHAR_POS.idle

  return (
    <div
      className={`room-char ${working ? 'room-char--busy' : 'room-char--idle'}`}
      style={{ bottom: pos.bottom, left: pos.left }}
    >
      <svg
        viewBox="0 0 28 50"
        width="100%"
        height="100%"
        style={{ display: 'block', imageRendering: 'pixelated' }}
      >
        {/* ── Shadow ── */}
        <ellipse cx="14" cy="48" rx="8" ry="2" fill="rgba(0,0,0,0.55)" />

        {/* ── Legs ── */}
        <rect x="7"  y="34" width="5" height="12" fill={t.pant} />
        <rect x="16" y="34" width="5" height="12" fill={t.pant} />

        {/* ── Shoes ── */}
        <rect x="5"  y="43" width="7"  height="3" fill="#111120" />
        <rect x="16" y="43" width="7"  height="3" fill="#111120" />

        {/* ── Body / shirt ── */}
        <rect x="5" y="20" width="18" height="15" fill={t.shirt} />

        {/* ── Collar ── */}
        <rect x="10" y="20" width="8" height="3" fill={t.hair} fillOpacity="0.4" />

        {/* ── Arm left (idle: at side / busy: raised pointing) ── */}
        <rect
          x="2" y={working ? 14 : 22}
          width="4" height={working ? 10 : 12}
          fill={t.shirt}
          style={{ transition: 'y 0.5s ease, height 0.5s ease' }}
        />
        {/* Pointing finger (visible only when busy) */}
        {working && (
          <rect x="0" y="14" width="3" height="2" fill={skin} />
        )}

        {/* ── Arm right ── */}
        <rect x="22" y="22" width="4" height="12" fill={t.shirt} />

        {/* ── Hands ── */}
        <circle cx="4"  cy={working ? 25 : 35} r="3" fill={skin}
          style={{ transition: 'cy 0.5s ease' }} />
        <circle cx="24" cy="35" r="3" fill={skin} />

        {/* ── Head ── */}
        <rect x="7" y="4" width="14" height="17" fill={skin} />

        {/* ── Hair ── */}
        <rect x="6"  y="2"  width="16" height="5"  fill={t.hair} />
        <rect x="5"  y="6"  width="3"  height="7"  fill={t.hair} fillOpacity="0.7" />
        <rect x="20" y="6"  width="3"  height="6"  fill={t.hair} fillOpacity="0.7" />

        {/* ── Eyes ── */}
        <rect x="9"  y="12" width="4" height="4" fill="#1a0e08" />
        <rect x="16" y="12" width="4" height="4" fill="#1a0e08" />
        {/* Eye shine */}
        <rect x="9"  y="12" width="1.5" height="1.5" fill="white" fillOpacity="0.8" />
        <rect x="16" y="12" width="1.5" height="1.5" fill="white" fillOpacity="0.8" />

        {/* ── Mouth ── */}
        <rect x="11" y="17" width="6" height="2" fill="#cc8866" fillOpacity="0.55" />

        {/* ── Busy: speech bubble ── */}
        {working && (
          <g>
            <rect x="18" y="0" width="10" height="8" rx="2"
              fill="white" fillOpacity="0.9" />
            <rect x="20" y="2" width="6" height="1.5" fill="#444" fillOpacity="0.6" />
            <rect x="20" y="4.5" width="4" height="1.5" fill="#444" fillOpacity="0.4" />
            <polygon points="20,8 18,11 22,8" fill="white" fillOpacity="0.9" />
          </g>
        )}
      </svg>
    </div>
  )
}

// ─── Placeholder (while image loads / missing) ────────────────────────────────
function Placeholder({ color, label, id }) {
  return (
    <svg
      viewBox="0 0 200 248"
      width="100%" height="100%"
      style={{ display: 'block', position: 'absolute', inset: 0 }}
    >
      <defs>
        <radialGradient id={`ph-${id}`} cx="50%" cy="40%" r="60%">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <pattern id={`pf-${id}`} x="0" y="0" width="20" height="12" patternUnits="userSpaceOnUse">
          <polygon points="10,0 20,6 10,12 0,6"
            fill={color} fillOpacity="0.07"
            stroke={color} strokeWidth="0.5" strokeOpacity="0.28" />
        </pattern>
        <filter id={`pg-${id}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
      </defs>
      <rect x="0" y="80" width="200" height="168" fill={`url(#pf-${id})`} />
      <rect x="0" y="0"  width="200" height="90"  fill={color} fillOpacity="0.09" />
      <line x1="0" y1="88" x2="200" y2="88" stroke={color} strokeOpacity="0.45" strokeWidth="1" />
      <rect x="0" y="86" width="200" height="4" fill={color} fillOpacity="0.28" />
      <rect x="0" y="0"  width="200" height="248" fill={`url(#ph-${id})`} />
      <polygon points="16,0 184,0 200,16 200,232 184,248 16,248 0,232 0,16"
        fill="none" stroke={color} strokeOpacity="0.75" strokeWidth="2" />
      {/* Spinner */}
      <g style={{ transformBox:'fill-box', transformOrigin:'100px 124px',
        animation:'roomSpin 3s linear infinite' }}>
        <circle cx="100" cy="124" r="26" fill="none"
          stroke={color} strokeWidth="1.5" strokeOpacity="0.5" strokeDasharray="6 8" />
      </g>
      <circle cx="100" cy="124" r="8" fill={color} fillOpacity="0.25"
        filter={`url(#pg-${id})`}
        style={{ animation:'roomPulse 2s ease-in-out infinite' }} />
      <circle cx="100" cy="124" r="3" fill={color} filter={`url(#pg-${id})`} />
      <text x="100" y="166" fill={color} fillOpacity="0.6" fontSize="7"
        fontFamily="Orbitron,monospace" textAnchor="middle" letterSpacing="3">{label}</text>
      <text x="100" y="178" fill={color} fillOpacity="0.3" fontSize="5"
        fontFamily="Orbitron,monospace" textAnchor="middle" letterSpacing="1">LOADING ROOM...</text>
    </svg>
  )
}

// ─── AgentRoom ────────────────────────────────────────────────────────────────
export default function AgentRoom({ id, agent }) {
  const cfg     = ROOM_CONFIG[id] || { color: '#888', label: id }
  const working = agent?.status === 'working'
  const color   = cfg.color
  const rgb     = hexToRgb(color)
  const task    = agent?.current_task || null
  const level   = agent?.level || 1
  const xpPct   = agent?.xp_pct || 0
  const name    = agent?.name || id
  const taskStr = task ? (task.length > 38 ? task.slice(0, 38) + '…' : task) : '— standby —'

  const [imgLoaded, setImgLoaded] = useState(false)
  const [imgError,  setImgError]  = useState(false)
  const hasImage = imgLoaded && !imgError

  return (
    <motion.div
      className={`agent-room ${working ? 'agent-room--on' : 'agent-room--off'}`}
      style={{ '--c': color, '--rgb': rgb }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
      whileHover={{ scale: 1.02, zIndex: 20 }}
    >
      {/* Room background image (no character — character is SVG overlay) */}
      {!imgError && (
        <img
          src={`/assets/rooms/${id}.jpg`}
          className={`room-bg-img${hasImage ? ' room-bg-img--loaded' : ''}`}
          onLoad={() => setImgLoaded(true)}
          onError={() => setImgError(true)}
          alt=""
          draggable={false}
        />
      )}

      {/* Placeholder while loading or on error */}
      {!hasImage && <Placeholder color={color} label={cfg.label} id={id} />}

      {/* Vignette for text readability */}
      <div className="room-vignette" />

      {/* Busy animated pulse */}
      {working && <div className="room-busy-pulse" style={{ '--rgb': rgb }} />}

      {/* ── Animated SVG character ── */}
      <RoomChar id={id} working={working} />

      {/* ── Header ── */}
      <div className="room-hdr">
        <span className="room-hdr-label">{cfg.label}</span>
        <span className={`room-hdr-status ${working ? 'room-hdr-status--on' : 'room-hdr-status--off'}`}>
          <span className="room-hdr-dot" />
          {working ? 'BUSY' : 'IDLE'}
        </span>
      </div>

      {/* ── Footer ── */}
      <div className="room-ftr">
        <div className="room-ftr-top">
          <span className="room-ftr-name">{name}</span>
          <span className="room-ftr-level" style={{ color }}>Lv{level}</span>
        </div>
        <div className="room-ftr-task">{taskStr}</div>
        <div className="room-ftr-xptrack">
          <div className="room-ftr-xpfill" style={{ width: `${xpPct}%`, background: color }} />
        </div>
      </div>
    </motion.div>
  )
}
