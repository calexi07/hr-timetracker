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
  const [tipAprobare, setTipAprobare] = useState<'fara_recuperare' | 'cu_recuperare'>('fara_recuperare')
  const [saving, setSaving] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [step, setStep] = useState<'decizie' | 'tip_aprobare'>('decizie')

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

  const handleRespinge = async (notificare: Notificare) => {
    setSaving(true)

    const updateData = {
      motivatie_status: 'respins',
      motivatie_aprobata_de: userId,
      motivatie_aprobata_la: new Date().toISOString(),
      motivatie_raspuns: raspuns.trim() || null,
      motivatie_tip_aprobare: null,
    }

    let success = false

    if (notificare.timesheet_id) {
      const { error } = await supabase.from('timesheets').update(updateData).eq('id', notificare.timesheet_id)
      success = !error
      if (error) toast.error('Eroare: ' + error.message)
    } else if (notificare.observatie_id) {
      const { error } = await supabase.from('observatii_zile').update(updateData).eq('id', notificare.observatie_id)
      success = !error
      if (error) toast.error('Eroare: ' + error.message)
    }

    if (success) {
      await supabase.from('notificari').update({ rezolvata: true, citita: true }).eq('id', notificare.id)
      toast.success('Motivatie respinsa')
      setApproveModal(null)
      setRaspuns('')
      setStep('decizie')
      await loadNotificari()
    }

    setSaving(false)
  }

  const handleAproba = async (notificare: Notificare) => {
    setSaving(true)

    const updateData: any = {
      motivatie_status: 'aprobat',
      motivatie_aprobata_de: userId,
      motivatie_aprobata_la: new Date().toISOString(),
      motivatie_raspuns: raspuns.trim() || null,
      motivatie_tip_aprobare: tipAprobare,
    }

    let success = false

    if (notificare.timesheet_id) {
      const { error } = await supabase.from('timesheets').update(updateData).eq('id', notificare.timesheet_id)
      success = !error
      if (error) toast.error('Eroare: ' + error.message)
    } else if (notificare.observatie_id) {
      const { error } = await supabase.from('observatii_zile').update(updateData).eq('id', notificare.observatie_id)
      success = !error
      if (error) toast.error('Eroare: ' + error.message)
    }

    if (success) {
      await supabase.from('notificari').update({ rezolvata: true, citita: true }).eq('id', notificare.id)
      toast.success(
        tipAprobare === 'fara_recuperare'
          ? 'Motivatie aprobata — ziua devine 8h 15m'
          : 'Motivatie aprobata — se recupereaza intr-o alta zi'
      )
      setApproveModal(null)
      setRaspuns('')
      setTipAprobare('fara_recuperare')
      setStep('decizie')
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

  const openApproveModal = (n: Notificare) => {
    setApproveModal(n)
    setRaspuns('')
    setTipAprobare('fara_recuperare')
    setStep('decizie')
  }

  const portal = mounted ? createPortal(
    <>
      {/* Panel notificari */}
      {open && (
        <>
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 99998, background: 'rgba(0,0,0,0.4)' }}
            onClick={() => setOpen(false)}
          />
          <div style={{
            position: 'fixed', top: 0, left: '256px', height: '100vh', width: '320px',
            background: 'white', zIndex: 99999, display: 'flex', flexDirection: 'column',
            boxShadow: '4px 0 24px rgba(0,0,0,0.15)',
          }}>
            <div style={{
              padding: '16px', borderBottom: '1px solid #f1f5f9',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              flexShrink: 0, background: 'white',
            }}>
              <div>
                <p style={{ fontWeight: 600, color: '#0f172a', fontSize: '14px', margin: 0 }}>Notificari</p>
                <p style={{ fontSize: '12px', color: '#94a3b8', margin: '2px 0 0 0' }}>
                  {count === 0 ? 'Nicio notificare noua' : `${count} motivatii de rezolvat`}
                </p>
              </div>
              <button onClick={() => setOpen(false)} style={{
                padding: '6px', borderRadius: '8px', border: 'none',
                background: 'none', cursor: 'pointer', color: '#94a3b8', display: 'flex', alignItems: 'center',
              }}>
                <X size={15} />
              </button>
            </div>

            <div style={{ flex: 1, overflowY: 'auto' }}>
              {notificari.length === 0 ? (
                <div style={{ padding: '32px', textAlign: 'center', marginTop: '16px' }}>
                  <div style={{
                    width: '56px', height: '56px', borderRadius: '50%', background: '#f1f5f9',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 12px',
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
                  <div key={n.id} style={{
                    padding: '16px',
                    borderBottom: i < notificari.length - 1 ? '1px solid #f8fafc' : 'none',
                    background: !n.citita ? '#eff6ff' : 'white',
                    borderLeft: !n.citita ? '3px solid #3b82f6' : '3px solid transparent',
                  }}>
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
                      <div style={{
                        width: '36px', height: '36px', borderRadius: '50%', background: '#fef3c7',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#d97706', fontWeight: 600, fontSize: '14px', flexShrink: 0,
                      }}>
                        {n.angajat_name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2px' }}>
                          <p style={{ fontSize: '12px', fontWeight: 600, color: '#0f172a', margin: 0 }}>{n.angajat_name}</p>
                          {!n.citita && <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#3b82f6', flexShrink: 0 }} />}
                        </div>
                        <p style={{ fontSize: '11px', color: '#94a3b8', margin: '0 0 8px' }}>
                          {n.date_referinta && format(parseISO(n.date_referinta), 'dd MMM yyyy', { locale: ro })}
                        </p>
                        <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '8px 12px', marginBottom: '10px' }}>
                          <p style={{ fontSize: '12px', color: '#475569', fontStyle: 'italic', margin: 0 }}>"{n.mesaj}"</p>
                        </div>
                        <button
                          onClick={() => openApproveModal(n)}
                          style={{
                            width: '100%', padding: '8px', borderRadius: '8px',
                            border: '1px solid #fcd34d', background: '#fffbeb',
                            color: '#b45309', fontSize: '12px', fontWeight: 500,
                            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
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
        </>
      )}

      {/* Modal decizie */}
      {approveModal && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 100000,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px',
        }}>
          <div
            style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)' }}
            onClick={() => { setApproveModal(null); setStep('decizie') }}
          />
          <div style={{
            position: 'relative', background: 'white', borderRadius: '16px',
            boxShadow: '0 25px 50px rgba(0,0,0,0.25)', width: '100%', maxWidth: '448px', padding: '24px',
          }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: '16px' }}>
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', margin: '0 0 4px' }}>
                  {step === 'decizie' ? 'Decizie motivatie' : 'Tip aprobare'}
                </h3>
                <p style={{ fontSize: '14px', color: '#94a3b8', margin: 0 }}>
                  {approveModal.angajat_name} · {approveModal.date_referinta && format(parseISO(approveModal.date_referinta), 'dd MMM yyyy', { locale: ro })}
                </p>
              </div>
              <button
                onClick={() => { setApproveModal(null); setStep('decizie') }}
                style={{ padding: '6px', borderRadius: '8px', border: 'none', background: 'none', cursor: 'pointer', color: '#94a3b8' }}
              >
                <X size={18} />
              </button>
            </div>

            {/* Motivatia angajatului */}
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

            {step === 'decizie' ? (
              <>
                {/* Raspuns */}
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '12px', fontWeight: 500, color: '#64748b', marginBottom: '6px' }}>
                    Raspunsul tau <span style={{ color: '#94a3b8', fontWeight: 400 }}>(optional)</span>
                  </label>
                  <textarea
                    value={raspuns}
                    onChange={e => setRaspuns(e.target.value)}
                    placeholder="Ex: Aprobat. / Respins — lipsit nemotivat."
                    rows={3}
                    style={{
                      width: '100%', padding: '10px 12px', borderRadius: '12px',
                      border: '1px solid #e2e8f0', fontSize: '14px', color: '#0f172a',
                      resize: 'none', outline: 'none', boxSizing: 'border-box', fontFamily: 'inherit',
                    }}
                  />
                </div>

                {/* Butoane decizie */}
                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => handleRespinge(approveModal)}
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
                    onClick={() => setStep('tip_aprobare')}
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
                    Aproba
                  </button>
                </div>
              </>
            ) : (
              <>
                {/* Step 2: Tip aprobare */}
                <div style={{ marginBottom: '16px' }}>
                  <p style={{ fontSize: '13px', fontWeight: 500, color: '#475569', marginBottom: '12px' }}>
                    Ce se intampla cu timpul de recuperat?
                  </p>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    {/* Optiunea 1 - fara recuperare */}
                    <button
                      onClick={() => setTipAprobare('fara_recuperare')}
                      style={{
                        padding: '14px', borderRadius: '12px', textAlign: 'left',
                        border: tipAprobare === 'fara_recuperare' ? '2px solid #3b82f6' : '1px solid #e2e8f0',
                        background: tipAprobare === 'fara_recuperare' ? '#eff6ff' : 'white',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          border: tipAprobare === 'fara_recuperare' ? '6px solid #3b82f6' : '2px solid #cbd5e1',
                          flexShrink: 0, transition: 'all 0.15s',
                        }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>
                            Ziua devine {formatNorma(normaZi)}
                          </p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                            Orele zilei se considera {formatNorma(normaZi)} — nimic de recuperat
                          </p>
                        </div>
                      </div>
                    </button>

                    {/* Optiunea 2 - cu recuperare */}
                    <button
                      onClick={() => setTipAprobare('cu_recuperare')}
                      style={{
                        padding: '14px', borderRadius: '12px', textAlign: 'left',
                        border: tipAprobare === 'cu_recuperare' ? '2px solid #f59e0b' : '1px solid #e2e8f0',
                        background: tipAprobare === 'cu_recuperare' ? '#fffbeb' : 'white',
                        cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                          width: '20px', height: '20px', borderRadius: '50%',
                          border: tipAprobare === 'cu_recuperare' ? '6px solid #f59e0b' : '2px solid #cbd5e1',
                          flexShrink: 0, transition: 'all 0.15s',
                        }} />
                        <div>
                          <p style={{ fontSize: '14px', fontWeight: 600, color: '#0f172a', margin: '0 0 2px' }}>
                            Se recupereaza intr-o alta zi
                          </p>
                          <p style={{ fontSize: '12px', color: '#64748b', margin: 0 }}>
                            Orele raman cum sunt — angajatul recupereaza diferenta ulterior
                          </p>
                        </div>
                      </div>
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  <button
                    onClick={() => setStep('decizie')}
                    style={{
                      flex: 1, padding: '10px', borderRadius: '12px',
                      border: '1px solid #e2e8f0', background: 'white', color: '#64748b',
                      fontSize: '14px', fontWeight: 500, cursor: 'pointer',
                    }}
                  >
                    Inapoi
                  </button>
                  <button
                    onClick={() => handleAproba(approveModal)}
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
                    {saving ? 'Se salveaza...' : 'Confirma aprobarea'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>,
    document.body
  ) : null

  return (
    <>
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
      {portal}
    </>
  )
}
