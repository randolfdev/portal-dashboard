import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

type IndicatorResult = {
  data: Record<string, unknown>[]
  metadata: Record<string, unknown>
  fetched_at: string
}

export function useIndicatorData(indicatorId: string | null, enabled = true) {
  const [result, setResult] = useState<IndicatorResult | null>(null)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!indicatorId || !enabled) return

    setLoading(true)

    supabase
      .from('indicator_results')
      .select('data, metadata, fetched_at')
      .eq('indicator_id', indicatorId)
      .order('fetched_at', { ascending: false })
      .limit(1)
      .single()
      .then(({ data }) => {
        if (data) setResult(data as IndicatorResult)
        setLoading(false)
      })

    const channel = supabase
      .channel(`indicator-${indicatorId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'indicator_results',
          filter: `indicator_id=eq.${indicatorId}`,
        },
        (payload) => {
          const row = payload.new as IndicatorResult
          setResult(row)
        },
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [indicatorId, enabled])

  return { result, loading }
}
