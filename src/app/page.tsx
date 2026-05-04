'use client'
import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function Home() {
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('app_users')
        .select('role, employee_id')
        .eq('id', user.id)
        .single()

      if (!u) { router.push('/login'); return }

      if (u.role === 'manager' || u.role === 'director') {
        router.push('/team')
      } else {
        router.push('/dashboard')
      }
    }
    check()
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )
}
