import { motion } from 'framer-motion'

export const ROOM_CONFIG = {
  'tinyagi':          { color: '#00d4ff', label: 'NEXUS'    },
  'market-analyst':   { color: '#ff6b35', label: 'MARKET'   },
  'notion-creator':   { color: '#00ff88', label: 'DOC FORGE'},
  'finance-creator':  { color: '#ffd700', label: 'FINANCE'  },
  'business-creator': { color: '#aa44ff', label: 'STRATEGY' },
  'copywriter':       { color: '#ff44aa', label: 'CONTENT'  },
  'publisher':        { color: '#ff8c00', label: 'PUBLISH'  },
  'analytics':        { color: '#00e5ff', label: 'ANALYTICS'},
}

function hexToRgb(hex) {
  return `${parseInt(hex.slice(1,3),16)},${parseInt(hex.slice(3,5),16)},${parseInt(hex.slice(5,7),16)}`
}

// ─── Shared SVG defs ──────────────────────────────────────────────────────────
function Defs({ color, id, floor = 'tile' }) {
  return (
    <defs>
      <radialGradient id={`amb-${id}`} cx="50%" cy="45%" r="65%">
        <stop offset="0%"   stopColor={color} stopOpacity="0.3" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <radialGradient id={`amb2-${id}`} cx="50%" cy="45%" r="50%">
        <stop offset="0%"   stopColor={color} stopOpacity="0.08" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <pattern id={`flr-${id}`} x="0" y="0" width="16" height="16" patternUnits="userSpaceOnUse">
        {floor === 'tile' && (
          <g>
            <rect width="16" height="16" fill={color} fillOpacity="0.03" />
            <path d="M 16 0 L 0 0 0 16" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.25" />
          </g>
        )}
        {floor === 'dot' && (
          <g>
            <rect width="16" height="16" fill={color} fillOpacity="0.03" />
            <circle cx="8" cy="8" r="1.1" fill={color} fillOpacity="0.3" />
          </g>
        )}
        {floor === 'iso' && (
          <g>
            <rect width="16" height="16" fill={color} fillOpacity="0.03" />
            <path d="M 0 8 L 8 0 L 16 8 L 8 16 Z" fill="none" stroke={color} strokeWidth="0.5" strokeOpacity="0.22" />
          </g>
        )}
        {floor === 'cross' && (
          <g>
            <rect width="16" height="16" fill={color} fillOpacity="0.03" />
            <line x1="8" y1="4" x2="8" y2="12" stroke={color} strokeWidth="0.5" strokeOpacity="0.22" />
            <line x1="4" y1="8" x2="12" y2="8" stroke={color} strokeWidth="0.5" strokeOpacity="0.22" />
          </g>
        )}
      </pattern>
      <filter id={`gl-${id}`} x="-80%" y="-80%" width="260%" height="260%">
        <feGaussianBlur stdDeviation="2.5" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
      <filter id={`sg-${id}`} x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.2" result="b" />
        <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
      </filter>
    </defs>
  )
}

// ─── Room background: floor + walls + corner studs ────────────────────────────
function Bg({ color, id }) {
  const pts = '16,0 184,0 200,16 200,232 184,248 16,248 0,232 0,16'
  return (
    <>
      <rect x="0" y="0" width="200" height="248" fill={`url(#flr-${id})`} />
      <rect x="0" y="0" width="200" height="248" fill={`url(#amb-${id})`} />
      {/* Wall polygon */}
      <polygon points={pts} fill="none" stroke={color} strokeOpacity="0.7" strokeWidth="2.5" />
      <polygon points="18,2 182,2 198,18 198,230 182,246 18,246 2,230 2,18"
        fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="0.5" />
      {/* Wall trim line inner top */}
      <line x1="0" y1="18" x2="200" y2="18" stroke={color} strokeOpacity="0.22" strokeWidth="0.5" />
      <line x1="0" y1="230" x2="200" y2="230" stroke={color} strokeOpacity="0.22" strokeWidth="0.5" />
      {/* Corner studs */}
      {[[14,3],[186,3],[3,14],[197,14],[14,245],[186,245],[3,234],[197,234]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.5" fill={color} fillOpacity="0.85" filter={`url(#sg-${id})`} />
      ))}
      {/* Door slit top */}
      <rect x="90" y="0" width="20" height="4" fill="rgba(0,0,0,0.9)" />
      <rect x="92" y="1" width="16" height="2" fill={color} fillOpacity="0.7"
        style={{ animation: 'roomBlink 2.5s ease-in-out infinite' }} />
    </>
  )
}

