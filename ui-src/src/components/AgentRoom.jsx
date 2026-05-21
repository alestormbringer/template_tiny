import { motion } from 'framer-motion'

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

// ─── Shared SVG defs ──────────────────────────────────────────────────────────
function Defs({ color, id }) {
  return (
    <defs>
      <radialGradient id={`amb-${id}`} cx="50%" cy="38%" r="62%">
        <stop offset="0%"   stopColor={color} stopOpacity="0.28" />
        <stop offset="100%" stopColor={color} stopOpacity="0" />
      </radialGradient>
      <pattern id={`flr-${id}`} x="0" y="0" width="20" height="12" patternUnits="userSpaceOnUse">
        <polygon points="10,0 20,6 10,12 0,6"
          fill={color} fillOpacity="0.07"
          stroke={color} strokeWidth="0.5" strokeOpacity="0.28" />
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

// ─── Background: isometric floor + wall division ──────────────────────────────
function Bg({ color, id }) {
  return (
    <>
      {/* Isometric floor tiles (lower portion) */}
      <rect x="0" y="82" width="200" height="166" fill={`url(#flr-${id})`} />
      {/* Back wall (upper) */}
      <rect x="0" y="0" width="200" height="90" fill={color} fillOpacity="0.09" />
      {/* Horizon line wall/floor */}
      <line x1="0" y1="88" x2="200" y2="88" stroke={color} strokeOpacity="0.5" strokeWidth="1" />
      {/* Wall skirting */}
      <rect x="0" y="86" width="200" height="4" fill={color} fillOpacity="0.28" />
      {/* Ambient center glow */}
      <rect x="0" y="0" width="200" height="248" fill={`url(#amb-${id})`} />
      {/* Outer octagon border */}
      <polygon points="16,0 184,0 200,16 200,232 184,248 16,248 0,232 0,16"
        fill="none" stroke={color} strokeOpacity="0.8" strokeWidth="2" />
      <polygon points="18,2 182,2 198,18 198,230 182,246 18,246 2,230 2,18"
        fill="none" stroke={color} strokeOpacity="0.18" strokeWidth="0.5" />
      {/* Corner studs */}
      {[[14,3],[186,3],[3,14],[197,14],[14,245],[186,245],[3,234],[197,234]].map(([x,y],i)=>(
        <circle key={i} cx={x} cy={y} r="1.8" fill={color} fillOpacity="0.95" filter={`url(#sg-${id})`} />
      ))}
      {/* Top door slit */}
      <rect x="88" y="0" width="24" height="5" fill="rgba(0,0,0,0.9)" />
      <rect x="90" y="1" width="20" height="3" fill={color} fillOpacity="0.8"
        style={{ animation: 'roomBlink 2.5s ease-in-out infinite' }} />
    </>
  )
}

// ─── Info overlay ─────────────────────────────────────────────────────────────
function Info({ color, id, label, name, task, level, xpPct, working }) {
  const taskStr = task ? (task.length > 34 ? task.slice(0, 34) + '…' : task) : '— standby —'
  return (
    <g>
      <rect x="0" y="248" width="200" height="32" fill="rgba(3,3,12,0.94)" />
      <line x1="0" y1="248" x2="200" y2="248" stroke={color} strokeOpacity="0.65" strokeWidth="1" />
      <text x="8" y="258" fill={color} fillOpacity="0.95" fontSize="6.5"
        fontFamily="Orbitron,monospace" letterSpacing="2.5" fontWeight="700">{label}</text>
      <text x="70" y="257" fill={working ? '#88ffcc' : '#333355'} fontSize="5.5"
        fontFamily="Orbitron,monospace" letterSpacing="2">{working ? 'BUSY' : 'IDLE'}</text>
      <circle cx="192" cy="255" r="3"
        fill={working ? '#66ffaa' : 'rgba(255,255,255,0.12)'}
        filter={working ? `url(#gl-${id})` : undefined}
        style={working ? { animation: 'roomBlink 0.9s ease-in-out infinite' } : undefined} />
      <text x="8" y="268" fill="#d0d0f0" fontSize="8.5"
        fontFamily="Rajdhani,sans-serif" fontWeight="700">{name}</text>
      <text x="178" y="268" fill={color} fontSize="7"
        fontFamily="Orbitron,monospace" textAnchor="end">Lv{level}</text>
      <text x="8" y="277" fill="#5050a0" fontSize="7"
        fontFamily="Rajdhani,sans-serif">{taskStr}</text>
      <rect x="0" y="279" width="200" height="1.5" fill={`rgba(${hexToRgb(color)},0.12)`} />
      <rect x="0" y="279" width={xpPct * 2} height="1.5" fill={color} fillOpacity="0.9" />
    </g>
  )
}

// ─── Primitives ───────────────────────────────────────────────────────────────
function Term({ x, y, color, id, w = 14, h = 12, rate = 1.5, lit = true }) {
  return (
    <g>
      <rect x={x} y={y+h} width={w} height="2.5" fill="rgba(0,0,0,0.5)" />
      <rect x={x} y={y} width={w} height={h} fill="rgba(4,4,18,0.88)"
        stroke={color} strokeWidth="0.8" strokeOpacity="0.95" />
      <rect x={x+1.5} y={y+1.5} width={w-3} height={h-5.5} fill={color}
        fillOpacity={lit ? 0.9 : 0.2} filter={lit ? `url(#sg-${id})` : undefined}
        style={lit ? { animation: `roomBlink ${rate}s ease-in-out infinite` } : undefined} />
      <line x1={x+1.5} y1={y+h-3.5} x2={x+w-1.5} y2={y+h-3.5}
        stroke={color} strokeOpacity="0.5" strokeWidth="0.4" />
    </g>
  )
}

function Scr({ x, y, w = 26, h = 13, color, id, content = 'bars', rate = 1.5 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill="rgba(4,4,18,0.9)"
        stroke={color} strokeWidth="0.8" strokeOpacity="0.95" />
      <rect x={x} y={y} width={w} height="2.2" fill={color} fillOpacity="0.7" />
      {content === 'bars' && Array.from({ length: 5 }, (_, i) => {
        const bh = [4,7,5,9,6][i]
        return <rect key={i} x={x+2+i*(w-4)/5} y={y+h-2-bh} width={(w-4)/5-0.5} height={bh}
          fill={color} fillOpacity="0.95" filter={`url(#sg-${id})`}
          style={{ animation:`roomBarPulse ${0.8+i*0.2}s ease-in-out infinite alternate`,
                   transformBox:'fill-box', transformOrigin:'bottom' }} />
      })}
      {content === 'line' && (
        <polyline points={`${x+2},${y+h-3} ${x+w*0.2},${y+3} ${x+w*0.4},${y+h-4} ${x+w*0.65},${y+2} ${x+w-2},${y+h-3}`}
          fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="1" filter={`url(#sg-${id})`} />
      )}
      {content === 'wave' && (
        <path d={`M${x+1},${y+h/2} Q${x+w/4},${y+1} ${x+w/2},${y+h/2} T${x+w-1},${y+h/2}`}
          fill="none" stroke={color} strokeWidth="1.2" strokeOpacity="1" filter={`url(#sg-${id})`} />
      )}
      {content === 'dot' && Array.from({ length: 5 }, (_, i) => (
        <circle key={i} cx={x+3+i*(w-6)/4} cy={y+h/2} r="1.2" fill={color}
          style={{ animation:`roomBlink ${0.6+i*0.22}s ease-in-out infinite` }} />
      ))}
      {content === 'text' && [0,1,2].map(i => (
        <rect key={i} x={x+2} y={y+3+i*3} width={w-4-(i%2)*4} height="1.5"
          fill={color} fillOpacity={0.8-i*0.18}
          style={{ animation:`roomBlink ${1+i*0.4}s ease-in-out infinite` }} />
      ))}
    </g>
  )
}

// Bigger pixel-art character with variant themes
function Char({ x, y, color, id, variant = 'default', dur = 0.75 }) {
  const themes = {
    default:   { hair: color,     shirt: color,     pant: '#2a2a40' },
    nexus:     { hair: '#44ddff', shirt: '#1a3366', pant: '#0d1a33' },
    analyst:   { hair: '#ff9933', shirt: '#cc5522', pant: '#1a1a33' },
    designer:  { hair: '#dd44ff', shirt: '#33aa77', pant: '#112233' },
    finance:   { hair: '#887755', shirt: '#3355aa', pant: '#111133' },
    business:  { hair: '#885533', shirt: '#884499', pant: '#221133' },
    writer:    { hair: '#ff44aa', shirt: '#bb2277', pant: '#330033' },
    publisher: { hair: '#ff4444', shirt: '#aa2222', pant: '#330011' },
    data:      { hair: '#44aaff', shirt: '#115577', pant: '#111133' },
  }
  const t = themes[variant] || themes.default
  const skin = '#f5c5a3'

  return (
    <g style={{
      animation: `roomCharBob ${dur}s ease-in-out infinite alternate`,
      transformBox: 'fill-box', transformOrigin: 'bottom center'
    }}>
      {/* Shadow */}
      <ellipse cx={x+6} cy={y+23.5} rx="5.5" ry="1.6" fill="rgba(0,0,0,0.55)" />
      {/* Legs */}
      <rect x={x+2} y={y+15} width="3" height="7" fill={t.pant} />
      <rect x={x+7} y={y+15} width="3" height="7" fill={t.pant} />
      {/* Shoes */}
      <rect x={x+1} y={y+21} width="5" height="2.5" fill="#181824" />
      <rect x={x+6.5} y={y+21} width="5" height="2.5" fill="#181824" />
      {/* Body */}
      <rect x={x+1} y={y+8} width="10" height="8" fill={t.shirt} />
      {/* Collar accent */}
      <rect x={x+4} y={y+8} width="4" height="1.5" fill={t.hair} fillOpacity="0.45" />
      {/* Arms */}
      <rect x={x-0.5} y={y+9} width="2" height="5" fill={t.shirt} />
      <rect x={x+10.5} y={y+9} width="2" height="5" fill={t.shirt} />
      {/* Hands */}
      <circle cx={x+0.2} cy={y+15} r="1.5" fill={skin} />
      <circle cx={x+11.8} cy={y+15} r="1.5" fill={skin} />
      {/* Head */}
      <rect x={x+2} y={y+1} width="8" height="8" fill={skin} />
      {/* Hair */}
      <rect x={x+2} y={y} width="8" height="3" fill={t.hair} />
      <rect x={x+1.5} y={y+3} width="1.5" height="3.5" fill={t.hair} fillOpacity="0.6" />
      <rect x={x+9} y={y+3} width="1.5" height="3.5" fill={t.hair} fillOpacity="0.6" />
      {/* Eyes */}
      <rect x={x+3.5} y={y+4} width="2" height="2" fill="#1a0e08" />
      <rect x={x+6.5} y={y+4} width="2" height="2" fill="#1a0e08" />
      <rect x={x+3.5} y={y+4} width="0.7" height="0.7" fill="white" fillOpacity="0.8" />
      <rect x={x+6.5} y={y+4} width="0.7" height="0.7" fill="white" fillOpacity="0.8" />
      {/* Mouth */}
      <rect x={x+4.5} y={y+7} width="3" height="1" fill="#cc8866" fillOpacity="0.5" />
    </g>
  )
}

function Lamp({ x, y, color, id, rate = 1.3 }) {
  return (
    <g>
      <circle cx={x} cy={y} r="5" fill={color} fillOpacity="0.14" />
      <circle cx={x} cy={y} r="2.2" fill={color} filter={`url(#gl-${id})`}
        style={{ animation: `roomBlink ${rate}s ease-in-out infinite` }} />
    </g>
  )
}

// Pixel art plant
function Plant({ x, y, color }) {
  return (
    <g>
      <rect x={x+2} y={y+11} width="10" height="8" fill="#1a2233" stroke={color} strokeWidth="0.5" strokeOpacity="0.6" />
      <rect x={x+1} y={y+10} width="12" height="2.5" fill="#222d44" />
      <rect x={x+6} y={y+4} width="2" height="8" fill="#228833" />
      <ellipse cx={x+4} cy={y+7} rx="4.5" ry="3" fill="#33aa44" />
      <ellipse cx={x+9} cy={y+5} rx="4" ry="3" fill="#44bb55" />
      <ellipse cx={x+6} cy={y+3} rx="3.5" ry="2.5" fill="#55cc66" />
    </g>
  )
}

// Coffee mug
function Mug({ x, y, color }) {
  return (
    <g>
      <rect x={x} y={y+4} width="11" height="10" fill="#221a10" stroke={color} strokeWidth="0.6" strokeOpacity="0.7" />
      <path d={`M${x+11} ${y+6} Q${x+15} ${y+6} ${x+15} ${y+9} Q${x+15} ${y+12} ${x+11} ${y+12}`}
        fill="none" stroke={color} strokeWidth="1.3" strokeOpacity="0.7" />
      <rect x={x+1} y={y+4} width="9" height="3" fill={color} fillOpacity="0.35" />
      <path d={`M${x+4} ${y+3} Q${x+3} ${y+1} ${x+4} ${y-1}`}
        fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.45"
        style={{ animation: 'roomBlink 1.6s ease-in-out infinite' }} />
      <path d={`M${x+7} ${y+2} Q${x+6} ${y+0} ${x+7} ${y-2}`}
        fill="none" stroke={color} strokeWidth="0.8" strokeOpacity="0.3"
        style={{ animation: 'roomBlink 2s ease-in-out infinite' }} />
    </g>
  )
}

// Neon sign
function NeonSign({ x, y, text, color, id, w = 40, h = 10 }) {
  return (
    <g>
      <rect x={x} y={y} width={w} height={h} fill={color} fillOpacity="0.12"
        stroke={color} strokeWidth="0.7" strokeOpacity="0.9" filter={`url(#sg-${id})`} />
      <text x={x+w/2} y={y+h*0.72} fill={color} fillOpacity="0.95" fontSize="5.5"
        fontFamily="Orbitron,monospace" textAnchor="middle" letterSpacing="1.5"
        filter={`url(#sg-${id})`}>{text}</text>
    </g>
  )
}

// ─── ROOM 1: NEXUS — Command center with pipeline ─────────────────────────────
function NexusRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Wall screens */}
      {[14,52,88,124,158].map((x,i)=>(
        <Scr key={i} x={x} y={22} w={28} h={14} color={c} id={id}
          content={['bars','line','wave','text','dot'][i]} rate={0.9+i*0.2} />
      ))}

      {/* Central NEXUS core ring system */}
      <circle cx="100" cy="96" r="22" fill={c} fillOpacity="0.07" filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'1s':'2.8s'} ease-in-out infinite` }} />
      {[32,24,15].map((r,i)=>(
        <g key={i} style={{ transformBox:'fill-box', transformOrigin:'100px 96px',
          animation:`${i%2===0?'roomSpin':'roomSpinRev'} ${working?3+i:8+i*2.5}s linear infinite` }}>
          <circle cx="100" cy="96" r={r} fill="none" stroke={c}
            strokeOpacity={0.4+i*0.14} strokeWidth={i===2?1.8:0.9}
            strokeDasharray={i===0?'4 5':'none'} />
          {i===1 && [0,120,240].map(a=>{
            const rad=a*Math.PI/180
            return <circle key={a} cx={100+Math.cos(rad)*24} cy={96+Math.sin(rad)*24}
              r="2.5" fill={c} filter={`url(#gl-${id})`} />
          })}
        </g>
      ))}
      <circle cx="100" cy="96" r="7" fill={c} fillOpacity="0.55" filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'0.8s':'2s'} ease-in-out infinite` }} />
      <circle cx="100" cy="96" r="2.5" fill="#fff" filter={`url(#gl-${id})`} />

      {/* Holographic pipeline table */}
      <ellipse cx="100" cy="152" rx="68" ry="20" fill={c} fillOpacity="0.1"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.65" />
      <ellipse cx="100" cy="150" rx="66" ry="18" fill={c} fillOpacity="0.05" />

      {/* Pipeline nodes on table */}
      {[[48,142,'MKT'],[68,134,'DOC'],[100,130,'CPY'],[132,134,'PUB'],[152,142,'ANL']].map(([nx,ny,lbl],i)=>(
        <g key={i}>
          <circle cx={nx} cy={ny} r="8" fill={c} fillOpacity="0.25"
            stroke={c} strokeWidth="1" strokeOpacity="0.85" />
          <circle cx={nx} cy={ny} r="3.5" fill={c} fillOpacity="0.8"
            style={{ animation:`roomBlink ${0.7+i*0.22}s ease-in-out infinite` }} />
          <text x={nx} y={ny+2.5} fill={c} fillOpacity="0.9" fontSize="4"
            fontFamily="monospace" textAnchor="middle">{lbl}</text>
        </g>
      ))}
      {/* Pipeline connectors */}
      {[[48,142,68,134],[68,134,100,130],[100,130,132,134],[132,134,152,142]].map(([x1,y1,x2,y2],i)=>(
        <line key={i} x1={x1+8} y1={y1} x2={x2-8} y2={y2}
          stroke={c} strokeWidth="1.2" strokeOpacity="0.65" strokeDasharray="3 2"
          style={{ animation:`roomDash ${1+i*0.28}s linear infinite` }} />
      ))}

      {/* Corner terminals */}
      <Term x={12} y={100} color={c} id={id} w={22} h={16} rate={1.4} />
      <Term x={166} y={100} color={c} id={id} w={22} h={16} rate={1.1} />

      {/* Characters */}
      <Char x={86} y={172} color={c} id={id} variant="nexus" dur={0.7} />
      <Char x={104} y={174} color={c} id={id} variant="data" dur={0.95} />

      {/* Blips */}
      {[[126,82],[72,110],[128,110]].map(([bx,by],i)=>(
        <circle key={i} cx={bx} cy={by} r="1.8" fill={c} filter={`url(#gl-${id})`}
          style={{ animation:`roomBlink ${0.8+i*0.38}s ease-in-out infinite` }} />
      ))}

      <Lamp x={14} y={108} color={c} id={id} rate={1.4} />
      <Lamp x={186} y={108} color={c} id={id} rate={1.1} />
      <Lamp x={100} y={8} color={c} id={id} rate={2} />
    </>
  )
}

