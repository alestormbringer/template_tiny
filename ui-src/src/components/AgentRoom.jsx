import { motion } from 'framer-motion'

export const ROOM_CONFIG = {
  'tinyagi':          { color: '#00d4ff', label: 'ORCHESTRATOR',   viz: 'radar'   },
  'market-analyst':   { color: '#ff6b35', label: 'MARKET ANALYST', viz: 'hud'     },
  'notion-creator':   { color: '#00ff88', label: 'DOC FORGE',      viz: 'hex'     },
  'finance-creator':  { color: '#ffd700', label: 'FINANCE CORE',   viz: 'matrix'  },
  'business-creator': { color: '#aa44ff', label: 'STRATEGY HUB',   viz: 'orbital' },
  'copywriter':       { color: '#ff44aa', label: 'CONTENT MILL',   viz: 'wave'    },
  'publisher':        { color: '#ff8c00', label: 'PUBLISH BAY',    viz: 'network' },
  'analytics':        { color: '#00e5ff', label: 'ANALYTICS GRID', viz: 'chart'   },
}

// ─── Radar ───────────────────────────────────────────────────────────────────
function RadarViz({ color, w }) {
  const cx = 100, cy = 80
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <radialGradient id={`rg-${color}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.18" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`sweep-${color}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={color} stopOpacity="0" />
          <stop offset="100%" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        <filter id={`glow-${color}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Bg radial */}
      <circle cx={cx} cy={cy} r="75" fill={`url(#rg-${color})`} />

      {/* Concentric rings */}
      {[22, 40, 58, 72].map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={color}
          strokeOpacity={0.12 + i * 0.04} strokeWidth="0.8"
          strokeDasharray={i === 3 ? '4 4' : 'none'} />
      ))}

      {/* Crosshairs */}
      <line x1={cx} y1={cy - 75} x2={cx} y2={cy + 75} stroke={color} strokeOpacity="0.08" strokeWidth="0.6" />
      <line x1={cx - 75} y1={cy} x2={cx + 75} y2={cy} stroke={color} strokeOpacity="0.08" strokeWidth="0.6" />

      {/* Sweep group */}
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpin ${w ? '2s' : '5s'} linear infinite` }}>
        <path d={`M${cx},${cy} L${cx},${cy - 72} A72,72 0 0,1 ${cx + 72 * Math.sin(Math.PI / 4)},${cy - 72 * Math.cos(Math.PI / 4)} Z`}
          fill={color} fillOpacity="0.12" />
        <line x1={cx} y1={cy} x2={cx} y2={cy - 72}
          stroke={color} strokeWidth="1.5" strokeOpacity="0.9"
          filter={`url(#glow-${color})`} />
      </g>

      {/* Blips */}
      {[[cx + 28, cy - 38], [cx - 20, cy + 30], [cx + 52, cy + 18], [cx - 44, cy - 18]].map(([bx, by], i) => (
        <circle key={i} cx={bx} cy={by} r="3" fill={color}
          style={{ animation: `roomBlink ${1.2 + i * 0.4}s ease-in-out infinite` }}
          filter={`url(#glow-${color})`} />
      ))}

      {/* Tick marks */}
      {Array.from({ length: 12 }, (_, i) => {
        const a = (i / 12) * Math.PI * 2
        return <line key={i}
          x1={cx + Math.cos(a) * 68} y1={cy + Math.sin(a) * 68}
          x2={cx + Math.cos(a) * 73} y2={cy + Math.sin(a) * 73}
          stroke={color} strokeWidth="1" strokeOpacity="0.5" />
      })}

      {/* Center dot */}
      <circle cx={cx} cy={cy} r="4" fill={color}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: 'roomPulse 1.8s ease-in-out infinite' }}
        filter={`url(#glow-${color})`} />

      {/* Readouts */}
      <text x="8" y="148" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">SIG:72%</text>
      <text x="140" y="148" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">LOCK:3</text>
    </svg>
  )
}