// ─── Agent info overlay (bottom of SVG) ───────────────────────────────────────
function Info({ color, id, label, name, task, level, xpPct, working }) {
  const taskStr = task ? (task.length > 34 ? task.slice(0, 34) + '…' : task) : '— standby —'
  return (
    <g>
      <rect x="0" y="248" width="200" height="32" fill="rgba(0,0,2,0.85)" />
      <line x1="0" y1="248" x2="200" y2="248" stroke={color} strokeOpacity="0.55" strokeWidth="1" />
      {/* Label */}
      <text x="8" y="258" fill={color} fillOpacity="0.95" fontSize="6.5"
        fontFamily="Orbitron,monospace" letterSpacing="2.5" fontWeight="700">{label}</text>
      {/* Status dot */}
      <circle cx="192" cy="255" r="3"
        fill={working ? '#00ff88' : 'rgba(255,255,255,0.15)'}
        filter={working ? `url(#gl-${id})` : undefined}
        style={working ? { animation: 'roomBlink 0.9s ease-in-out infinite' } : undefined} />
      {/* Agent name */}
      <text x="8" y="268" fill="#d0d0f0" fontSize="8.5"
        fontFamily="Rajdhani,sans-serif" fontWeight="700">{name}</text>
      <text x="178" y="268" fill={color} fontSize="7"
        fontFamily="Orbitron,monospace" textAnchor="end">Lv{level}</text>
      {/* Task */}
      <text x="8" y="277" fill="#6060a0" fontSize="7"
        fontFamily="Rajdhani,sans-serif">{taskStr}</text>
      {/* XP bar */}
      <rect x="0" y="279" width="200" height="1.5" fill={`rgba(${hexToRgb(color)},0.12)`} />
      <rect x="0" y="279" width={xpPct * 2} height="1.5" fill={color} fillOpacity="0.85" />
    </g>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Term({ x, y, color, id, w = 14, h = 12, rate = 1.5, lit = true }) {
  return (
    <g>
      <rect x={x} y={y+h-2} width={w} height={2.5} fill="rgba(0,0,0,0.6)" />
      <rect x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.75)"
        stroke={color} strokeWidth="0.7" strokeOpacity="0.9" />
      <rect x={x+1.5} y={y+1.5} width={w-3} height={h-5.5} fill={color}
        fillOpacity={lit ? 0.9 : 0.2} filter={lit ? `url(#sg-${id})` : undefined}
        style={lit ? { animation: `roomBlink ${rate}s ease-in-out infinite` } : undefined} />
      <line x1={x+1.5} y1={y+h-3.5} x2={x+w-1.5} y2={y+h-3.5}
        stroke={color} strokeOpacity="0.55" strokeWidth="0.4" />
    </g>
  )
}

function Scr({ x, y, w = 26, h = 13, color, id, content = 'bars', rate = 1.5 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="rgba(0,0,0,0.85)"
        stroke={color} strokeWidth="0.8" strokeOpacity="0.95" />
      <rect x={x} y={y} width={w} height="2" fill={color} fillOpacity="0.65" />
      {content === 'bars' && Array.from({ length: 5 }, (_, i) => {
        const bh = [4, 7, 5, 9, 6][i]
        return <rect key={i} x={x+2+i*(w-4)/5} y={y+h-2-bh} width={(w-4)/5-0.5} height={bh}
          fill={color} fillOpacity="0.95" filter={`url(#sg-${id})`}
          style={{ animation: `roomBarPulse ${0.8+i*0.2}s ease-in-out infinite alternate`,
                   transformBox: 'fill-box', transformOrigin: 'bottom' }} />
      })}
      {content === 'line' && (
        <polyline points={`${x+2},${y+h-3} ${x+w*0.2},${y+3} ${x+w*0.4},${y+h-4} ${x+w*0.65},${y+2} ${x+w-2},${y+h-3}`}
          fill="none" stroke={color} strokeWidth="1" strokeOpacity="1" filter={`url(#sg-${id})`} />
      )}
      {content === 'wave' && (
        <path d={`M${x+1},${y+h/2} Q${x+w/4},${y+1} ${x+w/2},${y+h/2} T${x+w-1},${y+h/2}`}
          fill="none" stroke={color} strokeWidth="1" strokeOpacity="1" filter={`url(#sg-${id})`} />
      )}
      {content === 'dot' && Array.from({ length: 6 }, (_, i) => (
        <circle key={i} cx={x+2+i*(w-4)/5} cy={y+h/2} r="0.9" fill={color}
          style={{ animation: `roomBlink ${0.6+i*0.2}s ease-in-out infinite` }} />
      ))}
    </g>
  )
}

function Char({ x, y, color, id, skin, dur = 0.75 }) {
  const s = skin || color
  return (
    <g style={{ animation: `roomCharBob ${dur}s ease-in-out infinite alternate`,
                transformBox: 'fill-box', transformOrigin: 'bottom' }}>
      <ellipse cx={x+3} cy={y+14} rx="3.5" ry="1" fill="rgba(0,0,0,0.6)" />
      <rect x={x+1.5} y={y+10} width="1.5" height="4" fill="#131320" />
      <rect x={x+3.5} y={y+10} width="1.5" height="4" fill="#131320" />
      <rect x={x+1} y={y+4.5} width="5" height="5.5" fill={s} stroke="#080818" strokeWidth="0.4" />
      <rect x={x+1.4} y={y+4.5} width="5" height="1.2" fill="rgba(0,0,0,0.5)" />
      <rect x={x+1.4} y={y} width="4.2" height="4.5" fill={s} stroke="#080818" strokeWidth="0.4" />
      <rect x={x+2.2} y={y+1.6} width="0.8" height="0.8" fill="#050510" />
      <rect x={x+4}   y={y+1.6} width="0.8" height="0.8" fill="#050510" />
    </g>
  )
}

function Crate({ x, y, color, id, w = 12, h = 12 }) {
  return (
    <g>
      <rect x={x+0.5} y={y+h-1} width={w} height="1.5" fill="rgba(0,0,0,0.45)" />
      <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.22"
        stroke={color} strokeWidth="0.8" strokeOpacity="0.8" />
      <line x1={x} y1={y+h/2} x2={x+w} y2={y+h/2} stroke={color} strokeOpacity="0.5" strokeWidth="0.4" />
      <line x1={x+w/2} y1={y} x2={x+w/2} y2={y+h} stroke={color} strokeOpacity="0.5" strokeWidth="0.4" />
      <circle cx={x+w/2} cy={y+h/2} r="1" fill={color} fillOpacity="0.9" filter={`url(#sg-${id})`} />
    </g>
  )
}

function Lamp({ x, y, color, id, rate = 1.3 }) {
  return (
    <g>
      <circle cx={x} cy={y} r="3" fill={color} fillOpacity="0.15" />
      <circle cx={x} cy={y} r="1.5" fill={color} filter={`url(#gl-${id})`}
        style={{ animation: `roomBlink ${rate}s ease-in-out infinite` }} />
    </g>
  )
}

// ─── ROOM 1: NEXUS — Command center ───────────────────────────────────────────
function NexusRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} floor="tile" />
      <Bg color={c} id={id} />
      {/* Top row: 5 wall screens */}
      {[16,52,88,124,160].map((x,i)=>(
        <Scr key={i} x={x} y={22} w={28} h={13} color={c} id={id}
          content={['bars','line','wave','bars','dot'][i]} rate={0.9+i*0.2} />
      ))}
      {/* Central core + spinning rings */}
      <circle cx="100" cy="120" r="30" fill={c} fillOpacity="0.06" />
      {[50,38,26].map((r,i)=>(
        <g key={i} style={{ transformBox:'fill-box', transformOrigin:'100px 120px',
          animation:`${i%2===0?'roomSpin':'roomSpinRev'} ${working?2+i:5+i*2}s linear infinite` }}>
          <circle cx="100" cy="120" r={r} fill="none" stroke={c}
            strokeOpacity={0.35+i*0.12} strokeWidth={i===2?2:1}
            strokeDasharray={i===0?'4 5':i===1?'2 4':'none'} />
          {i===1 && [0,90,180,270].map(a=>{
            const rad=a*Math.PI/180
            return <circle key={a} cx={100+Math.cos(rad)*r} cy={120+Math.sin(rad)*r}
              r="2.5" fill={c} filter={`url(#gl-${id})`} />
          })}
        </g>
      ))}
      {/* Sweep */}
      <g style={{ transformBox:'fill-box', transformOrigin:'100px 120px',
        animation:`roomSpin ${working?1.8:4.5}s linear infinite` }}>
        <path d={`M100,120 L100,70 A50,50 0 0,1 ${100+50*Math.sin(Math.PI/4)},${120-50*Math.cos(Math.PI/4)} Z`}
          fill={c} fillOpacity="0.18" />
        <line x1="100" y1="120" x2="100" y2="70" stroke={c} strokeWidth="2" strokeOpacity="0.9"
          filter={`url(#gl-${id})`} />
      </g>
      {/* Center core */}
      <circle cx="100" cy="120" r="12" fill={`url(#amb2-${id})`} stroke={c} strokeWidth="1.8"
        style={{ transformBox:'fill-box', transformOrigin:'center',
          animation:`roomPulse ${working?'0.9s':'2.2s'} ease-in-out infinite` }}
        filter={`url(#gl-${id})`} />
      <circle cx="100" cy="120" r="5" fill={c} filter={`url(#gl-${id})`} />
      <circle cx="100" cy="120" r="2" fill="#fff" filter={`url(#gl-${id})`} />
      {/* Radar blips */}
      {[[130,95],[75,140],[140,140],[68,96],[120,152]].map(([bx,by],i)=>(
        <circle key={i} cx={bx} cy={by} r={i===0?3.5:2.5} fill={c} filter={`url(#gl-${id})`}
          style={{ animation:`roomBlink ${1+i*0.35}s ease-in-out infinite` }} />
      ))}
      {/* Tick marks */}
      {Array.from({length:16},(_,i)=>{
        const a=(i/16)*Math.PI*2
        return <line key={i}
          x1={100+Math.cos(a)*50} y1={120+Math.sin(a)*50}
          x2={100+Math.cos(a)*56} y2={120+Math.sin(a)*56}
          stroke={c} strokeWidth="1.2" strokeOpacity="0.55" />
      })}
      {/* Corner consoles */}
      <Term x={14} y={48} color={c} id={id} w={20} h={16} rate={1.6} />
      <Term x={166} y={48} color={c} id={id} w={20} h={16} rate={1.2} />
      <Term x={14} y={162} color={c} id={id} w={20} h={16} rate={1.8} />
      <Term x={166} y={162} color={c} id={id} w={20} h={16} rate={1.4} />
      {/* Cables */}
      {[[24,64],[176,64],[24,170],[176,170]].map(([cx2,cy2],i)=>(
        <line key={i} x1={cx2} y1={cy2} x2="100" y2="120"
          stroke={c} strokeWidth="0.6" strokeOpacity="0.35" strokeDasharray="2 3"
          style={{ animation:`roomDash ${1.5+i*0.35}s linear infinite` }} />
      ))}
      {/* Characters */}
      <Char x={84} y={196} color={c} id={id} skin="#88ccff" dur={0.7} />
      <Char x={110} y={194} color={c} id={id} skin="#66aaee" dur={0.9} />
      {/* Wall lamps */}
      <Lamp x={12} y={120} color={c} id={id} rate={1.4} />
      <Lamp x={188} y={120} color={c} id={id} rate={1.1} />
      <Lamp x={100} y={8} color={c} id={id} rate={1.8} />
    </>
  )
}

