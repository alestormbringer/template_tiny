// 8-col × 12-row pixel grid.  Each entry is a color-key char.
// _ transparent  H hair  S skin  d dark(eyes/mouth)
// B shirt        b shirt-highlight  P pants  K shoes

const IDLE = [
  '__HHHH__',
  '_HSSSSH_',
  '_SSSSSS_',
  '_SdSSdS_',
  '_SSSSSS_',
  '__SddS__',
  '__BBBB__',
  '_BBBBBB_',
  'bBBBBBBb',
  '_BBBBBB_',
  '_PP__PP_',
  '_KK__KK_',
]

const WORK = [
  '__HHHH__',
  '_HSSSSH_',
  '_SSSSSS_',
  '_SdSSdS_',
  '_SSSSSS_',
  '__SddS__',
  '__BBBB__',
  '_BBBBBB_',
  'BbBBBBbB',
  '_BBBBBB_',
  'PP____PP',
  '_KK__KK_',
]

function lighten(hex, amt) {
  const n = parseInt(hex.replace('#', ''), 16)
  const r = Math.min(255, ((n >> 16) & 0xff) + amt)
  const g = Math.min(255, ((n >>  8) & 0xff) + amt)
  const b = Math.min(255, ( n        & 0xff) + amt)
  return `rgb(${r},${g},${b})`
}

function fill(code, palette) {
  switch (code) {
    case 'H': return palette.hair
    case 'S': return palette.skin
    case 'd': return '#0d1020'
    case 'B': return palette.shirt
    case 'b': return lighten(palette.shirt, 45)
    case 'P': return '#181828'
    case 'K': return '#080812'
    default:  return null
  }
}

// Returns a <g> element — meant to be embedded inside a room <svg>
// PX: SVG units per virtual pixel  |  ox, oy: top-left offset in SVG coords
export default function BotSprite({ working, palette, px = 1.5, ox = 54, oy = 52 }) {
  const grid = working ? WORK : IDLE

  const rects = []
  grid.forEach((row, py) => {
    ;[...row].forEach((code, pc) => {
      const color = fill(code, palette)
      if (color) rects.push(
        <rect
          key={`${pc}-${py}`}
          x={ox + pc * px}
          y={oy + py * px}
          width={px}
          height={px}
          fill={color}
          shapeRendering="crispEdges"
        />
      )
    })
  })

  if (working) {
    return (
      <g>
        <animateTransform
          attributeName="transform"
          type="translate"
          values="0,0; 0,-1.8; 0,0"
          dur="0.75s"
          repeatCount="indefinite"
          calcMode="spline"
          keySplines="0.45 0 0.55 1; 0.45 0 0.55 1"
        />
        {rects}
      </g>
    )
  }

  return <g>{rects}</g>
}
