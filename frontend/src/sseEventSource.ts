/**
 * SSE 客户端：使用浏览器原生 EventSource 实现。
 * 与 sseFetchStream 相同的回调接口，便于在 App 中切换。
 */

import type { SSECallbacks } from './sseFetchStream'

const DEFAULT_ERROR_MESSAGE = 'SSE 连接失败，请检查 Ollama 是否已启动'

/**
 * 使用 EventSource 消费 SSE 流，按 event 类型调用 callbacks。
 * 返回 EventSource 实例，可由调用方在需要时 close()。
 */
export function subscribeSSEEventSource(url: string, callbacks: SSECallbacks): EventSource {
  const eventSource = new EventSource(url)

  eventSource.addEventListener('parsed', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data)
      callbacks.onParsed?.(data)
    } catch (_) {}
  })

  eventSource.addEventListener('outfit', (e: MessageEvent) => {
    try {
      const data = JSON.parse(e.data)
      callbacks.onOutfit?.(data)
    } catch (_) {}
  })

  eventSource.addEventListener('done', () => {
    callbacks.onDone?.()
    eventSource.close()
  })

  eventSource.addEventListener('error', (e: MessageEvent) => {
    let errMsg = '请求失败'
    try {
      const data = JSON.parse(e.data)
      errMsg = (data as { message?: string }).message ?? errMsg
    } catch (_) {}
    callbacks.onError?.({ message: errMsg })
    eventSource.close()
  })

  eventSource.onerror = () => {
    callbacks.onError?.({ message: DEFAULT_ERROR_MESSAGE })
    eventSource.close()
  }

  return eventSource
}
