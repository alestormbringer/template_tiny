// SVG furniture scenes — viewBox 0 0 120 90
// Wall: y 0-57  |  Floor: y 58-90
// Bot occupies roughly x 54-66, y 52-70 → furniture stays clear of that zone

function Desk({ x1 = 5, x2 = 115, y = 50, color = '#101828' }) {
  return (
    <>
      <rect x={x1} y={y} width={x2 - x1} height={6} rx="0.5" fill={color} />
      <rect x={x1 + 2} y={y + 6} width={3} height={10} fill={color} />
      <rect x={x2 - 5} y={y + 6} width={3} height={10} fill={color} />
    </>
  )
}

function Screen({ x, y, w = 28, h = 20, accent, working }) {
  return (
    <>
      <rect x={x} y={y} width={w} height={h} rx="1" fill="#04040e" stroke={accent} strokeWidth="1" />
      {working
        ? <>
            <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill={`${accent}18`} />
            <line x1={x + 3} y1={y + 5} x2={x + w - 4} y2={y + 5} stroke={accent} strokeWidth="0.6" opacity="0.7" />
            <line x1={x + 3} y1={y + 9} x2={x + w - 7} y2={y + 9} stroke={accent} strokeWidth="0.6" opacity="0.5" />
            <line x1={x + 3} y1={y + 13} x2={x + w - 5} y2={y + 13} stroke={accent} strokeWidth="0.6" opacity="0.6" />
          </>
        : <rect x={x + 1.5} y={y + 1.5} width={w - 3} height={h - 3} fill="#02020a" />
      }
    </>
  )
}

// ── Command Center ──────────────────────────────────────────────────────────
function Command({ accent, working }) {
  return (
    <>
      {/* Circuit lines on wall */}
      <line x1="0" y1="18" x2="8" y2="18" stroke={accent} strokeWidth="0.4" opacity="0.18" />
      <line x1="8" y1="18" x2="8" y2="28" stroke={accent} strokeWidth="0.4" opacity="0.18" />
      <line x1="112" y1="22" x2="120" y2="22" stroke={accent} strokeWidth="0.4" opacity="0.18" />

      {/* Left wall monitor */}
      <Screen x={8} y={8} w={28} h={20} accent={accent} working={working} />
      <rect x={20} y={28} width={4} height={5} fill="#0a1020" />
      <rect x={16} y={33} width={12} height={2} fill="#0a1020" />

      {/* Right wall monitor */}
      <Screen x={80} y={10} w={28} h={20} accent={accent} working={working} />
      <rect x={92} y={30} width={4} height={4} fill="#0a1020" />
      <rect x={88} y={34} width={12} height={2} fill="#0a1020" />

      {/* Hologram ring (center-top) */}
      <circle cx={50} cy={26} r={10} fill="none"
        stroke={accent} strokeWidth={working ? 1.2 : 0.6}
        strokeDasharray="4 2.5"
        opacity={working ? 0.85 : 0.25} />
      <circle cx={50} cy={26} r={6} fill="none"
        stroke={accent} strokeWidth={working ? 0.8 : 0.4}
        strokeDasharray="2.5 3.5"
        opacity={working ? 0.65 : 0.18} />
      {working && <circle cx={50} cy={26} r={2.5} fill={accent} opacity="0.55" />}

      {/* Desk */}
      <Desk color="#0c1a30" />

      {/* Keyboard */}
      <rect x={37} y={46} width={32} height={5} rx="0.8" fill="#0c1530"
        stroke={accent} strokeWidth="0.5" opacity="0.6" />
    </>
  )
}

// ── Observatory ─────────────────────────────────────────────────────────────
function Observatory({ accent, working }) {
  return (
    <>
      {/* Star dots on wall */}
      {[[12,8],[20,14],[30,6],[8,22],[18,28],[35,18]].map(([x,y],i) => (
        <circle key={i} cx={x} cy={y} r="0.8" fill="#c8d8ff" opacity="0.5" />
      ))}

      {/* Telescope body (angled) */}
      <line x1={20} y1={50} x2={8} y2={18}
        stroke={accent} strokeWidth="2.5" strokeLinecap="round"
        opacity={working ? 1 : 0.5} />
      {/* Eyepiece */}
      <rect x={17} y={48} width={6} height={4} rx="1" fill={accent} opacity={working ? 0.9 : 0.4} />
      {/* Lens */}
      <circle cx={8.5} cy={18} r={3.5}
        fill={working ? `${accent}30` : '#05050f'}
        stroke={accent} strokeWidth="1"
        opacity={working ? 1 : 0.5} />

      {/* Tripod legs */}
      <line x1={20} y1={52} x2={13} y2={58} stroke="#404048" strokeWidth="1.2" />
      <line x1={20} y1={52} x2={27} y2={58} stroke="#404048" strokeWidth="1.2" />

      {/* Wall chart (right) */}
      <rect x={80} y={10} width={34} height={36} rx="1" fill="#06050c"
        stroke={accent} strokeWidth="0.8" opacity="0.7" />
      {working
        ? <>
            {[0,1,2,3,4].map(i => (
              <rect key={i}
                x={82 + i * 6} y={30 - i * 3}
                width={4} height={i * 3 + 5}
                fill={accent} opacity="0.55" />
            ))}
          </>
        : <rect x={82} y={12} width={30} height={32} fill="#02020a" />
      }

      <Desk color="#1a1008" />
    </>
  )
}

