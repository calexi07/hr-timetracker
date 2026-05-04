'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import TermsModal from '@/components/TermsModal'

export default function TermsGuard({ children }: { children: React.ReactNode }) {
  const [checking, setChecking] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    const check = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setChecking(false); return }

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
  }, [])

  const handleAccept = () => {
    setShowModal(false)
    // Actualizeaza sessionStorage
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

  if (checking) return (
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
