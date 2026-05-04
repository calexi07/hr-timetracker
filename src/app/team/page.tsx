'use client'
import Link from 'next/link'
import { useUser } from '@/components/UserContext'
import Sidebar from '@/components/Sidebar'
import { ArrowLeft, AlertTriangle, Info, Shield, Clock, Users, FileText } from 'lucide-react'

export default function TermsPage() {
  const user = useUser()

  const content = (
    <div className="max-w-3xl mx-auto px-6 py-12">
      <div className="mb-10">
        <Link href={user ? '/profile' : '/login'}
          className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-900 transition-colors mb-6">
          <ArrowLeft size={16} />
          Inapoi
        </Link>

        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center">
            <Clock size={22} className="text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Termeni și Condiții</h1>
            <p className="text-slate-400 text-sm">Pontaj HR — Krka Romania</p>
          </div>
        </div>

        <p className="text-slate-500 text-sm">
          Ultima actualizare: {new Date().toLocaleDateString('ro-RO', { year: 'numeric', month: 'long', day: 'numeric' })}
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 mb-8">
        <div className="flex items-start gap-3">
          <AlertTriangle size={20} className="text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-900 mb-1">Notificare importantă</p>
            <p className="text-amber-800 text-sm leading-relaxed">
              Datele afișate în această aplicație au caracter <strong>estimativ</strong> și sunt
              generate automat pe baza înregistrărilor din sistemul de control acces.
              Acestea <strong>nu constituie documente oficiale</strong> de pontaj și nu pot fi
              utilizate ca dovadă legală a orelor lucrate.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center">
              <Info size={14} className="text-blue-600" />
            </div>
            <h2 className="font-semibold text-slate-900">1. Scopul aplicației</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Aplicația <strong>Pontaj HR</strong> este un instrument intern de informare,
            destinat angajaților Krka Romania, care oferă o vizualizare orientativă a
            prezenței la locul de muncă pe baza datelor înregistrate de sistemul de
            control acces al companiei. Aplicația nu înlocuiește sistemele oficiale de
            evidență a muncii și nu generează documente cu valoare juridică.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center">
              <AlertTriangle size={14} className="text-amber-600" />
            </div>
            <h2 className="font-semibold text-slate-900">2. Caracter estimativ al datelor</h2>
          </div>
          <div className="text-slate-600 text-sm leading-relaxed space-y-3">
            <p>
              Orele afișate sunt calculate automat ca diferență între <strong>prima pontare
              și ultima pontare</strong> din ziua respectivă. Această metodă de calcul poate
              genera inexactități în următoarele situații:
            </p>
            <ul className="space-y-1.5 ml-4">
              {[
                'Ieșiri temporare din clădire în timpul programului (pauze, deplasări scurte)',
                'Pontări multiple accidentale sau eronate în sistem',
                'Lucru de acasă (WFH) — zilele fără pontaj fizic nu sunt înregistrate',
                'Zile de concediu, concediu medical sau absențe aprobate',
                'Defecțiuni tehnice ale sistemului de control acces',
                'Diferențe de fus orar sau erori de sincronizare a sistemului',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-amber-500 mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center">
              <Shield size={14} className="text-red-600" />
            </div>
            <h2 className="font-semibold text-slate-900">3. Limitări tehnice și bug-uri</h2>
          </div>
          <div className="text-slate-600 text-sm leading-relaxed space-y-3">
            <p>
              Aplicația Pontaj HR este în stadiu de dezvoltare activă și poate conține
              erori operaționale sau funcționale. Krka Romania nu garantează:
            </p>
            <ul className="space-y-1.5 ml-4">
              {[
                'Disponibilitatea continuă și neîntreruptă a platformei',
                'Acuratețea 100% a calculelor de ore afișate',
                'Absența completă a erorilor de afișare sau procesare a datelor',
                'Compatibilitatea cu toate browserele și dispozitivele',
              ].map((item, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="text-red-400 mt-0.5 shrink-0">•</span>
                  {item}
                </li>
              ))}
            </ul>
            <p>
              În cazul identificării unor erori sau discrepanțe, vă rugăm să contactați
              administratorul IT pentru raportarea problemei.
            </p>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center">
              <Users size={14} className="text-green-600" />
            </div>
            <h2 className="font-semibold text-slate-900">4. Sursa oficială a datelor</h2>
          </div>
          <div className="text-slate-600 text-sm leading-relaxed space-y-3">
            <p>
              Pentru informații oficiale și corecte privind orele lucrate, concediile,
              absențele și orice alte aspecte legate de evidența muncii, angajații sunt
              rugați să contacteze:
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-2">
              <div className="bg-green-50 border border-green-100 rounded-xl p-4">
                <p className="font-semibold text-green-900 text-sm mb-1">Managerul direct</p>
                <p className="text-green-700 text-xs leading-relaxed">
                  Prima sursă de contact pentru clarificarea oricăror discrepanțe
                  în datele de pontaj.
                </p>
              </div>
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                <p className="font-semibold text-blue-900 text-sm mb-1">Directorul de departament</p>
                <p className="text-blue-700 text-xs leading-relaxed">
                  Pentru situații ce necesită aprobare sau clarificare la nivel
                  superior de management.
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-purple-100 flex items-center justify-center">
              <Shield size={14} className="text-purple-600" />
            </div>
            <h2 className="font-semibold text-slate-900">5. Confidențialitate și acces</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Fiecare angajat are acces exclusiv la propriile date de pontaj. Managerii
            pot vizualiza datele membrilor echipei aflate în subordinea lor directă.
            Datele sunt stocate în condiții de securitate și nu sunt partajate cu
            terțe părți. Accesul la aplicație este restricționat prin autentificare
            și este permis exclusiv angajaților Krka Romania.
          </p>
        </div>

        <div className="card p-6">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <Info size={14} className="text-slate-600" />
            </div>
            <h2 className="font-semibold text-slate-900">6. Modificări ale termenilor</h2>
          </div>
          <p className="text-slate-600 text-sm leading-relaxed">
            Krka Romania își rezervă dreptul de a modifica acești termeni și condiții
            în orice moment, fără notificare prealabilă. Continuarea utilizării aplicației
            după publicarea modificărilor constituie acceptarea noilor termeni.
          </p>
        </div>
      </div>

      <div className="mt-10 pt-6 border-t border-slate-200 text-center">
        <p className="text-slate-400 text-xs">
          © {new Date().getFullYear()} Krka Romania · Pontaj HR · Toate drepturile rezervate
        </p>
        <Link href={user ? '/profile' : '/login'}
          className="inline-flex items-center gap-2 mt-4 text-sm text-blue-600 hover:text-blue-700 font-medium">
          <ArrowLeft size={14} />
          Inapoi
        </Link>
      </div>
    </div>
  )

  // Daca e logat, arata cu sidebar
  if (user) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 overflow-auto bg-slate-50">
          {content}
        </main>
      </div>
    )
  }

  // Daca nu e logat, arata fara sidebar
  return (
    <div className="min-h-screen bg-slate-50">
      {content}
    </div>
  )
}
