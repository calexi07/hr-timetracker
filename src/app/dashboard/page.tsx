import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { formatHours, formatDate, formatTime } from '@/lib/utils'
import { Clock, Calendar, TrendingUp, Award, Download } from 'lucide-react'
import { format, startOfMonth, startOfWeek } from 'date-fns'
import TimesheetTable from '@/components/TimesheetTable'
import DateFilter from '@/components/DateFilter'
import HoursChart from '@/components/charts/HoursChart'

interface SearchParams { from?: string; to?: string }

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  if (!session) redirect('/login')

  const admin = createAdminClient()
  const { data: appUser } = await admin
    .from('app_users')
    .select('*')
    .eq('id', session.user.id)
    .single()

  if (!appUser) redirect('/login')
  if (appUser.role === 'admin') redirect('/admin/upload')

  const today = new Date()
  const from = searchParams.from || format(startOfMonth(today), 'yyyy-MM-dd')
  const to = searchParams.to || format(today, 'yyyy-MM-dd')

  const { data: timesheets } = await admin
    .from('timesheets')
    .select('*')
    .eq('employee_id', appUser.employee_id)
    .gte('date', from)
    .lte('date', to)
    .order('date', { ascending: false })

  const rows = timesheets || []
  const totalHours = rows.reduce((s: number, r: any) => s + r.hours_worked, 0)
  const daysWorked = rows.length
  const maxDay = rows.reduce((best: number, r: any) => r.hours_worked > best ? r.hours_worked : best, 0)
  const weekStart = format(startOfWeek(today, { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekHours = rows.filter((r: any) => r.date >= weekStart).reduce((s: number, r: any) => s + r.hours_worked, 0)

  if (!appUser.employee_id) {
    return (
      <div className="p-8">
        <div className="card p-8 text-center max-w-lg mx-auto mt-16">
          <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
            <Clock size={28} className="text-amber-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900 mb-2">Cont nelinkuit</h2>
          <p className="text-slate-500 text-sm">
            Contul tău nu a fost asociat cu un ID de angajat încă. Contactează administratorul.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">
          Bun venit, {appUser.name?.split(' ')[0]} 👋
        </h1>
        <p className="text-slate-500 mt-1">Iată rezumatul prezenței tale</p>
      </div>

      <div className="mb-6">
        <DateFilter from={from} to={to} />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="card p-6 bg-blue-50 border-blue-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Total ore</p>
              <p className="text-3xl font-bold mt-1 text-blue-700">{formatHours(totalHours)}</p>
              <p className="text-slate-400 text-xs mt-1">{from} – {to}</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">
              <Clock size={20} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-green-50 border-green-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Săptămâna aceasta</p>
              <p className="text-3xl font-bold mt-1 text-green-700">{formatHours(weekHours)}</p>
              <p className="text-slate-400 text-xs mt-1">Luni – Duminică</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-green-100 text-green-600 flex items-center justify-center">
              <Calendar size={20} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-purple-50 border-purple-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Zile lucrate</p>
              <p className="text-3xl font-bold mt-1 text-purple-700">{daysWorked}</p>
              <p className="text-slate-400 text-xs mt-1">În perioada selectată</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-purple-100 text-purple-600 flex items-center justify-center">
              <TrendingUp size={20} />
            </div>
          </div>
        </div>

        <div className="card p-6 bg-orange-50 border-orange-100">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-slate-500 text-sm font-medium">Record zilnic</p>
              <p className="text-3xl font-bold mt-1 text-orange-700">{formatHours(maxDay)}</p>
              <p className="text-slate-400 text-xs mt-1">Cel mai lung schimb</p>
            </div>
            <div className="w-11 h-11 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center">
              <Award size={20} />
            </div>
          </div>
        </div>
      </div>

      <div className="card p-6 mb-8">
        <h2 className="text-base font-semibold text-slate-900 mb-4">Ore zilnice</h2>
        <HoursChart timesheets={rows} />
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-base font-semibold text-slate-900">Detalii pontaj</h2>
          <span className="text-xs text-slate-400">{rows.length} înregistrări</span>
        </div>
        <TimesheetTable timesheets={rows} />
      </div>
    </div>
  )
}