// ─── HUD / Multi-ring ────────────────────────────────────────────────────────
function HUDViz({ color, w }) {
  const cx = 100, cy = 78
  const segs = 10
  const dur = w ? '1.5s' : '4s'
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`gh-${color}`}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Outer segmented ring */}
      {Array.from({ length: segs }, (_, i) => {
        const a1 = (i / segs) * Math.PI * 2 - Math.PI / 2
        const a2 = ((i + 0.7) / segs) * Math.PI * 2 - Math.PI / 2
        const r = 70
        const x1 = cx + Math.cos(a1) * r, y1 = cy + Math.sin(a1) * r
        const x2 = cx + Math.cos(a2) * r, y2 = cy + Math.sin(a2) * r
        return <path key={i}
          d={`M${x1},${y1} A${r},${r} 0 0,1 ${x2},${y2}`}
          fill="none" stroke={color}
          strokeWidth={i % 2 === 0 ? '3' : '1.5'}
          strokeOpacity={i % 2 === 0 ? 0.9 : 0.3}
          filter={i % 2 === 0 ? `url(#gh-${color})` : undefined} />
      })}

      {/* Middle spinning ring */}
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpin ${dur} linear infinite` }}>
        <circle cx={cx} cy={cy} r="52" fill="none"
          stroke={color} strokeWidth="1.5" strokeOpacity="0.4"
          strokeDasharray="8 6" />
      </g>

      {/* Inner reverse ring */}
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpinRev ${w ? '2s' : '6s'} linear infinite` }}>
        <circle cx={cx} cy={cy} r="36" fill="none"
          stroke={color} strokeWidth="1" strokeOpacity="0.25"
          strokeDasharray="4 8" />
      </g>

      {/* Center diamond */}
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpin ${w ? '3s' : '8s'} linear infinite` }}>
        <polygon points={`${cx},${cy - 16} ${cx + 10},${cy} ${cx},${cy + 16} ${cx - 10},${cy}`}
          fill={color} fillOpacity="0.15"
          stroke={color} strokeWidth="1.5" strokeOpacity="0.9"
          filter={`url(#gh-${color})`} />
      </g>

      {/* Bar graphs */}
      {[0, 1, 2, 3, 4, 5].map(i => {
        const bx = 14 + i * 30
        const bh = 15 + Math.sin((i * 1.2) * Math.PI) * 12
        return (
          <g key={i}>
            <rect x={bx} y={148 - bh} width="14" height={bh}
              fill={color} fillOpacity="0.12" stroke={color} strokeWidth="0.5" strokeOpacity="0.5" />
            <rect x={bx} y={146 - bh} width="14" height="2"
              fill={color} fillOpacity="0.8"
              style={{ animation: `roomBlink ${1 + i * 0.2}s ease-in-out infinite` }} />
          </g>
        )
      })}

      <text x="84" y="153" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">ACTIVE</text>
    </svg>
  )
}

// ─── Hex grid ────────────────────────────────────────────────────────────────
function hexPoints(cx, cy, r) {
  return Array.from({ length: 6 }, (_, i) => {
    const a = (i / 6) * Math.PI * 2 - Math.PI / 6
    return `${cx + Math.cos(a) * r},${cy + Math.sin(a) * r}`
  }).join(' ')
}