// ─── ROOM 2: MARKET — Trading floor ───────────────────────────────────────────
function MarketRoom({ id, color, working }) {
  const c = color
  const barH = [10,16,12,22,14,20,26,16,24,18,28,13,21,15]
  return (
    <>
      <Defs color={c} id={id} floor="dot" />
      <Bg color={c} id={id} />
      {/* Back wall screens */}
      {[10,44,78,112,146,170].map((x,i)=>(
        <Scr key={i} x={x} y={20} w={28} h={16} color={c} id={id}
          content={i%2===0?'line':'bars'} rate={0.8+i*0.18} />
      ))}
      {/* Long trading desk */}
      <rect x="16" y="62" width="168" height="14" fill={c} fillOpacity="0.2"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.85" />
      <rect x="16" y="60" width="168" height="3" fill={c} fillOpacity="0.65" />
      {/* Desk monitors */}
      {[24,52,80,108,136,162].map((x,i)=>(
        <Term key={i} x={x} y={48} color={c} id={id} w={18} h={13} rate={0.9+i*0.15} />
      ))}
      {/* Chairs */}
      {[32,64,96,128,160].map((x,i)=>(
        <ellipse key={i} cx={x} cy={82} rx="5" ry="2.2" fill={c} fillOpacity="0.3"
          stroke={c} strokeWidth="0.5" strokeOpacity="0.6" />
      ))}
      {/* Ticker tape */}
      <rect x="14" y="92" width="172" height="7" fill="rgba(0,0,0,0.8)"
        stroke={c} strokeWidth="0.5" strokeOpacity="0.65" />
      {Array.from({length:16},(_,i)=>(
        <circle key={i} cx={18+i*11} cy={95.5} r="1" fill={c} fillOpacity="0.9"
          style={{ animation:`roomBlink ${0.4+i*0.09}s ease-in-out infinite` }} />
      ))}
      {/* Floor chart */}
      <rect x="16" y="108" width="168" height="50" fill="rgba(0,0,0,0.8)"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.8" />
      {barH.map((h,i)=>(
        <rect key={i} x={18+i*11.7} y={158-h} width={9.5} height={h}
          fill={c} fillOpacity="0.9" filter={`url(#sg-${id})`}
          style={{ animation:`roomBarPulse ${0.7+i*0.1}s ease-in-out infinite alternate`,
                   transformBox:'fill-box', transformOrigin:'bottom' }} />
      ))}
      {/* Price chart line */}
      <polyline
        points={barH.map((h,i)=>`${22+i*11.7},${158-h}`).join(' ')}
        fill="none" stroke={c} strokeWidth="1.2" strokeOpacity="0.7"
        filter={`url(#sg-${id})`} />
      {/* Up arrow */}
      <path d="M 180 118 L 180 108 M 176 112 L 180 108 L 184 112"
        fill="none" stroke={c} strokeWidth="2" strokeLinecap="round"
        filter={`url(#gl-${id})`} />
      {/* Characters */}
      <Char x={60} y={164} color={c} id={id} skin="#ffbb88" dur={0.6} />
      <Char x={100} y={166} color={c} id={id} skin="#ffaa66" dur={0.8} />
      <Char x={140} y={164} color={c} id={id} skin="#ff9944" dur={1.0} />
      <Lamp x={14} y={14} color={c} id={id} rate={1.5} />
      <Lamp x={186} y={14} color={c} id={id} rate={1.2} />
    </>
  )
}

