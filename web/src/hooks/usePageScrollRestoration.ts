import { useLayoutEffect } from 'react'
import { useLocation, useNavigationType } from 'react-router-dom'

const positions = new Map<string, number>()

/** 等异步内容就绪后再恢复，避免页面高度不足时滚动位置被截断。 */
export function usePageScrollRestoration(ready: boolean) {
  const { key } = useLocation()
  const navigationType = useNavigationType()

  useLayoutEffect(() => {
    const previous = window.history.scrollRestoration
    window.history.scrollRestoration = 'manual'
    return () => { window.history.scrollRestoration = previous }
  }, [])

  useLayoutEffect(() => {
    if (!ready) return
    window.scrollTo(0, positions.get(key) ?? (navigationType === 'REPLACE' ? window.scrollY : 0))
    const remember = () => {
      positions.set(key, window.scrollY)
      if (positions.size > 100) positions.delete(positions.keys().next().value!)
    }
    window.addEventListener('scroll', remember, { passive: true })
    return () => {
      remember()
      window.removeEventListener('scroll', remember)
    }
  }, [key, ready, navigationType])
}
