'use client'
import { useEffect, useState } from 'react'
import { AlertTriangle, ArrowRight } from 'lucide-react'

const NEW_HOST = 'hr-timetracker.itassetflow.app'
const NEW_URL = `https://${NEW_HOST}`

// Afiseaza un mesaj pe adresa veche (ex. *.vercel.app). Pe adresa noua si pe localhost nu apare.
export default function NoticeAdresaNoua({ children }: { children?: React.ReactNode }) {
  const [oldHost, setOldHost] = useState<boolean | null>(null)

  useEffect(() => {
    const h = window.location.hostname
    setOldHost(h !== NEW_HOST && h !== 'localhost' && h !== '127.0.0.1')
  }, [])

  if (oldHost === null) return null
  if (!oldHost) return <>{children}</>

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-lg bg-white border border-amber-300 rounded-2xl shadow-sm p-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-full bg-amber-100 flex items-center justify-center">
            <AlertTriangle className="w-5 h-5 text-amber-600" />
          </div>
          <h1 className="text-xl font-semibold text-slate-800">Aplicatia a fost mutata pe o adresa noua</h1>
        </div>
        <p className="text-slate-600 text-sm leading-relaxed mb-3">
          Aplicatia Pontaj HR + Concedii este disponibila acum la adresa:
        </p>
        <a href={NEW_URL} className="block text-center font-semibold text-blue-700 bg-blue-50 border border-blue-200 rounded-lg py-3 mb-4 break-all hover:bg-blue-100">
          {NEW_HOST}
        </a>
        <p className="text-slate-600 text-sm leading-relaxed mb-3">
          Adresa veche (hr-timetracker.vercel.app) nu va mai fi utilizata. Va rugam sa va actualizati
          link-ul salvat si favoritele din browser.
        </p>
        <p className="text-slate-600 text-sm leading-relaxed mb-5">
          Datele de autentificare (email si PIN) raman neschimbate. Pentru probleme de acces, va rugam
          sa contactati echipa de suport: cristian.alexiu@krka.biz sau alexandru.museat@krka.biz.
        </p>
        <a href={NEW_URL} className="w-full inline-flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg py-3 text-sm">
          Mergi la adresa noua <ArrowRight className="w-4 h-4" />
        </a>
      </div>
    </div>
  )
}