// ── Creative Studio ─────────────────────────────────────────────────────────
function Studio({ accent, working }) {
  return (
    <>
      {/* Hanging lamp from ceiling */}
      <line x1={50} y1={0} x2={50} y2={12} stroke="#404050" strokeWidth="0.8" />
      <ellipse cx={50} cy={14} rx={8} ry={4}
        fill={working ? '#ffeeaa' : '#202030'}
        stroke="#505060" strokeWidth="0.8" />
      {/* Lamp glow */}
      {working && (
        <ellipse cx={50} cy={18} rx={14} ry={8}
          fill="#ffeeaa" opacity="0.12" />
      )}

      {/* Large monitor right of center */}
      <Screen x={72} y={8} w={36} h={28} accent={accent} working={working} />
      <rect x={88} y={36} width={4} height={6} fill="#0e0a18" />
      <rect x={84} y={42} width={12} height={2} fill="#0e0a18" />

      {/* Plant left */}
      {/* Pot */}
      <rect x={6} y={46} width={14} height={10} rx="1" fill="#3a2010" />
      {/* Stem */}
      <line x1={13} y1={46} x2={13} y2={32} stroke="#1a6020" strokeWidth="1.5" />
      {/* Leaves */}
      <ellipse cx={13} cy={36} rx={8} ry={4} fill="#1e8028" opacity="0.85" transform="rotate(-20 13 36)" />
      <ellipse cx={13} cy={42} rx={7} ry={3.5} fill="#22a030" opacity="0.75" transform="rotate(15 13 42)" />
      <ellipse cx={13} cy={30} rx={6} ry={3} fill="#1a7022" opacity="0.8" transform="rotate(-35 13 30)" />

      {/* Drawing pad on desk */}
      <rect x={34} y={44} width={22} height={8} rx="0.8"
        fill={working ? `${accent}20` : '#06060e'}
        stroke={accent} strokeWidth="0.6" opacity="0.7" />

      <Desk color="#1a0e20" />
    </>
  )
}

// ── Trading Floor ───────────────────────────────────────────────────────────
function Trading({ accent, working }) {
  // 3×2 grid of mini screens on wall
  const screens = [
    [6,6], [40,6], [74,6],
    [6,30], [40,30], [74,30],
  ]

  return (
    <>
      {screens.map(([sx, sy], i) => (
        <g key={i}>
          <rect x={sx} y={sy} width={28} height={20} rx="0.8"
            fill="#030810" stroke={accent} strokeWidth="0.8" />
          {working
            ? <>
                <rect x={sx+1.5} y={sy+1.5} width={25} height={17}
                  fill={`${accent}14`} />
                {/* Mini bar chart */}
                {[0,1,2,3].map(j => {
                  const h = (i + j * 2 + 3) % 10 + 3
                  return (
                    <rect key={j}
                      x={sx + 3 + j * 6} y={sy + 16 - h}
                      width={4} height={h}
                      fill={j % 2 === 0 ? accent : `${accent}80`}
                      opacity="0.7" />
                  )
                })}
              </>
            : <rect x={sx+1.5} y={sy+1.5} width={25} height={17} fill="#01010a" />
          }
        </g>
      ))}

      {/* Ticker strip at wall bottom */}
      <rect x={0} y={52} width={120} height={4}
        fill={working ? `${accent}20` : '#08080f'}
        stroke={accent} strokeWidth="0.5" opacity="0.6" />

      <Desk color="#081a10" />
    </>
  )
}

