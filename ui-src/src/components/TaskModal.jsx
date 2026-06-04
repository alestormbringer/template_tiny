import { useEffect } from 'react'

export default function TaskModal({ config, agent, onClose }) {
  const working  = agent?.status === 'working'
  const level    = agent?.level    ?? 1
  const xpPct    = agent?.xp_pct   ?? 0
  const tasksDone= agent?.tasks_done ?? 0
  const queue    = agent?.queue_size ?? 0
  const task     = agent?.current_task ?? null
  const log      = (agent?.log ?? []).slice(0, 8)

  // Close on Escape
  useEffect(() => {
    const h = (e) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', h)
    return () => window.removeEventListener('keydown', h)
  }, [onClose])

  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-card" style={{ '--ma': config.accent }}>

        {/* Header */}
        <div className="modal-top">
          <div className="modal-title-block">
            <span className="modal-bot-name">{config.name}</span>
            <span className="modal-room-sub">{config.roomLabel}</span>
          </div>
          <button className="modal-close" onClick={onClose}>✕</button>
        </div>

        {/* Current task */}
        <p className="modal-label">CURRENT TASK</p>
        <div className="modal-task-box">
          {working && task
            ? task
            : <span style={{ color: 'var(--text-dim)' }}>— idle —</span>
          }
        </div>

        {/* Quick stats */}
        <div className="modal-stats-row">
          <div className="modal-stat">
            <span className="modal-stat-lbl">STATUS</span>
            <span className="modal-stat-val" style={{ color: working ? '#00ff88' : '#404860' }}>
              {working ? 'ACTIVE' : 'IDLE'}
            </span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">TASKS DONE</span>
            <span className="modal-stat-val">{tasksDone}</span>
          </div>
          <div className="modal-stat">
            <span className="modal-stat-lbl">QUEUE</span>
            <span className="modal-stat-val">{queue}</span>
          </div>
        </div>

        {/* XP / Level */}
        <div className="modal-xp-section">
          <div className="modal-xp-header">
            <span className="modal-label" style={{ marginBottom: 0 }}>EXPERIENCE</span>
            <span className="modal-lvl">LV {level}</span>
          </div>
          <div style={{ marginBottom: 4 }} />
          <div className="modal-xp-bar">
            <div className="modal-xp-fill" style={{ width: `${xpPct}%` }} />
          </div>
        </div>

        {/* Log */}
        {log.length > 0 && (
          <>
            <p className="modal-label">RECENT LOG</p>
            <div style={{ marginBottom: 4 }} />
            <div className="modal-log">
              {log.map((entry, i) => (
                <div key={i} className="modal-log-line">{entry}</div>
              ))}
            </div>
          </>
        )}

      </div>
    </div>
  )
}
