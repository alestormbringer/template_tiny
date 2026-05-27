import { useState } from 'react'
import { ROOMS } from '../config.js'
import Room from './Room.jsx'
import TaskModal from './TaskModal.jsx'

export default function RoomGrid({ data }) {
  const [selected, setSelected] = useState(null)
  const agents = data?.agents || {}

  return (
    <>
      <main className="room-grid">
        {ROOMS.map(cfg => (
          <Room
            key={cfg.id}
            config={cfg}
            agent={agents[cfg.id] ?? null}
            onClick={() => setSelected({ config: cfg, agent: agents[cfg.id] ?? null })}
          />
        ))}
      </main>

      {selected && (
        <TaskModal
          config={selected.config}
          agent={selected.agent}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