// ── Boardroom ────────────────────────────────────────────────────────────────
function Boardroom({ accent, working }) {
  return (
    <>
      {/* Large whiteboard on wall */}
      <rect x={14} y={6} width={82} height={38} rx="1"
        fill={working ? '#f5f6f8' : '#0e0e18'}
        stroke={accent} strokeWidth="1" />
      {working
        ? <>
            {/* Writing on board */}
            <line x1={18} y1={16} x2={60} y2={16} stroke="#334" strokeWidth="1.2" opacity="0.6" />
            <line x1={18} y1={22} x2={50} y2={22} stroke="#334" strokeWidth="1.2" opacity="0.5" />
            <line x1={18} y1={28} x2={68} y2={28} stroke="#334" strokeWidth="1.2" opacity="0.55" />
            <line x1={18} y1={34} x2={42} y2={34} stroke="#334" strokeWidth="1.2" opacity="0.45" />
            {/* Diagram box */}
            <rect x={68} y={14} width={22} height={18} rx="0.5" fill="none" stroke="#334" strokeWidth="0.8" opacity="0.5" />
            <line x1={79} y1={14} x2={79} y2={32} stroke="#334" strokeWidth="0.5" opacity="0.4" />
          </>
        : <rect x={16} y={8} width={78} height={34} fill="#060614" />
      }

      {/* Whiteboard tray */}
      <rect x={14} y={44} width={82} height={3} rx="0.5" fill="#1a1a2a" />

      {/* Projector on ceiling */}
      <rect x={100} y={0} width={14} height={8} rx="1" fill="#1a1a2a" stroke="#303040" strokeWidth="0.6" />
      {working && (
        <polygon points="107,8 92,48 122,48"
          fill={accent} opacity="0.06" />
      )}

      {/* Conference table */}
      <ellipse cx={60} cy={57} rx={38} ry={6} fill="#181830" stroke="#242440" strokeWidth="0.8" />

      <Desk color="#14102a" />
    </>
  )
}

// ── Writer's Den ─────────────────────────────────────────────────────────────
function Den({ accent, working }) {
  return (
    <>
      {/* Bookshelf left */}
      <rect x={2} y={6} width={20} height={50} rx="0.5" fill="#1a1008" stroke="#2a1a0a" strokeWidth="0.6" />
      {/* Book spines */}
      {[0,1,2,3,4,5,6].map(i => (
        <rect key={i}
          x={4} y={8 + i * 6}
          width={16} height={5}
          rx="0.3"
          fill={['#8b0000','#00508b','#1a6b1a','#7b4a00','#4a007b','#7b6b00','#006b5a'][i]}
          opacity="0.8" />
      ))}

      {/* Desk lamp */}
      {/* Base */}
      <rect x={78} y={48} width={8} height={3} rx="0.5" fill="#202028" />
      {/* Pole */}
      <line x1={82} y1={48} x2={82} y2={38} stroke="#282830" strokeWidth="1.2" />
      {/* Arm */}
      <line x1={82} y1={38} x2={90} y2={32} stroke="#282830" strokeWidth="1.2" />
      {/* Shade */}
      <ellipse cx={90} cy={31} rx={7} ry={3.5}
        fill={working ? '#ffdd88' : '#181820'}
        stroke="#303038" strokeWidth="0.6" />
      {/* Glow */}
      {working && <ellipse cx={90} cy={35} rx={12} ry={6} fill="#ffdd88" opacity="0.1" />}

      {/* Typewriter / laptop on desk */}
      <rect x={34} y={43} width={28} height={9} rx="0.8"
        fill="#0c0c14" stroke={accent} strokeWidth={working ? 0.8 : 0.4}
        opacity={working ? 0.9 : 0.45} />
      {/* Keys */}
      {working && [0,1,2,3,4].map(i => (
        <rect key={i}
          x={36 + i * 5} y={45}
          width={3.5} height={2.5} rx="0.3"
          fill={accent} opacity={i % 2 === 0 ? 0.5 : 0.3} />
      ))}

      {/* Stack of papers right */}
      <rect x={96} y={42} width={20} height={3} rx="0.3" fill="#e8e4d0" opacity="0.7" />
      <rect x={96} y={45} width={20} height={3} rx="0.3" fill="#dedad0" opacity="0.65" />
      <rect x={97} y={48} width={19} height={3} rx="0.3" fill="#d0ccbf" opacity="0.6" />

      <Desk color="#221408" />
    </>
  )
}

