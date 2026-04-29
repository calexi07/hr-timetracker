'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, FileSpreadsheet } from 'lucide-react'

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('upload_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50)
      setLogs(data || [])
      setLoading(false)
    }
    load()
  }, [])

  if (loading) return <div className="p-8 text-slate-400">Se incarca...</div>

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Istoric incarcari</h1>
        <p className="text-slate-500 mt-1">Istoricul fisierelor Excel incarcate si rezultatele procesarii.</p>
      </div>

      <div className="card overflow-hidden">
        {!logs.length ? (
          <div className="p-12 text-center text-slate-400">
            <FileSpreadsheet size={36} className="mx-auto mb-3 opacity-30" />
            <p className="text-sm">Nicio incarcare pana acum</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Fisier</th>
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Data</th>
                <th className="text-right px-5 py-3.5 font-medium text-slate-500">Inregistrari</th>
                <th className="text-left px-5 py-3.5 font-medium text-slate-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log: any) => (
                <tr key={log.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <FileSpreadsheet size={16} className="text-green-600" />
                      <span className="font-medium text-slate-900 truncate max-w-xs">{log.filename}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm')}
                  </td>
                  <td className="px-5 py-3.5 text-right font-medium text-slate-900">
                    {log.records_inserted}
                  </td>
                  <td className="px-5 py-3.5">
                    {log.status === 'success'
                      ? <span className="flex items-center gap-1.5 text-green-700"><CheckCircle2 size={14} />Succes</span>
                      : <span className="flex items-center gap-1.5 text-red-600"><XCircle size={14} />Eroare</span>
                    }
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
