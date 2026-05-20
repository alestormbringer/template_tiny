import { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import ColonyCanvas from './components/ColonyCanvas.jsx'
import LeftPanel    from './components/LeftPanel.jsx'
import RightPanel   from './components/RightPanel.jsx'
import TopHUD       from './components/TopHUD.jsx'

const POLL_MS = 5000

export default function App() {
  const [data,    setData]    = useState(null)
  const [status,  setStatus]  = useState('connecting')
  const timerRef = useRef(null)

  const poll = async () => {
    try {
      const r = await fetch('/agents/status')
      if (!r.ok) throw new Error(r.status)
      const json = await r.json()
      setData(json)
      setStatus('online')
    } catch {
      setStatus('offline')
    }
  }

  useEffect(() => {
    poll()
    timerRef.current = setInterval(poll, POLL_MS)
    return () => clearInterval(timerRef.current)
  }, [])

  return (
    <div className="colony-root">
      <TopHUD data={data} />

      <div className="colony-body">
        <motion.div
          className="panel-wrap"
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <LeftPanel data={data} />
        </motion.div>

        {/* Center world */}
        <div className="colony-world">
          <ColonyCanvas agents={data} />

          {/* Connection overlay badge */}
          <motion.div
            className={`conn-badge conn-${status}`}
            animate={status === 'offline' ? { opacity: [1, 0.3, 1] } : {}}
            transition={{ repeat: Infinity, duration: 1.5 }}
          >
            {status === 'online'      && '◉ API CONNECTED'}
            {status === 'offline'     && '◌ API OFFLINE'}
            {status === 'connecting'  && '◎ CONNECTING…'}
          </motion.div>
        </div>

        <motion.div
          className="panel-wrap"
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <RightPanel data={data} />
        </motion.div>
      </div>
    </div>
  )
}
