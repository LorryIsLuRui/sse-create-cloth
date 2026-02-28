import { useState } from 'react'
import { Outfit } from '../App'

export default function OutfitCard({
  outfit,
  onAdopt,
  onAbandon,
}: {
  outfit: Outfit
  onAdopt: () => void
  onAbandon: () => void
}) {
  const [feedback, setFeedback] = useState<'adopt' | 'abandon' | null>(null)

  const handleAdopt = () => {
    if (feedback !== null) return
    setFeedback('adopt')
    onAdopt()
  }
  const handleAbandon = () => {
    if (feedback !== null) return
    setFeedback('abandon')
    onAbandon()
  }

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        background: '#f9f9f9',
        borderRadius: 8,
        overflow: 'hidden',
        border: '1px solid #eee',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      <img
        src={outfit.imageUrl}
        alt={outfit.title}
        style={{ width: '100%', height: 120, objectFit: 'cover', flexShrink: 0 }}
      />
      <div style={{ padding: 8, flex: 1, minWidth: 0 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: 12, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{outfit.title}</h3>
        <p style={{ margin: '0 0 8px', color: '#555', fontSize: 11, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', lineHeight: 1.3 }}>{outfit.description}</p>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          <button
            onClick={handleAdopt}
            disabled={feedback !== null}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: 'none',
              background: feedback === 'adopt' ? '#0a0' : '#1a73e8',
              color: '#fff',
              fontSize: 11,
              cursor: feedback === null ? 'pointer' : 'default',
            }}
          >
            {feedback === 'adopt' ? '已采纳' : '采纳'}
          </button>
          <button
            onClick={handleAbandon}
            disabled={feedback !== null}
            style={{
              padding: '4px 10px',
              borderRadius: 6,
              border: '1px solid #999',
              background: feedback === 'abandon' ? '#999' : 'transparent',
              color: feedback === 'abandon' ? '#fff' : '#333',
              fontSize: 11,
              cursor: feedback === null ? 'pointer' : 'default',
            }}
          >
            {feedback === 'abandon' ? '已放弃' : '放弃'}
          </button>
        </div>
      </div>
    </div>
  )
}