function HexViz({ color, w }) {
  const centers = [
    [100, 72],
    [72, 57], [128, 57],
    [56, 83], [144, 83],
    [72, 107], [128, 107],
  ]
  const dur = w ? '1.5s' : '5s'
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`ghx-${color}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Connection lines */}
      {[[0,1],[0,2],[0,3],[0,4],[0,5],[0,6],[1,3],[2,4],[3,5],[4,6]].map(([a, b], i) => (
        <line key={i}
          x1={centers[a][0]} y1={centers[a][1]}
          x2={centers[b][0]} y2={centers[b][1]}
          stroke={color} strokeWidth="0.8" strokeOpacity="0.3"
          strokeDasharray="3 4"
          style={{ animation: `roomDash ${2 + i * 0.3}s linear infinite` }} />
      ))}

      {/* Hex cells */}
      {centers.map(([cx, cy], i) => (
        <polygon key={i} points={hexPoints(cx, cy, i === 0 ? 22 : 16)}
          fill={color} fillOpacity={i === 0 ? 0.1 : 0.04}
          stroke={color} strokeWidth={i === 0 ? '1.5' : '0.8'}
          strokeOpacity={i === 0 ? 0.9 : 0.4}
          filter={i === 0 ? `url(#ghx-${color})` : undefined}
          style={i === 0 ? {
            transformBox: 'fill-box', transformOrigin: 'center',
            animation: `roomPulse ${dur} ease-in-out infinite`
          } : undefined} />
      ))}

      {/* Center node pulsing */}
      <circle cx="100" cy="72" r="5" fill={color}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `roomPulse ${w ? '1s' : '2.5s'} ease-in-out infinite` }}
        filter={`url(#ghx-${color})`} />

      {/* Outer nodes */}
      {centers.slice(1).map(([cx, cy], i) => (
        <circle key={i} cx={cx} cy={cy} r="3" fill={color} fillOpacity="0.8"
          style={{ animation: `roomBlink ${1.5 + i * 0.3}s ease-in-out infinite` }} />
      ))}

      {/* Outer hex frame */}
      <polygon points={hexPoints(100, 80, 74)}
        fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.12"
        strokeDasharray="5 6" />

      <text x="8" y="150" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">NODES:7</text>
      <text x="140" y="150" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">SYN:OK</text>
    </svg>
  )
}

// ─── Matrix / Finance ────────────────────────────────────────────────────────
function MatrixViz({ color, w }) {
  const rows = 5, cols = 7
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`gm-${color}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Grid cells */}
      {Array.from({ length: rows }, (_, r) =>
        Array.from({ length: cols }, (_, c) => {
          const lit = (r + c) % 3 === 0 || (r * c) % 5 === 1
          return (
            <rect key={`${r}-${c}`}
              x={12 + c * 24} y={10 + r * 22}
              width="20" height="16" rx="1"
              fill={color} fillOpacity={lit ? 0.18 : 0.04}
              stroke={color} strokeWidth="0.5" strokeOpacity={lit ? 0.7 : 0.2}
              style={lit ? { animation: `roomBlink ${1.5 + (r * cols + c) * 0.15}s ease-in-out infinite` } : undefined} />
          )
        })
      )}

      {/* Highlight row */}
      {Array.from({ length: cols }, (_, c) => (
        <rect key={`h-${c}`} x={12 + c * 24} y={10 + 2 * 22} width="20" height="16" rx="1"
          fill={color} fillOpacity="0.3" stroke={color} strokeWidth="1" strokeOpacity="0.9"
          style={{ animation: `roomBlink ${w ? '0.8s' : '2s'} ease-in-out infinite` }} />
      ))}

      {/* Chart bars */}
      {[42, 28, 55, 35, 48].map((h, i) => (
        <g key={i}>
          <rect x={24 + i * 32} y={122 - h} width="18" height={h}
            fill={color} fillOpacity="0.15"
            stroke={color} strokeWidth="0.5" strokeOpacity="0.5" />
          <rect x={24 + i * 32} y={121 - h} width="18" height="2"
            fill={color} fillOpacity="0.9"
            filter={`url(#gm-${color})`} />
        </g>
      ))}

      {/* Trend arrow */}
      <path d="M 155 130 L 175 108 L 185 115 L 185 105 L 175 105 L 185 108"
        fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7"
        filter={`url(#gm-${color})`} />

      <text x="8" y="152" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">VALUE:+12.4%</text>
    </svg>
  )
}

