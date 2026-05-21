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

// Steampunk theme: all chars wear dark coats, per-agent accent color for hat/tie
const CHAR_THEMES = {
  'tinyagi':          { accent: '#44ddff', hat: '#1a2a3a' },
  'market-analyst':   { accent: '#ffaa55', hat: '#2a1a0a' },
  'notion-creator':   { accent: '#88ddaa', hat: '#0a2a1a' },
  'finance-creator':  { accent: '#ffdd55', hat: '#2a2a0a' },
  'business-creator': { accent: '#cc88ff', hat: '#1a0a2a' },
  'copywriter':       { accent: '#ff88cc', hat: '#2a0a1a' },
  'publisher':        { accent: '#ff8866', hat: '#2a0a0a' },
  'analytics':        { accent: '#55ffdd', hat: '#0a2a2a' },
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

// ─── Steampunk pixel-art character ───────────────────────────────────────────
function RoomChar({ id, working }) {
  const t    = CHAR_THEMES[id] || CHAR_THEMES['tinyagi']
  const skin = '#d4956a'
  const coat = '#2a1f14'    // dark brown coat
  const pant = '#1a1510'    // near-black trousers
  const boot = '#0d0a07'    // dark boots
  const brass= '#c87f2a'    // brass belt buckle
  const pos  = working ? CHAR_POS.busy : CHAR_POS.idle

  return (
    <div
      className={`room-char ${working ? 'room-char--busy' : 'room-char--idle'}`}
      style={{ bottom: pos.bottom, left: pos.left }}
    >
      <svg viewBox="0 0 28 52" width="100%" height="100%"
        style={{ display: 'block', imageRendering: 'pixelated' }}>

        {/* Shadow */}
        <ellipse cx="14" cy="50" rx="7" ry="2" fill="rgba(0,0,0,0.5)" />

        {/* ── Boots ── */}
        <rect x="6"  y="41" width="6" height="8" fill={boot} />
        <rect x="16" y="41" width="6" height="8" fill={boot} />
        {/* boot buckle */}
        <rect x="7"  y="44" width="4" height="2" fill={brass} fillOpacity="0.7" />
        <rect x="17" y="44" width="4" height="2" fill={brass} fillOpacity="0.7" />

        {/* ── Trousers ── */}
        <rect x="7"  y="31" width="5" height="12" fill={pant} />
        <rect x="16" y="31" width="5" height="12" fill={pant} />

        {/* ── Coat body ── */}
        <rect x="4" y="18" width="20" height="15" fill={coat} />
        {/* coat lapels */}
        <polygon points="14,18 10,22 14,24" fill="#3a2a1a" />
        <polygon points="14,18 18,22 14,24" fill="#3a2a1a" />
        {/* brass buttons */}
        <circle cx="14" cy="26" r="1.2" fill={brass} />
        <circle cx="14" cy="30" r="1.2" fill={brass} />
        {/* belt */}
        <rect x="4" y="31" width="20" height="2" fill="#1a1208" />
        <rect x="11" y="31" width="6"  height="2" fill={brass} />

        {/* ── Arms ── */}
        {/* left arm — raised/pointing when busy, at side when idle */}
        <rect x="1" y={working ? 16 : 22} width="4"
          height={working ? 10 : 14} fill={coat} rx="1" />
        {/* right arm */}
        <rect x="23" y="22" width="4" height="14" fill={coat} rx="1" />

        {/* ── Gloved hands ── */}
        <rect x="0"  cy={working ? 25 : 34}
          y={working ? 25 : 34} width="5" height="4" fill="#1a1208" rx="1" />
        <rect x="23" y="34" width="5" height="4" fill="#1a1208" rx="1" />
        {/* brass cuff */}
        <rect x="1"  y={working ? 24 : 33} width="4" height="2" fill={brass} fillOpacity="0.8" />
        <rect x="23" y="33" width="4" height="2" fill={brass} fillOpacity="0.8" />

        {/* ── Neck / cravat ── */}
        <rect x="11" y="16" width="6" height="4" fill={skin} />
        <rect x="11" y="17" width="6" height="3" fill={t.accent} fillOpacity="0.6" />

        {/* ── Head ── */}
        <rect x="7" y="5" width="14" height="14" fill={skin} />
        {/* sideburns */}
        <rect x="6"  y="9" width="2" height="6" fill="#5a3a1a" fillOpacity="0.6" />
        <rect x="20" y="9" width="2" height="6" fill="#5a3a1a" fillOpacity="0.6" />

        {/* ── Goggles on forehead ── */}
        <rect x="7" y="5" width="14" height="4" fill={t.hat} />
        <circle cx="10" cy="7" r="2.5" fill="#0a0808" stroke={brass} strokeWidth="0.8" />
        <circle cx="18" cy="7" r="2.5" fill="#0a0808" stroke={brass} strokeWidth="0.8" />
        <circle cx="10" cy="7" r="1.2" fill={t.accent} fillOpacity="0.5" />
        <circle cx="18" cy="7" r="1.2" fill={t.accent} fillOpacity="0.5" />
        {/* goggle strap */}
        <rect x="12" y="6" width="4" height="2" fill={brass} fillOpacity="0.6" />

        {/* ── Top hat ── */}
        <rect x="8"  y="0"  width="12" height="6" fill={t.hat} />
        <rect x="5"  y="5"  width="18" height="2" fill={t.hat} />
        {/* hat band */}
        <rect x="8"  y="4"  width="12" height="2" fill={t.accent} fillOpacity="0.5" />

        {/* ── Eyes ── */}
        <rect x="9"  y="10" width="3" height="3" fill="#1a0e08" />
        <rect x="16" y="10" width="3" height="3" fill="#1a0e08" />
        <rect x="9"  y="10" width="1" height="1" fill="white" fillOpacity="0.9" />
        <rect x="16" y="10" width="1" height="1" fill="white" fillOpacity="0.9" />

        {/* ── Moustache ── */}
        <rect x="10" y="15" width="8" height="2" fill="#3a2010" />
        <rect x="11" y="14" width="3" height="1" fill="#3a2010" />
        <rect x="14" y="14" width="3" height="1" fill="#3a2010" />

        {/* Busy: gear/tool in hand */}
        {working && (
          <g>
            <circle cx="3" cy="24" r="4" fill="none" stroke={brass} strokeWidth="1.2" />
            <circle cx="3" cy="24" r="1.5" fill={brass} fillOpacity="0.7" />
            {[0,60,120,180,240,300].map(deg => {
              const r = deg * Math.PI / 180
              const x = 3 + Math.cos(r) * 4.5
              const y = 24 + Math.sin(r) * 4.5
              return <rect key={deg} x={x-0.8} y={y-0.8} width="1.6" height="1.6" fill={brass} />
            })}
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
          src={`/assets/rooms/${id}.png`}
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
