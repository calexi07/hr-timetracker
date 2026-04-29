'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function DashboardPage() {
  const router = useRouter()
  const supabase = createClient()
  const [debug, setDebug] = useState<string[]>([])

  const log = (msg: string) => setDebug(prev => [...prev, msg])

  useEffect(() => {
    const init = async () => {
      log('1. Verificam sesiunea...')
      
      const { data: sessionData } = await supabase.auth.getSession()
      log('2. Session: ' + JSON.stringify(sessionData.session?.user?.email || 'NULL'))

      const { data: userData } = await supabase.auth.getUser()
      log('3. User: ' + JSON.stringify(userData.user?.email || 'NULL'))

      if (!userData.user) {
        log('4. NU EXISTA USER - redirect login')
        setTimeout(() => router.push('/login'), 2000)
        return
      }

      log('4. User gasit: ' + userData.user.email)

      const { data: appUser, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', userData.user.id)
        .single()

      log('5. AppUser: ' + JSON.stringify(appUser) + ' | Error: ' + JSON.stringify(error))
    }
    init()
  }, [])

  return (
    <div className="p-8">
      <h1 className="text-xl font-bold mb-4">Debug Dashboard</h1>
      <div className="bg-slate-900 text-green-400 p-4 rounded-xl font-mono text-sm space-y-1">
        {debug.map((d, i) => <div key={i}>{d}</div>)}
        {debug.length === 0 && <div>Se incarca...</div>}
      </div>
    </div>
  )
}
