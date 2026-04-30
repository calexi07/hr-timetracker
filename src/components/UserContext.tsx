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
      // Incearca din cache mai intai
      const cached = sessionStorage.getItem('pontaj_user')
      if (cached) {
        try {
          setUser(JSON.parse(cached))
        } catch {}
      }

      // Fetch din Supabase
      const { data: { user: authUser } } = await supabase.auth.getUser()
      if (!authUser) {
        sessionStorage.removeItem('pontaj_user')
        setUser(null)
        return
      }

      const { data, error } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', authUser.id)
        .single()

      if (data) {
        const info: UserInfo = {
          id: authUser.id,
          name: data.name || authUser.email || '',
          email: authUser.email || '',
          role: data.role || '',
          employee_id: data.employee_id || null
        }
        setUser(info)
        sessionStorage.setItem('pontaj_user', JSON.stringify(info))
      }
    }

    load()

    // Asculta schimbarile de autentificare
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        sessionStorage.removeItem('pontaj_user')
        setUser(null)
      } else if (event === 'SIGNED_IN') {
        load()
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  return (
    <UserContext.Provider value={user}>
      {children}
    </UserContext.Provider>
  )
}