// ─── Orbital ─────────────────────────────────────────────────────────────────
function OrbitalViz({ color, w }) {
  const cx = 100, cy = 78
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`go-${color}`}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <radialGradient id={`rgo-${color}`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={color} stopOpacity="0.25" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* Bg glow */}
      <circle cx={cx} cy={cy} r="75" fill={`url(#rgo-${color})`} />

      {/* Orbit ellipses */}
      <ellipse cx={cx} cy={cy} rx="68" ry="22"
        fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.25" />
      <ellipse cx={cx} cy={cy} rx="50" ry="45"
        fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.25" />
      <ellipse cx={cx} cy={cy} rx="28" ry="62"
        fill="none" stroke={color} strokeWidth="0.6" strokeOpacity="0.25" />

      {/* Orbiting dots */}
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpin ${w ? '3s' : '8s'} linear infinite` }}>
        <circle cx={cx + 68} cy={cy} r="5" fill={color}
          filter={`url(#go-${color})`} />
        <circle cx={cx - 68} cy={cy} r="3" fill={color} fillOpacity="0.5" />
      </g>
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpinRev ${w ? '2s' : '5s'} linear infinite` }}>
        <circle cx={cx} cy={cy - 45} r="4" fill={color}
          filter={`url(#go-${color})`} />
      </g>
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpin ${w ? '1.5s' : '4s'} linear infinite` }}>
        <circle cx={cx + 28} cy={cy} r="3.5" fill={color}
          filter={`url(#go-${color})`} />
      </g>

      {/* Center sphere */}
      <circle cx={cx} cy={cy} r="10" fill={color} fillOpacity="0.15"
        stroke={color} strokeWidth="1.5"
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `roomPulse ${w ? '1s' : '2.5s'} ease-in-out infinite` }}
        filter={`url(#go-${color})`} />
      <circle cx={cx} cy={cy} r="4" fill={color}
        filter={`url(#go-${color})`} />

      <text x="8" y="152" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">ORBIT:3</text>
      <text x="142" y="152" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">SYNC:ON</text>
    </svg>
  )
}

// ─── Wave / EQ ───────────────────────────────────────────────────────────────
function WaveViz({ color, w }) {
  const bars = [30, 55, 45, 70, 40, 65, 50, 35, 60, 48, 72, 38, 56, 44, 66, 52]
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`gw-${color}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Wave 1 */}
      <path d={`M8,80 C25,55 40,105 55,80 S80,35 95,75 S120,110 140,75 S165,45 185,80`}
        fill="none" stroke={color} strokeWidth="1.5" strokeOpacity="0.7"
        style={{ animation: `roomDash ${w ? '1.5s' : '4s'} linear infinite` }}
        strokeDasharray="6 3"
        filter={`url(#gw-${color})`} />

      {/* Wave 2 (offset) */}
      <path d={`M8,90 C30,65 45,115 60,85 S85,45 100,82 S128,118 148,82 S168,52 185,90`}
        fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.3"
        strokeDasharray="4 5"
        style={{ animation: `roomDash ${w ? '2s' : '5s'} linear infinite` }} />

      {/* EQ bars */}
      {bars.map((h, i) => (
        <rect key={i}
          x={10 + i * 11.5} y={120 - h * 0.5}
          width="8" height={h * 0.5}
          fill={color} fillOpacity="0.15"
          stroke={color} strokeWidth="0.5" strokeOpacity="0.6"
          style={{ animation: `roomEQ ${w ? 0.6 + i * 0.05 : 1.5 + i * 0.1}s ease-in-out infinite alternate` }} />
      ))}

      {/* Top line markers */}
      {[25, 50, 75].map((y, i) => (
        <line key={i} x1="8" y1={y} x2="192" y2={y}
          stroke={color} strokeWidth="0.4" strokeOpacity="0.1" />
      ))}

      <text x="8" y="155" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">FREQ:24kHz</text>
      <text x="130" y="155" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">AMP:+8dB</text>
    </svg>
  )
}