// ─── ROOM 2: MARKET — Research office with CRT monitors ──────────────────────
function MarketRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Back wall: 3 CRT monitors */}
      {[16,76,136].map((x,i)=>(
        <g key={i}>
          {/* CRT body */}
          <rect x={x} y={18} width="50" height="38" fill="rgba(8,8,22,0.9)"
            stroke={c} strokeWidth="1" strokeOpacity="0.85" />
          <rect x={x} y={18} width="50" height="3" fill={c} fillOpacity="0.6" />
          {/* Screen content */}
          <Scr x={x+3} y={22} w={44} h={22} color={c} id={id}
            content={['line','bars','line'][i]} rate={0.8+i*0.3} />
          {/* CRT stand */}
          <rect x={x+20} y={56} width="10" height="4" fill={c} fillOpacity="0.4" />
          <rect x={x+16} y={59} width="18" height="2.5" fill={c} fillOpacity="0.5" />
          {/* Label */}
          <text x={x+25} y={18+34+10} fill={c} fillOpacity="0.7" fontSize="4.5"
            fontFamily="monospace" textAnchor="middle" letterSpacing="1">
            {['GUMROAD','ETSY','SEO'][i]}
          </text>
        </g>
      ))}

      {/* World map dots (glowing) */}
      {[[52,50],[80,44],[130,52],[160,46],[38,56],[170,58]].map(([mx,my],i)=>(
        <circle key={i} cx={mx} cy={my} r="1.5" fill={c} fillOpacity="0.9"
          filter={`url(#sg-${id})`}
          style={{ animation:`roomBlink ${0.6+i*0.2}s ease-in-out infinite` }} />
      ))}

      {/* Post-it notes on wall */}
      {[[14,22,'#ffdd77'],[14,36,'#ff99cc'],[14,50,'#88ddaa']].map(([px,py,pc],i)=>(
        <rect key={i} x={px} y={py} width="12" height="10" fill={pc} fillOpacity="0.55"
          stroke={pc} strokeWidth="0.4" strokeOpacity="0.8" />
      ))}
      <text x="20" y="28" fill="#ffdd77" fillOpacity="0.9" fontSize="3.5" fontFamily="monospace">$15</text>
      <text x="20" y="42" fill="#ff99cc" fillOpacity="0.9" fontSize="3.5" fontFamily="monospace">$49</text>
      <text x="20" y="56" fill="#88ddaa" fillOpacity="0.9" fontSize="3.5" fontFamily="monospace">SEO</text>

      {/* Desk with keyboard */}
      <rect x="16" y="108" width="168" height="16" fill={c} fillOpacity="0.22"
        stroke={c} strokeWidth="0.9" strokeOpacity="0.8" />
      <rect x="16" y="106" width="168" height="4" fill={c} fillOpacity="0.55" />

      {/* Ticker tape */}
      <rect x="14" y="96" width="172" height="8" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="0.5" strokeOpacity="0.6" />
      {Array.from({length:14},(_,i)=>(
        <circle key={i} cx={20+i*11} cy={100} r="1.1" fill={c} fillOpacity="0.9"
          style={{ animation:`roomBlink ${0.35+i*0.1}s ease-in-out infinite` }} />
      ))}

      {/* Desk monitors */}
      {[28,86,144].map((x,i)=>(
        <Term key={i} x={x} y={95} color={c} id={id} w={22} h={12} rate={0.9+i*0.2} />
      ))}

      {/* Floor bar chart */}
      <rect x="14" y="126" width="172" height="44" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.8" />
      {[10,18,13,24,16,21,28,14,22,17,26,12,20,15].map((h,i)=>(
        <rect key={i} x={17+i*11.8} y={170-h} width={9} height={h}
          fill={c} fillOpacity="0.88" filter={`url(#sg-${id})`}
          style={{ animation:`roomBarPulse ${0.65+i*0.1}s ease-in-out infinite alternate`,
                   transformBox:'fill-box', transformOrigin:'bottom' }} />
      ))}

      {/* Characters */}
      <Char x={54} y={182} color={c} id={id} variant="analyst" dur={0.6} />
      <Char x={94} y={184} color={c} id={id} variant="analyst" dur={0.85} />
      <Char x={134} y={182} color={c} id={id} variant="default" dur={1.05} />
      <Mug x={168} y={107} color={c} />
      <Lamp x={14} y={14} color={c} id={id} rate={1.5} />
      <Lamp x={186} y={14} color={c} id={id} rate={1.2} />
    </>
  )
}

