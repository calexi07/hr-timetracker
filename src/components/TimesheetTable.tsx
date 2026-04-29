'use client'
import { formatHours, formatDate, formatTime, downloadCSV } from '@/lib/utils'
import { Download } from 'lucide-react'
import { cn } from '@/lib/utils'

export default function TimesheetTable({ timesheets }: { timesheets: any[] }) {
  const handleExport = () => {
    downloadCSV(
      timesheets.map(t => ({
        'Data': t.date,
        'Intrare': t.check_in,
        'Iesire': t.check_out,
        'Ore lucrate': t.hours_worked,
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
              <th className="text-right px-4 py-3 font-medium text-slate-500">Ore</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
            </tr>
          </thead>
          <tbody>
            {timesheets.map((t, i) => {
              const short = t.hours_worked > 0 && t.hours_worked < 6
              const long = t.hours_worked > 10
              return (
                <tr key={t.id || i} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                  <td className="px-4 py-3 font-medium text-slate-900">{formatDate(t.date)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(t.check_in)}</td>
                  <td className="px-4 py-3 text-slate-600">{formatTime(t.check_out)}</td>
                  <td className="px-4 py-3 text-right font-semibold text-slate-900">{formatHours(t.hours_worked)}</td>
                  <td className="px-4 py-3">
                    <span className={cn(
                      'badge',
                      t.hours_worked === 0 ? 'bg-slate-100 text-slate-600'
                        : short ? 'bg-amber-100 text-amber-700'
                        : long ? 'bg-blue-100 text-blue-700'
                        : 'bg-green-100 text-green-700'
                    )}>
                      {t.hours_worked === 0 ? 'O singura intrare' : short ? 'Scurt' : long ? 'Ore suplimentare' : 'Normal'}
                    </span>
                  </td>
                </tr>
              )
            })}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50">
              <td colSpan={3} className="px-4 py-3 text-sm font-medium text-slate-500">Total</td>
              <td className="px-4 py-3 text-right font-bold text-slate-900">
                {formatHours(timesheets.reduce((s, t) => s + t.hours_worked, 0))}
              </td>
              <td />
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  )
}
