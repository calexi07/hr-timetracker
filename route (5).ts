'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ro } from 'date-fns/locale'
import { AlertCircle, CheckCircle, Clock, Eye, X } from 'lucide-react'

const STATUS_BADGE: Record<string, { label: string; color: string; icon: any }> = {
  nou: { label: 'Nou', color: 'bg-red-100 text-red-700', icon: AlertCircle },
  in_lucru: { label: 'In lucru', color: 'bg-amber-100 text-amber-700', icon: Clock },
  rezolvat: { label: 'Rezolvat', color: 'bg-green-100 text-green-700', icon: CheckCircle },
}

export default function RapoartePage() {
  const router = useRouter()
  const supabase = createClient()
  const [rapoarte, setRapoarte] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewModal, setViewModal] = useState<any>(null)
  const [screenshotUrl, setScreenshotUrl] = useState<string | null>(null)
  const [updatingId, setUpdatingId] = useState<string | null>(null)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('app_users')
        .select('role')
        .eq('id', user.id)
        .single()

      if (u?.role !== 'admin') { router.push('/dashboard'); return }

      await load()
      setLoading(false)
    }
    init()
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('rapoarte_probleme')
      .select('*')
      .order('created_at', { ascending: false })
    setRapoarte(data || [])
  }

  const handleViewModal = async (raport: any) => {
    setViewModal(raport)
    setScreenshotUrl(null)

    if (raport.screenshot_url) {
      const { data } = await supabase.storage
        .from('rapoarte-screenshots')
        .createSignedUrl(raport.screenshot_url, 60)
      if (data?.signedUrl) setScreenshotUrl(data.signedUrl)
    }
  }

  const handleUpdateStatus = async (id: string, status: string) => {
    setUpdatingId(id)
    await supabase
      .from('rapoarte_probleme')
      .update({ status })
      .eq('id', id)

    setRapoarte(prev => prev.map(r => r.id === id ? { ...r, status } : r))
    if (viewModal?.id === id) setViewModal((prev: any) => ({ ...prev, status }))
    setUpdatingId(null)
  }

  const nouCount = rapoarte.filter(r => r.status === 'nou').length

  if (loading) return <div className="p-8 text-slate-400">Se incarca...</div>

  return (
    <div className="p-8">
      {/* Modal vizualizare */}
      {viewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Detalii raport</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {format(new Date(viewModal.created_at), 'dd MMM yyyy HH:mm', { locale: ro })}
                </p>
              </div>
              <button onClick={() => setViewModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-slate-500">Utilizator:</span>
                <span className="font-medium text-slate-900">{viewModal.user_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Email:</span>
                <span className="font-medium text-slate-900">{viewModal.user_email}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-500">Status:</span>
                <StatusBadge status={viewModal.status} />
              </div>

              <div>
                <p className="text-slate-500 mb-1.5">Descriere:</p>
                <div className="bg-slate-50 border border-slate-100 rounded-xl p-3">
                  <p className="text-slate-700 leading-relaxed">{viewModal.descriere}</p>
                </div>
              </div>

              {screenshotUrl && (
                <div>
                  <p className="text-slate-500 mb-1.5">Screenshot:</p>
                  <a href={screenshotUrl} target="_blank" rel="noopener noreferrer">
                    <img
                      src={screenshotUrl}
                      alt="Screenshot"
                      className="w-full rounded-xl border border-slate-200 hover:opacity-90 transition-all cursor-zoom-in"
                    />
                  </a>
                  <p className="text-xs text-slate-400 mt-1">Click pe imagine pentru a o mari</p>
                </div>
              )}

              {viewModal.screenshot_url && !screenshotUrl && (
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500 text-center">
                  Se incarca screenshot-ul...
                </div>
              )}
            </div>

            {/* Schimba status */}
            <div className="mt-5">
              <p className="text-xs font-medium text-slate-500 mb-2">Schimba status:</p>
              <div className="flex gap-2">
                {Object.entries(STATUS_BADGE).map(([key, val]) => (
                  <button
                    key={key}
                    onClick={() => handleUpdateStatus(viewModal.id, key)}
                    disabled={viewModal.status === key || updatingId === viewModal.id}
                    className={cn(
                      'flex-1 py-2 rounded-xl text-xs font-medium transition-all border',
                      viewModal.status === key
                        ? val.color + ' border-transparent'
                        : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                    )}
                  >
                    {val.label}
                  </button>
                ))}
              </div>
            </div>

            <button onClick={() => setViewModal(null)} className="btn-secondary w-full justify-center mt-3">
              Inchide
            </button>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Rapoarte Probleme</h1>
          <p className="text-slate-500 mt-1">
            {nouCount > 0
              ? <span className="text-red-600 font-medium">{nouCount} rapoarte noi nerezolvate</span>
              : 'Toate problemele sunt rezolvate'}
          </p>
        </div>
        <button onClick={load} className="btn-secondary text-sm">
          Refresh
        </button>
      </div>

      {rapoarte.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <AlertCircle size={28} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Niciun raport</h2>
          <p className="text-slate-500 text-sm">Nu exista rapoarte de probleme momentan.</p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Utilizator</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Descriere</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Screenshot</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Data</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {rapoarte.map(raport => (
                <tr key={raport.id} className={cn(
                  'border-b border-slate-50 hover:bg-slate-50 transition-colors',
                  raport.status === 'nou' && 'bg-red-50/30'
                )}>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                        {raport.user_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="font-medium text-slate-900 text-xs">{raport.user_name}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-slate-500 text-xs">{raport.user_email}</td>
                  <td className="px-4 py-3">
                    <p className="text-slate-700 text-xs truncate max-w-[200px]" title={raport.descriere}>
                      {raport.descriere}
                    </p>
                  </td>
                  <td className="px-4 py-3">
                    {raport.screenshot_url ? (
                      <span className="text-xs text-blue-600 font-medium">✓ Da</span>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <StatusBadge status={raport.status} />
                  </td>
                  <td className="px-4 py-3 text-slate-400 text-xs">
                    {format(new Date(raport.created_at), 'dd MMM yyyy', { locale: ro })}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleViewModal(raport)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                      title="Vezi detalii"
                    >
                      <Eye size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.nou
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', s.color)}>
      <Icon size={10} />
      {s.label}
    </span>
  )
}
