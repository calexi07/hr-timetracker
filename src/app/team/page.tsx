'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { format, startOfMonth } from 'date-fns'
import Sidebar from '@/components/Sidebar'

export default function TeamPage() {
  const router = useRouter()
  const supabase = createClient()
  const [currentUser, setCurrentUser] = useState<any>(null)
  const [team, setTeam] = useState<any[]>([])
  const [selected, setSelected] = useState<any>(null)
  const [timesheets, setTimesheets] = useState<any[]>([])
  const [debug, setDebug] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const from = format(startOfMonth(new Date()), 'yyyy-MM-dd')
  const to = format(new Date(), 'yyyy-MM-dd')

  const log = (msg: string) => setDebug(prev => [...prev, msg])

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .single()

      setCurrentUser(u)
      log(`Rol curent: ${u?.role}`)

      let query = supabase
        .from('app_users')
        .select('*')
        .eq('role', 'employee')
        .order('name')

      if (u?.role === 'manager') {
        query = query.eq('manager_id', u.id)
        log(`Filtrez dupa manager_id: ${u.id}`)
      }

      const { data: teamData } = await query
      log(`Angajati gasiti: ${teamData?.length} — ${JSON.stringify(teamData?.map(t => ({ name: t.name, emp_id: t.employee_id, manager_id: t.manager_id })))}`)
      setTeam(teamData || [])
      setLoading(false)
    }
    init()
  }, [])

  const handleSelect = async (member: any) => {
    setSelected(member)
    log(`Selectat: ${member.name} | employee_id: ${member.employee_id} | tip: ${typeof member.employee_id}`)

    const empId = Number(member.employee_id)
    log(`employee_id convertit: ${empId} | from: ${from} | to: ${to}`)

    const { data, error } = await supabase
      .from('timesheets')
      .select('*')
      .eq('employee_id', empId)
      .gte('date', from)
      .lte('date', to)
      .order('date', { ascending: false })

    log(`Rezultat query: ${data?.length} randuri | Eroare: ${JSON.stringify(error)}`)
    setTimesheets(data || [])
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
        <h1 className="text-2xl font-bold text-slate-900 mb-6">Debug Echipa</h1>

        <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-xs space-y-1 mb-6 max-h-60 overflow-y-auto">
          {debug.map((d, i) => <div key={i}>{d}</div>)}
          {debug.length === 0 && <div>Se incarca...</div>}
        </div>

        <div className="flex gap-3 flex-wrap mb-6">
          {team.map(member => (
            <button key={member.id}
              onClick={() => handleSelect(member)}
              className="px-4 py-2 rounded-xl bg-blue-100 text-blue-700 text-sm font-medium hover:bg-blue-200">
              {member.name} (ID: {member.employee_id})
            </button>
          ))}
        </div>

        {selected && (
          <div className="card p-4">
            <p className="font-semibold mb-2">Pontaj pentru {selected.name}: {timesheets.length} randuri</p>
            {timesheets.slice(0, 3).map((t, i) => (
              <p key={i} className="text-xs text-slate-500">{t.date} | {t.check_in} - {t.check_out} | {t.hours_worked}h</p>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
