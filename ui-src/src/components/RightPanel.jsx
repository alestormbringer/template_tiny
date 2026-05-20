import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const MISSIONS = [
  { id: 1, label: 'First Revenue',   icon: '💎', target: 500,  metric: 'revenue',    unit: '€' },
  { id: 2, label: 'Publish 5 Items', icon: '📦', target: 5,    metric: 'products',   unit: '' },
  { id: 3, label: 'Complete 20 Tasks',icon: '⚡', target: 20,  metric: 'tasks_done', unit: '' },
  { id: 4, label: 'Full Crew',       icon: '👾', target: 8,    metric: 'agents',     unit: '' },
]

function MissionCard({ mission, progress, total }) {
  const pct = Math.min(100, Math.round((progress / total) * 100))
  const done = pct >= 100

  return (
    <motion.div
      className={`mission-card ${done ? 'mission-done' : ''}`}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mission-row">
        <span className="mission-icon">{mission.icon}</span>
        <span className="mission-label">{mission.label}</span>
        {done && <span className="mission-complete">✓</span>}
      </div>
      <div className="mission-progress">
        <motion.div
          className="mission-bar"
          initial={{ width: 0 }}
          animate={{ width: `${pct}%` }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
        />
      </div>
      <span className="mission-pct">{pct}%</span>
    </motion.div>
  )
}

function LogEntry({ entry, color }) {
  return (
    <motion.div
      className="log-entry"
      style={{ '--entry-color': color }}
      initial={{ opacity: 0, x: 12 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <span className="log-text">{entry}</span>
    </motion.div>
  )
}

export default function RightPanel({ data }) {
  const [logs, setLogs] = useState([])
  const agents    = data?.agents || {}
  const tasksDone = data?.tasks_done || 0
  const agentCount = Object.keys(agents).length

  // Collect recent logs from all agents
  useEffect(() => {
    const allLogs = []
    Object.entries(agents).forEach(([id, a]) => {
      const color = a.color || '#888'
      ;(a.log || []).slice(0, 3).forEach(entry => {
        allLogs.push({ id: `${id}-${entry}`, text: entry, color, name: a.name || id })
      })
    })
    // Sort by timestamp if possible (entries start with [HH:MM:SS])
    allLogs.sort((a, b) => b.text.localeCompare(a.text))
    setLogs(allLogs.slice(0, 18))
  }, [agents])

  return (
    <aside className="right-panel">

      {/* Missions */}
      <div className="panel-header">
        <span className="panel-title">MISSIONS</span>
      </div>
      <div className="missions-list">
        {MISSIONS.map(m => {
          let progress = 0
          if (m.metric === 'tasks_done') progress = tasksDone
          if (m.metric === 'agents')     progress = agentCount
          return <MissionCard key={m.id} mission={m} progress={progress} total={m.target} />
        })}
      </div>

      <div className="panel-divider" />

      {/* Event log */}
      <div className="panel-header">
        <span className="panel-title">COLONY LOG</span>
        <motion.span
          className="log-live"
          animate={{ opacity: [1, 0.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
        >
          ● LIVE
        </motion.span>
      </div>
      <div className="log-feed">
        <AnimatePresence initial={false}>
          {logs.map(l => (
            <LogEntry key={l.id} entry={l.text} color={l.color} />
          ))}
        </AnimatePresence>
        {logs.length === 0 && (
          <div className="log-empty">
            <motion.span
              animate={{ opacity: [0.3, 0.8, 0.3] }}
              transition={{ repeat: Infinity, duration: 2.5 }}
            >
              Awaiting colony activity…
            </motion.span>
          </div>
        )}
      </div>

    </aside>
  )
}
