'use client'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'
import { format, parseISO } from 'date-fns'

export default function HoursChart({ timesheets }: { timesheets: any[] }) {
  const data = [...timesheets]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-30)
    .map(t => ({
      date: format(parseISO(t.date), 'dd MMM'),
      hours: Number(t.hours_worked),
    }))

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload?.length) {
      return (
        <div className="bg-white border border-slate-200 rounded-xl p-3 shadow-lg text-sm">
          <p className="font-semibold text-slate-700">{label}</p>
          <p className="text-blue-600 mt-1">{payload[0].value.toFixed(2)} ore</p>
        </div>
      )
    }
    return null
  }

  if (!data.length) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-400 text-sm">
        Nu exista date pentru aceasta perioada
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} />
        <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} axisLine={false} tickLine={false} tickFormatter={v => `${v}h`} />
        <Tooltip content={<CustomTooltip />} />
        <ReferenceLine y={8} stroke="#e2e8f0" strokeDasharray="4 4" />
        <Bar dataKey="hours" fill="#3b82f6" radius={[6, 6, 0, 0]} maxBarSize={40} />
      </BarChart>
    </ResponsiveContainer>
  )
}
