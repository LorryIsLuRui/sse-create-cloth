/**
 * SSE 客户端：使用 fetch + ReadableStream 实现，可带自定义 headers、支持 POST 等。
 * 与 EventSource 同风格的回调接口，便于在 App 中切换。
 */

export type SSECallbacks = {
  onParsed?: (data: unknown) => void
  onOutfit?: (data: unknown) => void
  onDone?: () => void
  onError?: (data: { message?: string }) => void
}

/**
 * 使用 fetch + ReadableStream 消费 SSE 流，按 event 类型调用 callbacks。
 * 返回 AbortController，调用 abort() 可中断请求。
 */
export function subscribeSSEFetch(
  url: string,
  callbacks: SSECallbacks,
  options?: { signal?: AbortSignal }
): AbortController {
  const controller = new AbortController()
  const signal = options?.signal || controller.signal

  const run = async () => {
    try {
      const res = await fetch(url, {
        method: 'GET',
        headers: { Accept: 'text/event-stream' },
        signal,
      })
      if (!res.ok) {
        callbacks.onError?.({ message: `HTTP ${res.status}` })
        return
      }
      const reader = res.body?.getReader()
      if (!reader) {
        callbacks.onError?.({ message: 'No response body' })
        return
      }
      const decoder = new TextDecoder()
      let buffer = ''
      let currentEvent = ''
      let currentData = ''

      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (line.startsWith('event:')) {
            currentEvent = line.slice(6).trim()
          } else if (line.startsWith('data:')) {
            currentData = line.slice(5).trim()
          } else if (line === '') {
            if (currentEvent && currentData !== '') {
              try {
                const data = JSON.parse(currentData)
                if (currentEvent === 'parsed') callbacks.onParsed?.(data)
                else if (currentEvent === 'outfit') callbacks.onOutfit?.(data)
                else if (currentEvent === 'done') callbacks.onDone?.()
                else if (currentEvent === 'error') callbacks.onError?.(data)
              } catch (_) {
                if (currentEvent === 'error') callbacks.onError?.({ message: currentData })
              }
            }
            currentEvent = ''
            currentData = ''
          }
        }
      }
      if (currentEvent === 'done') callbacks.onDone?.()
    } catch (err) {
      if ((err as Error).name === 'AbortError') return
      callbacks.onError?.({ message: (err as Error).message || '连接失败' })
    }
  }

  run()
  return controller
}