// ─── Network tree ─────────────────────────────────────────────────────────────
function NetworkViz({ color, w }) {
  const nodes = [
    [100, 20],
    [60, 55], [140, 55],
    [30, 95], [90, 95], [110, 95], [170, 95],
    [50, 135], [130, 135],
  ]
  const links = [[0,1],[0,2],[1,3],[1,4],[2,5],[2,6],[3,7],[5,8]]
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`gn-${color}`}>
          <feGaussianBlur stdDeviation="2" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id={`arr-${color}`} markerWidth="4" markerHeight="4" refX="2" refY="2" orient="auto">
          <path d="M0,0 L4,2 L0,4 Z" fill={color} fillOpacity="0.6" />
        </marker>
      </defs>

      {/* Links */}
      {links.map(([a, b], i) => (
        <line key={i}
          x1={nodes[a][0]} y1={nodes[a][1]}
          x2={nodes[b][0]} y2={nodes[b][1]}
          stroke={color} strokeWidth="0.8" strokeOpacity="0.35"
          strokeDasharray="4 4"
          style={{ animation: `roomDash ${1.5 + i * 0.25}s linear infinite` }} />
      ))}

      {/* Traveling packets */}
      {links.slice(0, 4).map(([a, b], i) => {
        const dur = w ? `${0.8 + i * 0.2}s` : `${2 + i * 0.5}s`
        return (
          <circle key={`p-${i}`} r="2.5" fill={color}
            filter={`url(#gn-${color})`}>
            <animateMotion dur={dur} repeatCount="indefinite">
              <mpath href={`#nlink-${i}`} />
            </animateMotion>
          </circle>
        )
      })}
      {/* Hidden paths for animateMotion */}
      {links.slice(0, 4).map(([a, b], i) => (
        <path key={`np-${i}`} id={`nlink-${i}`}
          d={`M${nodes[a][0]},${nodes[a][1]} L${nodes[b][0]},${nodes[b][1]}`}
          fill="none" stroke="none" />
      ))}

      {/* Nodes */}
      {nodes.map(([nx, ny], i) => (
        <circle key={i} cx={nx} cy={ny} r={i === 0 ? 7 : i < 3 ? 5 : 3.5}
          fill={color} fillOpacity={i === 0 ? 0.2 : 0.1}
          stroke={color} strokeWidth={i === 0 ? '1.5' : '0.8'}
          strokeOpacity={i === 0 ? 0.9 : 0.6}
          filter={i < 3 ? `url(#gn-${color})` : undefined}
          style={i === 0 ? {
            transformBox: 'fill-box', transformOrigin: 'center',
            animation: `roomPulse ${w ? '1s' : '2s'} ease-in-out infinite`
          } : undefined} />
      ))}

      <text x="8" y="155" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">PKTS:128</text>
      <text x="135" y="155" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">LIVE</text>
    </svg>
  )
}

// ─── Radial chart ─────────────────────────────────────────────────────────────
function ChartViz({ color, w }) {
  const cx = 100, cy = 78
  const vals = [0.85, 0.62, 0.91, 0.44, 0.78, 0.55, 0.70, 0.38]
  return (
    <svg viewBox="0 0 200 160" width="100%" height="100%" style={{ display: 'block' }}>
      <defs>
        <filter id={`gc-${color}`}>
          <feGaussianBlur stdDeviation="2.5" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>

      {/* Reference circles */}
      {[25, 45, 62].map((r, i) => (
        <circle key={i} cx={cx} cy={cy} r={r}
          fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.12" />
      ))}

      {/* Radial bars */}
      {vals.map((v, i) => {
        const a = (i / vals.length) * Math.PI * 2 - Math.PI / 2
        const r = v * 62
        const x2 = cx + Math.cos(a) * r
        const y2 = cy + Math.sin(a) * r
        const xTip = cx + Math.cos(a) * 68
        const yTip = cy + Math.sin(a) * 68
        return (
          <g key={i}>
            <line x1={cx} y1={cy} x2={xTip} y2={yTip}
              stroke={color} strokeWidth="0.4" strokeOpacity="0.1" />
            <line x1={cx} y1={cy} x2={x2} y2={y2}
              stroke={color} strokeWidth="2.5" strokeOpacity="0.8"
              filter={`url(#gc-${color})`}
              style={{ animation: `roomBlink ${1.2 + i * 0.2}s ease-in-out infinite` }} />
            <circle cx={x2} cy={y2} r="3" fill={color} fillOpacity="0.9"
              filter={`url(#gc-${color})`} />
          </g>
        )
      })}

      {/* Filled polygon */}
      <polygon
        points={vals.map((v, i) => {
          const a = (i / vals.length) * Math.PI * 2 - Math.PI / 2
          return `${cx + Math.cos(a) * v * 62},${cy + Math.sin(a) * v * 62}`
        }).join(' ')}
        fill={color} fillOpacity="0.07"
        stroke={color} strokeWidth="0.8" strokeOpacity="0.4" />

      {/* Outer spinning ring */}
      <g style={{ transformBox: 'fill-box', transformOrigin: `${cx}px ${cy}px`, animation: `roomSpin ${w ? '3s' : '9s'} linear infinite` }}>
        <circle cx={cx} cy={cy} r="72"
          fill="none" stroke={color} strokeWidth="1" strokeOpacity="0.3"
          strokeDasharray="6 8" />
      </g>

      {/* Center */}
      <circle cx={cx} cy={cy} r="5" fill={color}
        style={{ transformBox: 'fill-box', transformOrigin: 'center', animation: `roomPulse ${w ? '0.8s' : '2s'} ease-in-out infinite` }}
        filter={`url(#gc-${color})`} />

      <text x="8" y="152" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">SCORE:78%</text>
      <text x="128" y="152" fill={color} fillOpacity="0.5" fontSize="7" fontFamily="monospace">8 METRICS</text>
    </svg>
  )
}

