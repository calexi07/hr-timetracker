'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Shield, X, FileText, AlertTriangle } from 'lucide-react'
import { useRouter } from 'next/navigation'
import toast from 'react-hot-toast'
import Link from 'next/link'

interface Props {
  onAccept: () => void
}

export default function TermsModal({ onAccept }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()
  const router = useRouter()

  const handleAccept = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { error } = await supabase
      .from('app_users')
      .update({
        terms_accepted: true,
        terms_accepted_at: new Date().toISOString()
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Eroare la salvarea consimtamantului')
      setLoading(false)
      return
    }

    toast.success('Termenii au fost acceptati')
    onAccept()
    setLoading(false)
  }

  const handleDeny = async () => {
    setLoading(true)
    await supabase.auth.signOut()
    router.push('/login?denied=true')
  }

  const handleClose = async () => {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-2xl z-10 flex flex-col max-h-[90vh]">

        {/* Header */}
        <div className="p-6 border-b border-slate-100 shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
                <FileText size={18} className="text-blue-600" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-slate-900">Termeni și Condiții</h2>
                <p className="text-slate-400 text-xs">Pontaj HR — Krka Romania</p>
              </div>
            </div>
            <button
              onClick={handleClose}
              disabled={loading}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-all"
              title="Inchide si deconecteaza"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Avertisment */}
        <div className="px-6 pt-4 shrink-0">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <div className="flex items-start gap-2">
              <AlertTriangle size={16} className="text-amber-600 shrink-0 mt-0.5" />
              <p className="text-amber-800 text-xs leading-relaxed">
                <strong>Notificare importantă:</strong> Datele afișate în această aplicație au caracter
                <strong> estimativ</strong> și sunt generate automat pe baza înregistrărilor din sistemul
                de control acces. Acestea nu constituie documente oficiale de pontaj.
              </p>
            </div>
          </div>
        </div>

        {/* Continut scrollabil */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4 text-sm text-slate-600 leading-relaxed">
          <div>
            <h3 className="font-semibold text-slate-900 mb-1">1. Scopul aplicației</h3>
            <p>
              Aplicația <strong>Pontaj HR</strong> este un instrument intern de informare destinat
              angajaților Krka Romania, care oferă o vizualizare orientativă a prezenței la locul
              de muncă pe baza datelor înregistrate de sistemul de control acces. Aplicația nu
              înlocuiește sistemele oficiale de evidență a muncii și nu generează documente cu
              valoare juridică.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">2. Caracter estimativ al datelor</h3>
            <p className="mb-2">
              Orele afișate sunt calculate automat ca diferență între prima și ultima pontare din
              ziua respectivă. Această metodă poate genera inexactități în cazul:
            </p>
            <ul className="space-y-1 ml-3">
              {[
                'Ieșirilor temporare din clădire în timpul programului',
                'Pontărilor multiple accidentale sau eronate',
                'Lucrului de acasă (WFH) — zilele fără pontaj fizic nu sunt înregistrate',
                'Zilelor de concediu, concediu medical sau absențe aprobate',
                'Defecțiunilor tehnice ale sistemului de control acces',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">3. Limitări tehnice și bug-uri</h3>
            <p>
              Aplicația este în stadiu de dezvoltare activă și poate conține erori operaționale
              sau funcționale. Krka Romania nu garantează disponibilitatea continuă, acuratețea
              100% a calculelor sau absența completă a erorilor de afișare.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">4. Sursa oficială a datelor</h3>
            <p>
              Pentru informații oficiale privind orele lucrate, concediile și absențele,
              contactați <strong>managerul direct</strong> sau <strong>directorul de departament</strong>.
              Datele din această aplicație nu pot fi folosite ca dovadă oficială.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">5. Confidențialitate și acces</h3>
            <p>
              Fiecare angajat are acces exclusiv la propriile date de pontaj. Managerii pot
              vizualiza datele echipei din subordine. Datele sunt stocate în condiții de
              securitate și nu sunt partajate cu terțe părți.
            </p>
          </div>

          <div>
            <h3 className="font-semibold text-slate-900 mb-1">6. Modificări ale termenilor</h3>
            <p>
              Krka Romania își rezervă dreptul de a modifica acești termeni în orice moment.
              Continuarea utilizării aplicației după publicarea modificărilor constituie
              acceptarea noilor termeni.
            </p>
          </div>

          <div className="pt-2">
            <Link href="/terms" target="_blank"
              className="text-xs text-blue-600 hover:text-blue-700 underline">
              Citește termenii completi →
            </Link>
          </div>
        </div>

        {/* Butoane */}
        <div className="p-6 border-t border-slate-100 shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={handleDeny}
              disabled={loading}
              className="btn-secondary flex-1 justify-center py-3"
            >
              <X size={16} />
              Refuz
            </button>
            <button
              onClick={handleAccept}
              disabled={loading}
              className="btn-primary flex-1 justify-center py-3"
            >
              {loading ? 'Se salveaza...' : (
                <>
                  <Shield size={16} />
                  Accept termenii
                </>
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 text-center mt-3">
            Prin apasarea "Accept termenii" confirmi ca ai citit si esti de acord cu termenii si conditiile.
            Daca refuzi sau inchizi, vei fi deconectat automat.
          </p>
        </div>
      </div>
    </div>
  )
}
