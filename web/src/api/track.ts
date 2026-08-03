import { apiClient } from './client'

const SESSION_KEY = 'finflow_analytics_sid'

function getSessionId(): string {
  let sid = sessionStorage.getItem(SESSION_KEY)
  if (!sid) {
    sid = crypto.randomUUID()
    sessionStorage.setItem(SESSION_KEY, sid)
  }
  return sid
}

export function trackPageview(path: string, title?: string): void {
  apiClient
    .post('/analytics/track', {
      app: 'finflow',
      eventType: 'pageview',
      path,
      title: title || document.title,
      sessionId: getSessionId()
    })
    .catch(() => {
      // fire-and-forget: tracking failure must not block the UI
    })
}
