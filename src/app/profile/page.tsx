'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/components/UserContext'
import Sidebar from '@/components/Sidebar'
import toast from 'react-hot-toast'
import { Eye, EyeOff, Save, ArrowLeft, User, Mail, CreditCard, Shield, FileText, CheckCircle2, XCircle } from 'lucide-react'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { ro } from 'date-fns/locale'

export default function ProfilePage() {
  const user = useUser()
  const supabase = createClient()
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrent, setShowCurrent] = useState(false)
  const [showNew, setShowNew] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [saving, setSaving] = useState(false)

  const getRolLabel = () => {
    if (user?.role === 'admin') return 'Administrator'
    if (user?.role === 'manager') return 'Manager'
    if (user?.role === 'director') return 'Director'
    return 'Angajat'
  }

  const getRolColor = () => {
    if (user?.role === 'admin') return 'bg-slate-100 text-slate-700'
    if (user?.role === 'manager') return 'bg-purple-100 text-purple-700'
    if (user?.role === 'director') return 'bg-blue-100 text-blue-700'
    return 'bg-green-100 text-green-700'
  }

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!currentPassword) {
      toast.error('Introdu PIN-ul curent')
      return
    }

    if (newPassword.length < 6) {
      toast.error('PIN-ul nou trebuie sa aiba minimum 6 caractere')
      return
    }

    if (newPassword !== confirmPassword) {
      toast.error('PIN-urile nu coincid')
      return
    }

    if (currentPassword === newPassword) {
      toast.error('PIN-ul nou trebuie sa fie diferit de cel curent')
      return
    }

    setSaving(true)

    const { data: { user: authUser } } = await supabase.auth.getUser()
    if (!authUser?.email) {
      toast.error('Eroare la obtinerea datelor utilizatorului')
      setSaving(false)
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: authUser.email,
      password: currentPassword
    })

    if (signInError) {
      toast.error('PIN-ul curent este incorect')
      setSaving(false)
      return
    }

    const { error } = await supabase.auth.updateUser({ password: newPassword })

    if (error) {
      toast.error('Eroare la schimbarea PIN-ului: ' + error.message)
    } else {
      toast.success('PIN-ul a fost schimbat cu succes!')
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
    }

    setSaving(false)
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">
        <div className="max-w-2xl mx-auto">

          <div className="flex items-center gap-3 mb-8">
            <Link href="/dashboard"
              className="flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors">
              <ArrowLeft size={16} />
              Inapoi
            </Link>
          </div>

          <h1 className="text-2xl font-bold text-slate-900 mb-6">Profilul meu</h1>

          {/* Info cont */}
          <div className="card p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <User size={18} className="text-slate-400" />
              Informatii cont
            </h2>

            <div className="space-y-4">
              <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-xl">
                <div className="w-12 h-12 rounded-full bg-blue-500 flex items-center justify-center text-white text-lg font-bold shrink-0">
                  {user?.name?.charAt(0)?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-semibold text-slate-900">{user?.name}</p>
                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${getRolColor()}`}>
                    {getRolLabel()}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <Mail size={16} className="text-slate-400 shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs text-slate-400 font-medium">Email</p>
                    <p className="text-sm text-slate-900 truncate">{user?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3 p-3 rounded-xl border border-slate-100">
                  <CreditCard size={16} className="text-slate-400 shrink-0" />
                  <div>
                    <p className="text-xs text-slate-400 font-medium">ID Angajat</p>
                    <p className="text-sm text-slate-900">{user?.employee_id || '—'}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Termeni si conditii */}
          <div className="card p-6 mb-6">
            <h2 className="text-base font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <FileText size={18} className="text-slate-400" />
              Termeni și Condiții
            </h2>

            <div className={`flex items-start gap-4 p-4 rounded-xl border ${
              user?.terms_accepted
                ? 'bg-green-50 border-green-100'
                : 'bg-red-50 border-red-100'
            }`}>
              <div className="shrink-0 mt-0.5">
                {user?.terms_accepted
                  ? <CheckCircle2 size={20} className="text-green-600" />
                  : <XCircle size={20} className="text-red-500" />
                }
              </div>
              <div className="flex-1">
                <p className={`font-medium text-sm ${
                  user?.terms_accepted ? 'text-green-800' : 'text-red-700'
                }`}>
                  {user?.terms_accepted ? 'Termeni acceptați' : 'Termeni neacceptați'}
                </p>
                {user?.terms_accepted && user?.terms_accepted_at && (
                  <p className="text-green-600 text-xs mt-0.5">
                    Acceptat pe {format(parseISO(user.terms_accepted_at), 'dd MMM yyyy, HH:mm', { locale: ro })}
                  </p>
                )}
              </div>
              <Link
                href="/terms"
                className="text-xs text-blue-600 hover:text-blue-700 font-medium shrink-0"
              >
                Citește termenii →
              </Link>
            </div>
          </div>

          {/* Schimba PIN */}
          <div className="card p-6">
            <h2 className="text-base font-semibold text-slate-900 mb-1 flex items-center gap-2">
              <Shield size={18} className="text-slate-400" />
              Schimba PIN-ul
            </h2>
            <p className="text-sm text-slate-400 mb-5">
              PIN-ul tau este folosit pentru autentificarea in aplicatie.
            </p>

            <form onSubmit={handleChangePassword} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  PIN curent
                </label>
                <div className="relative">
                  <input
                    type={showCurrent ? 'text' : 'password'}
                    value={currentPassword}
                    onChange={e => setCurrentPassword(e.target.value)}
                    placeholder="Introdu PIN-ul curent"
                    className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowCurrent(!showCurrent)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showCurrent ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  PIN nou
                </label>
                <div className="relative">
                  <input
                    type={showNew ? 'text' : 'password'}
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Minimum 6 caractere"
                    className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowNew(!showNew)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showNew ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Confirma PIN-ul nou
                </label>
                <div className="relative">
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Repeta PIN-ul nou"
                    className="input pr-10"
                  />
                  <button type="button" onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                    {showConfirm ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              <button type="submit" disabled={saving} className="btn-primary w-full justify-center py-3">
                {saving ? 'Se salveaza...' : <><Save size={15} />Salveaza PIN-ul nou</>}
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  )
}
