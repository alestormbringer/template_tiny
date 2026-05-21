import { motion, AnimatePresence } from 'framer-motion'
import { AGENT_META } from '../simulation.js'

const SHAPES = {
  hexagon:  '⬡',
  triangle: '▲',
  circle:   '●',
  diamond:  '◆',
  pentagon: '⬠',
  rhombus:  '◈',
  star:     '★',
  octagon:  '⬡',
}

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
  const meta    = AGENT_META[id] || {}
  const color   = agent.color || '#888'
  const working = agent.status === 'working'
  const icon    = SHAPES[meta.shape] || '◆'

  return (
    <motion.div
      className={`agent-row ${working ? 'agent-row--working' : ''}`}
      style={{ '--agent-color': color }}
      initial={{ opacity: 0, x: -16 }}
      animate={{ opacity: 1, x: 0 }}
      whileHover={{ x: 4 }}
      transition={{ duration: 0.35 }}
    >
      {/* Icon */}
      <motion.span
        className="agent-icon"
        style={{ color }}
        animate={working
          ? { scale: [1, 1.25, 1], opacity: [1, 0.7, 1] }
          : { scale: 1 }
        }
        transition={{ repeat: Infinity, duration: 1.4 }}
      >
        {icon}
      </motion.span>

      {/* Info */}
      <div className="agent-info">
        <div className="agent-header-row">
          <span className="agent-name" style={{ color }}>
            {agent.name || id}
          </span>
          <span className={`agent-badge ${working ? 'badge--active' : 'badge--idle'}`}>
            {working ? 'WORK' : 'IDLE'}
          </span>
        </div>
        <div className="agent-task">
          {working && agent.current_task
            ? <span className="task-text">{agent.current_task.slice(0, 38)}{agent.current_task.length > 38 ? '…' : ''}</span>
            : <span className="task-idle">Lvl {agent.level} · {agent.tasks_done} tasks</span>
          }
        </div>
        <XPBar pct={agent.xp_pct || 0} color={color} />
      </div>

      {/* Queue indicator */}
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

  return (
    <aside className="left-panel">
      <div className="panel-header">
        <span className="panel-title">COLONY UNITS</span>
        <span className="panel-count">{agentEntries.length}</span>
      </div>

      <div className="agent-list">
        <AnimatePresence>
          {agentEntries.map(([id, agent]) => (
            <AgentRow key={id} id={id} agent={agent} />
          ))}
        </AnimatePresence>
      </div>

      <div className="panel-footer">
        <motion.button
          className="recruit-btn"
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.97 }}
        >
          + RECRUIT UNIT
        </motion.button>
      </div>
    </aside>
  )
}
