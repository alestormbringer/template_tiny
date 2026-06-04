import BotSprite from './BotSprite.jsx'
import Furniture from './Furniture.jsx'

export default function Room({ config, agent, onClick }) {
  const working = agent?.status === 'working'
  const level   = agent?.level   ?? 1
  const xpPct   = agent?.xp_pct  ?? 0

  return (
    <div
      className="room-card"
      style={{ '--a': config.accent }}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={e => e.key === 'Enter' && onClick()}
      aria-label={`${config.name} – ${config.roomLabel}`}
    >
      {/*
        Single SVG that contains: background, furniture, and the bot.
        viewBox 120×90:  wall y 0-57 | floor y 58-90
        Bot occupies roughly x 54-66, y 52-70 — furniture keeps clear.
      */}
      <svg
        className="room-scene"
        viewBox="0 0 120 90"
        xmlns="http://www.w3.org/2000/svg"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* Wall */}
        <rect x="0" y="0" width="120" height="90" fill={config.wall} />
        {/* Floor */}
        <rect x="0" y="58" width="120" height="32" fill={config.floor} />
        {/* Subtle vignette corners */}
        <rect x="0" y="0" width="120" height="90"
          fill="url(#vign)"
          style={{ pointerEvents: 'none' }} />
        <defs>
          <radialGradient id="vign" cx="50%" cy="50%" r="70%">
            <stop offset="60%" stopColor="transparent" />
            <stop offset="100%" stopColor="rgba(0,0,0,0.45)" />
          </radialGradient>
        </defs>
        {/* Wall/floor divider */}
        <rect x="0" y="57" width="120" height="1.5" fill="rgba(0,0,0,0.55)" />

        {/* Room-specific furniture */}
        <Furniture type={config.furniture} working={working} accent={config.accent} />

        {/* Bot pixel-art character */}
        <BotSprite
          working={working}
          palette={config.botPalette}
          px={1.5}
          ox={54}
          oy={52}
        />
      </svg>

      {/* ── HTML overlays ── */}

      {/* Top: status pip + level */}
      <div className="room-hud">
        <div className="room-pip-row" style={{ color: working ? '#00ff88' : '#404860' }}>
          <span className={`pip ${working ? 'pip-active' : ''}`} />
          {working ? 'ACTIVE' : 'IDLE'}
        </div>
        <div className="room-lvl">LV{level}</div>
      </div>

      {/* Bottom: name + room label */}
      <div className="room-nameplate">
        <span className="room-bot-name">{config.name}</span>
        <span className="room-room-name">{config.roomLabel}</span>
      </div>

      {/* XP bar */}
      <div className="room-xp-bar">
        <div
          className="room-xp-fill"
          style={{ width: `${xpPct}%`, background: config.accent }}
        />
      </div>
    </div>
  )
}
