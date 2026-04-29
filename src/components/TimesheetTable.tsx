'use client'
import { useState } from 'react'
import { formatHours, formatDate, formatTime, downloadCSV, cn } from '@/lib/utils'
import { Download, MessageSquare, X, Save } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { eachDayOfInterval, parseISO, format, isWeekend, isSaturday, isSunday } from 'date-fns'
import { ro } from 'date-fns/locale'

const NORMA_ZI = 8.25

function getStatus(hours: number): { label: string; color: string } {
  const diff = hours - NORMA_ZI
  if (hours === 0) return { label: 'Normal', color: 'bg-green-100 text-green-700' }
  if (Math.abs(diff) <= 0.25) return { label: 'Normal', color: 'bg-green-100 text-green-700' }
  return { label: '⚠️ Atentie!', color: 'bg-amber-100 text-amber-700' }
}

function formatDiff(hours: number): { text: string; color: string } {
  if (hours === 0) return { text: '—', color: 'text-slate-400' }
  const diff = hours - NORMA_ZI
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

interface Props {
  timesheets: any[]
  readonly?: boolean
  from?: string
  to?: string
}

export default function TimesheetTable({ timesheets, readonly = false, from, to }: Props) {
  const supabase = createClient()
  const [rows, setRows] = useState(timesheets)
  const [modal, setModal] = useState<{ open: boolean; row: any | null }>({ open: false, row: null })
  const [observatie, setObservatie] = useState('')
  const [saving, setSaving] = useState(false)

  // Genereaza toate zilele din interval
  const allDays = from && to ? eachDayOfInterval({
    start: parseISO(from),
    end: parseISO(to)
  }).reverse() : null

  // Map pontaj dupa data
  const pontajMap = new Map(rows.map(r => [r.date, r]))

  // Construieste randurile finale
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

  const handleExport = () => {
    downloadCSV(
      tableRows.map(({ date, pontaj, weekend, ziSaptamana }) => ({
        'Data': date,
        'Zi': ziSaptamana,
        'Tip zi': weekend ? 'Weekend' : pontaj ? 'Zi lucratoare' : 'Absenta/WFH',
        'Intrare': pontaj?.check_in || '—',
        'Iesire': pontaj?.check_out || '—',
        'Ore lucrate': pontaj?.hours_worked || 0,
        'Diferenta': pontaj ? (() => {
          const diff = Number(pontaj.hours_worked) - NORMA_ZI
          const min = Math.round(diff * 60)
          return min >= 0 ? `+${min}m` : `${min}m`
        })() : '—',
        'Status': weekend ? 'Weekend' : pontaj ? getStatus(Number(pontaj.hours_worked)).label : 'Lipsa date',
        'Observatii': pontaj?.observatii || '',
      })),
      `pontaj-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  const openModal = (row: any) => {
    setModal({ open: true, row })
    setObservatie(row.observatii || '')
  }

  const closeModal = () => {
    setModal({ open: false, row: null })
    setObservatie('')
  }

  const handleSave = async () => {
    if (!modal.row) return
    setSaving(true)

    const { error } = await supabase
      .from('timesheets')
      .update({ observatii: observatie.trim() || null })
      .eq('id', modal.row.id)

    if (error) {
      toast.error('Eroare la salvare: ' + error.message)
    } else {
      toast.success('Observatie salvata')
      setRows(prev => prev.map(r =>
        r.id === modal.row.id
          ? { ...r, observatii: observatie.trim() || null }
          : r
      ))
      closeModal()
    }
    setSaving(false)
  }

  // Calculeaza totalurile doar din zilele cu pontaj (nu weekend)
  const totalOre = rows.reduce((s, r) => s + Number(r.hours_worked), 0)
  const totalNorma = rows.length * NORMA_ZI
  const totalDiffMinute = Math.round((totalOre - totalNorma) * 60)

  const formatTotalDiff = (minute: number) => {
    const abs = Math.abs(minute)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    const semn = minute >= 0 ? '+' : '-'
    if (abs === 0) return '±0m'
    return `${semn}${h > 0 ? h + 'h ' : ''}${m}m`
  }

  return (
    <div>
      {/* Modal observatii */}
      {modal.open && modal.row && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Observatie</h3>
                <p className="text-sm text-slate-400 mt-0.5">
                  {formatDate(modal.row.date)} — {modal.row.employee_name}
                </p>
              </div>
              <button onClick={closeModal}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>

            <div className="bg-slate-50 rounded-xl p-3 mb-4 text-xs text-slate-500 flex gap-4">
              <span>Intrare: <strong className="text-slate-700">{formatTime(modal.row.check_in)}</strong></span>
              <span>Iesire: <strong className="text-slate-700">{formatTime(modal.row.check_out)}</strong></span>
              <span>Ore: <strong className="text-slate-700">{formatHours(Number(modal.row.hours_worked))}</strong></span>
            </div>

            <textarea
              value={observatie}
              onChange={e => setObservatie(e.target.value)}
              placeholder="Adauga o observatie... (ex: deplasare, concediu medical, training)"
              rows={4}
              disabled={readonly}
              className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none disabled:bg-slate-50 disabled:text-slate-500"
            />

            <div className="flex gap-3 mt-4">
              {!readonly && (
                <button onClick={handleSave} disabled={saving} className="btn-primary flex-1 justify-center">
                  {saving ? 'Se salveaza...' : <><Save size={15} />Salveaza</>}
                </button>
              )}
              <button onClick={closeModal} className="btn-secondary flex-1 justify-center">
                {readonly ? 'Inchide' : 'Anuleaza'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="flex justify-end mb-3">
        <button onClick={handleExport} className="btn-secondary text-xs">
          <Download size={14} />
          Exporta CSV
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
              <th className="text-left px-4 py-3 font-medium text-slate-500">Observatii</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {tableRows.map(({ date, day, pontaj, weekend, ziSaptamana }, i) => {
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

              if (!pontaj) {
                return (
                  <tr key={date} className="border-b border-slate-50 bg-slate-50/50">
                    <td className="px-4 py-2.5 font-medium text-slate-400">{formatDate(date)}</td>
                    <td className="px-4 py-2.5 text-slate-400 capitalize text-xs">{ziSaptamana}</td>
                    <td className="px-4 py-2.5 text-slate-300">—</td>
                    <td className="px-4 py-2.5 text-slate-300">—</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                    <td className="px-4 py-2.5 text-right text-slate-300">—</td>
                    <td className="px-4 py-2.5">
                      <span className="badge bg-slate-100 text-slate-400">Fara date</span>
                    </td>
                    <td className="px-4 py-2.5 text-slate-300 text-xs">—</td>
                    <td className="px-4 py-2.5" />
                  </tr>
                )
              }

              const { label, color } = getStatus(Number(pontaj.hours_worked))
              const { text: diffText, color: diffColor } = formatDiff(Number(pontaj.hours_worked))

              return (
                <tr key={date} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{formatDate(date)}</td>
                  <td className="px-4 py-3 text-slate-400 capitalize text-xs">{ziSaptamana}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(pontaj.check_in)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(pontaj.check_out)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatHours(Number(pontaj.hours_worked))}</td>
                  <td className={cn('px-4 py-3 text-right', diffColor)}>{diffText}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', color)}>{label}</span>
                  </td>
                  <td className="px-4 py-3 max-w-xs">
                    {pontaj.observatii ? (
                      <span className="text-xs text-slate-600 truncate block max-w-[180px]" title={pontaj.observatii}>
                        {pontaj.observatii}
                      </span>
                    ) : (
                      <span className="text-xs text-slate-300">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => openModal(pontaj)}
                      className={cn(
                        'p-1.5 rounded-lg transition-all',
                        pontaj.observatii
                          ? 'text-blue-500 hover:text-blue-700 hover:bg-blue-50'
                          : 'text-slate-300 hover:text-slate-500 hover:bg-slate-100'
                      )}
                      title={readonly ? 'Vezi observatie' : 'Adauga / editeaza observatie'}
                    >
                      <MessageSquare size={15} />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td colSpan={4} className="px-4 py-3 text-sm font-semibold text-slate-600">Total perioada</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{formatHours(totalOre)}</td>
              <td className={cn(
                'px-4 py-3 text-right font-bold',
                totalDiffMinute === 0 ? 'text-green-600'
                  : totalDiffMinute > 0 ? 'text-blue-600'
                  : 'text-red-600'
              )}>
                {formatTotalDiff(totalDiffMinute)}
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'badge',
                  totalDiffMinute === 0 ? 'bg-green-100 text-green-700'
                    : totalDiffMinute > 0 ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                )}>
                  {totalDiffMinute === 0
                    ? 'Echilibrat'
                    : totalDiffMinute > 0
                    ? `Avans ${formatTotalDiff(totalDiffMinute)}`
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