// ─── ROOM 3: NOTION — Productivity studio ────────────────────────────────────
function NotionRoom({ id, color, working }) {
  const c = color
  const cols = ['#88ddaa','#ffdd77','#ff99cc','#88ccff']
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Kanban board on back wall */}
      <rect x="24" y="18" width="152" height="60" fill="rgba(4,8,20,0.88)"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.9" />
      <rect x="24" y="18" width="152" height="3" fill={c} fillOpacity="0.7" />
      {/* Kanban columns */}
      {['TODO','DOING','DONE','REV'].map((label,i)=>(
        <g key={i}>
          <rect x={26+i*37} y={22} width="35" height="54" fill={cols[i]} fillOpacity="0.08"
            stroke={cols[i]} strokeWidth="0.5" strokeOpacity="0.5" />
          <text x={43+i*37} y={29} fill={cols[i]} fillOpacity="0.8" fontSize="4.5"
            fontFamily="monospace" textAnchor="middle" letterSpacing="0.5">{label}</text>
          {/* Cards in column */}
          {[0,1,2].map(j=>(
            <rect key={j} x={28+i*37} y={32+j*14} width="31" height="11"
              fill={cols[i]} fillOpacity={working?0.22:0.14}
              stroke={cols[i]} strokeWidth="0.5" strokeOpacity="0.7"
              style={working&&j===0?{ animation:'roomBlink 1.2s ease-in-out infinite' }:undefined} />
          ))}
        </g>
      ))}

      {/* Floating block widgets */}
      {[[60,96],[100,92],[140,96],[80,108],[120,108]].map(([bx,by],i)=>(
        <g key={i} style={{ animation:`roomFloat ${1.5+i*0.4}s ease-in-out infinite` }}>
          <rect x={bx-8} y={by-5} width="16" height="10" fill={c} fillOpacity="0.25"
            stroke={c} strokeWidth="0.7" strokeOpacity="0.8" />
          <rect x={bx-6} y={by-3} width={8+i*2} height="1.5" fill={c} fillOpacity="0.7" />
          <rect x={bx-6} y={by+0.5} width={5} height="1.5" fill={c} fillOpacity="0.45" />
        </g>
      ))}

      {/* Desk */}
      <rect x="32" y="136" width="136" height="18" fill={c} fillOpacity="0.22"
        stroke={c} strokeWidth="0.9" strokeOpacity="0.8" />
      <rect x="32" y="134" width="136" height="4" fill={c} fillOpacity="0.55" />

      {/* Glowing keyboard */}
      <rect x="66" y="128" width="68" height="10" fill="rgba(4,4,18,0.85)"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.9" />
      {Array.from({length:7},(_,i)=>(
        <g key={i}>
          {Array.from({length:3},(_,j)=>(
            <rect key={j} x={68+i*9} y={129+j*3} width="7" height="2.2"
              fill={c} fillOpacity={working?0.6:0.35}
              style={{ animation:`roomBlink ${0.4+(i+j)*0.12}s ease-in-out infinite` }} />
          ))}
        </g>
      ))}

      {/* Monitor */}
      <Scr x={70} y={116} w={60} h={16} color={c} id={id} content="text" rate={1.2} />

      {/* Plants in corners */}
      <Plant x={10} y={126} color={c} />
      <Plant x={172} y={126} color={c} />

      {/* Characters */}
      <Char x={55} y={164} color={c} id={id} variant="designer" dur={0.65} />
      <Char x={120} y={164} color={c} id={id} variant="designer" dur={0.9} />
      <Mug x={42} y={137} color={c} />
      <Lamp x={16} y={118} color={c} id={id} rate={1.4} />
      <Lamp x={184} y={118} color={c} id={id} rate={1.1} />
      <Lamp x={100} y={8} color={c} id={id} rate={2.2} />
    </>
  )
}

