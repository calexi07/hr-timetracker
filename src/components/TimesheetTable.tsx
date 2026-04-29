'use client'
import { formatHours, formatDate, formatTime, downloadCSV, cn } from '@/lib/utils'
import { Download } from 'lucide-react'

const NORMA_ZI = 8.25

function getStatus(hours: number): { label: string; color: string } {
  const diff = hours - NORMA_ZI
  if (hours === 0) return { label: 'O singura intrare', color: 'bg-slate-100 text-slate-600' }
  if (Math.abs(diff) <= 0.25) return { label: 'Normal', color: 'bg-green-100 text-green-700' }
  if (diff > 0.25) return { label: 'Avans', color: 'bg-blue-100 text-blue-700' }
  return { label: 'De recuperat', color: 'bg-red-100 text-red-700' }
}

function formatDiff(hours: number): { text: string; color: string } {
  if (hours === 0) return { text: '—', color: 'text-slate-400' }
  
  const diff = hours - NORMA_ZI
  const totalMinute = Math.round(diff * 60)
  
  if (totalMinute === 0) return { text: '±0m', color: 'text-green-600' }
  
  const semn = totalMinute > 0 ? '+' : '-'
  const absTotalMinute = Math.abs(totalMinute)
  const h = Math.floor(absTotalMinute / 60)
  const m = absTotalMinute % 60
  
  let text = semn
  if (h > 0) text += `${h}h `
  text += `${m}m`
  
  return {
    text,
    color: totalMinute > 0 ? 'text-blue-600 font-semibold' : 'text-red-600 font-semibold'
  }
}

export default function TimesheetTable({ timesheets }: { timesheets: any[] }) {
  const handleExport = () => {
    downloadCSV(
      timesheets.map(t => {
        const diff = Number(t.hours_worked) - NORMA_ZI
        const totalMinute = Math.round(diff * 60)
        return {
          'Data': t.date,
          'Intrare': t.check_in,
          'Iesire': t.check_out,
          'Ore lucrate': t.hours_worked,
          'Diferenta (minute)': totalMinute >= 0 ? `+${totalMinute}m` : `${totalMinute}m`,
          'Status': getStatus(Number(t.hours_worked)).label,
          'Departament': t.department,
          'Angajat': t.employee_name,
        }
      }),
      `pontaj-${new Date().toISOString().split('T')[0]}.csv`
    )
  }

  if (!timesheets.length) {
    return (
      <div className="text-center py-12 text-slate-400">
        <p className="text-sm">Nicio inregistrare pentru perioada selectata</p>
      </div>
    )
  }

  const totalOre = timesheets.reduce((s, r) => s + Number(r.hours_worked), 0)
  const totalNorma = timesheets.length * NORMA_ZI
  const totalDiffMinute = Math.round((totalOre - totalNorma) * 60)

  return (
    <div>
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
              <th className="text-left px-4 py-3 font-medium text-slate-500">Intrare</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Iesire</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Ore lucrate</th>
              <th className="text-right px-4 py-3 font-medium text-slate-500">Diferenta</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((t, i) => {
              const { label, color } = getStatus(Number(t.hours_worked))
              const { text: diffText, color: diffColor } = formatDiff(Number(t.hours_worked))
              return (
                <tr key={t.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(t.check_in)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(t.check_out)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatHours(Number(t.hours_worked))}</td>
                  <td className={cn('px-4 py-3 text-right', diffColor)}>{diffText}</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', color)}>{label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t-2 border-slate-200">
              <td colSpan={3} className="px-4 py-3 text-sm font-semibold text-slate-600">Total perioada</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{formatHours(totalOre)}</td>
              <td className={cn(
                'px-4 py-3 text-right font-bold',
                totalDiffMinute === 0 ? 'text-green-600'
                  : totalDiffMinute > 0 ? 'text-blue-600'
                  : 'text-red-600'
              )}>
                {totalDiffMinute === 0 ? '±0m'
                  : totalDiffMinute > 0
                  ? (() => {
                      const h = Math.floor(totalDiffMinute / 60)
                      const m = totalDiffMinute % 60
                      return `+${h > 0 ? h + 'h ' : ''}${m}m`
                    })()
                  : (() => {
                      const abs = Math.abs(totalDiffMinute)
                      const h = Math.floor(abs / 60)
                      const m = abs % 60
                      return `-${h > 0 ? h + 'h ' : ''}${m}m`
                    })()
                }
              </td>
              <td className="px-4 py-3">
                <span className={cn(
                  'badge',
                  totalDiffMinute === 0 ? 'bg-green-100 text-green-700'
                    : totalDiffMinute > 0 ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                )}>
                  {totalDiffMinute === 0 ? 'Echilibrat'
                    : totalDiffMinute > 0
                    ? (() => {
                        const h = Math.floor(totalDiffMinute / 60)
                        const m = totalDiffMinute % 60
                        return `Avans +${h > 0 ? h + 'h ' : ''}${m}m`
                      })()
                    : (() => {
                        const abs = Math.abs(totalDiffMinute)
                        const h = Math.floor(abs / 60)
                        const m = abs % 60
                        return `De recuperat ${h > 0 ? h + 'h ' : ''}${m}m`
                      })()
                  }
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