// ─── ROOM 3: DOC FORGE — Library ──────────────────────────────────────────────
function DocRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} floor="cross" />
      <Bg color={c} id={id} />
      {/* Left bookshelves */}
      {[20,38,56,74].map((y,i)=>(
        <g key={`l${i}`}>
          <rect x="10" y={y} width="26" height="16" fill={c} fillOpacity="0.16"
            stroke={c} strokeWidth="0.7" strokeOpacity="0.75" />
          {[0,1,2,3,4].map(j=>(
            <rect key={j} x={12+j*4.5} y={y+2} width="3.5" height="12"
              fill={c} fillOpacity={0.3+j*0.12} stroke="rgba(0,0,0,0.3)" strokeWidth="0.3" />
          ))}
        </g>
      ))}
      {/* Right bookshelves */}
      {[20,38,56,74].map((y,i)=>(
        <g key={`r${i}`}>
          <rect x="164" y={y} width="26" height="16" fill={c} fillOpacity="0.16"
            stroke={c} strokeWidth="0.7" strokeOpacity="0.75" />
          {[0,1,2,3,4].map(j=>(
            <rect key={j} x={166+j*4.5} y={y+2} width="3.5" height="12"
              fill={c} fillOpacity={0.3+j*0.12} stroke="rgba(0,0,0,0.3)" strokeWidth="0.3" />
          ))}
        </g>
      ))}
      {/* Pedestal */}
      <rect x="78" y="96" width="44" height="22" fill={c} fillOpacity="0.2"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.9" />
      {/* Open glowing book */}
      <g style={{ transformBox:'fill-box', transformOrigin:'100px 82px',
        animation:`roomPulse ${working?'1.1s':'2.8s'} ease-in-out infinite` }}>
        <rect x="76" y="72" width="48" height="22" fill="rgba(0,0,0,0.8)"
          stroke={c} strokeWidth="0.9" strokeOpacity="1" filter={`url(#sg-${id})`} />
        <line x1="100" y1="72" x2="100" y2="94" stroke={c} strokeWidth="0.6" strokeOpacity="0.8" />
        {[76,88,102,114].map((x,i)=>(
          <line key={i} x1={x} y1={i<2?78:78} x2={i<2?x+8:x+8} y2={i<2?78:78}
            stroke={c} strokeOpacity="0.7" strokeWidth="0.5" />
        ))}
        {[76,88,102,114].map((x,i)=>(
          <line key={`b${i}`} x1={x} y1={84} x2={x+8} y2={84}
            stroke={c} strokeOpacity="0.55" strokeWidth="0.5" />
        ))}
        {[76,88,102,114].map((x,i)=>(
          <line key={`c${i}`} x1={x} y1={90} x2={x+8} y2={90}
            stroke={c} strokeOpacity="0.35" strokeWidth="0.5" />
        ))}
      </g>
      {/* Book aura */}
      <circle cx="100" cy="84" r="22" fill={c} fillOpacity="0.15" filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'1s':'2.5s'} ease-in-out infinite` }} />
      {/* Floating particles */}
      {[[84,62],[116,62],[100,56],[76,78],[124,78],[86,108],[114,108]].map(([px,py],i)=>(
        <circle key={i} cx={px} cy={py} r="1.4" fill={c} filter={`url(#gl-${id})`}
          style={{ animation:`roomBlink ${0.8+i*0.22}s ease-in-out infinite` }} />
      ))}
      {/* Writing desks */}
      <rect x="42" y="156" width="36" height="14" fill={c} fillOpacity="0.2"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.75" />
      <rect x="122" y="156" width="36" height="14" fill={c} fillOpacity="0.2"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.75" />
      <Term x={48} y={142} color={c} id={id} w={14} h={13} rate={1.3} />
      <Term x={130} y={142} color={c} id={id} w={14} h={13} rate={1.6} />
      {/* Scrolls on floor */}
      {[[56,168],[68,170],[134,166],[146,170]].map(([px,py],i)=>(
        <ellipse key={i} cx={px} cy={py} rx="3.5" ry="1.8" fill={c} fillOpacity="0.7"
          stroke={c} strokeWidth="0.3" />
      ))}
      {/* Characters */}
      <Char x={52} y={180} color={c} id={id} skin="#55dd88" dur={0.65} />
      <Char x={130} y={180} color={c} id={id} skin="#44cc77" dur={0.9} />
      <Lamp x={56} y={12} color={c} id={id} rate={1.6} />
      <Lamp x={144} y={12} color={c} id={id} rate={1.3} />
    </>
  )
}

