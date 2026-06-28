import { useCallback, useEffect, useRef, useState } from 'react'

interface QueryState<T> {
  data: T | undefined
  loading: boolean
  error: Error | null
  reload: () => void
}

export function useQuery<T>(fetcher: () => Promise<T>, deps: any[] = []): QueryState<T> {
  const [data, setData] = useState<T | undefined>(undefined)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<Error | null>(null)
  const [tick, setTick] = useState(0)
  const fetcherRef = useRef(fetcher)
  fetcherRef.current = fetcher

  const reload = useCallback(() => setTick(t => t + 1), [])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    fetcherRef.current()
      .then(d => {
        if (!cancelled) {
          setData(d === null ? undefined as T : d)
          setError(null)
        }
      })
      .catch(err => {
        if (!cancelled) setError(err)
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [...deps, tick])

  return { data, loading, error, reload }
}
