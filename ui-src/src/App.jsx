import { useState, useEffect } from 'react'
import GalaxyBg from './components/GalaxyBg.jsx'
import TopBar from './components/TopBar.jsx'
import RoomGrid from './components/RoomGrid.jsx'

const POLL_MS = 5000

export default function App() {
  const [data, setData] = useState(null)
  const [status, setStatus] = useState('connecting')

  useEffect(() => {
    const poll = async () => {
      try {
        const r = await fetch('/agents/status')
        if (!r.ok) throw new Error(r.status)
        setData(await r.json())
        setStatus('online')
      } catch {
        setStatus('offline')
      }
    }
    poll()
    const id = setInterval(poll, POLL_MS)
    return () => clearInterval(id)
  }, [])

  return (
    <div className="app-root">
      <GalaxyBg />
      <div className="app-content">
        <TopBar data={data} status={status} />
        <RoomGrid data={data} />
      </div>
    </div>
  )
}