// ─── ROOM 4: FINANCE — Vault ───────────────────────────────────────────────────
function FinanceRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} floor="iso" />
      <Bg color={c} id={id} />
      {/* Vault door */}
      <g style={{ transformBox:'fill-box', transformOrigin:'100px 76px',
        animation:`roomSpin ${working?8:22}s linear infinite` }}>
        <circle cx="100" cy="76" r="46" fill="rgba(0,0,0,0.72)"
          stroke={c} strokeWidth="2" strokeOpacity="0.95" />
        <circle cx="100" cy="76" r="36" fill="none" stroke={c} strokeWidth="1" strokeOpacity="0.65" />
        <circle cx="100" cy="76" r="26" fill="none" stroke={c} strokeWidth="0.7" strokeOpacity="0.45" />
        {[0,45,90,135,180,225,270,315].map((a,i)=>{
          const r=a*Math.PI/180
          return <line key={i}
            x1={100+Math.cos(r)*10} y1={76+Math.sin(r)*10}
            x2={100+Math.cos(r)*36} y2={76+Math.sin(r)*36}
            stroke={c} strokeWidth="0.9" strokeOpacity="0.75" />
        })}
        <circle cx="100" cy="76" r="8" fill={c} fillOpacity="0.45"
          stroke={c} strokeWidth="1.5" />
        <line x1="100" y1="68" x2="100" y2="84" stroke={c} strokeWidth="1.5" strokeOpacity="0.9" />
        <line x1="92" y1="76" x2="108" y2="76" stroke={c} strokeWidth="1.5" strokeOpacity="0.9" />
      </g>
      {/* Vault glow */}
      <circle cx="100" cy="76" r="52" fill={c} fillOpacity="0.06" filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'1.2s':'3s'} ease-in-out infinite` }} />
      {/* Gold bars left */}
      {[0,1,2,3].map(i=>(
        <rect key={`lb${i}`} x={14} y={152-i*5} width="24" height="4.5"
          fill={c} fillOpacity={0.55+i*0.1} stroke="#080808" strokeWidth="0.4" />
      ))}
      {/* Gold bars right */}
      {[0,1,2,3,4].map(i=>(
        <rect key={`rb${i}`} x={162} y={148-i*5} width="24" height="4.5"
          fill={c} fillOpacity={0.55+i*0.08} stroke="#080808" strokeWidth="0.4" />
      ))}
      {/* Coin piles center */}
      {[[72,170],[80,172],[88,168],[108,170],[116,172],[124,168],[100,174]].map(([px,py],i)=>(
        <g key={i}>
          <circle cx={px} cy={py} r="3" fill={c} fillOpacity="0.85"
            stroke="#050510" strokeWidth="0.3" />
          <circle cx={px-0.8} cy={py-0.8} r="0.7" fill="#fff" fillOpacity="0.5" />
        </g>
      ))}
      {/* Counter terminals */}
      <Scr x={14} y={122} w={36} h={14} color={c} id={id} content="bars" rate={1.3} />
      <Scr x={150} y={122} w={36} h={14} color={c} id={id} content="line" rate={1.1} />
      {/* Characters */}
      <Char x={90} y={140} color={c} id={id} skin="#ffcc44" dur={0.9} />
      <Char x={44} y={178} color={c} id={id} skin="#eeaa22" dur={1.1} />
      <Lamp x={14} y={14} color={c} id={id} rate={1.4} />
      <Lamp x={186} y={14} color={c} id={id} rate={1.2} />
      <Lamp x={100} y={130} color={c} id={id} rate={1.7} />
    </>
  )
}

// ─── ROOM 5: STRATEGY — War room ──────────────────────────────────────────────
function StrategyRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} floor="dot" />
      <Bg color={c} id={id} />
      {/* Wall screens */}
      {[12,50,88,124,162].map((x,i)=>(
        <Scr key={i} x={x} y={20} w={30} h={15} color={c} id={id}
          content={['line','bars','dot','line','bars'][i]} rate={0.9+i*0.2} />
      ))}
      {/* Holo table */}
      <ellipse cx="100" cy="122" rx="62" ry="18" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.85" />
      <ellipse cx="100" cy="120" rx="60" ry="17" fill={c} fillOpacity="0.22"
        filter={`url(#sg-${id})`} />
      {/* Holo projection above table */}
      {[1,2].map(i=>(
        <g key={i} style={{ transformBox:'fill-box', transformOrigin:'100px 90px',
          animation:`${i%2===0?'roomSpin':'roomSpinRev'} ${working?3+i:8+i*2}s linear infinite` }}>
          <ellipse cx="100" cy="90" rx={30+i*14} ry={8+i*4} fill="none"
            stroke={c} strokeWidth="0.8" strokeOpacity={0.55-i*0.12}
            strokeDasharray={i===0?'3 3':'none'} />
          <circle cx={100+(30+i*14)} cy="90" r="2.2" fill={c} filter={`url(#gl-${id})`} />
        </g>
      ))}
      <circle cx="100" cy="90" r="7" fill={c} filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'0.9s':'2.2s'} ease-in-out infinite` }} />
      <circle cx="100" cy="90" r="2.5" fill="#fff" filter={`url(#gl-${id})`} />
      {/* Table beam */}
      <path d="M 84 108 L 100 90 L 116 108 Z" fill={c} fillOpacity="0.1"
        stroke={c} strokeWidth="0.4" strokeOpacity="0.4" />
      {/* Floor strategy markers */}
      {[[60,115],[140,115],[70,130],[130,130],[100,136]].map(([px,py],i)=>(
        <circle key={i} cx={px} cy={py} r="1.5" fill={c} filter={`url(#gl-${id})`}
          style={{ animation:`roomBlink ${0.9+i*0.28}s ease-in-out infinite` }} />
      ))}
      {/* Floor terminals */}
      <Term x={14} y={154} color={c} id={id} w={20} h={16} rate={1.5} />
      <Term x={166} y={154} color={c} id={id} w={20} h={16} rate={1.2} />
      {/* Characters around table */}
      <Char x={34} y={114} color={c} id={id} skin="#cc88ff" dur={0.7} />
      <Char x={162} y={114} color={c} id={id} skin="#bb77ee" dur={0.9} />
      <Char x={70} y={174} color={c} id={id} skin="#aa66dd" dur={0.8} />
      <Char x={120} y={176} color={c} id={id} skin="#cc88ff" dur={1.1} />
      <Lamp x={14} y={100} color={c} id={id} rate={1.4} />
      <Lamp x={186} y={100} color={c} id={id} rate={1.1} />
    </>
  )
}

