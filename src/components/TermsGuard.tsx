'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TermsModal from '@/components/TermsModal'
import { usePathname } from 'next/navigation'

const PUBLIC_PATHS = ['/login', '/terms', '/reset-password', '/update-password']

export default function TermsGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      // Nu verifica pe paginile publice
      if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        setChecking(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChecking(false)
        return
      }

      // Sterge cache-ul vechi care nu are terms_accepted
      const cached = sessionStorage.getItem('pontaj_user')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          // Daca nu are campul terms_accepted in cache, sterge cache-ul
          if (parsed.terms_accepted === undefined) {
            sessionStorage.removeItem('pontaj_user')
          }
        } catch {
          sessionStorage.removeItem('pontaj_user')
        }
      }

      // Verifica direct din Supabase
      const { data } = await supabase
        .from('app_users')
        .select('terms_accepted')
        .eq('id', user.id)
        .single()

      if (!data?.terms_accepted) {
        setShowModal(true)
      }

      setChecking(false)
    }
    check()
  }, [pathname])

  const handleAccept = () => {
    setShowModal(false)
    const cached = sessionStorage.getItem('pontaj_user')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        parsed.terms_accepted = true
        parsed.terms_accepted_at = new Date().toISOString()
        sessionStorage.setItem('pontaj_user', JSON.stringify(parsed))
      } catch {}
    }
  }

  if (checking && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )

  return (
    <>
      {showModal && <TermsModal onAccept={handleAccept} />}
      {children}
    </>
  )
}
