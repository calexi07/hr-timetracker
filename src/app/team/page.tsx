'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { formatHours, cn } from '@/lib/utils'
import { format, startOfMonth } from 'date-fns'
import { ArrowLeft, Users, Clock, AlertTriangle, CheckCircle2, ChevronRight } from 'lucide-react'
import DateFilter from '@/components/DateFilter'
import TimesheetTable from '@/components/TimesheetTable'
import HoursChart from '@/components/charts/HoursChart'
import Sidebar from '@/components/Sidebar'
import LastUpdated from '@/components/LastUpdated'

const NORMA_ZI = 8.25

interface MemberSummary {
  member: any
  totalOre: number
  zile: number
  norma: number
  diffMin: number
}

export default function TeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [directTeam, setDirectTeam] = useState<any[]>([])
  const [subManagers, setSubManagers] = useState<any[]>([])
  const [subManagerTeams, setSubManagerTeams] = useState<Record<string, any[]>>({})
  const [allMembers, setAllMembers] = useState<any[]>([])
  const [summaries, setSummaries] = useState<MemberSummary[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [loadingTs, setLoadingTs] = useState(false)
  const [loadingSummaries, setLoadingSummaries] = useState(false)
  const [expandedManagers, setExpandedManagers] = useState<Set<string>>(new Set())
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

      if (u.role === 'director') {
        const { data } = await supabase
          .from('app_users')
          .select('*')
          .neq('id', u.id)
          .order('name')
        const members = data || []
        setAllMembers(members)
        await loadSummaries(members, from, to)
      } else {
        // Toti cei cu manager_id = id-ul meu (echipa directa)
        const { data: directData } = await supabase
          .from('app_users')
          .select('*')
          .eq('manager_id', u.id)
          .order('name')

        const direct = directData || []

        // Toti din echipa directa apar in "Echipa mea directa"
        setDirectTeam(direct)

        // Managerii din echipa directa apar si in sectiunea expandabila
        const subMgrs = direct.filter((m: any) => m.role === 'manager')
        setSubManagers(subMgrs)

        // Incarca echipa fiecarui submanager
        const teams: Record<string, any[]> = {}
        for (const mgr of subMgrs) {
          const { data: subordinateIds } = await supabase
            .rpc('get_subordinates', { manager_uuid: mgr.id })
          if (subordinateIds && subordinateIds.length > 0) {
            const ids = subordinateIds.map((s: any) => s.id)
            const { data: mgrTeam } = await supabase
              .from('app_users')
              .select('*')
              .in('id', ids)
              .order('name')
            teams[mgr.id] = mgrTeam || []
          } else {
            teams[mgr.id] = []
          }
        }
        setSubManagerTeams(teams)

        // Toti membrii unici pentru sumar
        const allSubordinates = Object.values(teams).flat()
        const uniqueMembers = [...direct, ...allSubordinates].filter(
          (m, i, arr) => arr.findIndex(x => x.id === m.id) === i
        )
        await loadSummaries(uniqueMembers, from, to)
      }

      setLoading(false)
    }
    init()
  }, [])

  const loadSummaries = async (members: any[], f: string, t: string) => {
    setLoadingSummaries(true)
    const results: MemberSummary[] = []

    for (const member of members) {
      if (!member.employee_id) {
        results.push({ member, totalOre: 0, zile: 0, norma: 0, diffMin: 0 })
        continue
      }
      const { data } = await supabase
        .from('timesheets')
        .select('hours_worked')
        .eq('employee_id', Number(member.employee_id))
        .gte('date', f)
        .lte('date', t)

      const rows = data || []
      const totalOre = rows.reduce((s: number, r: any) => s + Number(r.hours_worked), 0)
      const zile = rows.length
      const norma = zile * NORMA_ZI
      const diffMin = Math.round((totalOre - norma) * 60)
      results.push({ member, totalOre, zile, norma, diffMin })
    }

    setSummaries(results)
    setLoadingSummaries(false)
  }

  const getSummary = (memberId: string) =>
    summaries.find(s => s.member.id === memberId)

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
    } else {
      const allM = currentUser?.role === 'director'
        ? allMembers
        : [...directTeam, ...Object.values(subManagerTeams).flat()].filter(
            (m, i, arr) => arr.findIndex(x => x.id === m.id) === i
          )
      await loadSummaries(allM, f, t)
    }
  }

  const toggleManager = (managerId: string) => {
    setExpandedManagers(prev => {
      const next = new Set(prev)
      if (next.has(managerId)) next.delete(managerId)
      else next.add(managerId)
      return next
    })
  }

  const formatBilant = (minute: number) => {
    const abs = Math.abs(minute)
    const h = Math.floor(abs / 60)
    const m = abs % 60
    const semn = minute >= 0 ? '+' : '-'
    if (abs === 0) return '±0m'
    return `${semn}${h > 0 ? h + 'h ' : ''}${m}m`
  }

  const getRolLabel = (role: string) => {
    if (role === 'admin') return 'Administrator'
    if (role === 'manager') return 'Manager'
    if (role === 'director') return 'Director'
    return 'Angajat'
  }

  const totalHours = timesheets.reduce((s, r) => s + Number(r.hours_worked), 0)
  const totalNorma = timesheets.length * NORMA_ZI
  const totalDiffMin = Math.round((totalHours - totalNorma) * 60)

  const allSummaries = summaries
  const atentionari = allSummaries.filter(s => s.diffMin < -15)
  const ok = allSummaries.filter(s => s.diffMin >= -15)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )

  const MemberCard = ({ member }: { member: any }) => {
    const s = getSummary(member.id)
    const areProbleme = (s?.diffMin || 0) < -15
    const esteAvans = (s?.diffMin || 0) > 15
    return (
      <button
        onClick={() => handleSelectMember(member)}
        className={cn(
          'card p-4 text-left hover:shadow-md transition-all group border w-full',
          areProbleme ? 'border-red-200 hover:border-red-400'
            : esteAvans ? 'border-blue-200 hover:border-blue-400'
            : 'border-slate-200 hover:border-green-300'
        )}
      >
        <div className="flex items-center gap-3 mb-2">
          <div className={cn(
            'w-9 h-9 rounded-full flex items-center justify-center font-semibold text-sm shrink-0 transition-all',
            areProbleme ? 'bg-red-100 text-red-700 group-hover:bg-red-500 group-hover:text-white'
              : esteAvans ? 'bg-blue-100 text-blue-700 group-hover:bg-blue-500 group-hover:text-white'
              : 'bg-green-100 text-green-700 group-hover:bg-green-500 group-hover:text-white'
          )}>
            {member.name?.charAt(0)?.toUpperCase() || '?'}
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="font-medium text-slate-900 truncate text-sm">{member.name}</p>
              {member.role === 'manager' && (
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium shrink-0">
                  Manager
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400">{s ? `${s.zile} zile` : '—'}</p>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-xs text-slate-500">{formatHours(s?.totalOre || 0)}</p>
          <p className={cn(
            'text-xs font-bold',
            areProbleme ? 'text-red-600' : esteAvans ? 'text-blue-600' : 'text-green-600'
          )}>
            {s ? formatBilant(s.diffMin) : '—'}
          </p>
        </div>
        {!member.employee_id && (
          <p className="text-xs text-amber-500 mt-1">⚠️ ID neasignat</p>
        )}
      </button>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        {!selected ? (
          <>
            <div className="flex items-start justify-between mb-6">
              <div>
                <h1 className="text-2xl font-bold text-slate-900">
                  {currentUser?.role === 'director' ? 'Toti angajatii' : 'Echipa mea'}
                </h1>
                <p className="text-slate-500 mt-1">
                  Click pe un angajat pentru detalii pontaj
                </p>
              </div>
              <LastUpdated />
            </div>

            <div className="mb-6">
              <DateFilter from={from} to={to} onFilter={async (f, t) => {
                setFrom(f); setTo(t)
                const allM = currentUser?.role === 'director'
                  ? allMembers
                  : [...directTeam, ...Object.values(subManagerTeams).flat()].filter(
                      (m, i, arr) => arr.findIndex(x => x.id === m.id) === i
                    )
                await loadSummaries(allM, f, t)
              }} />
            </div>

            {/* Overview carduri */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
              <div className="card p-5 bg-slate-50">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center">
                    <Users size={18} className="text-slate-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Total in subordine</p>
                    <p className="text-2xl font-bold text-slate-900">{allSummaries.length}</p>
                  </div>
                </div>
              </div>
              <div className="card p-5 bg-red-50 border-red-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center">
                    <AlertTriangle size={18} className="text-red-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">Ore de recuperat</p>
                    <p className="text-2xl font-bold text-red-700">{atentionari.length} persoane</p>
                  </div>
                </div>
              </div>
              <div className="card p-5 bg-green-50 border-green-100">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                    <CheckCircle2 size={18} className="text-green-600" />
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 font-medium">La norma / avans</p>
                    <p className="text-2xl font-bold text-green-700">{ok.length} persoane</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Atentionari */}
            {atentionari.length > 0 && (
              <div className="card p-5 mb-8 border-red-100 bg-red-50">
                <div className="flex items-center gap-2 mb-4">
                  <AlertTriangle size={16} className="text-red-600" />
                  <h2 className="font-semibold text-red-800 text-sm">
                    {atentionari.length} {atentionari.length === 1 ? 'persoana' : 'persoane'} cu ore de recuperat
                  </h2>
                </div>
                <div className="space-y-2">
                  {atentionari.sort((a, b) => a.diffMin - b.diffMin).map(s => (
                    <div key={s.member.id}
                      className="flex items-center justify-between bg-white rounded-xl px-4 py-3 border border-red-100 cursor-pointer hover:border-red-300 transition-all"
                      onClick={() => handleSelectMember(s.member)}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-semibold">
                          {s.member.name?.charAt(0)?.toUpperCase() || '?'}
                        </div>
                        <div>
                          <p className="font-medium text-slate-900 text-sm">{s.member.name}</p>
                          <p className="text-xs text-slate-400">{getRolLabel(s.member.role)} · {s.zile} zile</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-red-600 text-sm">{formatBilant(s.diffMin)}</p>
                        <p className="text-xs text-red-400">de recuperat</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Director: toti flat */}
            {currentUser?.role === 'director' && (
              <div>
                <h2 className="font-semibold text-slate-700 text-sm mb-3">Toate persoanele</h2>
                {loadingSummaries ? (
                  <div className="flex items-center justify-center py-12">
                    <p className="text-slate-400 text-sm">Se calculeaza...</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                    {allMembers.map(m => <MemberCard key={m.id} member={m} />)}
                  </div>
                )}
              </div>
            )}

            {/* Manager: ierarhie */}
            {currentUser?.role === 'manager' && (
              <div className="space-y-8">

                {/* Echipa directa — toti cei cu manager_id = id-ul meu */}
                {directTeam.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-blue-500 rounded-full" />
                      <h2 className="font-semibold text-slate-900 text-sm">
                        Echipa mea directa
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {directTeam.length} {directTeam.length === 1 ? 'persoana' : 'persoane'}
                        </span>
                      </h2>
                    </div>
                    {loadingSummaries ? (
                      <p className="text-slate-400 text-sm">Se calculeaza...</p>
                    ) : (
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                        {directTeam.map(m => <MemberCard key={m.id} member={m} />)}
                      </div>
                    )}
                  </div>
                )}

                {/* Managerii subordonati cu echipele lor expandabile */}
                {subManagers.length > 0 && (
                  <div>
                    <div className="flex items-center gap-2 mb-3">
                      <div className="w-1 h-5 bg-purple-500 rounded-full" />
                      <h2 className="font-semibold text-slate-900 text-sm">
                        Echipele managerilor subordonati
                        <span className="ml-2 text-xs font-normal text-slate-400">
                          {subManagers.length} {subManagers.length === 1 ? 'manager' : 'manageri'}
                        </span>
                      </h2>
                    </div>
                    <div className="space-y-4">
                      {subManagers.map(mgr => {
                        const mgrTeam = subManagerTeams[mgr.id] || []
                        const isExpanded = expandedManagers.has(mgr.id)
                        const mgrSummary = getSummary(mgr.id)
                        const areProbleme = (mgrSummary?.diffMin || 0) < -15
                        const esteAvans = (mgrSummary?.diffMin || 0) > 15

                        return (
                          <div key={mgr.id} className="card border border-purple-100 overflow-hidden">
                            <div className="flex items-center gap-3 p-4 bg-purple-50">
                              <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center text-purple-700 font-semibold text-sm shrink-0">
                                {mgr.name?.charAt(0)?.toUpperCase() || '?'}
                              </div>
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="font-semibold text-slate-900">{mgr.name}</p>
                                  <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 font-medium">
                                    Manager
                                  </span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">
                                  {mgrTeam.length} {mgrTeam.length === 1 ? 'persoana' : 'persoane'} in echipa
                                  {mgrSummary && (
                                    <span className={cn(
                                      'ml-2 font-medium',
                                      areProbleme ? 'text-red-500'
                                        : esteAvans ? 'text-blue-500'
                                        : 'text-green-500'
                                    )}>
                                      · bilant propriu: {formatBilant(mgrSummary.diffMin)}
                                    </span>
                                  )}
                                </p>
                              </div>
                              <div className="flex items-center gap-2 shrink-0">
                                <button
                                  onClick={() => handleSelectMember(mgr)}
                                  className="btn-secondary text-xs py-1.5"
                                >
                                  Pontaj
                                </button>
                                {mgrTeam.length > 0 && (
                                  <button
                                    onClick={() => toggleManager(mgr.id)}
                                    className="flex items-center gap-1 text-xs text-purple-600 hover:text-purple-800 font-medium px-2 py-1.5 rounded-lg hover:bg-purple-100 transition-all"
                                  >
                                    {isExpanded ? 'Ascunde' : 'Vezi echipa'}
                                    <ChevronRight size={14} className={cn('transition-transform', isExpanded && 'rotate-90')} />
                                  </button>
                                )}
                              </div>
                            </div>

                            {isExpanded && mgrTeam.length > 0 && (
                              <div className="p-4 border-t border-purple-100 bg-white">
                                <p className="text-xs text-slate-400 mb-3 font-medium">
                                  Echipa lui {mgr.name.split(' ')[0]}
                                </p>
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                  {mgrTeam.map(m => <MemberCard key={m.id} member={m} />)}
                                </div>
                              </div>
                            )}

                            {isExpanded && mgrTeam.length === 0 && (
                              <div className="p-4 border-t border-purple-100 text-center">
                                <p className="text-xs text-slate-400">Niciun angajat asignat acestui manager</p>
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}

                {directTeam.length === 0 && subManagers.length === 0 && (
                  <div className="card p-12 text-center max-w-lg mx-auto">
                    <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
                      <Users size={28} className="text-slate-400" />
                    </div>
                    <h2 className="text-lg font-semibold text-slate-900 mb-2">Niciun angajat asignat</h2>
                    <p className="text-slate-500 text-sm">Nu ai niciun angajat in subordine.</p>
                  </div>
                )}
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
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 font-bold text-lg">
                    {selected.name?.charAt(0)?.toUpperCase() || '?'}
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold text-slate-900">{selected.name}</h1>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-slate-400 text-sm">{selected.email}</p>
                      <span className="text-xs px-1.5 py-0.5 rounded-full font-medium bg-slate-100 text-slate-600">
                        {getRolLabel(selected.role)}
                      </span>
                    </div>
                  </div>
                </div>
                <LastUpdated />
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
                  Acest utilizator nu are un ID de angajat asignat.
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
                      {totalDiffMin === 0 ? 'Echilibrat'
                        : totalDiffMin > 0 ? 'Timp in plus'
                        : 'De recuperat'}
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
                  <TimesheetTable
                    timesheets={timesheets}
                    readonly={true}
                    from={from}
                    to={to}
                    employeeId={Number(selected.employee_id)}
                  />
                </div>
              </>
            )}
          </>
        )}
      </main>
    </div>
  )
}