// ─── ROOM 6: CONTENT — Studio ─────────────────────────────────────────────────
function ContentRoom({ id, color, working }) {
  const c = color
  const eqH = [6,11,8,16,10,14,20,12,18,14,22,10,16,12,18,10,14,8]
  return (
    <>
      <Defs color={c} id={id} floor="dot" />
      <Bg color={c} id={id} />
      {/* Big display wall */}
      <rect x="16" y="18" width="168" height="52" fill="rgba(0,0,0,0.9)"
        stroke={c} strokeWidth="1.2" strokeOpacity="1" />
      <rect x="16" y="18" width="168" height="3" fill={c} fillOpacity="0.75" />
      {/* Text content on screen */}
      {[0,1,2,3,4,5].map(i=>(
        <rect key={i} x={22} y={26+i*7} width={i%2===0?150:110} height="2.5"
          fill={c} fillOpacity={i===0?1:0.6}
          style={{ animation:`roomBlink ${0.7+i*0.35}s ease-in-out infinite` }} />
      ))}
      {/* Cursor */}
      <rect x="136" y="61" width="4" height="4" fill={c} filter={`url(#gl-${id})`}
        style={{ animation:'roomBlink 0.5s ease-in-out infinite' }} />
      {/* Spotlight cones */}
      <path d="M 50 18 L 65 80 L 110 80 L 125 18 Z" fill={c} fillOpacity="0.04"
        stroke={c} strokeWidth="0.4" strokeOpacity="0.2" />
      {/* Writing desk */}
      <rect x="38" y="82" width="124" height="14" fill={c} fillOpacity="0.2"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.85" />
      <rect x="38" y="80" width="124" height="3" fill={c} fillOpacity="0.6" />
      {/* Desk items */}
      <Term x={48} y={70} color={c} id={id} w={22} h={12} rate={1.2} />
      <Term x={80} y={70} color={c} id={id} w={22} h={12} rate={1.6} />
      <Term x={120} y={70} color={c} id={id} w={22} h={12} rate={1.0} />
      {/* Microphone */}
      <rect x="97" y="73" width="6" height="9" fill="#0a0a1a" stroke={c} strokeWidth="0.5" />
      <circle cx="100" cy="72" r="4" fill={c} fillOpacity="0.9" filter={`url(#sg-${id})`} />
      <circle cx="100" cy="72" r="1.5" fill="#fff" fillOpacity="0.8" />
      {/* EQ bars */}
      <rect x="16" y="106" width="168" height="30" fill="rgba(0,0,0,0.8)"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.7" />
      {eqH.map((h,i)=>(
        <rect key={i} x={18+i*9} y={136-h} width="7" height={h}
          fill={c} fillOpacity="0.9" filter={`url(#sg-${id})`}
          style={{ animation:`roomBarPulse ${0.35+i*0.055}s ease-in-out infinite alternate`,
                   transformBox:'fill-box', transformOrigin:'bottom' }} />
      ))}
      {/* Speakers */}
      {[[14,152],[178,152]].map(([sx,sy],i)=>(
        <g key={i}>
          <rect x={sx} y={sy} width="14" height="18" fill={c} fillOpacity="0.18"
            stroke={c} strokeWidth="0.7" strokeOpacity="0.8" />
          <circle cx={sx+7} cy={sy+9} r="4.5" fill={c} fillOpacity="0.5" />
          <circle cx={sx+7} cy={sy+9} r="2" fill={c} filter={`url(#gl-${id})`} />
        </g>
      ))}
      {/* Characters */}
      <Char x={93} y={148} color={c} id={id} skin="#ff88cc" dur={0.6} />
      <Char x={50} y={178} color={c} id={id} skin="#ee66bb" dur={0.8} />
      <Char x={140} y={178} color={c} id={id} skin="#ff88cc" dur={1.0} />
      <Lamp x={38} y={14} color={c} id={id} rate={0.9} />
      <Lamp x={162} y={14} color={c} id={id} rate={1.3} />
    </>
  )
}

