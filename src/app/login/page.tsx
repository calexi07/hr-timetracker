'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import { X, Shield, ArrowLeft } from 'lucide-react'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [step, setStep] = useState<'email' | 'pin'>('email')
  const [pin, setPin] = useState('')
  const [loading, setLoading] = useState(false)
  const [showAdminModal, setShowAdminModal] = useState(false)
  const [admins, setAdmins] = useState<any[]>([])
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const loadAdmins = async () => {
      const { data } = await supabase
        .from('app_users')
        .select('name, email')
        .eq('role', 'admin')
        .order('name')
      setAdmins(data || [])
    }
    loadAdmins()
  }, [])

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) return
    setStep('pin')
  }

  const handlePinSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin) return
    setLoading(true)

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: pin
    })

    if (error) {
      toast.error('PIN incorect. Incearca din nou.')
      setPin('')
      setLoading(false)
      return
    }

    router.push('/')
    router.refresh()
  }

  const handlePinInput = (val: string) => {
    // Accepta doar cifre
    const clean = val.replace(/\D/g, '').slice(0, 10)
    setPin(clean)
  }

  return (
    <div className="min-h-screen flex bg-slate-50">
      {/* Modal contact admin */}
      {showAdminModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowAdminModal(false)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-slate-900">Ai uitat PIN-ul?</h3>
              <button onClick={() => setShowAdminModal(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all">
                <X size={18} />
              </button>
            </div>

            <p className="text-slate-600 text-sm mb-5">
              Pentru resetarea PIN-ului, ia legatura cu un administrator IT din lista de mai jos:
            </p>

            <div className="space-y-3">
              {admins.length === 0 ? (
                <p className="text-slate-400 text-sm text-center py-4">Se incarca...</p>
              ) : (
                admins.map((admin, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                    <div className="w-9 h-9 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-sm font-semibold shrink-0">
                      {admin.name?.charAt(0)?.toUpperCase() || '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-slate-900 text-sm">{admin.name}</p>
                      <p className="text-slate-400 text-xs truncate">{admin.email}</p>
                    </div>
                    <div className="flex items-center gap-1 bg-blue-50 px-2 py-1 rounded-full">
                      <Shield size={10} className="text-blue-500" />
                      <span className="text-blue-600 text-xs font-medium">Admin</span>
                    </div>
                  </div>
                ))
              )}
            </div>

            <button onClick={() => setShowAdminModal(false)} className="btn-primary w-full justify-center mt-5">
              Am inteles
            </button>
          </div>
        </div>
      )}

      {/* Stanga — branding */}
      <div className="hidden lg:flex w-1/2 bg-gradient-to-br from-blue-900 via-blue-700 to-blue-500 flex-col justify-between p-12">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="text-white font-semibold text-lg">Pontaj HR</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold text-white leading-tight mb-4">
            Evidenta prezentei,<br />simplu si rapid.
          </h1>
          <p className="text-blue-100 text-lg leading-relaxed mb-8">
            Portal dedicat angajatilor Krka Romania pentru vizualizarea orelor lucrate si a pontajului zilnic.
          </p>
          <div className="grid grid-cols-3 gap-4">
            {[
              { label: 'Angajati', value: '40+' },
              { label: 'Zile monitorizate', value: '365' },
              { label: 'Acuratete', value: '100%' },
            ].map(stat => (
              <div key={stat.label} className="bg-white/10 rounded-2xl p-4 backdrop-blur">
                <p className="text-2xl font-bold text-white">{stat.value}</p>
                <p className="text-blue-200 text-xs mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        </div>

        <p className="text-blue-300 text-sm">
          © {new Date().getFullYear()} Krka Romania · Toate drepturile rezervate
        </p>
      </div>

      {/* Dreapta — form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md">

          {/* Mobile logo */}
          <div className="flex items-center gap-3 mb-10 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6h4.5m4.5 0a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <span className="font-semibold text-slate-900 text-lg">Pontaj HR</span>
          </div>

          {/* STEP 1 — Email */}
          {step === 'email' && (
            <>
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Bun venit</h2>
                <p className="text-slate-500">Introdu adresa de email pentru a continua.</p>
              </div>

              <form onSubmit={handleEmailSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Adresa de email
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="nume@krka.biz"
                    required
                    autoFocus
                    className="input text-base py-3"
                  />
                </div>

                <button type="submit" className="btn-primary w-full justify-center py-3 text-base">
                  Continua
                </button>
              </form>

              <div className="mt-8 pt-6 border-t border-slate-100">
                <p className="text-xs text-slate-400 text-center">
                  Acces restrictionat doar pentru angajatii Krka Romania.
                </p>
              </div>
            </>
          )}

          {/* STEP 2 — PIN */}
          {step === 'pin' && (
            <>
              <button
                onClick={() => { setStep('email'); setPin('') }}
                className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-8"
              >
                <ArrowLeft size={16} />
                Inapoi
              </button>

              <div className="mb-8">
                <h2 className="text-3xl font-bold text-slate-900 mb-2">Introdu PIN-ul</h2>
                <p className="text-slate-500 text-sm">
                  Autentificare pentru <span className="font-medium text-slate-700">{email}</span>
                </p>
              </div>

              {/* Explicatie PIN */}
              <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4 mb-6">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                    <Shield size={16} className="text-blue-600" />
                  </div>
                  <div>
                    <p className="font-semibold text-blue-900 text-sm">Ce este PIN-ul?</p>
                    <p className="text-blue-700 text-xs mt-1 leading-relaxed">
                 PIN-ul tau este <strong>ID-ul de utilizator</strong> din sistemul intern al companiei.
                      Il poti obtine de la administratorul IT.
                    </p>
                  </div>
                </div>
              </div>

              <form onSubmit={handlePinSubmit} className="space-y-5">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    PIN (ID utilizator)
                  </label>
                  <input
                    type="password"
                    inputMode="numeric"
                    value={pin}
                    onChange={e => handlePinInput(e.target.value)}
                    placeholder="••••••"
                    required
                    autoFocus
                    className="input text-base py-3 tracking-widest text-center text-xl"
                  />
                  <p className="text-xs text-slate-400 mt-1.5 text-center">
                    Ex: daca ID-ul tau e <strong>21</strong>, PIN-ul este <strong>21</strong>
                  </p>
                </div>

                <button
                  type="submit"
                  disabled={loading || !pin}
                  className="btn-primary w-full justify-center py-3 text-base"
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.4 0 0 5.4 0 12h4z"/>
                      </svg>
                      Se autentifica...
                    </span>
                  ) : 'Autentificare'}
                </button>
              </form>

              <div className="mt-5 text-center">
                <button
                  onClick={() => setShowAdminModal(true)}
                  className="text-sm text-blue-600 hover:text-blue-700 font-medium"
                >
                  Ai uitat PIN-ul?
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
