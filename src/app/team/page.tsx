'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatHours, cn } from '@/lib/utils'
import { format, startOfMonth } from 'date-fns'
import { ArrowLeft, Users, Clock } from 'lucide-react'
import DateFilter from '@/components/DateFilter'
import TimesheetTable from '@/components/TimesheetTable'
import HoursChart from '@/components/charts/HoursChart'
import Sidebar from '@/components/Sidebar'

const NORMA_ZI = 8.25

export default function TeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTs, setLoadingTs] = useState(false)
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
      if (u.role === 'employee') { router.push('/dashboard'); return }

      setCurrentUser(u)

      let query = supabase
        .from('app_users')
        .select('*')
        .eq('role', 'employee')
        .order('name')

      if (u.role === 'manager') {
        query = query.eq('manager_id', u.id)
      }

      const { data: teamData } = await query
      setTeam(teamData || [])
      setLoading(false)
    }
    init()
  }, [])

  const loadTimesheets = async (employeeId: number, f: string, t: string) => {
    if (!employeeId) { setTimesheets([]); return }
    const { data } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', Number(employeeId))
      .gte('date', f)
      .lte('date', t)
      .order('date', { ascending: false })
    setTimesheets(data || [])
  }

  const handleSelectMember = async (member: any) => {
    setSelected(member)
    setLoadingTs(true)
    await loadTimesheets(Number(member.employee_id), from, to)
    setLoadingTs(false)
  }

  const handleFilter = async (f: string, t: string) => {
    setFrom(f)
    setTo(t)
    if (selected?.employee_id) {
      setLoadingTs(true)
      await loadTimesheets(Number(selected.employee_id), f, t)
      setLoadingTs(false)
    }
  }

  const totalHours = timesheets.reduce((s, r) => s + Number(r.hours_worked), 0)
  const totalNorma = timesheets.length * NORMA_ZI
  const totalDiffMin = Math.round((totalHours - totalNorma) * 60)

  const formatBilant = (minute: number) => {
    const abs = Math.abs(minute)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    const semn = minute >= 0 ? '+' : '-'
    if (abs === 0) return '±0m'
    return `${semn}${h > 0 ? h + 'h ' : ''}${m}m`
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        {!selected ? (
          <>
            <div className="mb-8">
              <h1 className="text-2xl font-bold text-slate-900">
                {currentUser?.role === 'director' ? 'Toti angajatii' : 'Echipa mea'}
              </h1>
              <p className="text-slate-500 mt-1">
                {team.length} {team.length === 1 ? 'angajat' : 'angajati'} —
                click pe un angajat pentru a vedea pontajul
              </p>
            </div>

            {team.length === 0 ? (
              <div className="card p-12 text-center max-w-lg mx-auto">
                <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                  <Users size={28} className="text-slate-400" />
                </div>
                <h2 className="text-lg font-semibold text-slate-900 mb-2">Niciun angajat asignat</h2>
                <p className="text-slate-500 text-sm">
                  {currentUser?.role === 'manager'
                    ? 'Administratorul nu ti-a asignat niciun angajat inca.'
                    : 'Nu exista angajati in sistem.'
                  }
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {team.map(member => (
                  <button
                    key={member.id}
                    onClick={() => handleSelectMember(member)}
                    className="card p-5 text-left hover:border-blue-300 hover:shadow-md transition-all group"
                  >
                    <div className="flex items-center gap-3 mb-3">
                      <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-semibold group-hover:bg-blue-500 group-hover:text-white transition-all">
                        {member.name?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-slate-900 truncate">{member.name}</p>
                        <p className="text-xs text-slate-400 truncate">{member.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <Clock size={12} />
                      {member.employee_id
                        ? `ID: ${member.employee_id}`
                        : <span className="text-amber-500">ID neasignat</span>
                      }
                    </div>
                  </button>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            <div className="mb-6">
              <button
                onClick={() => { setSelected(null); setTimesheets([]) }}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-4"
              >
                <ArrowLeft size={16} />
                Inapoi la echipa
              </button>
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                  {selected.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-slate-900">{selected.name}</h1>
                  <p className="text-slate-400 text-sm">{selected.email}</p>
                </div>
              </div>
            </div>

            <div className="mb-6">
              <DateFilter from={from} to={to} onFilter={handleFilter} />
            </div>

            {loadingTs ? (
              <div className="flex items-center justify-center py-20">
                <p className="text-slate-400 text-sm">Se incarca datele...</p>
              </div>
            ) : !selected.employee_id ? (
              <div className="card p-8 text-center max-w-lg mx-auto">
                <p className="text-slate-500 text-sm">
                  Acest angajat nu are un ID asignat. Contacteaza administratorul.
                </p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                  <div className="card p-5 bg-blue-50 border-blue-100">
                    <p className="text-slate-500 text-xs font-medium mb-1">Total ore</p>
                    <p className="text-2xl font-bold text-blue-700">{formatHours(totalHours)}</p>
                  </div>
                  <div className="card p-5 bg-purple-50 border-purple-100">
                    <p className="text-slate-500 text-xs font-medium mb-1">Zile lucrate</p>
                    <p className="text-2xl font-bold text-purple-700">{timesheets.length}</p>
                  </div>
                  <div className="card p-5 bg-slate-50 border-slate-100">
                    <p className="text-slate-500 text-xs font-medium mb-1">Norma perioada</p>
                    <p className="text-2xl font-bold text-slate-700">{formatHours(totalNorma)}</p>
                  </div>
                  <div className={cn(
                    'card p-5 border',
                    totalDiffMin === 0 ? 'bg-green-50 border-green-100'
                      : totalDiffMin > 0 ? 'bg-blue-50 border-blue-100'
                      : 'bg-red-50 border-red-100'
                  )}>
                    <p className="text-slate-500 text-xs font-medium mb-1">Bilant</p>
                    <p className={cn(
                      'text-2xl font-bold',
                      totalDiffMin === 0 ? 'text-green-700'
                        : totalDiffMin > 0 ? 'text-blue-700'
                        : 'text-red-700'
                    )}>
                      {formatBilant(totalDiffMin)}
                    </p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      {totalDiffMin === 0 ? 'Echilibrat' : totalDiffMin > 0 ? 'Avans' : 'De recuperat'}
                    </p>
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
                  <TimesheetTable timesheets={timesheets} />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
