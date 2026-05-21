import { motion, AnimatePresence } from 'framer-motion'
import { useState, useEffect } from 'react'

const VERTICALS = [
  { id: 'notion',   label: 'Notion',   color: '#88ddaa', icon: '📋' },
  { id: 'finance',  label: 'Finance',  color: '#ffdd77', icon: '💰' },
  { id: 'business', label: 'Business', color: '#cc88ff', icon: '📊' },
]

const STAGES = ['RESEARCH', 'CREATION', 'COPYWRITING', 'PUBLISHING', 'ANALYTICS', 'DONE']

function PipelineCard({ v, byStage, byVertical }) {
  const total = byVertical[v.id] || 0
  const done  = byStage?.DONE    || 0

  return (
    <div className="pipe-card" style={{ '--vc': v.color }}>
      <div className="pipe-card-header">
        <span className="pipe-icon">{v.icon}</span>
        <span className="pipe-label" style={{ color: v.color }}>{v.label}</span>
        <span className="pipe-count">{total} products</span>
      </div>
      <div className="pipe-stages">
        {STAGES.map(s => {
          const n = byStage?.[s] || 0
          return n > 0 ? (
            <span
              key={s}
              className={`pipe-stage ${s === 'DONE' ? 'pipe-stage--done' : ''}`}
              style={s !== 'DONE' ? { borderColor: v.color, color: v.color } : {}}
            >
              {s.slice(0, 3)} {n}
            </span>
          ) : null
        })}
        {total === 0 && <span className="pipe-stage pipe-stage--empty">no products yet</span>}
      </div>
    </div>
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
  const agents   = data?.agents   || {}
  const pipeline = data?.pipeline || {}
  const byStage  = pipeline.by_stage    || {}
  const byVert   = pipeline.by_vertical || {}
  const totalDone = pipeline.done || 0
  const totalProd = pipeline.total || 0

  useEffect(() => {
    const allLogs = []
    Object.entries(agents).forEach(([id, a]) => {
      const color = a.color || '#888'
      ;(a.log || []).slice(0, 3).forEach(entry => {
        allLogs.push({ id: `${id}-${entry}`, text: entry, color, name: a.name || id })
      })
    })
    allLogs.sort((a, b) => b.text.localeCompare(a.text))
    setLogs(allLogs.slice(0, 16))
  }, [agents])

  return (
    <aside className="right-panel">

      {/* Pipeline */}
      <div className="panel-header">
        <span className="panel-title">PIPELINE</span>
        <span className="panel-count" style={{ color: '#44ffaa' }}>{totalDone}/{totalProd}</span>
      </div>

      <div className="missions-list">
        {VERTICALS.map(v => (
          <PipelineCard
            key={v.id}
            v={v}
            byStage={byStage}
            byVertical={byVert}
          />
        ))}
      </div>

      <div className="panel-divider" />

      {/* Event log */}
      <div className="panel-header">
        <span className="panel-title">LIVE LOG</span>
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
              Awaiting factory activity…
            </motion.span>
          </div>
        )}
      </div>

    </aside>
  )
}
