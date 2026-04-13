import { useCallback, useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'

export type CachedColumn = {
  name: string
  type: string
  nullable: boolean
  primaryKey: boolean
}

export type CachedTable = {
  schema_name: string
  table_name: string
  columns: CachedColumn[]
}

export function useSchemaCache(connectorId: string | null) {
  const [tables, setTables] = useState<CachedTable[]>([])
  const [loading, setLoading] = useState(false)

  const fetch = useCallback(() => {
    if (!connectorId) {
      setTables([])
      return
    }
    setLoading(true)
    supabase
      .from('schema_cache')
      .select('schema_name, table_name, columns')
      .eq('connector_id', connectorId)
      .order('schema_name')
      .order('table_name')
      .then(({ data }) => {
        setTables((data as CachedTable[]) ?? [])
        setLoading(false)
      })
  }, [connectorId])

  useEffect(() => { fetch() }, [fetch])

  return { tables, loading, refresh: fetch }
}
