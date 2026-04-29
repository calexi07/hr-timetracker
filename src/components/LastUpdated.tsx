'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format, parseISO } from 'date-fns'
import { ro } from 'date-fns/locale'
import { RefreshCw } from 'lucide-react'

export default function LastUpdated() {
  const [lastUpdate, setLastUpdate] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('upload_logs')
        .select('created_at')
        .eq('status', 'success')
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (data) setLastUpdate(data.created_at)
    }
    load()
  }, [])

  if (!lastUpdate) return null

  return (
    <div className="flex items-center gap-1.5 text-xs text-slate-400 bg-slate-100 px-3 py-1.5 rounded-full">
      <RefreshCw size={11} />
      <span>
        Actualizat: <span className="font-medium text-slate-600">
          {format(parseISO(lastUpdate), 'dd MMM yyyy, HH:mm', { locale: ro })}
        </span>
      </span>
    </div>
  )
}
