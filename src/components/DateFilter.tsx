'use client'
import { useState } from 'react'
import { format, subDays, startOfMonth, startOfWeek } from 'date-fns'
import { CalendarRange } from 'lucide-react'

const today = format(new Date(), 'yyyy-MM-dd')
const presets = [
  { label: 'Saptamana aceasta', from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'), to: today },
  { label: 'Luna aceasta', from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: today },
  { label: 'Ultimele 7 zile', from: format(subDays(new Date(), 6), 'yyyy-MM-dd'), to: today },
  { label: 'Ultimele 30 zile', from: format(subDays(new Date(), 29), 'yyyy-MM-dd'), to: today },
]

interface Props {
  from: string
  to: string
  onFilter: (from: string, to: string) => void
}

export default function DateFilter({ from, to, onFilter }: Props) {
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)

  return (
    <div className="card p-4 flex flex-wrap items-center gap-3">
      <CalendarRange size={16} className="text-slate-400" />
      <div className="flex items-center gap-2">
        <input
          type="date"
          value={localFrom}
          max={localTo}
          onChange={e => setLocalFrom(e.target.value)}
          className="input w-auto text-sm py-1.5"
        />
        <span className="text-slate-400 text-sm">pana la</span>
        <input
          type="date"
          value={localTo}
          min={localFrom}
          max={today}
          onChange={e => setLocalTo(e.target.value)}
          className="input w-auto text-sm py-1.5"
        />
        <button
          onClick={() => onFilter(localFrom, localTo)}
          className="btn-primary text-xs py-2"
        >
          Aplica
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => { setLocalFrom(p.from); setLocalTo(p.to); onFilter(p.from, p.to) }}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
