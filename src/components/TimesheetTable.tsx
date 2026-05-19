'use client'
import { useState, useEffect } from 'react'
import { formatHours, formatDate, formatTime, downloadCSV, cn } from '@/lib/utils'
import { Download, MessageSquare, X, Save, CheckCircle, XCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { eachDayOfInterval, parseISO, format, isWeekend } from 'date-fns'
import { ro } from 'date-fns/locale'
import { useUser } from '@/components/UserContext'

function getStatus(hours: number, norma: number, motivatieStatus?: string): { label: string; color: string } {
  if (motivatieStatus === 'aprobat') return { label: 'Echilibrat', color: 'bg-green-100 text-green-700' }
  if (hours === 0) return { label: 'Fara date', color: 'bg-slate-100 text-slate-500' }
  const diff = hours - norma
  const minute = Math.round(diff * 60)
  if (minute === 0) return { label: 'Normal', color: 'bg-green-100 text-green-700' }
  if (minute > 0) return { label: 'Timp in plus', color: 'bg-blue-100 text-blue-700' }
  return { label: 'Timp de recuperat', color: 'bg-amber-100 text-amber-700' }
}

function formatDiff(hours: number, norma: number, motivatieStatus?: string): { text: string; color: string } {
  if (hours === 0) return { text: '—', color: 'text-slate-400' }
  if (motivatieStatus === 'aprobat') return { text: '±0m', color: 'text-green-600' }
  const diff = hours - norma
  const totalMinute = Math.round(diff * 60)
  if (totalMinute === 0) return { text: '±0m', color: 'text-green-600' }
  const semn = totalMinute > 0 ? '+' : '-'
  const abs = Math.abs(totalMinute)
  const h = Math.floor(abs / 60)
  const m = abs % 60
  let text = semn
  if (h > 0) text += `${h}h `
  text += `${m}m`
  return { text, color: totalMinute > 0 ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold' }
}

function getMotivatieStatusBadge(status: string | null | undefined) {
  if (!status) return null
  if (status === 'aprobat') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
      <CheckCircle size={10} />Aprobat
    </span>
  )
  if (status === 'respins') return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">
      <XCircle size={10} />Respins
    </span>
  )
  return (
    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">
      <Clock size={10} />In asteptare
    </span>
  )
}

interface Props {
  timesheets: any[]
  readonly?: boolean
  from?: string
  to?: string
  employeeId?: number
  normaZi?: number
  isManager?: boolean
  onMotivatieUpdate?: () => void
}

