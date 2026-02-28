import { useState, useCallback, useEffect, useRef } from 'react'
import { mockParsed, mockOutfits } from './mockData' // mock data for UI development
import { DEFAULT_INPUT, USE_MOCK, ASSISTANT_BUBBLE_WIDTH, ASSISTANT_BUBBLE_HEIGHT } from './config'
import OutfitCard from './components/OutfitCard'  

import { Parsed, Outfit, UserMessage, AssistantMessage } from './types'

// configuration values are now moved to config.ts

// bubble sizing moved to config.ts

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

    if (USE_MOCK) {
      // simulate streaming with setTimeouts
      setTimeout(() => {
        setCurrentParsed(mockParsed)
      }, 200)
      mockOutfits.forEach((o, idx) => {
        setTimeout(() => {
          outfitsRef.current = [...outfitsRef.current, o]
          setCurrentOutfits((prev) => [...prev, o])
        }, 400 + idx * 200)
      })
      setTimeout(() => {
        setChatHistory((prev) => [
          ...prev,
          { role: 'assistant', parsed: mockParsed, outfits: mockOutfits },
        ])
        setLoading(false)
      }, 1200)
      return
    }

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
      <div style={{ padding: 12, overflow: 'hidden', height: '100%', boxSizing: 'border-box' }}>
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
                display: 'flex',
                gap: 16,
                overflowX: outfits.length > 3 ? 'auto' : 'visible',
                overflowY: 'hidden',
                // container width shows up to three items, extra scroll
                maxWidth: 3 * 180 + 2 * 16,
                height: 260, // increased height to give more breathing room
                paddingBottom: 4,
              }}
            >
              {outfits.map((o) => (
                <div style={{ width: 180, height: 240, flex: '0 0 180px' }} key={o.index}>
                  <OutfitCard
                    outfit={o}
                    onAdopt={showFeedback ? () => sendFeedback(o.index, 'adopt') : () => {}}
                    onAbandon={showFeedback ? () => sendFeedback(o.index, 'abandon') : () => {}}
                  />
                </div>
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

// OutfitCard component has been moved to src/components/OutfitCard.tsx