// ─── ROOM 7: PUBLISH — Print shop ─────────────────────────────────────────────
function PublishRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} floor="tile" />
      <Bg color={c} id={id} />
      {/* Antenna tower */}
      <line x1="100" y1="18" x2="100" y2="54" stroke={c} strokeWidth="2" strokeOpacity="0.9" />
      <circle cx="100" cy="18" r="4" fill={c} filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'0.7s':'1.8s'} ease-in-out infinite` }} />
      {[10,16,22,28].map((r,i)=>(
        <path key={i} d={`M ${100-r} 18 A ${r} ${r} 0 0 1 ${100+r} 18`}
          fill="none" stroke={c} strokeWidth="0.8" strokeOpacity={0.7-i*0.12}
          style={{ animation:`roomPulse ${1+i*0.35}s ease-in-out infinite` }} />
      ))}
      {/* Press body */}
      <rect x="18" y="56" width="164" height="46" fill={c} fillOpacity="0.18"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.9" />
      <rect x="18" y="56" width="164" height="4" fill={c} fillOpacity="0.7" />
      {/* Spinning rollers */}
      {[[42,78],[100,78],[158,78]].map(([rx,ry],i)=>(
        <g key={i} style={{ transformBox:'fill-box', transformOrigin:`${rx}px ${ry}px`,
          animation:`${i%2===0?'roomSpin':'roomSpinRev'} ${working?0.7:2}s linear infinite` }}>
          <circle cx={rx} cy={ry} r="12" fill="rgba(0,0,0,0.75)"
            stroke={c} strokeWidth="1" strokeOpacity="0.9" />
          <line x1={rx-10} y1={ry} x2={rx+10} y2={ry} stroke={c} strokeWidth="0.7" strokeOpacity="0.65" />
          <line x1={rx} y1={ry-10} x2={rx} y2={ry+10} stroke={c} strokeWidth="0.7" strokeOpacity="0.65" />
          <circle cx={rx} cy={ry} r="2.5" fill={c} fillOpacity="0.8" />
        </g>
      ))}
      {/* Conveyor belt */}
      <rect x="14" y="110" width="172" height="10" fill="rgba(0,0,0,0.8)"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.7" />
      {[26,50,74,98,122,146,168].map((bx,i)=>(
        <rect key={i} x={bx} y="112" width="16" height="6"
          fill={c} fillOpacity="0.75" stroke="#0a0a1a" strokeWidth="0.3"
          style={{ animation:`roomMoveRight ${working?1.4:3}s linear infinite` }} />
      ))}
      <circle cx="14" cy="115" r="3.5" fill={c} fillOpacity="0.4" stroke={c} strokeWidth="0.5" />
      <circle cx="186" cy="115" r="3.5" fill={c} fillOpacity="0.4" stroke={c} strokeWidth="0.5" />
      {/* Output tray */}
      <rect x="50" y="138" width="100" height="22" fill={c} fillOpacity="0.14"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.7" />
      {[0,1,2,3,4,5].map(i=>(
        <rect key={i} x={66-i*2} y={140+i*3} width={68+i*4} height="2.5"
          fill={c} fillOpacity={0.85-i*0.12} />
      ))}
      {/* Characters */}
      <Char x={24} y={148} color={c} id={id} skin="#ffbb55" dur={0.55} />
      <Char x={162} y={148} color={c} id={id} skin="#ffaa44" dur={0.75} />
      <Char x={92} y={180} color={c} id={id} skin="#ff9933" dur={0.9} />
      <Lamp x={14} y={40} color={c} id={id} rate={1.3} />
      <Lamp x={186} y={40} color={c} id={id} rate={1.0} />
    </>
  )
}

// ─── ROOM 8: ANALYTICS — Data center ──────────────────────────────────────────
function AnalyticsRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} floor="tile" />
      <Bg color={c} id={id} />
      {/* Left server racks */}
      {[14,30,46].map((x,i)=>(
        <g key={`lr${i}`}>
          <rect x={x} y={18} width="12" height="96" fill={c} fillOpacity="0.16"
            stroke={c} strokeWidth="0.8" strokeOpacity="0.9" />
          {Array.from({length:9},(_,j)=>(
            <rect key={j} x={x+1.5} y={21+j*10} width="9" height="7"
              fill="rgba(0,0,0,0.8)" stroke={c} strokeOpacity="0.5" strokeWidth="0.3" />
          ))}
          {Array.from({length:9},(_,j)=>(
            <circle key={`led${j}`} cx={x+10} cy={23+j*10} r="0.8"
              fill={c} filter={`url(#sg-${id})`}
              style={{ animation:`roomBlink ${0.4+(i+j)*0.15}s ease-in-out infinite` }} />
          ))}
        </g>
      ))}
      {/* Right server racks */}
      {[144,160,176].map((x,i)=>(
        <g key={`rr${i}`}>
          <rect x={x} y={18} width="12" height="96" fill={c} fillOpacity="0.16"
            stroke={c} strokeWidth="0.8" strokeOpacity="0.9" />
          {Array.from({length:9},(_,j)=>(
            <rect key={j} x={x+1.5} y={21+j*10} width="9" height="7"
              fill="rgba(0,0,0,0.8)" stroke={c} strokeOpacity="0.5" strokeWidth="0.3" />
          ))}
          {Array.from({length:9},(_,j)=>(
            <circle key={`led${j}`} cx={x+1.5} cy={23+j*10} r="0.8"
              fill={c} filter={`url(#sg-${id})`}
              style={{ animation:`roomBlink ${0.4+(i+j)*0.17}s ease-in-out infinite` }} />
          ))}
        </g>
      ))}
      {/* Central data hub pillar */}
      <rect x="78" y="24" width="44" height="66" fill="rgba(0,0,0,0.88)"
        stroke={c} strokeWidth="1.4" strokeOpacity="1" />
      <rect x="78" y="24" width="44" height="4" fill={c} fillOpacity="0.8" />
      {[0,1,2,3,4,5,6,7,8].map(i=>(
        <rect key={i} x={82} y={32+i*7} width={i%2===0?36:26} height="2.5"
          fill={c} fillOpacity={0.9-i*0.06}
          style={{ animation:`roomBlink ${0.5+i*0.22}s ease-in-out infinite` }} />
      ))}
      {/* Hub top glow */}
      <circle cx="100" cy="56" r="18" fill={c} fillOpacity="0.08" filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'1s':'2.5s'} ease-in-out infinite` }} />
      {/* Top wall screens */}
      <Scr x={62}  y={18} w={28} h={14} color={c} id={id} content="line" rate={1.0} />
      <Scr x={110} y={18} w={28} h={14} color={c} id={id} content="bars" rate={1.3} />
      {/* Connection lines */}
      {[[34,66],[50,66],[150,66],[166,66]].map(([cx2,cy2],i)=>(
        <line key={i} x1={cx2} y1={cy2} x2="100" y2="56"
          stroke={c} strokeWidth="0.6" strokeOpacity="0.5" strokeDasharray="2 3"
          style={{ animation:`roomDash ${1.3+i*0.3}s linear infinite` }} />
      ))}
      {/* Floor displays */}
      <Scr x={16} y={128} w={56} h={20} color={c} id={id} content="line" rate={1.2} />
      <Scr x={80} y={128} w={40} h={20} color={c} id={id} content="dot" rate={1.4} />
      <Scr x={128} y={128} w={56} h={20} color={c} id={id} content="bars" rate={1.1} />
      {/* Characters */}
      <Char x={62} y={170} color={c} id={id} skin="#66e0ff" dur={0.7} />
      <Char x={100} y={172} color={c} id={id} skin="#44ccee" dur={0.9} />
      <Char x={138} y={170} color={c} id={id} skin="#66e0ff" dur={1.1} />
      {/* Cooling pipes */}
      <line x1="62" y1="20" x2="62" y2="12" stroke={c} strokeWidth="1.4" strokeOpacity="0.65" />
      <line x1="138" y1="20" x2="138" y2="12" stroke={c} strokeWidth="1.4" strokeOpacity="0.65" />
      <Lamp x={62} y={10} color={c} id={id} rate={1.5} />
      <Lamp x={138} y={10} color={c} id={id} rate={1.2} />
    </>
  )
}

// ─── Viz registry ─────────────────────────────────────────────────────────────
const VIZS = {
  'tinyagi':          NexusRoom,
  'market-analyst':   MarketRoom,
  'notion-creator':   DocRoom,
  'finance-creator':  FinanceRoom,
  'business-creator': StrategyRoom,
  'copywriter':       ContentRoom,
  'publisher':        PublishRoom,
  'analytics':        AnalyticsRoom,
}

// ─── AgentRoom — full cell, info overlay inside SVG ───────────────────────────
export default function AgentRoom({ id, agent }) {
  const cfg     = ROOM_CONFIG[id] || { color: '#888', label: id }
  const Viz     = VIZS[id] || NexusRoom
  const working = agent?.status === 'working'
  const color   = cfg.color
  const rgb     = hexToRgb(color)
  const task    = agent?.current_task || null
  const level   = agent?.level || 1
  const xpPct   = agent?.xp_pct || 0
  const name    = agent?.name || id

  return (
    <motion.div
      className={`agent-room ${working ? 'agent-room--on' : 'agent-room--off'}`}
      style={{ '--c': color, '--rgb': rgb }}
      initial={{ opacity: 0, scale: 0.94 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.45 }}
      whileHover={{ scale: 1.02, zIndex: 20 }}
    >
      <svg viewBox="0 0 200 280" width="100%" height="100%"
        preserveAspectRatio="xMidYMid slice"
        style={{ display: 'block' }}>
        <Viz id={id} color={color} working={working} />
        <Info
          color={color} id={id} label={cfg.label}
          name={name} task={task} level={level} xpPct={xpPct} working={working}
        />
      </svg>
    </motion.div>
  )
}
