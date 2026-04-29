'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Clock, ArrowLeft } from 'lucide-react'
import Link from 'next/link'

export default function ResetPasswordPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState(false)
  const [trimis, setTrimis] = useState(false)
  const supabase = createClient()

  const handleReset = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`
    })

    if (error) {
      toast.error('Eroare la trimiterea emailului')
    } else {
      setTrimis(true)
    }
    setLoading(false)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
      <div className="w-full max-w-md mx-4">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/10 backdrop-blur mb-4">
            <Clock size={32} className="text-white" />
          </div>
          <h1 className="text-3xl font-bold text-white">Pontaj HR</h1>
          <p className="text-blue-100 mt-1">Portal angajați — Krka Romania</p>
        </div>

        <div className="card p-8">
          {trimis ? (
            <div className="text-center">
              <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h2 className="text-xl font-semibold text-slate-900 mb-2">Email trimis!</h2>
              <p className="text-slate-500 text-sm mb-6">
                Verifică căsuța de email <strong>{email}</strong> și urmează linkul pentru a-ți reseta parola.
              </p>
              <Link href="/login" className="btn-primary justify-center w-full">
                Înapoi la login
              </Link>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-semibold text-slate-900 mb-1">Resetare parolă</h2>
              <p className="text-slate-500 text-sm mb-6">
                Introdu emailul tău și îți trimitem un link de resetare.
              </p>

              <form onSubmit={handleReset} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nume@krka.biz"
                    required
                    className="input"
                  />
                </div>

                <button type="submit" disabled={loading} className="btn-primary w-full justify-center py-3">
                  {loading ? 'Se trimite…' : 'Trimite link de resetare'}
                </button>
              </form>

              <div className="mt-4 text-center">
                <Link href="/login" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-700">
                  <ArrowLeft size={14} />
                  Înapoi la login
                </Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
