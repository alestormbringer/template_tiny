import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'

function Metric({ label, value, color = '#a0a0cc', blink = false }) {
  return (
    <div className="hud-metric">
      <span className="hud-label">{label}</span>
      <motion.span
        className="hud-value"
        style={{ color }}
        animate={blink ? { opacity: [1, 0.3, 1] } : {}}
        transition={{ repeat: Infinity, duration: 1.8 }}
      >
        {value}
      </motion.span>
    </div>
  )
}

export default function TopHUD({ data, status }) {
  const [shipTime, setShipTime] = useState('')

  useEffect(() => {
    const tick = () => {
      const now = new Date()
      const hh  = String(now.getHours()).padStart(2, '0')
      const mm  = String(now.getMinutes()).padStart(2, '0')
      const ss  = String(now.getSeconds()).padStart(2, '0')
      setShipTime(`${hh}:${mm}:${ss}`)
    }
    tick()
    const id = setInterval(tick, 1000)
    return () => clearInterval(id)
  }, [])

  const agents    = Object.values(data?.agents || {})
  const working   = agents.filter(a => a.status === 'working').length
  const tasksDone = data?.tasks_done  || 0
  const pipeline  = data?.pipeline    || {}
  const published = pipeline.done     || 0
  const active    = (pipeline.total   || 0) - published
  const totalQ    = agents.reduce((s, a) => s + (a.queue_size || 0), 0)

  return (
    <header className="top-hud">
      {/* Logo */}
      <motion.div
        className="hud-logo"
        animate={{ opacity: [1, 0.7, 1] }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
      >
        <span className="logo-hex">⬡</span>
        <span className="logo-text">TINYAGI</span>
        <span className="logo-sub">FACTORY</span>
      </motion.div>

      {/* Metrics */}
      <div className="hud-metrics">
        <Metric label="AGENTS"     value={`${agents.length} ONLINE`}           color="#00ff88" />
        <Metric label="ACTIVE"     value={`${working} WORKING`}                color={working > 0 ? '#ff9944' : '#5858a0'} blink={working > 0} />
        <Metric label="TASKS DONE" value={tasksDone}                           color="#aa44ff" />
        <Metric label="PIPELINE"   value={`${active} ACTIVE`}                  color="#ffdd44" />
        <Metric label="PUBLISHED"  value={`${published} DONE`}                 color="#44ffaa" />
        <Metric label="QUEUE"      value={`${totalQ} PENDING`}                 color="#ff44aa" />
      </div>

      {/* Status + time */}
      <div className="hud-right">
        <span className="hud-time">{shipTime}</span>
        <motion.span
          className="status-dot"
          animate={{ opacity: [1, 0.2, 1], scale: [1, 1.3, 1] }}
          transition={{ repeat: Infinity, duration: 1.6 }}
          style={{ background: status === 'offline' ? '#ff4444' : working > 0 ? '#00ff88' : '#555588' }}
        />
        <span className="status-text">
          {status === 'offline' ? 'OFFLINE' : working > 0 ? 'ACTIVE' : 'STANDBY'}
        </span>
      </div>
    </header>
  )
}
