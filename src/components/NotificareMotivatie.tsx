'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquare, CheckCircle, XCircle, Clock, X } from 'lucide-react'
import toast from 'react-hot-toast'

interface Props {
  onClose: () => void
}

export default function NotificareMotivatie({ onClose }: Props) {
  const [loading, setLoading] = useState(false)
  const supabase = createClient()

  const handleInteles = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (user) {
      await supabase
        .from('app_users')
        .update({ notificare_motivatii_vazuta: true })
        .eq('id', user.id)
    }
    setLoading(false)
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />
      <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-lg z-10 overflow-hidden">

        {/* Header colorat */}
        <div className="bg-gradient-to-r from-blue-600 to-blue-500 p-6 text-white">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
              <MessageSquare size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-lg font-bold">Noutate — Sistem de Motivatii</h2>
              <p className="text-blue-100 text-xs">Pontaj HR · Krka Romania</p>
            </div>
          </div>
          <p className="text-blue-100 text-sm mt-3 leading-relaxed">
            Am adaugat o functionalitate noua care iti permite sa motivezi zilele
            cu ore insuficiente sau zilele fara pontaj la birou.
          </p>
        </div>

        {/* Continut */}
        <div className="p-6 space-y-4">

          {/* Cum functioneaza */}
          <div>
            <p className="text-sm font-semibold text-slate-900 mb-3">Cum functioneaza:</p>
            <div className="space-y-3">

              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 border border-slate-100">
                <div className="w-7 h-7 rounded-lg bg-blue-100 flex items-center justify-center shrink-0 mt-0.5">
                  <MessageSquare size={14} className="text-blue-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Tu adaugi o motivatie</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Pe orice zi cu ore insuficiente sau fara pontaj, poti adauga o motivatie
                    (ex: WFH, concediu medical, deplasare).
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100">
                <div className="w-7 h-7 rounded-lg bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
                  <Clock size={14} className="text-amber-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Managerul o analizeaza</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Motivatia ajunge la managerul tau care o poate aproba sau respinge,
                    cu un raspuns explicativ.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-green-50 border border-green-100">
                <div className="w-7 h-7 rounded-lg bg-green-100 flex items-center justify-center shrink-0 mt-0.5">
                  <CheckCircle size={14} className="text-green-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Daca e aprobata</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ziua respectiva va fi considerata <strong>echilibrata</strong> — diferenta
                    devine ±0m si nu mai apare ca timp de recuperat.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 p-3 rounded-xl bg-red-50 border border-red-100">
                <div className="w-7 h-7 rounded-lg bg-red-100 flex items-center justify-center shrink-0 mt-0.5">
                  <XCircle size={14} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-900">Daca e respinsa</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Vei vedea raspunsul managerului si ziua ramane cu diferenta initiala.
                  </p>
                </div>
              </div>

            </div>
          </div>

          {/* Unde gasesti */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
            <p className="text-xs text-blue-800">
              <strong>Unde gasesti?</strong> In tabelul de pontaj, apasa pe iconita
              <span className="inline-flex items-center mx-1 px-1.5 py-0.5 rounded bg-blue-100">
                <MessageSquare size={11} className="text-blue-600" />
              </span>
              de langa orice zi pentru a adauga o motivatie.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-6">
          <button
            onClick={handleInteles}
            disabled={loading}
            className="btn-primary w-full justify-center py-3 text-base"
          >
            {loading ? 'Se salveaza...' : 'Am inteles, multumesc!'}
          </button>
        </div>
      </div>
    </div>
  )
}