export default function TimesheetTable({ timesheets, readonly = false, from, to, employeeId, normaZi, isManager = false, onMotivatieUpdate }: Props) {
  const supabase = createClient()
  const user = useUser()
  const [rows, setRows] = useState(timesheets)
  const [observatiiZile, setObservatiiZile] = useState<Record<string, any>>({})
  const [modal, setModal] = useState<{
    open: boolean
    date: string
    pontaj: any | null
    motivatie: string
    type: 'edit' | 'approve'
    raspuns: string
  }>({ open: false, date: '', pontaj: null, motivatie: '', type: 'edit', raspuns: '' })
  const [saving, setSaving] = useState(false)

  const empId = employeeId || user?.employee_id
  const NORMA = normaZi ?? user?.norma_ore ?? 8.25

  useEffect(() => { setRows(timesheets) }, [timesheets])

  useEffect(() => {
    if (!empId || !from || !to) return
    const load = async () => {
      const { data } = await supabase
        .from('observatii_zile')
        .select('*')
        .eq('employee_id', empId)
        .gte('date', from)
        .lte('date', to)
      if (data) {
        const map: Record<string, any> = {}
        data.forEach(d => { map[d.date] = d })
        setObservatiiZile(map)
      }
    }
    load()
  }, [empId, from, to])

  const allDays = from && to ? eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to)
  }).reverse() : null

  const pontajMap = new Map(rows.map(r => [r.date, r]))

  const tableRows = allDays ? allDays.map(day => {
    const dateStr = format(day, 'yyyy-MM-dd')
    const pontaj = pontajMap.get(dateStr)
    const weekend = isWeekend(day)
    const ziSaptamana = format(day, 'EEEE', { locale: ro })
    return { date: dateStr, day, pontaj, weekend, ziSaptamana }
  }) : rows.map(r => ({
    date: r.date,
    day: parseISO(r.date),
    pontaj: r,
    weekend: isWeekend(parseISO(r.date)),
    ziSaptamana: format(parseISO(r.date), 'EEEE', { locale: ro })
  }))

  const getMotivatieForRow = (date: string, pontaj: any) => {
    const text = pontaj?.motivatie || observatiiZile[date]?.observatie || null
    const status = pontaj?.motivatie_status || observatiiZile[date]?.motivatie_status || null
    const raspuns = pontaj?.motivatie_raspuns || observatiiZile[date]?.motivatie_raspuns || null
    return { text, status, raspuns }
  }

  const openEditModal = (date: string, pontaj: any | null) => {
    const { text } = getMotivatieForRow(date, pontaj)
    setModal({ open: true, date, pontaj, motivatie: text || '', type: 'edit', raspuns: '' })
  }

  const openApproveModal = (date: string, pontaj: any | null) => {
    const { text, raspuns } = getMotivatieForRow(date, pontaj)
    setModal({ open: true, date, pontaj, motivatie: text || '', type: 'approve', raspuns: raspuns || '' })
  }

  const closeModal = () => {
    setModal({ open: false, date: '', pontaj: null, motivatie: '', type: 'edit', raspuns: '' })
  }

  const trimiteNotificare = async (
    date: string,
    motivatieText: string,
    timesheetId?: string,
    observatieId?: string
  ) => {
    // Ia userul direct din supabase auth
    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser) {
      console.log('trimiteNotificare: no auth user')
      return
    }

    // Gaseste angajatul si managerul sau
    const { data: angajat } = await supabase
      .from('app_users')
      .select('manager_id, name')
      .eq('id', authUser.id)
      .single()

    console.log('trimiteNotificare:', { angajat, date, motivatieText })

    if (!angajat?.manager_id) {
      console.log('Nu are manager asignat')
      return
    }

    // Sterge notificarea veche pentru aceeasi zi
    await supabase
      .from('notificari')
      .delete()
      .eq('destinatar_id', angajat.manager_id)
      .eq('angajat_id', authUser.id)
      .eq('date_referinta', date)

    // Creeaza notificare noua
    const { error } = await supabase.from('notificari').insert({
      destinatar_id: angajat.manager_id,
      tip: 'motivatie_noua',
      titlu: `Motivatie noua de la ${angajat.name}`,
      mesaj: motivatieText,
      angajat_id: authUser.id,
      angajat_name: angajat.name,
      timesheet_id: timesheetId || null,
      observatie_id: observatieId || null,
      date_referinta: date,
      citita: false,
      rezolvata: false,
    })

    console.log('Notificare creata:', { error })
  }

  const handleSaveMotivatie = async () => {
    if (!modal.date) return
    setSaving(true)

    if (modal.pontaj) {
      const { error } = await supabase
        .from('timesheets')
        .update({
          motivatie: modal.motivatie.trim() || null,
          motivatie_status: modal.motivatie.trim() ? 'in_asteptare' : null,
          motivatie_aprobata_de: null,
          motivatie_aprobata_la: null,
          motivatie_raspuns: null
        })
        .eq('id', modal.pontaj.id)

      if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }

      setRows(prev => prev.map(r =>
        r.id === modal.pontaj.id
          ? { ...r, motivatie: modal.motivatie.trim() || null, motivatie_status: modal.motivatie.trim() ? 'in_asteptare' : null, motivatie_aprobata_de: null, motivatie_aprobata_la: null, motivatie_raspuns: null }
          : r
      ))

      if (modal.motivatie.trim()) {
        await trimiteNotificare(modal.date, modal.motivatie.trim(), modal.pontaj.id, undefined)
      }
    } else {
      if (!empId) { toast.error('ID angajat lipsa'); setSaving(false); return }

      if (modal.motivatie.trim()) {
        const { data: obsData, error } = await supabase
          .from('observatii_zile')
          .upsert({
            employee_id: empId,
            date: modal.date,
            observatie: modal.motivatie.trim(),
            motivatie_status: 'in_asteptare',
            motivatie_aprobata_de: null,
            motivatie_aprobata_la: null,
            motivatie_raspuns: null
          }, { onConflict: 'employee_id,date' })
          .select()
          .single()

        if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }

        setObservatiiZile(prev => ({
          ...prev,
          [modal.date]: { ...prev[modal.date], observatie: modal.motivatie.trim(), motivatie_status: 'in_asteptare', motivatie_raspuns: null }
        }))

        await trimiteNotificare(modal.date, modal.motivatie.trim(), undefined, obsData?.id)
      } else {
        await supabase.from('observatii_zile').delete().eq('employee_id', empId).eq('date', modal.date)
        setObservatiiZile(prev => { const next = { ...prev }; delete next[modal.date]; return next })
      }
    }

    toast.success('Motivatie salvata')
    closeModal()
    setSaving(false)
    onMotivatieUpdate?.()
  }

  const handleDecizie = async (decizie: 'aprobat' | 'respins') => {
    if (!modal.date) return
    setSaving(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    const updateData = {
      motivatie_status: decizie,
      motivatie_aprobata_de: authUser?.id,
      motivatie_aprobata_la: new Date().toISOString(),
      motivatie_raspuns: modal.raspuns.trim() || null
    }

    if (modal.pontaj) {
      const { error } = await supabase
        .from('timesheets')
        .update(updateData)
        .eq('id', modal.pontaj.id)

      if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }

      setRows(prev => prev.map(r =>
        r.id === modal.pontaj.id ? { ...r, ...updateData } : r
      ))
    } else {
      const obsZi = observatiiZile[modal.date]
      if (obsZi) {
        await supabase.from('observatii_zile')
          .update(updateData)
          .eq('employee_id', empId)
          .eq('date', modal.date)
        setObservatiiZile(prev => ({ ...prev, [modal.date]: { ...prev[modal.date], ...updateData } }))
      }
    }

    // Marcheaza notificarea ca rezolvata
    await supabase
      .from('notificari')
      .update({ rezolvata: true, citita: true })
      .eq('date_referinta', modal.date)
      .eq('rezolvata', false)

    toast.success(decizie === 'aprobat' ? 'Motivatie aprobata' : 'Motivatie respinsa')
    closeModal()
    setSaving(false)
    onMotivatieUpdate?.()
  }

  const totalOre = rows.reduce((s, r) => {
    if (r.motivatie_status === 'aprobat') return s + NORMA
    return s + Number(r.hours_worked)
  }, 0)
  const totalNorma = rows.length * NORMA
  const totalDiffMinute = Math.round((totalOre - totalNorma) * 60)

  const formatTotalDiff = (minute: number) => {
    const abs = Math.abs(minute)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    const semn = minute >= 0 ? '+' : '-'
    if (abs === 0) return '±0m'
    return `${semn}${h > 0 ? h + 'h ' : ''}${m}m`
  }

  const handleExport = () => {
    downloadCSV(
      tableRows.filter(r => !r.weekend).map(({ date, pontaj, ziSaptamana }) => {
        const { text: motivatieText, status: motivatieStatus, raspuns } = getMotivatieForRow(date, pontaj)
        const effectiveHours = pontaj && motivatieStatus === 'aprobat' ? NORMA : Number(pontaj?.hours_worked || 0)
        const diff = pontaj ? Math.round((effectiveHours - NORMA) * 60) : 0
        return {
          'Data': date, 'Zi': ziSaptamana,
          'Intrare': pontaj?.check_in || '—', 'Iesire': pontaj?.check_out || '—',
          'Ore lucrate': motivatieStatus === 'aprobat' ? NORMA : (pontaj?.hours_worked || 0),
          'Diferenta': pontaj ? (diff >= 0 ? `+${diff}m` : `${diff}m`) : '—',
          'Status': pontaj ? getStatus(Number(pontaj.hours_worked), NORMA, motivatieStatus).label : 'Fara date',
          'Motivatie': motivatieText || '',
          'Status motivatie': motivatieStatus || '',
          'Raspuns manager': raspuns || '',
        }
      }),
      `pontaj-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  return (
    <div>
      {modal.open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">
                  {modal.type === 'approve' ? 'Aprobare motivatie' : 'Motivatie'}
                </h3>
                <p className="text-sm text-slate-400 mt-0.5">{formatDate(modal.date)}</p>
              </div>
              <button onClick={closeModal} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>

            {modal.pontaj && (
              <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-500 flex gap-4">
                <span>Intrare: <strong className="text-slate-700">{formatTime(modal.pontaj.check_in)}</strong></span>
                <span>Iesire: <strong className="text-slate-700">{formatTime(modal.pontaj.check_out)}</strong></span>
                <span>Ore reale: <strong className="text-slate-700">{formatHours(Number(modal.pontaj.hours_worked))}</strong></span>
              </div>
            )}

            {modal.type === 'approve' ? (
              <>
                <div className="mb-4">
                  <p className="text-xs font-medium text-slate-500 mb-1.5">Motivatia angajatului</p>
                  <div className="bg-slate-50 border border-slate-200 rounded-xl p-3">
                    <p className="text-sm text-slate-700">{modal.motivatie || '—'}</p>
                  </div>
                </div>

                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-700">
                  Daca aprobi motivatia, orele zilei vor fi considerate <strong>{formatHours(NORMA)}</strong> (norma) si diferenta va fi <strong>±0m</strong>.
                </div>

                <div className="mb-5">
                  <label className="block text-xs font-medium text-slate-500 mb-1.5">
                    Raspunsul tau <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <textarea
                    value={modal.raspuns}
                    onChange={e => setModal(prev => ({ ...prev, raspuns: e.target.value }))}
                    placeholder="Ex: Aprobat, conform politicii companiei."
                    rows={3}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => handleDecizie('respins')}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-all disabled:opacity-50"
                  >
                    <XCircle size={16} />
                    {saving ? '...' : 'Respinge'}
                  </button>
                  <button
                    onClick={() => handleDecizie('aprobat')}
                    disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all disabled:opacity-50"
                  >
                    <CheckCircle size={16} />
                    {saving ? '...' : 'Aproba'}
                  </button>
                </div>

                <button onClick={closeModal} className="w-full mt-3 text-xs text-slate-400 hover:text-slate-600 py-1.5">
                  Anuleaza
                </button>
              </>
            ) : (
              <>
                {!modal.pontaj && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-4 text-xs text-amber-700">
                    Zi fara pontaj la birou — adauga o motivatie (ex: WFH, concediu, deplasare, medical)
                  </div>
                )}
                <textarea
                  value={modal.motivatie}
                  onChange={e => setModal(prev => ({ ...prev, motivatie: e.target.value }))}
                  placeholder="Ex: Lucrat de acasa (WFH), Concediu medical, Deplasare Cluj..."
                  rows={4}
                  disabled={readonly || isManager}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
                />
                <div className="flex gap-3 mt-4">
                  {!readonly && !isManager && (
                    <button onClick={handleSaveMotivatie} disabled={saving} className="btn-primary flex-1 justify-center">
                      {saving ? 'Se salveaza...' : <><Save size={15} />Salveaza</>}
                    </button>
                  )}
                  <button onClick={closeModal} className="btn-secondary flex-1 justify-center">
                    Inchide
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button onClick={handleExport} className="btn-secondary text-xs">
          <Download size={14} />Exporta CSV
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Data</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Zi</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Intrare</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Iesire</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Ore lucrate</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Diferenta</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Motivatie</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ date, pontaj, weekend, ziSaptamana }) => {
              if (weekend) {
                return (
                  <tr key={date} className="border-b border-red-100 bg-red-50/60">
                    <td className="px-4 py-2.5 font-medium text-red-400">{formatDate(date)}</td>
                    <td className="px-4 py-2.5 text-red-400 capitalize text-xs">{ziSaptamana}</td>
                    <td colSpan={6} className="px-4 py-2.5 text-red-300 text-xs">Weekend</td>
                    <td className="px-4 py-2.5" />
                  </tr>
                )
              }

              const { text: motivatieText, status: motivatieStatus, raspuns } = getMotivatieForRow(date, pontaj)
              const hasMot = !!motivatieText
              const canApproveThis = isManager && hasMot && motivatieStatus === 'in_asteptare'
              const canViewDecizie = hasMot && (motivatieStatus === 'aprobat' || motivatieStatus === 'respins')
              const oreEfective = pontaj && motivatieStatus === 'aprobat'
                ? NORMA
                : pontaj ? Number(pontaj.hours_worked) : 0

              if (!pontaj) {
                return (
                  <tr key={date} className="border-b border-slate-50 bg-slate-50/50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-2.5 font-medium text-slate-400">{formatDate(date)}</td>
                    <td className="px-4 py-2.5 text-slate-400 capitalize text-xs">{ziSaptamana}</td>
                    <td className="px-4 py-2.5 text-slate-300">—</td>
                    <td className="px-4 py-2.5 text-slate-300">—</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                    <td className="px-4 py-2.5">
                      <span className="badge bg-slate-100 text-slate-400">Fara date</span>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex flex-col gap-1">
                        {motivatieText && (
                          <span className="text-xs text-slate-600 truncate max-w-[140px]" title={motivatieText}>
                            {motivatieText}
                          </span>
                        )}
                        <div className="flex items-center gap-1 flex-wrap">
                          {getMotivatieStatusBadge(motivatieStatus)}
                          {raspuns && (
                            <span className="text-xs text-slate-400 italic truncate max-w-[120px]" title={raspuns}>
                              "{raspuns}"
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {!isManager && !readonly && (
                          <button onClick={() => openEditModal(date, null)}
                            className={cn('p-1.5 rounded-lg transition-all',
                              hasMot ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                                : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100')}
                            title="Adauga motivatie">
                            <MessageSquare size={15} />
                          </button>
                        )}
                        {canApproveThis && (
                          <button onClick={() => openApproveModal(date, null)}
                            className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all"
                            title="Aproba / Respinge">
                            <CheckCircle size={15} />
                          </button>
                        )}
                        {isManager && canViewDecizie && (
                          <button onClick={() => openApproveModal(date, null)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                            title="Vezi decizia">
                            <MessageSquare size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              }

              const { label, color } = getStatus(Number(pontaj.hours_worked), NORMA, motivatieStatus)
              const { text: diffText, color: diffColor } = formatDiff(Number(pontaj.hours_worked), NORMA, motivatieStatus)

              return (
                <tr key={date} className={cn(
                  'border-b border-slate-50 hover:bg-slate-50 transition-colors',
                  motivatieStatus === 'aprobat' && 'bg-green-50/30'
                )}>
                  <td className="px-4 py-3 font-medium text-slate-900">{formatDate(date)}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize text-xs">{ziSaptamana}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(pontaj.check_in)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(pontaj.check_out)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">
                    {formatHours(oreEfective)}
                    {motivatieStatus === 'aprobat' && (
                      <span className="text-xs text-slate-400 font-normal ml-1">(norma)</span>
                    )}
                  </td>
                  <td className={cn('px-4 py-3 text-right', diffColor)}>{diffText}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', color)}>{label}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-col gap-1">
                      {motivatieText && (
                        <span className="text-xs text-slate-600 truncate max-w-[140px]" title={motivatieText}>
                          {motivatieText}
                        </span>
                      )}
                      <div className="flex items-center gap-1 flex-wrap">
                        {getMotivatieStatusBadge(motivatieStatus)}
                        {raspuns && (
                          <span className="text-xs text-slate-400 italic truncate max-w-[120px]" title={raspuns}>
                            "{raspuns}"
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {!isManager && (
                        <button onClick={() => openEditModal(date, pontaj)}
                          className={cn('p-1.5 rounded-lg transition-all',
                            hasMot ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                              : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100')}
                          title={readonly ? 'Vezi motivatie' : 'Adauga / editeaza motivatie'}>
                          <MessageSquare size={15} />
                        </button>
                      )}
                      {canApproveThis && (
                        <button onClick={() => openApproveModal(date, pontaj)}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all"
                          title="Aproba / Respinge">
                          <CheckCircle size={15} />
                        </button>
                      )}
                      {isManager && canViewDecizie && (
                        <button onClick={() => openApproveModal(date, pontaj)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
                          title="Vezi decizia">
                          <MessageSquare size={15} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-600">Total perioada</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{formatHours(totalOre)}</td>
              <td className={cn('px-4 py-3 text-right font-bold',
                totalDiffMinute === 0 ? 'text-green-600'
                  : totalDiffMinute > 0 ? 'text-blue-600'
                  : 'text-red-600'
              )}>
                {formatTotalDiff(totalDiffMinute)}
              </td>
              <td className="px-4 py-3">
                <span className={cn('badge',
                  totalDiffMinute === 0 ? 'bg-green-100 text-green-700'
                    : totalDiffMinute > 0 ? 'bg-blue-100 text-blue-700'
                    : 'bg-amber-100 text-amber-700'
                )}>
                  {totalDiffMinute === 0 ? 'Echilibrat'
                    : totalDiffMinute > 0 ? `Timp in plus ${formatTotalDiff(totalDiffMinute)}`
                    : `De recuperat ${formatTotalDiff(totalDiffMinute).replace('-', '')}`}
                </span>
              </td>
              <td colSpan={2} />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
