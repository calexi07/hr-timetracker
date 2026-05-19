'use client'
import { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'
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
  const [mounted, setMounted] = useState(false)

  const nerezolvate = notificari.filter(n => !n.rezolvata)
  const count = nerezolvate.length

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  useEffect(() => {
    if (!userId) return
    loadNotificari()
    const interval = setInterval(loadNotificari, 30000)
    return () => clearInterval(interval)
  }, [userId])

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

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

  const portal = mounted && open ? createPortal(
    <>
      {/* Overlay complet peste tot */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 99998,
          background: 'rgba(0,0,0,0.4)',
        }}
        onClick={() => setOpen(false)}
      />

      {/* Panel notificari — montat direct in body */}
      <div
        style={{
          position: 'fixed',
          top: 0,
          left: '256px', // latimea sidebar-ului (w-64 = 256px)
          height: '100vh',
          width: '320px',
          background: 'white',
          zIndex: 99999,
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
        }}
      >
        {/* Header */}
        <div style={{
          padding: '16px',
          borderBottom: '1px solid #f1f5f9',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
          background: 'white',
        }}>
          <div>
            <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', margin: 0 }}>Notificari</p>
            <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
              {count === 0 ? 'Nicio notificare noua' : `${count} motivatii de rezolvat`}
            </p>
          </div>
          <button
            onClick={() => setOpen(false)}
            style={{
              padding: '6px',
              borderRadius: '8px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              color: '#94a3b8',
              display: 'flex',
              alignItems: 'center',
            }}
          >
            <X size={15} />
          </button>
        </div>

        {/* Lista */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {notificari.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', marginTop: '16px' }}>
              <div style={{
                width: '56px', height: '56px', borderRadius: '50%',
                background: '#f1f5f9', display: 'flex', alignItems: 'center',
                justifyContent: 'center', margin: '0 auto 12px'
              }}>
                <Bell size={24} color="#cbd5e1" />
              </div>
              <p style={{ fontSize: '14px', color: '#64748b', fontWeight: 500, margin: '0 0 4px' }}>
                Nicio motivatie in asteptare
              </p>
              <p style={{ fontSize: '12px', color: '#94a3b8', margin: 0 }}>
                Vei fi notificat cand apar motivatii noi
              </p>
            </div>
          ) : (
            notificari.map((n, i) => (
              <div
                key={n.id}
                style={{
                  padding: '16px',
                  borderBottom: i < notificari.length - 1 ? '1px solid #f8fafc' : 'none',
                  background: !n.citita ? '#eff6ff' : 'white',
                  borderLeft: !n.citita ? '3px solid #3b82f6' : '3px solid transparent',
                }}
              >
                <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                  <div style={{
                    width: '36px', height: '36px', borderRadius: '50%',
                    background: '#fef3c7', display: 'flex', alignItems: 'center',
                    justifyContent: 'center', color: '#d97706',
                    fontWeight: 600, fontSize: '14px', flexShrink: 0,
                  }}>
                    {n.angajat_name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                      <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', margin: 0 }}>
                        {n.angajat_name}
                      </p>
                      {!n.citita && (
                        <span style={{
                          width: '8px', height: '8px', borderRadius: '50%',
                          background: '#3b82f6', flexShrink: 0,
                        }} />
                      )}
                    </div>
                    <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px' }}>
                      {n.date_referinta && format(parseISO(n.date_referinta), 'dd MMM yyyy', { locale: ro })}
                    </p>
                    <div style={{
                      background: '#f8fafc', border: '1px solid #e2e8f0',
                      borderRadius: '8px', padding: '8px 12px', marginBottom: '10px',
                    }}>
                      <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: 0 }}>
                        "{n.mesaj}"
                      </p>
                    </div>
                    <button
                      onClick={() => { setApproveModal(n); setRaspuns('') }}
                      style={{
                        width: '100%', padding: '8px', borderRadius: '8px',
                        border: '1px solid #fcd34d', background: '#fffbeb',
                        color: '#b45309', fontSize: '12px', fontWeight: 500,
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        justifyContent: 'center', gap: '6px',
                      }}
                    >
                      <MessageSquare size={12} />
                      Aproba / Respinge
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal decizie */}
      {approveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => setApproveModal(null)}
          />
          <div style={{
            position: 'relative', background: 'white', borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '448px', padding: '24px',
          }}>
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                  Aprobare motivatie
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  {approveModal.angajat_name} · {approveModal.date_referinta && format(parseISO(approveModal.date_referinta), 'dd MMM yyyy', { locale: ro })}
                </p>
              </div>
              <button
                onClick={() => setApproveModal(null)}
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            <div style={{ marginBottom: '16px' }}>
              <p style={{ fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                Motivatia angajatului
              </p>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px' }}>
                <p style={{ fontSize: '14px', color: '#475569', fontStyle: 'italic', margin: 0 }}>
                  "{approveModal.mesaj}"
                </p>
              </div>
            </div>

            <div style={{
              background: '#fffbeb', border: '1px solid #fde68a',
              borderRadius: '12px', padding: '12px', marginBottom: '16px',
              fontSize: '12px', color: '#b45309',
            }}>
              Daca aprobi, orele zilei vor fi considerate <strong>{formatNorma(normaZi)}</strong> si diferenta va fi <strong>±0m</strong>.
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                Raspunsul tau <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
              </label>
              <textarea
                value={raspuns}
                onChange={e => setRaspuns(e.target.value)}
                placeholder="Ex: Aprobat, conform politicii companiei."
                rows={3}
                style={{
                  width: '100%', padding: '10px 12px', borderRadius: '12px',
                  border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a',
                  resize: 'none', outline: 'none', boxSizing: 'border-box',
                  fontFamily: 'inherit',
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                onClick={() => handleDecizie(approveModal, 'respins')}
                disabled={saving}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '10px', borderRadius: '12px',
                  border: '1px solid #fecaca', background: 'white', color: '#dc2626',
                  fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <XCircle size={16} />
                {saving ? '...' : 'Respinge'}
              </button>
              <button
                onClick={() => handleDecizie(approveModal, 'aprobat')}
                disabled={saving}
                style={{
                  flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: '8px', padding: '10px', borderRadius: '12px',
                  border: 'none', background: '#16a34a', color: 'white',
                  fontSize: '14px', fontWeight: 500, cursor: saving ? 'not-allowed' : 'pointer',
                  opacity: saving ? 0.5 : 1,
                }}
              >
                <CheckCircle size={16} />
                {saving ? '...' : 'Aproba'}
              </button>
            </div>

            <button
              onClick={() => setApproveModal(null)}
              style={{
                width: '100%', marginTop: '12px', padding: '6px',
                border: 'none', background: 'none', cursor: 'pointer',
                fontSize: '12px', color: '#94a3b8',
              }}
            >
              Anuleaza
            </button>
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null

  return (
    <>
      {/* Buton notificari in sidebar */}
      <button
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

      {/* Portal — randat direct in body, peste orice */}
      {portal}
    </>
  )
}
