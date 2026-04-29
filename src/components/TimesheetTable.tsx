'use client'
import { formatHours, formatDate, formatTime, downloadCSV } from '@/lib/utils'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

const NORMA_ZI = 8.25 // 8 ore si 15 minute

function getStatus(hours: number): { label: string; color: string; diff: number } {
  const diff = hours - NORMA_ZI
  const absDiff = Math.abs(diff)

  if (hours === 0) return { label: 'O singura intrare', color: 'bg-slate-100 text-slate-600', diff }
  if (absDiff <= 0.25) return { label: 'Normal', color: 'bg-green-100 text-green-700', diff }
  if (diff > 0.25) return { label: `+${formatHours(diff)} suplimentar`, color: 'bg-blue-100 text-blue-700', diff }
  return { label: `${formatHours(absDiff)} de recuperat`, color: 'bg-red-100 text-red-700', diff }
}

export default function TimesheetTable({ timesheets }: { timesheets: any[] }) {
  const handleExport = () => {
    downloadCSV(
      timesheets.map(t => ({
        'Data': t.date,
        'Intrare': t.check_in,
        'Iesire': t.check_out,
        'Ore lucrate': t.hours_worked,
        'Norma': NORMA_ZI,
        'Diferenta': (Number(t.hours_worked) - NORMA_ZI).toFixed(2),
        'Departament': t.department,
        'Angajat': t.employee_name,
      })),
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
  const totalDiff = totalOre - totalNorma

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
              <th className="text-right px-4 py-3 font-medium text-slate-500">Norma (8h15m)</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((t, i) => {
              const { label, color } = getStatus(Number(t.hours_worked))
              return (
                <tr key={t.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(t.check_in)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(t.check_out)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatHours(Number(t.hours_worked))}</td>
                  <td className="px-4 py-3 text-right text-slate-400">8h 15m</td>
                  <td className="px-4 py-3">
                    <span className={cn('badge', color)}>{label}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 border-t border-slate-200">
              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-slate-500">Total</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">{formatHours(totalOre)}</td>
              <td className="px-4 py-3 text-right font-bold text-slate-400">{formatHours(totalNorma)}</td>
              <td className="px-4 py-3">
                <span className={cn(
                  'badge',
                  Math.abs(totalDiff) <= 0.25 ? 'bg-green-100 text-green-700'
                    : totalDiff > 0 ? 'bg-blue-100 text-blue-700'
                    : 'bg-red-100 text-red-700'
                )}>
                  {Math.abs(totalDiff) <= 0.25 ? 'Echilibrat'
                    : totalDiff > 0 ? `+${formatHours(totalDiff)} suplimentar`
                    : `${formatHours(Math.abs(totalDiff))} de recuperat`}
                </span>
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
