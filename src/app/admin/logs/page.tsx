'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { format } from 'date-fns'
import { CheckCircle2, XCircle, FileSpreadsheet, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'

export default function LogsPage() {
  const [logs, setLogs] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [deleting, setDeleting] = useState<string | null>(null)
  const supabase = createClient()

  useEffect(() => {
    load()
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('upload_logs')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50)
    setLogs(data || [])
    setLoading(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Esti sigur ca vrei sa stergi aceasta inregistrare?')) return
    setDeleting(id)

    const { error } = await supabase
      .from('upload_logs')
      .delete()
      .eq('id', id)

    if (error) {
      toast.error('Eroare la stergere: ' + error.message)
    } else {
      toast.success('Inregistrare stearsa')
      setLogs(prev => prev.filter(l => l.id !== id))
    }
    setDeleting(null)
  }

  const handleDeleteAll = async () => {
    if (!confirm('Stergi TOT istoricul de incarcari. Esti sigur?')) return

    const { error } = await supabase
      .from('upload_logs')
      .delete()
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) {
      toast.error('Eroare: ' + error.message)
    } else {
      toast.success('Istoric sters complet')
      setLogs([])
    }
  }

  if (loading) return <div className="p-8 text-slate-400">Se incarca...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Istoric incarcari</h1>
          <p className="text-slate-500 mt-1">Istoricul fisierelor Excel incarcate si rezultatele procesarii.</p>
        </div>
        {logs.length > 0 && (
          <button
            onClick={handleDeleteAll}
            className="btn-secondary text-red-600 border-red-200 hover:bg-red-50 text-sm"
          >
            <Trash2 size={14} />
            Sterge tot istoricul
          </button>
        )}
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
                <th className="px-5 py-3.5" />
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
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleDelete(log.id)}
                      disabled={deleting === log.id}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      title="Sterge"
                    >
                      {deleting === log.id
                        ? <span className="text-xs">...</span>
                        : <Trash2 size={15} />
                      }
                    </button>
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
