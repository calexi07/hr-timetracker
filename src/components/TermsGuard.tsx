'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TermsModal from '@/components/TermsModal'
import NotificareMotivatie from '@/components/NotificareMotivatie'
import { usePathname } from 'next/navigation'

const PUBLIC_PATHS = ['/login', '/reset-password', '/update-password']

export default function TermsGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [showTermsModal, setShowTermsModal] = useState(false)
  const [showNotificare, setShowNotificare] = useState(false)
  const supabase = createClient()
  const pathname = usePathname()

  useEffect(() => {
    const check = async () => {
      if (PUBLIC_PATHS.some(p => pathname.startsWith(p))) {
        setChecking(false)
        return
      }

      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        setChecking(false)
        return
      }

      // Sterge cache vechi fara terms_accepted
      const cached = sessionStorage.getItem('pontaj_user')
      if (cached) {
        try {
          const parsed = JSON.parse(cached)
          if (parsed.terms_accepted === undefined) {
            sessionStorage.removeItem('pontaj_user')
          }
        } catch {
          sessionStorage.removeItem('pontaj_user')
        }
      }

      const { data } = await supabase
        .from('app_users')
        .select('terms_accepted, notificare_motivatii_vazuta')
        .eq('id', user.id)
        .single()

      if (!data?.terms_accepted && !pathname.startsWith('/terms')) {
        // Termenii au prioritate
        setShowTermsModal(true)
      } else if (data?.terms_accepted && !data?.notificare_motivatii_vazuta) {
        // Dupa termeni, arata notificarea
        setShowNotificare(true)
      }

      setChecking(false)
    }
    check()
  }, [pathname])

  const handleAcceptTerms = () => {
    setShowTermsModal(false)

    const cached = sessionStorage.getItem('pontaj_user')
    if (cached) {
      try {
        const parsed = JSON.parse(cached)
        parsed.terms_accepted = true
        parsed.terms_accepted_at = new Date().toISOString()
        sessionStorage.setItem('pontaj_user', JSON.stringify(parsed))
      } catch {}
    }

    // Dupa acceptarea termenilor, arata notificarea
    setShowNotificare(true)
  }

  const handleCloseNotificare = () => {
    setShowNotificare(false)
  }

  if (checking && !PUBLIC_PATHS.some(p => pathname.startsWith(p))) return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )

  return (
    <>
      {showTermsModal && <TermsModal onAccept={handleAcceptTerms} />}
      {showNotificare && !showTermsModal && <NotificareMotivatie onClose={handleCloseNotificare} />}
      {children}
    </>
  )
}