// ─── ROOM 4: FINANCE — Spreadsheet lab ───────────────────────────────────────
function FinanceRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Giant spreadsheet display */}
      <rect x="14" y="18" width="122" height="68" fill="rgba(4,4,18,0.9)"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.9" />
      <rect x="14" y="18" width="122" height="3" fill={c} fillOpacity="0.7" />
      {/* Grid cells */}
      {Array.from({length:7},(_,row)=>
        Array.from({length:6},(_,col)=>(
          <rect key={`${row}-${col}`}
            x={16+col*19} y={23+row*9} width="18" height="8"
            fill={c} fillOpacity={working&&row===2&&col===3?0.35:0.05}
            stroke={c} strokeWidth="0.3" strokeOpacity="0.35" />
        ))
      )}
      {/* Numbers in cells */}
      {[[16,30,'1.2k'],[35,30,'850'],[54,30,'2.4k'],[16,39,'945'],[35,39,'1.1k']].map(([cx,cy,val],i)=>(
        <text key={i} x={cx+9} y={cy+6} fill={c} fillOpacity="0.8" fontSize="4"
          fontFamily="monospace" textAnchor="middle">{val}</text>
      ))}

      {/* Pie chart (right side) */}
      <circle cx="162" cy="52" r="28" fill="rgba(4,4,18,0.85)"
        stroke={c} strokeWidth="1" strokeOpacity="0.6" />
      <path d="M162,52 L162,24 A28,28 0 0,1 186,66 Z"
        fill={c} fillOpacity="0.7" filter={`url(#sg-${id})`} />
      <path d="M162,52 L186,66 A28,28 0 0,1 148,78 Z"
        fill={c} fillOpacity="0.45" />
      <path d="M162,52 L148,78 A28,28 0 1,1 162,24 Z"
        fill={c} fillOpacity="0.2" />
      <circle cx="162" cy="52" r="10" fill="rgba(4,4,18,0.9)" />
      <text x="162" y="55" fill={c} fillOpacity="0.85" fontSize="5"
        fontFamily="monospace" textAnchor="middle">42%</text>

      {/* Calculator on desk */}
      <rect x="14" y="92" width="30" height="22" fill="rgba(8,8,24,0.9)"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.85" />
      <rect x="16" y="94" width="26" height="8" fill={c} fillOpacity="0.55" />
      {[0,1,2,3].map(row=>[0,1,2].map(col=>(
        <rect key={`${row}-${col}`}
          x={16+col*8} y={104+row*2.5} width="6.5" height="2"
          fill={c} fillOpacity="0.4" stroke="rgba(0,0,0,0.4)" strokeWidth="0.2" />
      )))}

      {/* Bar chart on wall right */}
      <rect x="144" y="92" width="42" height="30" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.7" />
      {[8,14,10,18,12,16].map((h,i)=>(
        <rect key={i} x={146+i*6.5} y={122-h} width={5} height={h}
          fill={c} fillOpacity="0.85"
          style={{ animation:`roomBarPulse ${0.7+i*0.15}s ease-in-out infinite alternate`,
                   transformBox:'fill-box', transformOrigin:'bottom' }} />
      ))}

      {/* Gold bars / coins */}
      {[0,1,2,3].map(i=>(
        <rect key={i} x={62} y={150-i*4} width="20" height="3.5"
          fill={c} fillOpacity={0.5+i*0.1} stroke="rgba(0,0,0,0.4)" strokeWidth="0.3" />
      ))}
      {[102,112,122,132].map((cx,i)=>(
        <g key={i}>
          <circle cx={cx} cy={154} r="4" fill={c} fillOpacity="0.8" stroke="rgba(0,0,0,0.3)" strokeWidth="0.3" />
          <circle cx={cx-1} cy={153} r="1" fill="#fff" fillOpacity="0.4" />
        </g>
      ))}

      {/* Desk */}
      <rect x="14" y="128" width="172" height="16" fill={c} fillOpacity="0.22"
        stroke={c} strokeWidth="0.9" strokeOpacity="0.8" />
      <rect x="14" y="126" width="172" height="4" fill={c} fillOpacity="0.5" />
      <Term x={152} y={112} color={c} id={id} w={20} h={14} rate={1.2} />

      {/* Characters */}
      <Char x={50} y={162} color={c} id={id} variant="finance" dur={0.9} />
      <Char x={92} y={164} color={c} id={id} variant="finance" dur={1.1} />
      <Lamp x={14} y={14} color={c} id={id} rate={1.4} />
      <Lamp x={186} y={14} color={c} id={id} rate={1.2} />
      <Lamp x={100} y={128} color={c} id={id} rate={1.8} />
    </>
  )
}

