'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MessageSquarePlus, X, Upload, FileText, CheckCircle, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useUser } from '@/components/UserContext'
import toast from 'react-hot-toast'

export default function RaportProblema() {
  const supabase = createClient()
  const user = useUser()
  const [open, setOpen] = useState(false)
  const [descriere, setDescriere] = useState('')
  const [screenshot, setScreenshot] = useState<File | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [trimis, setTrimis] = useState(false)

  const handleSubmit = async () => {
    if (!descriere.trim()) {
      toast.error('Descrie problema inainte de a trimite')
      return
    }

    setSubmitting(true)

    let screenshotUrl = null
    let screenshotName = null

    // Upload screenshot daca exista
    if (screenshot) {
      const ext = screenshot.name.split('.').pop()
      const fileName = `${user?.id || 'anonim'}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('rapoarte-screenshots')
        .upload(fileName, screenshot)

      if (uploadError) {
        toast.error('Eroare la upload screenshot: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      screenshotUrl = uploadData.path
      screenshotName = screenshot.name
    }

    // Salveaza raportul
    const { error } = await supabase
      .from('rapoarte_probleme')
      .insert({
        user_id: user?.id || null,
        user_name: user?.name || 'Necunoscut',
        user_email: user?.email || 'Necunoscut',
        descriere: descriere.trim(),
        screenshot_url: screenshotUrl,
        screenshot_name: screenshotName,
        status: 'nou',
      })

    if (error) {
      toast.error('Eroare: ' + error.message)
      setSubmitting(false)
      return
    }

    setTrimis(true)
    setSubmitting(false)

    // Reset dupa 3 secunde
    setTimeout(() => {
      setTrimis(false)
      setDescriere('')
      setScreenshot(null)
      setOpen(false)
    }, 3000)
  }

  const handleClose = () => {
    setOpen(false)
    setDescriere('')
    setScreenshot(null)
    setTrimis(false)
  }

// Nu afisa butonul daca userul nu e logat
if (!user) return null

return (
  <>
    {/* Bubble button */}
      <button
        onClick={() => setOpen(true)}
        className={cn(
          'fixed bottom-6 right-6 z-40 flex items-center gap-2 px-4 py-3 rounded-2xl shadow-lg transition-all',
          'bg-blue-600 hover:bg-blue-700 text-white font-medium text-sm',
          'hover:scale-105 active:scale-95'
        )}
        title="Raporteaza o problema"
      >
        <MessageSquarePlus size={18} />
        <span>Raporteaza o problema</span>
      </button>

      {/* Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={handleClose} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md z-10 overflow-hidden">

            {/* Header */}
            <div className="bg-gradient-to-r from-blue-900 to-blue-600 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                    <AlertCircle size={18} className="text-white" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold text-base">Raporteaza o problema</h3>
                    <p className="text-blue-200 text-xs mt-0.5">Echipa IT va fi notificata</p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="p-1.5 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition-all"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {trimis ? (
              /* Confirmare trimitere */
              <div className="p-8 text-center">
                <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-4">
                  <CheckCircle size={32} className="text-green-600" />
                </div>
                <h4 className="text-lg font-semibold text-slate-900 mb-2">Multumim!</h4>
                <p className="text-slate-500 text-sm">
                  Problema a fost raportata cu succes. Echipa IT va analiza solicitarea ta.
                </p>
              </div>
            ) : (
              /* Form */
              <div className="p-5 space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Descrie problema <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    value={descriere}
                    onChange={e => setDescriere(e.target.value)}
                    placeholder="Ex: Nu pot sa ma loghez, pagina nu se incarca, datele nu se salveaza..."
                    rows={4}
                    className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all resize-none"
                  />
                  <p className="text-xs text-slate-400 mt-1">{descriere.length}/500 caractere</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">
                    Screenshot <span className="text-slate-400 font-normal">(optional)</span>
                  </label>
                  <div className={cn(
                    'border-2 border-dashed rounded-xl p-4 text-center transition-all cursor-pointer',
                    screenshot ? 'border-green-300 bg-green-50' : 'border-slate-200 hover:border-blue-300 hover:bg-blue-50/30'
                  )}>
                    {screenshot ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <FileText size={16} />
                        <span className="text-sm font-medium truncate max-w-[200px]">{screenshot.name}</span>
                        <button
                          onClick={() => setScreenshot(null)}
                          className="text-red-400 hover:text-red-600 ml-1"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload size={20} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Click pentru a incarca un screenshot</p>
                        <p className="text-xs text-slate-400 mt-1">PNG, JPG (max 5MB)</p>
                        <input
                          type="file"
                          accept=".png,.jpg,.jpeg"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file && file.size > 5 * 1024 * 1024) {
                              toast.error('Fisierul e prea mare. Max 5MB.')
                              return
                            }
                            if (file) setScreenshot(file)
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>

                {/* Info user */}
                <div className="bg-slate-50 rounded-xl p-3 text-xs text-slate-500">
                  Raportat ca: <strong className="text-slate-700">{user?.name}</strong> ({user?.email})
                </div>

                <div className="flex gap-3 pt-1">
                  <button
                    onClick={handleSubmit}
                    disabled={submitting || !descriere.trim()}
                    className="btn-primary flex-1 justify-center disabled:opacity-50"
                  >
                    {submitting ? 'Se trimite...' : 'Trimite raportul'}
                  </button>
                  <button onClick={handleClose} className="btn-secondary">
                    Anuleaza
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}
