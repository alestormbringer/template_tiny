import { motion, AnimatePresence } from 'framer-motion'

function XPBar({ pct, color }) {
  return (
    <div className="xp-track">
      <motion.div
        className="xp-fill"
        style={{ background: color }}
        initial={{ width: 0 }}
        animate={{ width: `${pct}%` }}
        transition={{ duration: 1, ease: 'easeOut' }}
      />
    </div>
  )
}

function AgentRow({ id, agent }) {
  const color   = agent.color || '#888'
  const working = agent.status === 'working'

  return (
    <motion.div
      className={`agent-row ${working ? 'agent-row--working' : ''}`}
      style={{ '--agent-color': color }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.35 }}
    >
      {/* Status dot */}
      <motion.span
        className="agent-dot"
        style={{ background: color, boxShadow: working ? `0 0 6px ${color}` : 'none' }}
        animate={working ? { opacity: [1, 0.3, 1] } : { opacity: 0.5 }}
        transition={{ repeat: Infinity, duration: 1.2 }}
      />

      {/* Info */}
      <div className="agent-info">
        <div className="agent-header-row">
          <span className="agent-name" style={{ color }}>
            {agent.name || id}
          </span>
          <span className={`agent-badge ${working ? 'badge--active' : 'badge--idle'}`}>
            {working ? 'BUSY' : 'IDLE'}
          </span>
        </div>
        <div className="agent-task">
          {working && agent.current_task
            ? <span className="task-text">{agent.current_task.slice(0, 36)}{agent.current_task.length > 36 ? '…' : ''}</span>
            : <span className="task-idle">Lv{agent.level} · {agent.tasks_done} tasks</span>
          }
        </div>
        <XPBar pct={agent.xp_pct || 0} color={color} />
      </div>

      {/* Queue badge */}
      {(agent.queue_size || 0) > 0 && (
        <motion.span
          className="queue-badge"
          animate={{ opacity: [1, 0.4, 1] }}
          transition={{ repeat: Infinity, duration: 1.2 }}
        >
          {agent.queue_size}
        </motion.span>
      )}
    </motion.div>
  )
}

export default function LeftPanel({ data }) {
  const agentEntries = Object.entries(data?.agents || {})
  const working      = agentEntries.filter(([, a]) => a.status === 'working').length
  const totalXP      = data?.total_xp || 0

  return (
    <aside className="left-panel">
      <div className="panel-header">
        <span className="panel-title">AGENTS</span>
        <span className="panel-count">{agentEntries.length}</span>
      </div>

      <div className="agent-list">
        <AnimatePresence>
          {agentEntries.map(([id, agent]) => (
            <AgentRow key={id} id={id} agent={agent} />
          ))}
        </AnimatePresence>
      </div>

      {/* Bottom stats */}
      <div className="panel-footer lp-stats">
        <div className="lp-stat">
          <span className="lp-stat-label">ACTIVE</span>
          <span className="lp-stat-val" style={{ color: working > 0 ? '#ff9944' : '#5858a0' }}>
            {working}/{agentEntries.length}
          </span>
        </div>
        <div className="lp-stat">
          <span className="lp-stat-label">TOTAL XP</span>
          <span className="lp-stat-val" style={{ color: '#aa44ff' }}>{totalXP}</span>
        </div>
      </div>
    </aside>
  )
}
