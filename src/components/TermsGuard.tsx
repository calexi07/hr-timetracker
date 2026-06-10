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

      sessionStorage.removeItem('pontaj_user')

      const { data, error } = await supabase
        .from('app_users')
        .select('terms_accepted, notificare_motivatii_vazuta')
        .eq('id', user.id)
        .single()

      console.log('TermsGuard check:', { data, error, pathname })

      if (!data?.terms_accepted && !pathname.startsWith('/terms')) {
        setShowTermsModal(true)
      } else if (data?.terms_accepted && !data?.notificare_motivatii_vazuta) {
        console.log('Showing notificare motivatii')
        setShowNotificare(true)
      }

      setChecking(false)
    }
    check()
  }, [pathname])

  const handleAcceptTerms = () => {
    setShowTermsModal(false)
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
