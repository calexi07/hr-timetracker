'use client'
import { useState } from 'react'
import { format, subDays, startOfMonth, startOfWeek, endOfWeek, subMonths } from 'date-fns'
import { CalendarRange } from 'lucide-react'

interface Props {
  from: string
  to: string
  onFilter: (from: string, to: string) => void
}

export default function DateFilter({ from, to, onFilter }: Props) {
  const [localFrom, setLocalFrom] = useState(from)
  const [localTo, setLocalTo] = useState(to)

  const today = format(new Date(), 'yyyy-MM-dd')

  const presets = [
    {
      label: 'Saptamana aceasta',
      from: format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      to: format(endOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
    },
    {
      label: 'Luna aceasta',
      from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
      to: today
    },
    {
      label: 'Luna trecuta',
      from: format(startOfMonth(subMonths(new Date(), 1)), 'yyyy-MM-dd'),
      to: format(new Date(new Date().getFullYear(), new Date().getMonth(), 0), 'yyyy-MM-dd')
    },
    {
      label: 'Ultimele 30 zile',
      from: format(subDays(new Date(), 29), 'yyyy-MM-dd'),
      to: today
    },
    {
      label: 'Ultimele 90 zile',
      from: format(subDays(new Date(), 89), 'yyyy-MM-dd'),
      to: today
    },
  ]

  const handleApply = () => {
    console.log('Applying filter:', localFrom, localTo)
    onFilter(localFrom, localTo)
  }

  const handlePreset = (f: string, t: string) => {
    console.log('Applying preset:', f, t)
    setLocalFrom(f)
    setLocalTo(t)
    onFilter(f, t)
  }

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
          onChange={e => setLocalTo(e.target.value)}
          className="input w-auto text-sm py-1.5"
        />
        <button
          onClick={handleApply}
          className="btn-primary text-xs py-2"
        >
          Aplica
        </button>
      </div>
      <div className="flex gap-2 flex-wrap">
        {presets.map(p => (
          <button
            key={p.label}
            onClick={() => handlePreset(p.from, p.to)}
            className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 hover:border-blue-400 hover:text-blue-600 transition-colors"
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