// ── Print Shop ───────────────────────────────────────────────────────────────
function Printshop({ accent, working }) {
  return (
    <>
      {/* Printing press frame */}
      <rect x={6} y={14} width={40} height={38} rx="1" fill="#0c1220" stroke="#1a2038" strokeWidth="1" />

      {/* Top roller */}
      <rect x={8} y={20} width={36} height={7} rx="1"
        fill="#1a2840"
        stroke={accent} strokeWidth={working ? 1 : 0.5}
        opacity={working ? 1 : 0.5} />
      {/* Roller center line */}
      <line x1={8} y1={23.5} x2={44} y2={23.5} stroke={accent} strokeWidth="0.5" opacity="0.4" />

      {/* Paper going through (visible when working) */}
      {working
        ? <rect x={10} y={28} width={32} height={4} fill="#f0ead8" opacity="0.9" />
        : <rect x={10} y={28} width={32} height={4} fill="#1a1a28" />
      }

      {/* Bottom roller */}
      <rect x={8} y={33} width={36} height={7} rx="1"
        fill="#1a2840"
        stroke={accent} strokeWidth={working ? 1 : 0.5}
        opacity={working ? 1 : 0.5} />
      <line x1={8} y1={36.5} x2={44} y2={36.5} stroke={accent} strokeWidth="0.5" opacity="0.4" />

      {/* Ink reservoir */}
      <rect x={10} y={42} width={14} height={8} rx="0.5"
        fill={working ? `${accent}40` : '#08081a'} stroke={accent} strokeWidth="0.6" />

      {/* Paper output stack */}
      {[0,1,2,3].map(i => (
        <rect key={i}
          x={52 + i * 0.5} y={30 + i}
          width={28} height={3} rx="0.2"
          fill="#e8e4d5" opacity={0.75 - i * 0.08} />
      ))}

      {/* Wall poster */}
      <rect x={76} y={8} width={36} height={26} rx="1"
        fill="#06060e" stroke="#1a1a2a" strokeWidth="0.6" />
      {working && (
        <>
          <line x1={80} y1={14} x2={106} y2={14} stroke={accent} strokeWidth="0.7" opacity="0.4" />
          <line x1={80} y1={18} x2={100} y2={18} stroke={accent} strokeWidth="0.7" opacity="0.3" />
          <line x1={80} y1={22} x2={104} y2={22} stroke={accent} strokeWidth="0.7" opacity="0.35" />
          <line x1={80} y1={26} x2={98} y2={26} stroke={accent} strokeWidth="0.7" opacity="0.3" />
        </>
      )}

      <Desk color="#0a1220" />
    </>
  )
}

// ── Server Room ──────────────────────────────────────────────────────────────
function Server({ accent, working }) {
  const LED_ROWS = 10
  const LED_COLS = 4

  return (
    <>
      {/* Server rack right */}
      <rect x={78} y={6} width={36} height={50} rx="1"
        fill="#060c08" stroke="#101a10" strokeWidth="0.8" />
      {/* Rack units */}
      {Array.from({ length: LED_ROWS }).map((_, row) => (
        <g key={row}>
          <rect x={80} y={8 + row * 4.8} width={32} height={4} rx="0.3"
            fill={row % 2 === 0 ? '#08100a' : '#0a1410'} />
          {/* LEDs */}
          {Array.from({ length: LED_COLS }).map((_, col) => (
            <circle key={col}
              cx={82 + col * 6} cy={10 + row * 4.8}
              r={1}
              fill={working && (row + col) % 3 !== 2 ? accent : '#101418'}
              opacity={working ? (0.5 + Math.random() * 0.4) : 0.3} />
          ))}
        </g>
      ))}

      {/* Monitor left */}
      <Screen x={6} y={8} w={32} h={24} accent={accent} working={working} />
      <rect x={20} y={32} width={4} height={6} fill="#060c08" />
      <rect x={16} y={38} width={12} height={2} fill="#060c08" />

      {/* Cable tray at floor */}
      <rect x={0} y={54} width={78} height={3} fill="#101418" />
      {[5,14,23,32,41,50,60,70].map((x,i) => (
        <line key={i}
          x1={x} y1={54} x2={x + 6} y2={58}
          stroke={working && i % 2 === 0 ? accent : '#181c20'}
          strokeWidth="0.8" opacity="0.6" />
      ))}

      <Desk color="#060e08" />
    </>
  )
}

// ── Dispatcher ───────────────────────────────────────────────────────────────

const SCENES = {
  command:    Command,
  observatory:Observatory,
  studio:     Studio,
  trading:    Trading,
  boardroom:  Boardroom,
  den:        Den,
  printshop:  Printshop,
  server:     Server,
}

export default function Furniture({ type, working, accent }) {
  const Scene = SCENES[type]
  if (!Scene) return null
  return <Scene working={working} accent={accent} />
}