// ─── ROOM 5: STRATEGY — Freelancer operations ─────────────────────────────────
function StrategyRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Wall: Gantt chart / timeline */}
      <rect x="14" y="18" width="172" height="50" fill="rgba(4,4,18,0.88)"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.9" />
      <rect x="14" y="18" width="172" height="3" fill={c} fillOpacity="0.65" />
      <text x="100" y="26" fill={c} fillOpacity="0.7" fontSize="5" fontFamily="monospace"
        textAnchor="middle" letterSpacing="2">PROJECT TIMELINE</text>
      {/* Gantt bars */}
      {[
        [20,30,60,'RESEARCH','#88ccff'],
        [50,38,80,'DESIGN','#cc88ff'],
        [90,46,50,'BUILD','#88ddaa'],
        [60,54,40,'REVIEW','#ffdd77'],
        [110,62,30,'DEPLOY','#ff99cc'],
      ].map(([startX,y,w,label,bc],i)=>(
        <g key={i}>
          <text x="16" y={y+4} fill={c} fillOpacity="0.55" fontSize="3.5" fontFamily="monospace">{label}</text>
          <rect x={startX} y={y} width={w} height="5.5" fill={bc} fillOpacity="0.5"
            stroke={bc} strokeWidth="0.4" strokeOpacity="0.9" />
        </g>
      ))}

      {/* Blueprint table */}
      <ellipse cx="100" cy="132" rx="68" ry="18" fill={c} fillOpacity="0.14"
        stroke={c} strokeWidth="1.3" strokeOpacity="0.8" />
      <ellipse cx="100" cy="130" rx="66" ry="16" fill={c} fillOpacity="0.06" />
      {/* Blueprint grid on table */}
      {Array.from({length:5},(_,i)=>(
        <line key={`h${i}`} x1={40} y1={122+i*5} x2={160} y2={122+i*5}
          stroke={c} strokeOpacity="0.3" strokeWidth="0.4" />
      ))}
      {Array.from({length:7},(_,i)=>(
        <line key={`v${i}`} x1={40+i*20} y1={118} x2={40+i*20} y2={142}
          stroke={c} strokeOpacity="0.3" strokeWidth="0.4" />
      ))}

      {/* Invoice templates on wall sides */}
      <rect x="14" y="74" width="28" height="36" fill="rgba(4,4,18,0.85)"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.8" />
      {[0,1,2,3,4].map(i=>(
        <rect key={i} x={16} y={77+i*5} width={i%2===0?22:16} height="2.5"
          fill={c} fillOpacity="0.4" />
      ))}
      <text x="28" y="114" fill={c} fillOpacity="0.6" fontSize="4" fontFamily="monospace" textAnchor="middle">SOP</text>

      <rect x="158" y="74" width="28" height="36" fill="rgba(4,4,18,0.85)"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.8" />
      {[0,1,2,3,4].map(i=>(
        <rect key={i} x={160} y={77+i*5} width={i%2===0?22:16} height="2.5"
          fill={c} fillOpacity="0.4" />
      ))}
      <text x="172" y="114" fill={c} fillOpacity="0.6" fontSize="4" fontFamily="monospace" textAnchor="middle">INV</text>

      {/* Filing cabinet */}
      <rect x="14" y="148" width="22" height="32" fill={c} fillOpacity="0.18"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.8" />
      {[0,1,2].map(i=>(
        <rect key={i} x={15} y={150+i*10} width="20" height="8"
          fill={c} fillOpacity="0.08" stroke={c} strokeWidth="0.4" strokeOpacity="0.6" />
      ))}
      {[0,1,2].map(i=>(
        <circle key={i} cx={25} cy={154+i*10} r="1.2" fill={c} fillOpacity="0.7" />
      ))}

      {/* Characters around table */}
      <Char x={34} y={116} color={c} id={id} variant="business" dur={0.7} />
      <Char x={158} y={116} color={c} id={id} variant="business" dur={0.9} />
      <Char x={80} y={162} color={c} id={id} variant="business" dur={0.8} />
      <Char x={110} y={164} color={c} id={id} variant="default" dur={1.1} />

      <Lamp x={14} y={102} color={c} id={id} rate={1.4} />
      <Lamp x={186} y={102} color={c} id={id} rate={1.1} />
    </>
  )
}

