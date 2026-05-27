export default function TopBar({ data, status }) {
  const agents    = Object.values(data?.agents || {})
  const working   = agents.filter(a => a.status === 'working').length
  const tasksDone = data?.tasks_done  ?? 0
  const published = data?.pipeline?.done ?? 0
  const earnings  = data?.earnings != null
    ? `$${Number(data.earnings).toFixed(2)}`
    : '—'

  const dotClass  = status === 'offline'  ? 'sdot-offline'
    : working > 0                         ? 'sdot-active'
    :                                       'sdot-online'
  const statusTxt = status === 'offline'  ? 'OFFLINE'
    : working > 0                         ? 'ACTIVE'
    :                                       'STANDBY'

  return (
    <header className="topbar">
      <div className="topbar-logo">
        ⬡ TINYAGI<em>FACTORY</em>
      </div>

      <div className="topbar-stats">
        <div className="tb-stat">
          <span className="tb-stat-label">AGENTS</span>
          <span className="tb-stat-value">{agents.length} / {working} ON</span>
        </div>
        <div className="tb-stat">
          <span className="tb-stat-label">TASKS DONE</span>
          <span className="tb-stat-value">{tasksDone}</span>
        </div>
        <div className="tb-stat">
          <span className="tb-stat-label">PUBLISHED</span>
          <span className="tb-stat-value">{published}</span>
        </div>
        <div className="tb-stat">
          <span className="tb-stat-label">EARNINGS</span>
          <span className="tb-stat-value" style={{ color: '#44ff88' }}>{earnings}</span>
        </div>
      </div>

      <div className="topbar-right">
        <span className={`sdot ${dotClass}`} />
        <span>{statusTxt}</span>
      </div>
    </header>
  )
}
