'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [debug, setDebug] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setDebug('Se autentifica...')

    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    
    if (error) {
      setDebug('EROARE: ' + error.message)
      setLoading(false)
      return
    }

    setDebug('Login OK! User: ' + data.user?.email + ' | Redirectez...')
    
    setTimeout(() => {
      router.push('/')
      router.refresh()
    }, 1000)
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500">
      <div className="w-full max-w-md mx-4">
        <div className="card p-8">
          <h2 className="text-xl font-semibold text-slate-900 mb-6">Pontaj HR — Login</h2>

          <form onSubmit={handleLogin} className="space-y-4">
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

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Parola</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="input"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-3"
            >
              {loading ? 'Se autentifica...' : 'Autentificare'}
            </button>
          </form>

          {debug && (
            <div className="mt-4 p-3 rounded-xl bg-slate-100 text-sm font-mono text-slate-700 break-all">
              {debug}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