// ─── ROOM 6: CONTENT — Copywriter studio ──────────────────────────────────────
function ContentRoom({ id, color, working }) {
  const c = color
  const eqH = [6,11,8,16,10,14,20,12,18,14,22,10,16,12,18]
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Big text wall display */}
      <rect x="14" y="18" width="172" height="54" fill="rgba(4,4,18,0.92)"
        stroke={c} strokeWidth="1.2" strokeOpacity="1" />
      <rect x="14" y="18" width="172" height="3" fill={c} fillOpacity="0.75" />
      {/* Scrolling text lines */}
      {[0,1,2,3,4,5,6].map(i=>(
        <rect key={i} x={20} y={24+i*6} width={i%3===0?150:i%3===1?110:130} height="2.5"
          fill={c} fillOpacity={i===0?0.95:0.55}
          style={{ animation:`roomBlink ${0.6+i*0.3}s ease-in-out infinite` }} />
      ))}
      {/* Cursor blink */}
      <rect x="130" y="60" width="5" height="5" fill={c} filter={`url(#gl-${id})`}
        style={{ animation:'roomBlink 0.5s ease-in-out infinite' }} />

      {/* Neon signs */}
      <NeonSign x={14} y={78} text="CONVERT" color={c} id={id} w={48} h={11} />
      <NeonSign x={76} y={78} text="BUY NOW" color={c} id={id} w={48} h={11} />
      <NeonSign x={138} y={78} text="LIMITED" color={c} id={id} w={48} h={11} />

      {/* Glowing mechanical keyboard */}
      <rect x="32" y="120" width="96" height="20" fill="rgba(4,4,18,0.9)"
        stroke={c} strokeWidth="0.9" strokeOpacity="0.95" />
      {Array.from({length:10},(_,i)=>
        Array.from({length:3},(_,j)=>(
          <rect key={`${i}-${j}`}
            x={34+i*9} y={122+j*6} width="7" height="4.5"
            fill={c} fillOpacity={working?0.55:0.3}
            stroke="rgba(0,0,0,0.5)" strokeWidth="0.3"
            style={{ animation:`roomBlink ${0.3+(i+j)*0.1}s ease-in-out infinite` }} />
        ))
      )}

      {/* Book stack */}
      {[0,1,2].map(i=>(
        <rect key={i} x={142+i*3} y={120-i*6} width="18" height="5"
          fill={['#88ccff','#ff99cc','#88ddaa'][i]} fillOpacity="0.65"
          stroke="rgba(0,0,0,0.4)" strokeWidth="0.4" />
      ))}

      {/* Writing desk */}
      <rect x="14" y="142" width="172" height="16" fill={c} fillOpacity="0.22"
        stroke={c} strokeWidth="0.9" strokeOpacity="0.8" />
      <rect x="14" y="140" width="172" height="4" fill={c} fillOpacity="0.55" />

      {/* EQ bars */}
      <rect x="14" y="106" width="172" height="28" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="0.6" strokeOpacity="0.65" />
      {eqH.map((h,i)=>(
        <rect key={i} x={16+i*10.8} y={134-h} width="8.5" height={h}
          fill={c} fillOpacity="0.88" filter={`url(#sg-${id})`}
          style={{ animation:`roomBarPulse ${0.28+i*0.05}s ease-in-out infinite alternate`,
                   transformBox:'fill-box', transformOrigin:'bottom' }} />
      ))}

      <Mug x={170} y={143} color={c} />

      {/* Characters */}
      <Char x={48} y={168} color={c} id={id} variant="writer" dur={0.6} />
      <Char x={94} y={166} color={c} id={id} variant="writer" dur={0.8} />
      <Char x={136} y={168} color={c} id={id} variant="default" dur={1.0} />
      <Lamp x={22} y={14} color={c} id={id} rate={0.9} />
      <Lamp x={178} y={14} color={c} id={id} rate={1.3} />
    </>
  )
}

