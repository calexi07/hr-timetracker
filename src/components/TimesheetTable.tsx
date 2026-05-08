'use client'
import { useState, useEffect } from 'react'
import { formatHours, formatDate, formatTime, downloadCSV, cn } from '@/lib/utils'
import { Download, MessageSquare, X, Save, CheckCircle, XCircle, Clock } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { eachDayOfInterval, parseISO, format, isWeekend } from 'date-fns'
import { ro } from 'date-fns/locale'
import { useUser } from '@/components/UserContext'

function getStatus(hours: number, norma: number): { label: string; color: string } {
  if (hours === 0) return { label: 'Fara date', color: 'bg-slate-100 text-slate-500' }
  const diff = hours - norma
  const minute = Math.round(diff * 60)
  if (minute === 0) return { label: 'Normal', color: 'bg-green-100 text-green-700' }
  if (minute > 0) return { label: 'Timp in plus', color: 'bg-blue-100 text-blue-700' }
  return { label: 'Timp de recuperat', color: 'bg-amber-100 text-amber-700' }
}

function formatDiff(hours: number, norma: number, motivatieStatus?: string): { text: string; color: string } {
  if (hours === 0) return { text: '—', color: 'text-slate-400' }
  // Daca motivatia e aprobata, diferenta e 0
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
  const [modal, setModal] = useState<{ open: boolean; date: string; pontaj: any | null; motivatie: string; type: 'edit' | 'approve' }>({
    open: false, date: '', pontaj: null, motivatie: '', type: 'edit'
  })
  const [saving, setSaving] = useState(false)

  const empId = employeeId || user?.employee_id
  const NORMA = normaZi ?? user?.norma_ore ?? 8.25
  const canApprove = isManager || user?.role === 'manager' || user?.role === 'director' || user?.role === 'admin'

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

  const openEditModal = (date: string, pontaj: any | null) => {
    const obsExistenta = pontaj?.motivatie || observatiiZile[date]?.observatie || ''
    setModal({ open: true, date, pontaj, motivatie: obsExistenta, type: 'edit' })
  }

  const openApproveModal = (date: string, pontaj: any | null) => {
    const motivatieText = pontaj?.motivatie || observatiiZile[date]?.observatie || ''
    setModal({ open: true, date, pontaj, motivatie: motivatieText, type: 'approve' })
  }

  const closeModal = () => {
    setModal({ open: false, date: '', pontaj: null, motivatie: '', type: 'edit' })
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
          motivatie_aprobata_la: null
        })
        .eq('id', modal.pontaj.id)

      if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }

      setRows(prev => prev.map(r =>
        r.id === modal.pontaj.id
          ? { ...r, motivatie: modal.motivatie.trim() || null, motivatie_status: modal.motivatie.trim() ? 'in_asteptare' : null, motivatie_aprobata_de: null, motivatie_aprobata_la: null }
          : r
      ))
    } else {
      if (!empId) { toast.error('ID angajat lipsa'); setSaving(false); return }

      if (modal.motivatie.trim()) {
        const { error } = await supabase
          .from('observatii_zile')
          .upsert({
            employee_id: empId,
            date: modal.date,
            observatie: modal.motivatie.trim(),
            motivatie_status: 'in_asteptare',
            motivatie_aprobata_de: null,
            motivatie_aprobata_la: null
          }, { onConflict: 'employee_id,date' })

        if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }
        setObservatiiZile(prev => ({ ...prev, [modal.date]: { ...prev[modal.date], observatie: modal.motivatie.trim(), motivatie_status: 'in_asteptare' } }))
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

  const handleApprove = async () => {
    if (!modal.date) return
    setSaving(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (modal.pontaj) {
      const { error } = await supabase
        .from('timesheets')
        .update({
          motivatie_status: 'aprobat',
          motivatie_aprobata_de: authUser?.id,
          motivatie_aprobata_la: new Date().toISOString()
        })
        .eq('id', modal.pontaj.id)

      if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }
      setRows(prev => prev.map(r =>
        r.id === modal.pontaj.id
          ? { ...r, motivatie_status: 'aprobat', motivatie_aprobata_de: authUser?.id, motivatie_aprobata_la: new Date().toISOString() }
          : r
      ))
    } else {
      const obsZi = observatiiZile[modal.date]
      if (obsZi) {
        await supabase.from('observatii_zile').update({
          motivatie_status: 'aprobat',
          motivatie_aprobata_de: authUser?.id,
          motivatie_aprobata_la: new Date().toISOString()
        }).eq('employee_id', empId).eq('date', modal.date)
        setObservatiiZile(prev => ({ ...prev, [modal.date]: { ...prev[modal.date], motivatie_status: 'aprobat' } }))
      }
    }

    toast.success('Motivatie aprobata')
    closeModal()
    setSaving(false)
    onMotivatieUpdate?.()
  }

  const handleReject = async () => {
    if (!modal.date) return
    setSaving(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()

    if (modal.pontaj) {
      const { error } = await supabase
        .from('timesheets')
        .update({
          motivatie_status: 'respins',
          motivatie_aprobata_de: authUser?.id,
          motivatie_aprobata_la: new Date().toISOString()
        })
        .eq('id', modal.pontaj.id)

      if (error) { toast.error('Eroare: ' + error.message); setSaving(false); return }
      setRows(prev => prev.map(r =>
        r.id === modal.pontaj.id
          ? { ...r, motivatie_status: 'respins', motivatie_aprobata_de: authUser?.id, motivatie_aprobata_la: new Date().toISOString() }
          : r
      ))
    } else {
      const obsZi = observatiiZile[modal.date]
      if (obsZi) {
        await supabase.from('observatii_zile').update({
          motivatie_status: 'respins',
          motivatie_aprobata_de: authUser?.id,
          motivatie_aprobata_la: new Date().toISOString()
        }).eq('employee_id', empId).eq('date', modal.date)
        setObservatiiZile(prev => ({ ...prev, [modal.date]: { ...prev[modal.date], motivatie_status: 'respins' } }))
      }
    }

    toast.success('Motivatie respinsa')
    closeModal()
    setSaving(false)
    onMotivatieUpdate?.()
  }

  const getMotivatieForRow = (date: string, pontaj: any) => {
    const text = pontaj?.motivatie || observatiiZile[date]?.observatie || null
    const status = pontaj?.motivatie_status || observatiiZile[date]?.motivatie_status || null
    return { text, status }
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
        const { text: motivatieText, status: motivatieStatus } = getMotivatieForRow(date, pontaj)
        const effectiveHours = pontaj && motivatieStatus === 'aprobat' ? NORMA : Number(pontaj?.hours_worked || 0)
        const diff = pontaj ? Math.round((effectiveHours - NORMA) * 60) : 0
        return {
          'Data': date, 'Zi': ziSaptamana,
          'Intrare': pontaj?.check_in || '—', 'Iesire': pontaj?.check_out || '—',
          'Ore lucrate': pontaj?.hours_worked || 0,
          'Diferenta': pontaj ? (diff >= 0 ? `+${diff}m` : `${diff}m`) : '—',
          'Status': pontaj ? getStatus(Number(pontaj.hours_worked), NORMA).label : 'Fara date',
          'Motivatie': motivatieText || '', 'Status motivatie': motivatieStatus || '',
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
                <span>Ore: <strong className="text-slate-700">{formatHours(Number(modal.pontaj.hours_worked))}</strong></span>
              </div>
            )}

            {modal.type === 'approve' ? (
              <>
                <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-4">
                  <p className="text-xs font-medium text-blue-800 mb-1">Motivatia angajatului:</p>
                  <p className="text-sm text-blue-900">{modal.motivatie || '—'}</p>
                </div>
                <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 text-xs text-amber-700">
                  Daca aprobi motivatia, diferenta din acea zi va fi considerata <strong>0</strong> (ziua va fi echilibrata).
                </div>
                <div className="flex gap-3">
                  <button onClick={handleReject} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-all">
                    <XCircle size={16} />Respinge
                  </button>
                  <button onClick={handleApprove} disabled={saving}
                    className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all">
                    <CheckCircle size={16} />{saving ? 'Se salveaza...' : 'Aproba'}
                  </button>
                </div>
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
                  disabled={readonly}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
                />
                <div className="flex gap-3 mt-4">
                  {!readonly && (
                    <button onClick={handleSaveMotivatie} disabled={saving} className="btn-primary flex-1 justify-center">
                      {saving ? 'Se salveaza...' : <><Save size={15} />Salveaza</>}
                    </button>
                  )}
                  <button onClick={closeModal} className="btn-secondary flex-1 justify-center">
                    {readonly ? 'Inchide' : 'Anuleaza'}
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

              const { text: motivatieText, status: motivatieStatus } = getMotivatieForRow(date, pontaj)
              const hasMot = !!motivatieText
              const canApproveThis = canApprove && hasMot && motivatieStatus === 'in_asteptare'

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
                      <div className="flex items-center gap-2 flex-wrap">
                        {motivatieText && (
                          <span className="text-xs text-slate-600 truncate max-w-[120px]" title={motivatieText}>
                            {motivatieText}
                          </span>
                        )}
                        {getMotivatieStatusBadge(motivatieStatus)}
                      </div>
                    </td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1">
                        {!readonly && (
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
                            title="Aproba / Respinge motivatia">
                            <CheckCircle size={15} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              }

              const { label, color } = getStatus(Number(pontaj.hours_worked), NORMA)
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
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatHours(Number(pontaj.hours_worked))}</td>
                  <td className={cn('px-4 py-3 text-right', diffColor)}>{diffText}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', motivatieStatus === 'aprobat' ? 'bg-green-100 text-green-700' : color)}>
                      {motivatieStatus === 'aprobat' ? 'Echilibrat' : label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      {motivatieText && (
                        <span className="text-xs text-slate-600 truncate max-w-[120px]" title={motivatieText}>
                          {motivatieText}
                        </span>
                      )}
                      {getMotivatieStatusBadge(motivatieStatus)}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEditModal(date, pontaj)}
                        className={cn('p-1.5 rounded-lg transition-all',
                          hasMot ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                            : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100')}
                        title={readonly ? 'Vezi motivatie' : 'Adauga / editeaza motivatie'}>
                        <MessageSquare size={15} />
                      </button>
                      {canApproveThis && (
                        <button onClick={() => openApproveModal(date, pontaj)}
                          className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all"
                          title="Aproba / Respinge motivatia">
                          <CheckCircle size={15} />
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
