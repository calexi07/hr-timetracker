'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatHours, cn } from '@/lib/utils'
import { Clock, Calendar, TrendingUp, Award, AlertTriangle } from 'lucide-react'
import { format, startOfMonth, startOfWeek } from 'date-fns'
import TimesheetTable from '@/components/TimesheetTable'
import DateFilter from '@/components/DateFilter'
import HoursChart from '@/components/charts/HoursChart'
import Sidebar from '@/components/Sidebar'
import LastUpdated from '@/components/LastUpdated'

const NORMA_ZI = 8.25

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [appUser, setAppUser] = useState<any>(null)
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [from, setFrom] = useState(format(startOfMonth(new Date()), 'yyyy-MM-dd'))
  const [to, setTo] = useState(format(new Date(), 'yyyy-MM-dd'))

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!u) { router.push('/login'); return }

      setAppUser(u)

      if (u.employee_id) {
        await loadTimesheets(u.employee_id, from, to)
      }

      setLoading(false)
    }
    init()
  }, [])

  const loadTimesheets = async (employeeId: number, f: string, t: string) => {
    const { data } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', Number(employeeId))
      .gte('date', f)
      .lte('date', t)
      .order('date', { ascending: false })
    setTimesheets(data || [])
  }

  const handleFilter = async (f: string, t: string) => {
    setFrom(f)
    setTo(t)
    if (appUser?.employee_id) {
      await loadTimesheets(appUser.employee_id, f, t)
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )

  const totalHours = timesheets.reduce((s, r) => s + Number(r.hours_worked), 0)
  const daysWorked = timesheets.length
  const maxDay = timesheets.reduce((best, r) => Number(r.hours_worked) > best ? Number(r.hours_worked) : best, 0)
  const weekStart = format(startOfWeek(new Date(), { weekStartsOn: 1 }), 'yyyy-MM-dd')
  const weekHours = timesheets.filter(r => r.date >= weekStart).reduce((s, r) => s + Number(r.hours_worked), 0)
  const totalNorma = daysWorked * NORMA_ZI
  const totalDiff = totalHours - totalNorma
  const oreDeRecuperat = totalDiff < 0 ? Math.abs(totalDiff) : 0
  const oreExtra = totalDiff > 0 ? totalDiff : 0

  const formatBilant = () => {
    const totalDiffMin = Math.round(totalDiff * 60)
    const abs = Math.abs(totalDiffMin)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    if (abs === 0) return '✓'
    const semn = totalDiffMin > 0 ? '+' : '-'
    return `${semn}${h > 0 ? h + 'h ' : ''}${m}m`
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">

        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">
              Bun venit, {appUser?.name?.split(' ')[0] || appUser?.email} 👋
            </h1>
            <p className="text-slate-500 mt-1">Iata rezumatul prezentei tale</p>
          </div>
          <LastUpdated />
        </div>

        <div className="mb-6">
          <DateFilter from={from} to={to} onFilter={handleFilter} />
        </div>

        {!appUser?.employee_id ? (
          <div className="card p-8 text-center max-w-lg mx-auto mt-8">
            <div className="w-16 h-16 rounded-full bg-amber-100 flex items-center justify-center mx-auto mb-4">
              <Clock size={28} className="text-amber-600" />
            </div>
            <h2 className="text-xl font-semibold text-slate-900 mb-2">Cont nelinkuit</h2>
            <p className="text-slate-500 text-sm">
              Contul tau nu a fost asociat cu un ID de angajat. Contacteaza administratorul.
            </p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">

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
                    <p className="text-slate-500 text-sm font-medium">Saptamana aceasta</p>
                    <p className="text-3xl font-bold mt-1 text-green-700">{formatHours(weekHours)}</p>
                    <p className="text-slate-400 text-xs mt-1">Luni – Duminica</p>
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
                    <p className="text-slate-400 text-xs mt-1">In perioada selectata</p>
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

              <div className={cn(
                'card p-6 border',
                oreDeRecuperat > 0.25 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'
              )}>
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-slate-500 text-sm font-medium">Bilant perioada</p>
                    <p className={cn('text-3xl font-bold mt-1',
                      oreDeRecuperat > 0.25 ? 'text-red-700' : 'text-green-700'
                    )}>
                      {formatBilant()}
                    </p>
                    <p className="text-slate-400 text-xs mt-1">
                      {oreDeRecuperat > 0.25 ? 'De recuperat'
                        : oreExtra > 0.25 ? 'Ore suplimentare'
                        : 'La norma'}
                    </p>
                  </div>
                  <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center',
                    oreDeRecuperat > 0.25 ? 'bg-red-100 text-red-600' : 'bg-green-100 text-green-600'
                  )}>
                    <AlertTriangle size={20} />
                  </div>
                </div>
              </div>

            </div>

            <div className="card p-6 mb-8">
              <h2 className="text-base font-semibold text-slate-900 mb-4">Ore zilnice</h2>
              <HoursChart timesheets={timesheets} />
            </div>

            <div className="card p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-base font-semibold text-slate-900">Detalii pontaj</h2>
                <span className="text-xs text-slate-400">{timesheets.length} inregistrari</span>
              </div>
            <TimesheetTable timesheets={timesheets} from={from} to={to} />
            </div>
          </>
        )}
      </main>
    </div>
  )
}