// ─── ROOM 7: PUBLISH — Digital broadcast station ──────────────────────────────
function PublishRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Antenna tower */}
      <line x1="100" y1="18" x2="100" y2="58" stroke={c} strokeWidth="2.5" strokeOpacity="0.9" />
      <circle cx="100" cy="18" r="5" fill={c} filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'0.65s':'1.8s'} ease-in-out infinite` }} />
      {[10,18,26,34].map((r,i)=>(
        <path key={i} d={`M ${100-r} 18 A ${r} ${r} 0 0 1 ${100+r} 18`}
          fill="none" stroke={c} strokeWidth="0.9" strokeOpacity={0.75-i*0.12}
          style={{ animation:`roomPulse ${0.9+i*0.35}s ease-in-out infinite` }} />
      ))}

      {/* Server racks (sides) */}
      {[14,30].map((x,ri)=>(
        <g key={`left-${ri}`}>
          <rect x={x} y={18} width="12" height="70" fill={c} fillOpacity="0.16"
            stroke={c} strokeWidth="0.8" strokeOpacity="0.9" />
          {Array.from({length:7},(_,j)=>(
            <g key={j}>
              <rect x={x+1.5} y={21+j*9} width="9" height="7"
                fill="rgba(0,0,0,0.8)" stroke={c} strokeOpacity="0.4" strokeWidth="0.3" />
              <circle cx={x+10} cy={24+j*9} r="0.9"
                fill={c} filter={`url(#sg-${id})`}
                style={{ animation:`roomBlink ${0.4+(ri+j)*0.15}s ease-in-out infinite` }} />
            </g>
          ))}
        </g>
      ))}
      {[158,174].map((x,ri)=>(
        <g key={`right-${ri}`}>
          <rect x={x} y={18} width="12" height="70" fill={c} fillOpacity="0.16"
            stroke={c} strokeWidth="0.8" strokeOpacity="0.9" />
          {Array.from({length:7},(_,j)=>(
            <g key={j}>
              <rect x={x+1.5} y={21+j*9} width="9" height="7"
                fill="rgba(0,0,0,0.8)" stroke={c} strokeOpacity="0.4" strokeWidth="0.3" />
              <circle cx={x+1.5} cy={24+j*9} r="0.9"
                fill={c} filter={`url(#sg-${id})`}
                style={{ animation:`roomBlink ${0.4+(ri+j)*0.17}s ease-in-out infinite` }} />
            </g>
          ))}
        </g>
      ))}

      {/* Main publish console */}
      <rect x="52" y="58" width="96" height="48" fill={c} fillOpacity="0.18"
        stroke={c} strokeWidth="1.2" strokeOpacity="0.9" />
      <rect x="52" y="58" width="96" height="4" fill={c} fillOpacity="0.7" />

      {/* BIG PUBLISH button */}
      <circle cx="100" cy="82" r="18" fill={c} fillOpacity="0.2"
        stroke={c} strokeWidth="2" strokeOpacity="0.95" />
      <circle cx="100" cy="82" r="14" fill={c} fillOpacity={working?0.7:0.4}
        filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'0.7s':'2s'} ease-in-out infinite` }} />
      <text x="100" y="85" fill="#fff" fillOpacity="0.95" fontSize="6"
        fontFamily="Orbitron,monospace" textAnchor="middle" letterSpacing="1">PUB</text>

      {/* Upload progress */}
      <rect x="52" y="116" width="96" height="8" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="0.6" strokeOpacity="0.7" />
      <rect x="53" y="117" width={working?85:42} height="6" fill={c} fillOpacity="0.8"
        filter={`url(#sg-${id})`}
        style={{ animation:working?'roomUpload 1.5s ease-in-out infinite':undefined }} />
      <text x="100" y="122" fill={c} fillOpacity="0.7" fontSize="4.5"
        fontFamily="monospace" textAnchor="middle">{working?'UPLOADING...':'READY'}</text>

      {/* API status */}
      <rect x="54" y="130" width="92" height="22" fill="rgba(0,0,0,0.75)"
        stroke={c} strokeWidth="0.6" strokeOpacity="0.65" />
      {['API: CONNECTED','STATUS: 200 OK','GUMROAD: LIVE'].map((txt,i)=>(
        <text key={i} x="100" y={137+i*6} fill={c} fillOpacity={0.7-i*0.1} fontSize="4.5"
          fontFamily="monospace" textAnchor="middle">{txt}</text>
      ))}

      {/* Conveyor */}
      <rect x="14" y="158" width="172" height="10" fill="rgba(0,0,0,0.8)"
        stroke={c} strokeWidth="0.7" strokeOpacity="0.7" />
      {[22,50,78,106,134,162].map((bx,i)=>(
        <rect key={i} x={bx} y="160" width="18" height="6"
          fill={c} fillOpacity="0.7" stroke="rgba(0,0,0,0.4)" strokeWidth="0.3"
          style={{ animation:`roomMoveRight ${working?1.4:3}s linear infinite` }} />
      ))}
      <circle cx="14" cy="163" r="4" fill={c} fillOpacity="0.45" stroke={c} strokeWidth="0.5" />
      <circle cx="186" cy="163" r="4" fill={c} fillOpacity="0.45" stroke={c} strokeWidth="0.5" />

      {/* Characters */}
      <Char x={22} y={176} color={c} id={id} variant="publisher" dur={0.55} />
      <Char x={158} y={176} color={c} id={id} variant="publisher" dur={0.75} />
      <Char x={90} y={198} color={c} id={id} variant="default" dur={0.95} />
      <Lamp x={14} y={44} color={c} id={id} rate={1.3} />
      <Lamp x={186} y={44} color={c} id={id} rate={1.0} />
    </>
  )
}

