'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, differenceInBusinessDays, addDays } from 'date-fns'
import { ro } from 'date-fns/locale'
import { CalendarDays, Plus, X, Upload, FileText, Clock, CheckCircle, XCircle, Eye } from 'lucide-react'
import Sidebar from '@/components/Sidebar'
import toast from 'react-hot-toast'

type TipConcediu = 'odihna' | 'medical'
type StatusCerere = 'in_asteptare' | 'aprobat' | 'respins'

const STATUS_BADGE: Record<StatusCerere, { label: string; color: string; icon: any }> = {
  in_asteptare: { label: 'In asteptare', color: 'bg-amber-100 text-amber-700', icon: Clock },
  aprobat: { label: 'Aprobat', color: 'bg-green-100 text-green-700', icon: CheckCircle },
  respins: { label: 'Respins', color: 'bg-red-100 text-red-700', icon: XCircle },
}

export default function ConcediiPage() {
  const router = useRouter()
  const supabase = createClient()
  const [appUser, setAppUser] = useState<any>(null)
  const [cereri, setCereri] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [viewModal, setViewModal] = useState<any>(null)
  const [approveModal, setApproveModal] = useState<any>(null)
  const [raspunsManager, setRaspunsManager] = useState('')
  const [approvingId, setApprovingId] = useState<string | null>(null)
  const [allUsers, setAllUsers] = useState<any[]>([])

  const [form, setForm] = useState({
    tip: 'odihna' as TipConcediu,
    data_start: '',
    data_sfarsit: '',
    motiv: '',
    document: null as File | null,
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('app_users')
        .select('*')
        .eq('id', user.id)
        .single()

      if (!u) { router.push('/login'); return }
      setAppUser(u)

      // Incarca toti userii pentru HR/admin
      if (u.role === 'hr' || u.role === 'admin') {
        const { data: users } = await supabase
          .from('app_users')
          .select('id, name, email, role')
          .order('name')
        setAllUsers(users || [])
      }

      await loadCereri(u)
      setLoading(false)
    }
    init()
  }, [])

  const loadCereri = async (u: any) => {
    let query = supabase
      .from('cereri_concediu')
      .select('*, angajat:angajat_id(id, name, email, zile_concediu_total, zile_concediu_folosite)')
      .order('created_at', { ascending: false })

    if (u.role === 'employee' || u.role === 'hr' && false) {
      query = query.eq('angajat_id', u.id)
    } else if (u.role === 'manager') {
      // Managerul vede cererile echipei sale
      const { data: echipa } = await supabase
        .from('app_users')
        .select('id')
        .eq('manager_id', u.id)
      const ids = (echipa || []).map((e: any) => e.id)
      ids.push(u.id)
      query = query.in('angajat_id', ids)
    } else if (u.role === 'director') {
      // Directorul vede toate
    } else if (u.role === 'hr' || u.role === 'admin') {
      // HR si admin vad toate
    } else {
      query = query.eq('angajat_id', u.id)
    }

    const { data } = await query
    setCereri(data || [])
  }

  const calcZileLucratoare = (start: string, end: string) => {
    if (!start || !end) return 0
    const s = new Date(start)
    const e = new Date(end)
    if (e < s) return 0
    return differenceInBusinessDays(addDays(e, 1), s)
  }

  const handleSubmit = async () => {
    if (!form.data_start || !form.data_sfarsit) {
      toast.error('Selecteaza perioada')
      return
    }
    if (form.tip === 'medical' && !form.document) {
      toast.error('Documentul medical este obligatoriu')
      return
    }

    const zile = calcZileLucratoare(form.data_start, form.data_sfarsit)
    if (zile <= 0) {
      toast.error('Perioada invalida')
      return
    }

    // Verifica zile disponibile pentru concediu odihna
    if (form.tip === 'odihna') {
      const zileDisponibile = (appUser.zile_concediu_total || 21) - (appUser.zile_concediu_folosite || 0)
      if (zile > zileDisponibile) {
        toast.error(`Nu ai suficiente zile disponibile. Disponibil: ${zileDisponibile} zile`)
        return
      }
    }

    setSubmitting(true)

    let documentUrl = null
    let documentName = null

    // Upload document medical
    if (form.tip === 'medical' && form.document) {
      const ext = form.document.name.split('.').pop()
      const fileName = `${appUser.id}/${Date.now()}.${ext}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('documente-medicale')
        .upload(fileName, form.document)

      if (uploadError) {
        toast.error('Eroare la upload document: ' + uploadError.message)
        setSubmitting(false)
        return
      }

      documentUrl = uploadData.path
      documentName = form.document.name
    }

    const { error } = await supabase
      .from('cereri_concediu')
      .insert({
        angajat_id: appUser.id,
        tip: form.tip,
        data_start: form.data_start,
        data_sfarsit: form.data_sfarsit,
        zile_lucratoare: zile,
        motiv: form.motiv || null,
        document_url: documentUrl,
        document_name: documentName,
        manager_id: appUser.manager_id || null,
        status: 'in_asteptare'
      })

    if (error) {
      toast.error('Eroare: ' + error.message)
    } else {
      toast.success('Cerere trimisa cu succes!')
      setShowForm(false)
      setForm({ tip: 'odihna', data_start: '', data_sfarsit: '', motiv: '', document: null })
      await loadCereri(appUser)
    }

    setSubmitting(false)
  }

  const handleDecizie = async (cerereId: string, decizie: 'aprobat' | 'respins') => {
    setApprovingId(cerereId)
    const cerere = cereri.find(c => c.id === cerereId)
    if (!cerere) return

    const { error } = await supabase
      .from('cereri_concediu')
      .update({
        status: decizie,
        manager_id: appUser.id,
        manager_raspuns: raspunsManager.trim() || null,
        manager_decis_la: new Date().toISOString(),
      })
      .eq('id', cerereId)

    if (error) {
      toast.error('Eroare: ' + error.message)
      setApprovingId(null)
      return
    }

    // Daca aprobat si concediu odihna, actualizeaza zilele folosite
    if (decizie === 'aprobat' && cerere.tip === 'odihna') {
      await supabase
        .from('app_users')
        .update({
          zile_concediu_folosite: (cerere.angajat?.zile_concediu_folosite || 0) + cerere.zile_lucratoare
        })
        .eq('id', cerere.angajat_id)
    }

    toast.success(decizie === 'aprobat' ? 'Cerere aprobata' : 'Cerere respinsa')
    setApproveModal(null)
    setRaspunsManager('')
    setApprovingId(null)
    await loadCereri(appUser)
  }

  const getDocumentUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from('documente-medicale')
      .createSignedUrl(path, 60)
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  const getUserName = (id: string) => {
    const u = allUsers.find(u => u.id === id)
    return u?.name || '—'
  }

  const isManagerOrAbove = appUser?.role === 'manager' || appUser?.role === 'director' || appUser?.role === 'hr' || appUser?.role === 'admin'
  const zileDisponibile = (appUser?.zile_concediu_total || 21) - (appUser?.zile_concediu_folosite || 0)
  const zileCerute = calcZileLucratoare(form.data_start, form.data_sfarsit)

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <p className="text-slate-400 text-sm">Se incarca...</p>
    </div>
  )

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 overflow-auto p-8">

        {/* Modal aprobare */}
        {approveModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setApproveModal(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Decizie cerere</h3>
                <button onClick={() => setApproveModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="bg-slate-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-slate-500">Angajat:</span>
                  <span className="font-medium text-slate-900">{approveModal.angajat?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Tip:</span>
                  <span className="font-medium text-slate-900 capitalize">
                    {approveModal.tip === 'odihna' ? 'Concediu odihna' : 'Concediu medical'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Perioada:</span>
                  <span className="font-medium text-slate-900">
                    {format(new Date(approveModal.data_start), 'dd MMM yyyy', { locale: ro })} —{' '}
                    {format(new Date(approveModal.data_sfarsit), 'dd MMM yyyy', { locale: ro })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Zile lucratoare:</span>
                  <span className="font-medium text-slate-900">{approveModal.zile_lucratoare}</span>
                </div>
                {approveModal.motiv && (
                  <div>
                    <span className="text-slate-500">Motiv:</span>
                    <p className="text-slate-700 mt-1">{approveModal.motiv}</p>
                  </div>
                )}
                {approveModal.document_url && (appUser?.role === 'hr' || appUser?.role === 'admin') && (
                  <button
                    onClick={() => getDocumentUrl(approveModal.document_url)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-xs font-medium mt-2"
                  >
                    <FileText size={14} />
                    Vezi document medical
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-slate-700 mb-1.5">
                  Raspuns <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={raspunsManager}
                  onChange={e => setRaspunsManager(e.target.value)}
                  placeholder="Ex: Aprobat. / Respins — perioada nu este disponibila."
                  rows={3}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => handleDecizie(approveModal.id, 'respins')}
                  disabled={!!approvingId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border border-red-200 text-red-600 hover:bg-red-50 font-medium text-sm transition-all disabled:opacity-50"
                >
                  <XCircle size={16} />
                  {approvingId ? '...' : 'Respinge'}
                </button>
                <button
                  onClick={() => handleDecizie(approveModal.id, 'aprobat')}
                  disabled={!!approvingId}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-green-600 hover:bg-green-700 text-white font-medium text-sm transition-all disabled:opacity-50"
                >
                  <CheckCircle size={16} />
                  {approvingId ? '...' : 'Aproba'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal vizualizare */}
        {viewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setViewModal(null)} />
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md p-6 z-10">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-slate-900">Detalii cerere</h3>
                <button onClick={() => setViewModal(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100">
                  <X size={18} />
                </button>
              </div>

              <div className="space-y-3 text-sm">
                {isManagerOrAbove && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Angajat:</span>
                    <span className="font-medium text-slate-900">{viewModal.angajat?.name}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-500">Tip:</span>
                  <span className="font-medium capitalize">
                    {viewModal.tip === 'odihna' ? '🏖️ Concediu odihna' : '🏥 Concediu medical'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Perioada:</span>
                  <span className="font-medium">
                    {format(new Date(viewModal.data_start), 'dd MMM yyyy', { locale: ro })} —{' '}
                    {format(new Date(viewModal.data_sfarsit), 'dd MMM yyyy', { locale: ro })}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Zile lucratoare:</span>
                  <span className="font-medium">{viewModal.zile_lucratoare}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Status:</span>
                  <StatusBadge status={viewModal.status} />
                </div>
                {viewModal.motiv && (
                  <div>
                    <span className="text-slate-500">Motiv:</span>
                    <p className="text-slate-700 mt-1 bg-slate-50 rounded-lg p-2">{viewModal.motiv}</p>
                  </div>
                )}
                {viewModal.manager_raspuns && (
                  <div>
                    <span className="text-slate-500">Raspuns manager:</span>
                    <p className="text-slate-700 mt-1 bg-slate-50 rounded-lg p-2">{viewModal.manager_raspuns}</p>
                  </div>
                )}
                {viewModal.document_url && (appUser?.role === 'hr' || appUser?.role === 'admin') && (
                  <button
                    onClick={() => getDocumentUrl(viewModal.document_url)}
                    className="flex items-center gap-2 text-blue-600 hover:text-blue-700 text-sm font-medium w-full justify-center py-2 border border-blue-200 rounded-xl hover:bg-blue-50 transition-all"
                  >
                    <FileText size={16} />
                    Vezi document medical
                  </button>
                )}
                {viewModal.tip === 'medical' && appUser?.role !== 'hr' && appUser?.role !== 'admin' && viewModal.document_url && (
                  <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 text-xs text-amber-700">
                    Document medical disponibil doar pentru HR.
                  </div>
                )}
              </div>

              <button onClick={() => setViewModal(null)} className="btn-secondary w-full justify-center mt-5">
                Inchide
              </button>
            </div>
          </div>
        )}

        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Cereri Concediu</h1>
            <p className="text-slate-500 mt-1">
              {isManagerOrAbove
                ? 'Gestioneaza cererile de concediu ale echipei'
                : 'Cererile tale de concediu'}
            </p>
          </div>
          {appUser?.role === 'employee' || appUser?.role === 'manager' || appUser?.role === 'director' || appUser?.role === 'admin' ? (
            <button onClick={() => setShowForm(!showForm)} className="btn-primary">
              <Plus size={16} />
              Cerere noua
            </button>
          ) : null}
        </div>

        {/* Carduri zile disponibile - doar pentru angajati */}
        {(appUser?.role === 'employee' || appUser?.role === 'manager' || appUser?.role === 'director') && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
            <div className="card p-5 bg-blue-50 border-blue-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Zile totale</p>
              <p className="text-3xl font-bold text-blue-700">{appUser?.zile_concediu_total || 21}</p>
              <p className="text-xs text-slate-400 mt-1">zile/an</p>
            </div>
            <div className="card p-5 bg-red-50 border-red-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Zile folosite</p>
              <p className="text-3xl font-bold text-red-700">{appUser?.zile_concediu_folosite || 0}</p>
              <p className="text-xs text-slate-400 mt-1">zile luate</p>
            </div>
            <div className="card p-5 bg-green-50 border-green-100">
              <p className="text-xs text-slate-500 font-medium mb-1">Zile disponibile</p>
              <p className="text-3xl font-bold text-green-700">{zileDisponibile}</p>
              <p className="text-xs text-slate-400 mt-1">zile ramase</p>
            </div>
          </div>
        )}

        {/* Form cerere noua */}
        {showForm && (
          <div className="card p-6 mb-8 border-blue-100 bg-blue-50">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-semibold text-slate-900">Cerere noua de concediu</h2>
              <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Tip concediu</label>
                <div className="flex gap-3">
                  <button
                    onClick={() => setForm(f => ({ ...f, tip: 'odihna', document: null }))}
                    className={cn(
                      'flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all',
                      form.tip === 'odihna'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    )}
                  >
                    🏖️ Odihna
                  </button>
                  <button
                    onClick={() => setForm(f => ({ ...f, tip: 'medical' }))}
                    className={cn(
                      'flex-1 py-2.5 px-3 rounded-xl border text-sm font-medium transition-all',
                      form.tip === 'medical'
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-300'
                    )}
                  >
                    🏥 Medical
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Zile lucratoare calculate
                </label>
                <div className="bg-white rounded-xl border border-slate-200 px-3 py-2.5 text-sm">
                  {zileCerute > 0 ? (
                    <span className={cn(
                      'font-bold',
                      form.tip === 'odihna' && zileCerute > zileDisponibile
                        ? 'text-red-600' : 'text-blue-600'
                    )}>
                      {zileCerute} zile
                      {form.tip === 'odihna' && zileCerute > zileDisponibile && (
                        <span className="text-red-500 font-normal ml-2">— insuficiente!</span>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-400">Selecteaza perioada</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Data inceput</label>
                <input
                  type="date"
                  value={form.data_start}
                  min={format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setForm(f => ({ ...f, data_start: e.target.value }))}
                  className="input"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">Data sfarsit</label>
                <input
                  type="date"
                  value={form.data_sfarsit}
                  min={form.data_start || format(new Date(), 'yyyy-MM-dd')}
                  onChange={e => setForm(f => ({ ...f, data_sfarsit: e.target.value }))}
                  className="input"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Motiv <span className="text-slate-400 font-normal">(optional)</span>
                </label>
                <textarea
                  value={form.motiv}
                  onChange={e => setForm(f => ({ ...f, motiv: e.target.value }))}
                  placeholder="Detalii suplimentare..."
                  rows={2}
                  className="w-full px-3 py-2.5 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                />
              </div>

              {form.tip === 'medical' && (
                <div className="sm:col-span-2">
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Document medical <span className="text-red-500">*obligatoriu</span>
                  </label>
                  <div className={cn(
                    'border-2 border-dashed rounded-xl p-4 text-center transition-all',
                    form.document ? 'border-green-300 bg-green-50' : 'border-slate-200 bg-white hover:border-blue-300'
                  )}>
                    {form.document ? (
                      <div className="flex items-center justify-center gap-2 text-green-700">
                        <FileText size={16} />
                        <span className="text-sm font-medium">{form.document.name}</span>
                        <button
                          onClick={() => setForm(f => ({ ...f, document: null }))}
                          className="text-red-400 hover:text-red-600 ml-2"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ) : (
                      <label className="cursor-pointer">
                        <Upload size={20} className="text-slate-400 mx-auto mb-2" />
                        <p className="text-sm text-slate-500">Click pentru a incarca documentul</p>
                        <p className="text-xs text-slate-400 mt-1">PDF, JPG, PNG (max 10MB)</p>
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          className="hidden"
                          onChange={e => {
                            const file = e.target.files?.[0]
                            if (file) setForm(f => ({ ...f, document: file }))
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <p className="text-xs text-amber-600 mt-1.5">
                    ⚠️ Documentul medical va fi vizibil DOAR de catre HR.
                  </p>
                </div>
              )}
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleSubmit}
                disabled={submitting}
                className="btn-primary"
              >
                {submitting ? 'Se trimite...' : <><CalendarDays size={15} />Trimite cererea</>}
              </button>
              <button onClick={() => setShowForm(false)} className="btn-secondary">
                Anuleaza
              </button>
            </div>
          </div>
        )}

        {/* Lista cereri */}
        {cereri.length === 0 ? (
          <div className="card p-12 text-center max-w-lg mx-auto">
            <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
              <CalendarDays size={28} className="text-slate-400" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-2">Nicio cerere</h2>
            <p className="text-slate-500 text-sm">
              {isManagerOrAbove
                ? 'Nu exista cereri de concediu momentan.'
                : 'Nu ai nicio cerere de concediu. Creeaza una apasand butonul de mai sus.'}
            </p>
          </div>
        ) : (
          <div className="card overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  {isManagerOrAbove && (
                    <th className="text-left px-4 py-3 font-medium text-slate-500">Angajat</th>
                  )}
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Tip</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Perioada</th>
                  <th className="text-center px-4 py-3 font-medium text-slate-500">Zile</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Status</th>
                  <th className="text-left px-4 py-3 font-medium text-slate-500">Depus pe</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {cereri.map(cerere => {
                  const canApprove = isManagerOrAbove &&
                    cerere.status === 'in_asteptare' &&
                    cerere.angajat_id !== appUser?.id &&
                    appUser?.role !== 'hr'

                  return (
                    <tr key={cerere.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                      {isManagerOrAbove && (
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                              {cerere.angajat?.name?.charAt(0)?.toUpperCase() || '?'}
                            </div>
                            <span className="font-medium text-slate-900 text-xs">{cerere.angajat?.name}</span>
                          </div>
                        </td>
                      )}
                      <td className="px-4 py-3">
                        <span className={cn(
                          'text-xs px-2 py-1 rounded-full font-medium',
                          cerere.tip === 'odihna' ? 'bg-blue-100 text-blue-700' : 'bg-purple-100 text-purple-700'
                        )}>
                          {cerere.tip === 'odihna' ? '🏖️ Odihna' : '🏥 Medical'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-slate-600">
                        <span className="text-xs">
                          {format(new Date(cerere.data_start), 'dd MMM', { locale: ro })} —{' '}
                          {format(new Date(cerere.data_sfarsit), 'dd MMM yyyy', { locale: ro })}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span className="font-semibold text-slate-900">{cerere.zile_lucratoare}</span>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge status={cerere.status} />
                      </td>
                      <td className="px-4 py-3 text-slate-400 text-xs">
                        {format(new Date(cerere.created_at), 'dd MMM yyyy', { locale: ro })}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2 justify-end">
                          <button
                            onClick={() => setViewModal(cerere)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-all"
                            title="Vezi detalii"
                          >
                            <Eye size={15} />
                          </button>
                          {canApprove && (
                            <button
                              onClick={() => { setApproveModal(cerere); setRaspunsManager('') }}
                              className="p-1.5 rounded-lg text-amber-500 hover:text-amber-700 hover:bg-amber-50 transition-all"
                              title="Aproba / Respinge"
                            >
                              <CheckCircle size={15} />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </main>
    </div>
  )
}

function StatusBadge({ status }: { status: StatusCerere }) {
  const s = STATUS_BADGE[status] || STATUS_BADGE.in_asteptare
  const Icon = s.icon
  return (
    <span className={cn('inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full font-medium', s.color)}>
      <Icon size={10} />
      {s.label}
    </span>
  )
}
