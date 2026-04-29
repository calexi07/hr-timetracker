'use client'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { LayoutDashboard, Clock, Users, Upload, LogOut, ChevronRight, Shield, FileText, UsersRound } from 'lucide-react'
import { useEffect, useState } from 'react'

interface UserInfo {
  name: string
  email: string
  role: string
}

export default function Sidebar() {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const [userInfo, setUserInfo] = useState<UserInfo | null>(null)

  useEffect(() => {
    // Citeste din localStorage instant
    const cached = localStorage.getItem('pontaj_user')
    if (cached) {
      try { setUserInfo(JSON.parse(cached)) } catch {}
    }

    // Apoi fetch din supabase si actualizeaza
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('app_users')
        .select('name, role')
        .eq('id', user.id)
        .single()

      if (data) {
        const info: UserInfo = {
          name: data.name || user.email || '',
          email: user.email || '',
          role: data.role || ''
        }
        setUserInfo(info)
        localStorage.setItem('pontaj_user', JSON.stringify(info))
      }
    }
    load()
  }, [])

  const handleLogout = async () => {
    localStorage.removeItem('pontaj_user')
    await supabase.auth.signOut()
    router.push('/login')
  }

  const getRolLabel = () => {
    if (!userInfo?.role) return '...'
    if (userInfo.role === 'admin') return 'Administrator'
    if (userInfo.role === 'manager') return 'Manager'
    if (userInfo.role === 'director') return 'Director'
    return 'Angajat'
  }

  const role = userInfo?.role || ''

  const navItems = [
    { label: 'Panou principal', href: '/dashboard', icon: <LayoutDashboard size={18} />, show: true },
    { label: 'Echipa mea', href: '/team', icon: <UsersRound size={18} />, show: role === 'manager' || role === 'director' },
    { label: 'Incarca date', href: '/admin/upload', icon: <Upload size={18} />, show: role === 'admin' },
    { label: 'Gestionare angajati', href: '/admin/users', icon: <Users size={18} />, show: role === 'admin' },
    { label: 'Istoric incarcari', href: '/admin/logs', icon: <FileText size={18} />, show: role === 'admin' },
  ].filter(n => n.show)

  const initials = userInfo?.name?.charAt(0)?.toUpperCase() || userInfo?.email?.charAt(0)?.toUpperCase() || '?'
  const displayName = userInfo?.name || userInfo?.email || '...'

  return (
    <aside className="w-64 min-h-screen bg-blue-900 flex flex-col">
      <div className="p-6 border-b border-blue-700">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-500 flex items-center justify-center">
            <Clock size={18} className="text-white" />
          </div>
          <div>
            <p className="font-semibold text-white text-sm leading-tight">Pontaj HR</p>
            <p className="text-blue-300 text-xs">Krka Romania</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {navItems.map(item => {
          const active = pathname === item.href || pathname.startsWith(item.href + '/')
          return (
            <Link key={item.href} href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all group',
                active ? 'bg-blue-500 text-white' : 'text-blue-200 hover:bg-blue-800 hover:text-white'
              )}
            >
              <span className={cn(active ? 'text-white' : 'text-blue-400 group-hover:text-white')}>
                {item.icon}
              </span>
              {item.label}
              {active && <ChevronRight size={14} className="ml-auto" />}
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-blue-700">
        <div className="flex items-center gap-3 px-3 py-2 mb-2">
          <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-white text-xs font-medium truncate">{displayName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              {role === 'admin' && <Shield size={10} className="text-blue-400" />}
              <span className="text-blue-400 text-xs">{getRolLabel()}</span>
            </div>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-2 px-3 py-2 rounded-xl text-blue-300 hover:text-white hover:bg-blue-800 text-sm transition-all"
        >
          <LogOut size={16} />
          Deconectare
        </button>
      </div>
    </aside>
  )
}