// ─── ROOM 8: ANALYTICS — Data observatory ────────────────────────────────────
function AnalyticsRoom({ id, color, working }) {
  const c = color
  return (
    <>
      <Defs color={c} id={id} />
      <Bg color={c} id={id} />

      {/* Revenue chart (wall left) */}
      <rect x="14" y="18" width="80" height="56" fill="rgba(4,4,18,0.88)"
        stroke={c} strokeWidth="1" strokeOpacity="0.9" />
      <rect x="14" y="18" width="80" height="3" fill={c} fillOpacity="0.65" />
      <text x="54" y="26" fill={c} fillOpacity="0.7" fontSize="4.5" textAnchor="middle"
        fontFamily="monospace" letterSpacing="1">REVENUE</text>
      <Scr x={17} y={28} w={74} h={32} color={c} id={id} content="line" rate={1.1} />

      {/* Top products leaderboard (wall right) */}
      <rect x="106" y="18" width="80" height="56" fill="rgba(4,4,18,0.88)"
        stroke={c} strokeWidth="1" strokeOpacity="0.9" />
      <rect x="106" y="18" width="80" height="3" fill={c} fillOpacity="0.65" />
      <text x="146" y="26" fill={c} fillOpacity="0.7" fontSize="4.5" textAnchor="middle"
        fontFamily="monospace" letterSpacing="1">TOP PRODUCTS</text>
      {['#1 Notion CRM','#2 Finance Kit','#3 SOP Bundle','#4 Copy Pack'].map((txt,i)=>(
        <g key={i}>
          <rect x={108} y={29+i*10} width={74} height="8"
            fill={c} fillOpacity={i===0?0.18:0.06} stroke={c} strokeWidth="0.3" strokeOpacity="0.4" />
          <text x={112} y={35+i*10} fill={c} fillOpacity={0.9-i*0.12} fontSize="4.5"
            fontFamily="monospace">{txt}</text>
          <rect x={150} y={31+i*10} width={28-i*5} height="4"
            fill={i<2?'#66ffaa':'#ff6644'} fillOpacity="0.7" />
        </g>
      ))}

      {/* Central DATA GLOBE */}
      <circle cx="100" cy="120" r="32" fill={c} fillOpacity="0.06" filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'1s':'2.8s'} ease-in-out infinite` }} />
      {[32,24,16].map((r,i)=>(
        <g key={i} style={{ transformBox:'fill-box', transformOrigin:'100px 120px',
          animation:`${i%2===0?'roomSpin':'roomSpinRev'} ${working?4+i:10+i*3}s linear infinite` }}>
          <ellipse cx="100" cy="120" rx={r} ry={r*0.4} fill="none"
            stroke={c} strokeOpacity={0.45+i*0.12} strokeWidth="0.8" />
        </g>
      ))}
      {/* Orbiting data points */}
      {[[0,32],[72,24],[144,32],[216,24]].map((a,i)=>{
        const rad=i*Math.PI*2/4
        return (
          <g key={i} style={{ transformBox:'fill-box', transformOrigin:'100px 120px',
            animation:`roomSpin ${working?4:9}s linear infinite` }}>
            <circle cx={100+Math.cos(rad)*28} cy={120+Math.sin(rad)*28*0.4} r="3"
              fill={c} filter={`url(#gl-${id})`} />
          </g>
        )
      })}
      <circle cx="100" cy="120" r="8" fill={c} fillOpacity="0.4"
        filter={`url(#gl-${id})`}
        style={{ animation:`roomPulse ${working?'0.9s':'2.2s'} ease-in-out infinite` }} />
      <circle cx="100" cy="120" r="3" fill="#fff" filter={`url(#gl-${id})`} />

      {/* Daily report on desk */}
      <rect x="28" y="156" width="52" height="34" fill="rgba(4,4,18,0.85)"
        stroke={c} strokeWidth="0.8" strokeOpacity="0.8" />
      <text x="54" y="164" fill={c} fillOpacity="0.8" fontSize="5" textAnchor="middle"
        fontFamily="monospace" letterSpacing="0.5">DAILY SALES</text>
      {[0,1,2,3].map(i=>(
        <rect key={i} x={30} y={167+i*5} width={i%2===0?44:32} height="2.5"
          fill={c} fillOpacity={0.5-i*0.08} />
      ))}

      {/* Trend arrows */}
      {[[120,162,'▲ +12%','#66ffaa'],[152,162,'▼ -3%','#ff6644'],[120,175,'▲ +8%','#66ffaa']].map(([ax,ay,txt,tc],i)=>(
        <text key={i} x={ax} y={ay} fill={tc} fillOpacity="0.9" fontSize="5.5"
          fontFamily="monospace">{txt}</text>
      ))}

      {/* Forecast bar */}
      <Scr x={118} y={180} w={68} h={14} color={c} id={id} content="bars" rate={1.3} />

      {/* Characters */}
      <Char x={50} y={196} color={c} id={id} variant="data" dur={0.7} />
      <Char x={86} y={198} color={c} id={id} variant="data" dur={0.9} />
      <Char x={136} y={196} color={c} id={id} variant="analyst" dur={1.1} />

      <Lamp x={14} y={78} color={c} id={id} rate={1.5} />
      <Lamp x={186} y={78} color={c} id={id} rate={1.2} />
      <Lamp x={100} y={8} color={c} id={id} rate={2} />
    </>
  )
}

// ─── Viz registry ─────────────────────────────────────────────────────────────
const VIZS = {
  'tinyagi':          NexusRoom,
  'market-analyst':   MarketRoom,
  'notion-creator':   NotionRoom,
  'finance-creator':  FinanceRoom,
  'business-creator': StrategyRoom,
  'copywriter':       ContentRoom,
  'publisher':        PublishRoom,
  'analytics':        AnalyticsRoom,
}

// ─── AgentRoom export ─────────────────────────────────────────────────────────
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
