'use client'
import { useEffect, useState, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Bell, CheckCircle, XCircle, X, MessageSquare } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ro } from 'date-fns/locale'
import toast from 'react-hot-toast'

interface Notificare {
  id: string
  titlu: string
  mesaj: string
  angajat_name: string
  angajat_id: string
  timesheet_id: string | null
  observatie_id: string | null
  date_referinta: string
  citita: boolean
  rezolvata: boolean
  created_at: string
}

interface Props {
  userId: string
  normaZi?: number
}

export default function NotificariDropdown({ userId, normaZi = 8.25 }: Props) {
  const supabase = createClient()
  const [open, setOpen] = useState(false)
  const [notificari, setNotificari] = useState<Notificare[]>([])
  const [approveModal, setApproveModal] = useState<Notificare | null>(null)
  const [raspuns, setRaspuns] = useState('')
  const [saving, setSaving] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)

  const nerezolvate = notificari.filter(n => !n.rezolvata)
  const count = nerezolvate.length

  useEffect(() => {
    if (!userId) return
    loadNotificari()
    const interval = setInterval(loadNotificari, 30000)
    return () => clearInterval(interval)
  }, [userId])

  const loadNotificari = async () => {
    if (!userId) return
    const { data } = await supabase
      .from('notificari')
      .select('*')
      .eq('destinatar_id', userId)
      .eq('rezolvata', false)
      .order('created_at', { ascending: false })
    setNotificari(data || [])
  }

  const handleOpen = async () => {
    setOpen(prev => !prev)
    if (!open && count > 0) {
      await supabase
        .from('notificari')
        .update({ citita: true })
        .eq('destinatar_id', userId)
        .eq('citita', false)
      setNotificari(prev => prev.map(n => ({ ...n, citita: true })))
    }
  }

  const handleDecizie = async (notificare: Notificare, decizie: 'aprobat' | 'respins') => {
    setSaving(true)

    const updateData = {
      motivatie_status: decizie,
      motivatie_aprobata_de: userId,
      motivatie_aprobata_la: new Date().toISOString(),
      motivatie_raspuns: raspuns.trim() || null
    }

    let success = false

    if (notificare.timesheet_id) {
      const { error } = await supabase
        .from('timesheets')
        .update(updateData)
        .eq('id', notificare.timesheet_id)
      success = !error
      if (error) toast.error('Eroare: ' + error.message)
    } else if (notificare.observatie_id) {
      const { error } = await supabase
        .from('observatii_zile')
        .update(updateData)
        .eq('id', notificare.observatie_id)
      success = !error
      if (error) toast.error('Eroare: ' + error.message)
    }

    if (success) {
      await supabase
        .from('notificari')
        .update({ rezolvata: true, citita: true })
        .eq('id', notificare.id)

      toast.success(decizie === 'aprobat' ? 'Motivatie aprobata' : 'Motivatie respinsa')
      setApproveModal(null)
      setRaspuns('')
      await loadNotificari()
    }

    setSaving(false)
  }

  const formatNorma = (ore: number) => {
    const h = Math.floor(ore)
    const m = Math.round((ore - h) * 60)
    if (m === 0) return `${h}h`
    return `${h}h ${m}m`
  }

  return (
    <>
      {/* Buton notificari */}
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className={cn(
          'relative flex items-center gap-2 px-3 py-2 rounded-xl transition-all w-full text-left',
          open ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
        )}
      >
        <Bell size={18} className={count > 0 ? 'animate-pulse' : ''} />
        <span className="text-sm font-medium">Notificari</span>
        {count > 0 && (
          <span className="ml-auto bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center shrink-0">
            {count > 9 ? '9+' : count}
          </span>
        )}
      </button>

      {/* Panel + Overlay */}
      {open && (
        <>
          {/* Overlay peste tot inclusiv grafice */}
          <div
            className="fixed inset-0 bg-black/30"
            style={{ zIndex: 9998 }}
            onClick={() => setOpen(false)}
          />

          {/* Panel notificari */}
          <div
            className="fixed top-0 left-64 h-screen w-80 bg-white shadow-2xl flex flex-col"
            style={{ zIndex: 9999 }}
          >
            {/* Header */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0 bg-white">
              <div>
                <h3 className="font-semibold text-slate-900 text-sm">Notificari</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  {count === 0 ? 'Nicio notificare noua' : `${count} motivatii de rezolvat`}
                </p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={15} />
              </button>
            </div>

            {/* Lista */}
            <div className="flex-1 overflow-y-auto">
              {notificari.length === 0 ? (
                <div className="p-8 text-center mt-4">
                  <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
                    <Bell size={24} className="text-slate-300" />
                  </div>
                  <p className="text-sm font-medium text-slate-500">Nicio motivatie in asteptare</p>
                  <p className="text-xs text-slate-400 mt-1">Vei fi notificat cand apar motivatii noi</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-50">
                  {notificari.map(n => (
                    <div
                      key={n.id}
                      className={cn(
                        'p-4 transition-all hover:bg-slate-50',
                        !n.citita && 'bg-blue-50/40 border-l-2 border-l-blue-400'
                      )}
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-9 h-9 rounded-full bg-amber-100 flex items-center justify-center text-amber-700 text-sm font-semibold shrink-0 mt-0.5">
                          {n.angajat_name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <p className="text-xs font-semibold text-slate-900">{n.angajat_name}</p>
                            {!n.citita && (
                              <span className="w-2 h-2 rounded-full bg-blue-500 shrink-0" />
                            )}
                          </div>
                          <p className="text-xs text-slate-400 mb-2">
                            {n.date_referinta && format(parseISO(n.date_referinta), 'dd MMM yyyy', { locale: ro })}
                          </p>
                          <div className="bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 mb-3">
                            <p className="text-xs text-slate-700 italic">"{n.mesaj}"</p>
                          </div>
                          <button
                            onClick={() => { setApproveModal(n); setRaspuns('') }}
                            className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs font-medium hover:bg-amber-100 transition-all"
                          >
                            <MessageSquare size={12} />
                            Aproba / Respinge
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}

      {/* Modal decizie */}
      {approveModal && (
        <div className="fixed inset-0 flex items-center justify-center p-4" style={{ zIndex: 10000 }}>
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setApproveModal(null)}
          />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Aprobare motivatie</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {approveModal.angajat_name} · {approveModal.date_referinta && format(parseISO(approveModal.date_referinta), 'dd MMM yyyy', { locale: ro })}
                </p>
              </div>
              <button
                onClick={() => setApproveModal(null)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
              >
                <X size={18} />
              </button>
            </div>

            <div className="mb-4">
              <p className="text-xs font-medium text-slate-500 mb-1.5">Motivatia angajatului</p>
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                <p className="text-sm text-slate-700 italic">"{approveModal.mesaj}"</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-700">
              Daca aprobi, orele zilei vor fi considerate <strong>{formatNorma(normaZi)}</strong> si diferenta va fi <strong>±0m</strong>.
            </div>

            <div className="mb-5">
              <label className="block text-xs font-medium text-slate-500 mb-1.5">
                Raspunsul tau <span className="text-slate-400 font-normal">(optional)</span>
              </label>
              <textarea
                value={raspuns}
                onChange={e => setRaspuns(e.target.value)}
                placeholder="Ex: Aprobat, conform politicii companiei."
                rows={3}
                className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => handleDecizie(approveModal, 'respins')}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-all disabled:opacity-50"
              >
                <XCircle size={16} />
                {saving ? '...' : 'Respinge'}
              </button>
              <button
                onClick={() => handleDecizie(approveModal, 'aprobat')}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all disabled:opacity-50"
              >
                <CheckCircle size={16} />
                {saving ? '...' : 'Aproba'}
              </button>
            </div>

            <button
              onClick={() => setApproveModal(null)}
              className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 py-1.5"
            >
              Anuleaza
            </button>
          </div>
        </div>
      )}
    </>
  )
}
