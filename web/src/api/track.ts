import { apiClient } from './client'
import { uid } from '../utils/uid'

const SESSION_KEY = 'finflow_analytics_sid'

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = uid()
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

// 埋点必须是彻底的 fire-and-forget：无论构造 payload（如读 sessionStorage、生成 sid）
// 还是网络请求出错，都不得抛出，否则会从调用它的 useEffect 冒泡、卸载整棵 React 树导致白屏。
export function trackPageview(path: string, title?: string): void {
  try {
    apiClient
      .post('/analytics/track', {
        app: 'finflow',
        eventType: 'pageview',
        path,
        title: title || document.title,
        sessionId: getSessionId()
      })
      .catch(() => {
        // 网络失败静默忽略
      })
  } catch {
    // 同步构造 payload 失败（如 sessionStorage 被禁用）静默忽略
  }
}
