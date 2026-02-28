import { useState, useCallback, useRef, useEffect } from 'react'
import { USE_FETCH_SSE } from './config'
import { subscribeSSEFetch } from './sseFetchStream'
import { subscribeSSEEventSource } from './sseEventSource'
import type { Parsed, Outfit } from './types'

export type UseRecommendSSEOptions = {
  onDone: (parsed: Parsed | null, outfits: Outfit[]) => void
  onError: (message: string) => void
}

/**
 * React Hook：封装 SSE 推荐请求（EventSource 或 fetch+ReadableStream）。
 * 负责订阅、流式状态、完成/错误回调和卸载时清理。
 */
export function useRecommendSSE(options: UseRecommendSSEOptions) {
  const { onDone, onError } = options
  const [loading, setLoading] = useState(false)
  const [currentParsed, setCurrentParsed] = useState<Parsed | null>(null)
  const [currentOutfits, setCurrentOutfits] = useState<Outfit[]>([])
  const [currentError, setCurrentError] = useState<string | null>(null)

  const parsedRef = useRef<Parsed | null>(null)
  const outfitsRef = useRef<Outfit[]>([])
  const subscriptionRef = useRef<AbortController | EventSource | null>(null)

  const startRecommend = useCallback((query: string) => {
    const text = query.trim()
    if (!text) return

    setLoading(true)
    setCurrentError(null)
    parsedRef.current = null
    outfitsRef.current = []
    setCurrentParsed(null)
    setCurrentOutfits([])

    const url = `/sse/recommend?q=${encodeURIComponent(text)}`
    const callbacks = {
      onParsed(data: unknown) {
        try {
          const parsed = data as Parsed
          parsedRef.current = parsed
          setCurrentParsed(parsed)
        } catch (_) {}
      },
      onOutfit(data: unknown) {
        try {
          const item = { index: (data as Outfit).index, ...(data as object) } as Outfit
          outfitsRef.current = [...outfitsRef.current, item]
          setCurrentOutfits((prev) => [...prev, item])
        } catch (_) {}
      },
      onDone() {
        const parsed = parsedRef.current
        const outfits = [...outfitsRef.current]
        onDone(parsed, outfits)
        parsedRef.current = null
        outfitsRef.current = []
        setCurrentParsed(null)
        setCurrentOutfits([])
        setLoading(false)
        subscriptionRef.current = null
      },
      onError(data: { message?: string }) {
        const msg = data?.message ?? '请求失败'
        setCurrentError(msg)
        onError(msg)
        parsedRef.current = null
        outfitsRef.current = []
        setCurrentParsed(null)
        setCurrentOutfits([])
        setLoading(false)
        subscriptionRef.current = null
      },
    }

    if (USE_FETCH_SSE) {
      const controller = subscribeSSEFetch(url, callbacks)
      subscriptionRef.current = controller
    } else {
      const es = subscribeSSEEventSource(url, callbacks)
      subscriptionRef.current = es
    }
  }, [onDone, onError])

  useEffect(() => {
    return () => {
      const sub = subscriptionRef.current
      if (sub) {
        if ('abort' in sub && typeof sub.abort === 'function') (sub as AbortController).abort()
        else if ('close' in sub && typeof sub.close === 'function') (sub as EventSource).close()
        subscriptionRef.current = null
      }
    }
  }, [])

  return { startRecommend, loading, currentParsed, currentOutfits, currentError }
}
