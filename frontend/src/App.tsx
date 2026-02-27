import { useState, useCallback, useEffect, useRef } from 'react'

export type Parsed = {
  date: string
  weather: string
  occasion: string
  colorPreference: string
  comfortPreference: string
  thicknessPreference: string
}

export type Outfit = {
  index: number
  title: string
  description: string
  imageUrl: string
}

type UserMessage = { role: 'user'; text: string }
type AssistantMessage = { role: 'assistant'; parsed: Parsed | null; outfits: Outfit[]; error?: string }

const DEFAULT_INPUT = '明天阴天 15 度，去面试，希望正式一点、偏深色、不要太厚'

const ASSISTANT_BUBBLE_WIDTH = 520
const ASSISTANT_BUBBLE_HEIGHT = 380

export default function App() {
  const [input, setInput] = useState(DEFAULT_INPUT)
  const [chatHistory, setChatHistory] = useState<(UserMessage | AssistantMessage)[]>([])
  const [loading, setLoading] = useState(false)
  const [currentParsed, setCurrentParsed] = useState<Parsed | null>(null)
  const [currentOutfits, setCurrentOutfits] = useState<Outfit[]>([])
  const [currentError, setCurrentError] = useState<string | null>(null)
  const [sessionId] = useState(() => `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`)
  const scrollRef = useRef<HTMLDivElement>(null)
  const parsedRef = useRef<Parsed | null>(null)
  const outfitsRef = useRef<Outfit[]>([])

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chatHistory, loading, currentParsed, currentOutfits])

  const startRecommend = useCallback(() => {
    const text = input.trim()
    if (!text) return

    setLoading(true)
    parsedRef.current = null
    outfitsRef.current = []
    setCurrentParsed(null)
    setCurrentOutfits([])
    setCurrentError(null)
    setChatHistory((prev) => [...prev, { role: 'user', text }])
    setInput(DEFAULT_INPUT)

    const q = encodeURIComponent(text)
    const eventSource = new EventSource(`/sse/recommend?q=${q}`)

    eventSource.addEventListener('parsed', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        parsedRef.current = data
        setCurrentParsed(data)
      } catch (_) {}
    })
    eventSource.addEventListener('outfit', (e) => {
      try {
        const data = JSON.parse((e as MessageEvent).data)
        const item = { index: data.index, ...data }
        outfitsRef.current = [...outfitsRef.current, item]
        setCurrentOutfits((prev) => [...prev, item])
      } catch (_) {}
    })
    eventSource.addEventListener('done', () => {
      const parsed = parsedRef.current
      const outfits = [...outfitsRef.current]
      setChatHistory((prev) => [
        ...prev,
        { role: 'assistant', parsed, outfits, error: undefined },
      ])
      parsedRef.current = null
      outfitsRef.current = []
      setCurrentParsed(null)
      setCurrentOutfits([])
      setLoading(false)
      eventSource.close()
    })
    eventSource.addEventListener('error', (e) => {
      let errMsg = '请求失败'
      try {
        const data = JSON.parse((e as MessageEvent).data)
        errMsg = data.message || errMsg
      } catch (_) {}
      setCurrentError(errMsg)
      setChatHistory((prev) => [...prev, { role: 'assistant', parsed: null, outfits: [], error: errMsg }])
      parsedRef.current = null
      outfitsRef.current = []
      setCurrentParsed(null)
      setCurrentOutfits([])
      setLoading(false)
      eventSource.close()
    })
    eventSource.onerror = () => {
      const err = 'SSE 连接失败，请检查 Ollama 是否已启动'
      setCurrentError(err)
      setChatHistory((prev) => [...prev, { role: 'assistant', parsed: null, outfits: [], error: err }])
      parsedRef.current = null
      outfitsRef.current = []
      setCurrentParsed(null)
      setCurrentOutfits([])
      setLoading(false)
      eventSource.close()
    }
  }, [input])

  const sendFeedback = useCallback(async (outfitIndex: number, action: 'adopt' | 'abandon') => {
    try {
      await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, outfitIndex, action }),
      })
    } catch (_) {}
  }, [sessionId])

  const renderAssistantContent = (parsed: Parsed | null, outfits: Outfit[], error?: string, showFeedback = true) => {
    if (error) {
      return (
        <div style={{ padding: 12, color: '#c00', fontSize: 14 }}>{error}</div>
      )
    }
    return (
      <div style={{ padding: 12, overflow: 'auto', height: '100%', boxSizing: 'border-box' }}>
        {parsed && (
          <div style={{ marginBottom: 12, flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>解析结果</div>
            <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, color: '#444' }}>
              <li>日期 / 天气：{parsed.date} {parsed.weather}</li>
              <li>场景：{parsed.occasion}</li>
              <li>颜色偏好：{parsed.colorPreference || '—'}</li>
              <li>舒适度：{parsed.comfortPreference || '—'}</li>
              <li>薄厚：{parsed.thicknessPreference || '—'}</li>
            </ul>
          </div>
        )}
        {outfits.length > 0 && (
          <div style={{ flexShrink: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 8 }}>推荐穿搭</div>
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${outfits.length}, minmax(0, 1fr))`,
                gap: 12,
              }}
            >
              {outfits.map((o) => (
                <OutfitCard
                  key={o.index}
                  outfit={o}
                  onAdopt={showFeedback ? () => sendFeedback(o.index, 'adopt') : () => {}}
                  onAbandon={showFeedback ? () => sendFeedback(o.index, 'abandon') : () => {}}
                />
              ))}
            </div>
          </div>
        )}
        {!parsed && outfits.length === 0 && !error && (
          <span style={{ fontSize: 13, color: '#888' }}>正在分析…</span>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', maxWidth: 800, margin: '0 auto' }}>
      <header style={{ padding: '12px 20px', borderBottom: '1px solid #e5e5e5', background: '#fff', flexShrink: 0 }}>
        <h1 style={{ margin: 0, fontSize: 18 }}>穿搭建议</h1>
      </header>

      <main style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 16 }}>
        {chatHistory.map((msg, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
            }}
          >
            <div
              style={{
                maxWidth: msg.role === 'user' ? '85%' : ASSISTANT_BUBBLE_WIDTH,
                width: msg.role === 'assistant' ? ASSISTANT_BUBBLE_WIDTH : undefined,
                borderRadius: 12,
                padding: '10px 14px',
                background: msg.role === 'user' ? '#1a73e8' : '#f0f0f0',
                color: msg.role === 'user' ? '#fff' : '#1a1a1a',
                ...(msg.role === 'assistant' && {
                  height: ASSISTANT_BUBBLE_HEIGHT,
                  overflow: 'hidden',
                  display: 'flex',
                  flexDirection: 'column',
                }),
              }}
            >
              {msg.role === 'user' ? (
                <div style={{ fontSize: 14, whiteSpace: 'pre-wrap' }}>{msg.text}</div>
              ) : (
                <div
                  style={{
                    background: '#fff',
                    borderRadius: 8,
                    overflow: 'auto',
                    flex: 1,
                    minHeight: 0,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                  }}
                >
                  {renderAssistantContent(msg.parsed, msg.outfits, msg.error)}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div style={{ display: 'flex', justifyContent: 'flex-start' }}>
            <div
              style={{
                width: ASSISTANT_BUBBLE_WIDTH,
                height: ASSISTANT_BUBBLE_HEIGHT,
                borderRadius: 12,
                padding: '10px 14px',
                background: '#f0f0f0',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
              }}
            >
              <div
                style={{
                  background: '#fff',
                  borderRadius: 8,
                  overflow: 'auto',
                  flex: 1,
                  minHeight: 0,
                  boxShadow: '0 1px 2px rgba(0,0,0,0.06)',
                }}
              >
                {renderAssistantContent(currentParsed, currentOutfits, currentError || undefined, false)}
              </div>
            </div>
          </div>
        )}

        <div ref={scrollRef} />
      </main>

      <footer
        style={{
          flexShrink: 0,
          padding: '16px 20px',
          borderTop: '1px solid #e5e5e5',
          background: '#fff',
        }}
      >
        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && startRecommend()}
            placeholder="输入穿搭需求…"
            style={{
              flex: 1,
              padding: '12px 16px',
              borderRadius: 24,
              border: '1px solid #ddd',
              fontSize: 14,
              outline: 'none',
            }}
          />
          <button
            onClick={startRecommend}
            disabled={loading}
            style={{
              padding: '12px 24px',
              borderRadius: 24,
              border: 'none',
              background: loading ? '#ccc' : '#1a73e8',
              color: '#fff',
              fontWeight: 500,
              cursor: loading ? 'not-allowed' : 'pointer',
              flexShrink: 0,
            }}
          >
            {loading ? '发送中' : '发送'}
          </button>
        </div>
      </footer>
    </div>
  )
}

function OutfitCard({
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
        minWidth: 0,
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
        style={{ width: '100%', height: 100, objectFit: 'cover', flexShrink: 0 }}
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
