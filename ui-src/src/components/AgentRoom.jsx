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

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

// ─── Placeholder shown while image is loading or missing ─────────────────────
function Placeholder({ color, label, id }) {
  return (
    <svg viewBox="0 0 200 248" width="100%" height="100%" style={{ display:'block', position:'absolute', inset:0 }}>
      <defs>
        <radialGradient id={`ph-amb-${id}`} cx="50%" cy="40%" r="65%">
          <stop offset="0%"   stopColor={color} stopOpacity="0.22" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <pattern id={`ph-flr-${id}`} x="0" y="0" width="20" height="12" patternUnits="userSpaceOnUse">
          <polygon points="10,0 20,6 10,12 0,6"
            fill={color} fillOpacity="0.07"
            stroke={color} strokeWidth="0.5" strokeOpacity="0.28" />
        </pattern>
        <filter id={`ph-gl-${id}`} x="-80%" y="-80%" width="260%" height="260%">
          <feGaussianBlur stdDeviation="3" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Floor tiles */}
      <rect x="0" y="80" width="200" height="168" fill={`url(#ph-flr-${id})`} />
      {/* Back wall */}
      <rect x="0" y="0" width="200" height="88" fill={color} fillOpacity="0.09" />
      {/* Horizon line */}
      <line x1="0" y1="88" x2="200" y2="88" stroke={color} strokeOpacity="0.5" strokeWidth="1" />
      <rect x="0" y="86" width="200" height="4" fill={color} fillOpacity="0.28" />
      {/* Ambient glow */}
      <rect x="0" y="0" width="200" height="248" fill={`url(#ph-amb-${id})`} />

      {/* Outer border */}
      <polygon points="16,0 184,0 200,16 200,232 184,248 16,248 0,232 0,16"
        fill="none" stroke={color} strokeOpacity="0.8" strokeWidth="2" />

      {/* Corner studs */}
      {[[14,3],[186,3],[3,14],[197,14],[14,245],[186,245],[3,234],[197,234]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.8" fill={color} fillOpacity="0.9" />
      ))}

      {/* Central spinner (loading indicator) */}
      <g style={{ transformBox:'fill-box', transformOrigin:'100px 124px',
        animation:'roomSpin 3s linear infinite' }}>
        <circle cx="100" cy="124" r="28" fill="none" stroke={color} strokeWidth="1.5"
          strokeOpacity="0.5" strokeDasharray="6 8" />
      </g>
      <circle cx="100" cy="124" r="18" fill={color} fillOpacity="0.07" />
      <circle cx="100" cy="124" r="8" fill={color} fillOpacity="0.25"
        filter={`url(#ph-gl-${id})`}
        style={{ animation:'roomPulse 2s ease-in-out infinite' }} />
      <circle cx="100" cy="124" r="3" fill={color}
        filter={`url(#ph-gl-${id})`} />

      {/* Label */}
      <text x="100" y="168" fill={color} fillOpacity="0.6" fontSize="7"
        fontFamily="Orbitron,monospace" textAnchor="middle" letterSpacing="3">
        {label}
      </text>
      <text x="100" y="180" fill={color} fillOpacity="0.35" fontSize="5.5"
        fontFamily="Orbitron,monospace" textAnchor="middle" letterSpacing="1.5">
        LOADING ROOM...
      </text>
    </svg>
  )
}

// ─── AgentRoom: image background + live data overlay ─────────────────────────
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
      {/* Room background image (webp preferred, jpg fallback) */}
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

      {/* Placeholder while image loads or on error */}
      {!hasImage && <Placeholder color={color} label={cfg.label} id={id} />}

      {/* Dark vignette to make text readable */}
      <div className="room-vignette" />

      {/* Busy animated pulse overlay */}
      {working && <div className="room-busy-pulse" style={{ '--rgb': rgb }} />}

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