// ─── Viz map ──────────────────────────────────────────────────────────────────
const VIZS = { radar: RadarViz, hud: HUDViz, hex: HexViz, matrix: MatrixViz, orbital: OrbitalViz, wave: WaveViz, network: NetworkViz, chart: ChartViz }

// ─── AgentRoom ───────────────────────────────────────────────────────────────
export default function AgentRoom({ id, agent }) {
  const cfg     = ROOM_CONFIG[id] || { color: '#ffffff', label: id.toUpperCase(), viz: 'radar' }
  const Viz     = VIZS[cfg.viz] || RadarViz
  const working = agent?.status === 'working'
  const color   = agent?.color || cfg.color
  const task    = agent?.current_task || null
  const level   = agent?.level || 1
  const xpPct   = agent?.xp_pct || 0

  return (
    <motion.div
      className={`agent-room ${working ? 'agent-room--working' : 'agent-room--idle'}`}
      style={{ '--rc': color, '--rc-a': color + '33', '--rc-b': color + '11' }}
      initial={{ opacity: 0, scale: 0.93 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5 }}
      whileHover={{ scale: 1.03, zIndex: 10 }}
    >
      {/* Corner brackets */}
      <span className="corner tl" /><span className="corner tr" />
      <span className="corner bl" /><span className="corner br" />

      {/* Header bar */}
      <div className="room-header">
        <span className="room-id">{cfg.label}</span>
        <motion.span
          className={`room-status ${working ? 'room-status--on' : 'room-status--idle'}`}
          animate={working ? { opacity: [1, 0.3, 1] } : {}}
          transition={{ repeat: Infinity, duration: 0.9 }}
        >
          {working ? '● ACTIVE' : '○ IDLE'}
        </motion.span>
      </div>

      {/* Main visualization */}
      <div className="room-viz">
        <Viz color={color} w={working} />
      </div>

      {/* Footer */}
      <div className="room-footer">
        <div className="room-footer-top">
          <span className="room-name">{agent?.name || id}</span>
          <span className="room-level">Lv{level}</span>
        </div>
        <div className="room-task">
          {task
            ? <span className="task-live">{task.length > 40 ? task.slice(0, 40) + '…' : task}</span>
            : <span className="task-wait">— standby —</span>
          }
        </div>
        <div className="room-xp">
          <motion.div
            className="room-xp-fill"
            style={{ background: color }}
            animate={{ width: `${xpPct}%` }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
          />
        </div>
      </div>
    </motion.div>
  )
}
