'use client'
import { createContext, useContext, useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'

interface UserInfo {
  id: string
  name: string
  email: string
  role: string
  employee_id: number | null
}

const UserContext = createContext<UserInfo | null>(null)

export function useUser() {
  return useContext(UserContext)
}

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserInfo | null>(null)
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) return

      const { data } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (data) {
        setUser({
          id: authUser.id,
          name: data.name || authUser.email || '',
          email: authUser.email || '',
          role: data.role || '',
          employee_id: data.employee_id || null
        })
      }
    }
    load()
  }, [])

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}
