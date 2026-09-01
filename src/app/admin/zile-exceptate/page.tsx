'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'
import { format, parseISO } from 'date-fns'
import { ro } from 'date-fns/locale'
import { Plus, Trash2, X, CalendarOff } from 'lucide-react'
import toast from 'react-hot-toast'

const TIPURI = [
  { value: 'concediu_colectiv', label: '🏖️ Concediu colectiv', color: 'bg-blue-100 text-blue-700' },
  { value: 'sarbatoare', label: '🎉 Sarbatoare legala', color: 'bg-purple-100 text-purple-700' },
  { value: 'deplasare', label: '🚗 Deplasare', color: 'bg-amber-100 text-amber-700' },
  { value: 'altele', label: '📅 Altele', color: 'bg-slate-100 text-slate-700' },
]

export default function ZileExceptatePage() {
  const router = useRouter()
  const supabase = createClient()
  const [zile, setZile] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [form, setForm] = useState({
    data_start: '',
    data_sfarsit: '',
    tip: 'concediu_colectiv',
    descriere: '',
  })

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { router.push('/login'); return }

      const { data: u } = await supabase
        .from('app_users')
        .select('role, id')
        .eq('id', user.id)
        .single()

      if (u?.role !== 'admin') { router.push('/dashboard'); return }

      await load()
      setLoading(false)
    }
    init()
  }, [])

  const load = async () => {
    const { data } = await supabase
      .from('zile_exceptate')
      .select('*')
      .order('data_start', { ascending: false })
    setZile(data || [])
  }

  const handleSave = async () => {
    if (!form.data_start || !form.data_sfarsit || !form.descriere.trim()) {
      toast.error('Completeaza toate campurile')
      return
    }
    if (form.data_sfarsit < form.data_start) {
      toast.error('Data sfarsit trebuie sa fie dupa data inceput')
      return
    }

    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()

    const { error } = await supabase
      .from('zile_exceptate')
      .insert({
        data_start: form.data_start,
        data_sfarsit: form.data_sfarsit,
        tip: form.tip,
        descriere: form.descriere.trim(),
        created_by: user?.id,
      })

    if (error) {
      toast.error('Eroare: ' + error.message)
    } else {
      toast.success('Perioada exceptata adaugata')
      setShowForm(false)
      setForm({ data_start: '', data_sfarsit: '', tip: 'concediu_colectiv', descriere: '' })
      await load()
    }
    setSaving(false)
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Stergi aceasta perioada exceptata?')) return
    setDeleting(id)
    await supabase.from('zile_exceptate').delete().eq('id', id)
    toast.success('Perioada stearsa')
    setZile(prev => prev.filter(z => z.id !== id))
    setDeleting(null)
  }

  const getTip = (tip: string) => TIPURI.find(t => t.value === tip) || TIPURI[3]

  const calcZileLucratoare = (start: string, end: string) => {
    let count = 0
    const d = new Date(start)
    const e = new Date(end)
    while (d <= e) {
      const dow = d.getDay()
      if (dow !== 0 && dow !== 6) count++
      d.setDate(d.getDate() + 1)
    }
    return count
  }

  if (loading) return <div className="p-8 text-slate-400">Se incarca...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Zile Exceptate</h1>
          <p className="text-slate-500 mt-1">
            Perioade excluse din calculul pontajului — concedii colective, sarbatori, deplasari.
          </p>
        </div>
        <button onClick={() => setShowForm(true)} className="btn-primary">
          <Plus size={16} />
          Adauga perioada
        </button>
      </div>

      <div className="card p-4 mb-6 bg-amber-50 border-amber-100 text-sm text-amber-800">
        <strong>Cum functioneaza:</strong> Zilele din perioadele exceptate nu vor fi incluse
        in calculul normei pentru niciun angajat. Bilanțul se va calcula doar pe zilele lucratoare ramase.
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-blue-50 border-blue-100">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-semibold text-slate-900">Perioada noua exceptata</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Tip perioada</label>
              <select
                value={form.tip}
                onChange={e => setForm(f => ({ ...f, tip: e.target.value }))}
                className="input"
              >
                {TIPURI.map(t => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Descriere</label>
              <input
                type="text"
                value={form.descriere}
                onChange={e => setForm(f => ({ ...f, descriere: e.target.value }))}
                placeholder="Ex: Concediu colectiv august 2026"
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data inceput</label>
              <input
                type="date"
                value={form.data_start}
                onChange={e => setForm(f => ({ ...f, data_start: e.target.value }))}
                className="input"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1.5">Data sfarsit</label>
              <input
                type="date"
                value={form.data_sfarsit}
                min={form.data_start}
                onChange={e => setForm(f => ({ ...f, data_sfarsit: e.target.value }))}
                className="input"
              />
            </div>
          </div>

          {form.data_start && form.data_sfarsit && form.data_sfarsit >= form.data_start && (
            <div className="bg-white rounded-xl border border-slate-200 p-3 mb-4 text-sm">
              <span className="text-slate-500">Zile lucratoare exceptate: </span>
              <strong className="text-blue-700">
                {calcZileLucratoare(form.data_start, form.data_sfarsit)} zile
              </strong>
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={handleSave} disabled={saving} className="btn-primary">
              {saving ? 'Se salveaza...' : <><Plus size={15} />Adauga</>}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Anuleaza</button>
          </div>
        </div>
      )}

      {zile.length === 0 ? (
        <div className="card p-12 text-center max-w-lg mx-auto">
          <div className="w-16 h-16 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-4">
            <CalendarOff size={28} className="text-slate-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-900 mb-2">Nicio perioada exceptata</h2>
          <p className="text-slate-500 text-sm">
            Adauga perioade de concediu colectiv, sarbatori sau deplasari care sa fie excluse din calcul.
          </p>
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50">
                <th className="text-left px-4 py-3 font-medium text-slate-500">Tip</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Descriere</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Data inceput</th>
                <th className="text-left px-4 py-3 font-medium text-slate-500">Data sfarsit</th>
                <th className="text-center px-4 py-3 font-medium text-slate-500">Zile lucratoare</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {zile.map(z => {
                const tip = getTip(z.tip)
                return (
                  <tr key={z.id} className="border-b border-slate-50 hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-3">
                      <span className={cn('text-xs px-2 py-1 rounded-full font-medium', tip.color)}>
                        {tip.label}
                      </span>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-900">{z.descriere}</td>
                    <td className="px-4 py-3 text-slate-600">
                      {format(parseISO(z.data_start), 'dd MMM yyyy', { locale: ro })}
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {format(parseISO(z.data_sfarsit), 'dd MMM yyyy', { locale: ro })}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-slate-900">
                      {calcZileLucratoare(z.data_start, z.data_sfarsit)}
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(z.id)}
                        disabled={deleting === z.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                      >
                        {deleting === z.id ? '...' : <Trash2 size={15} />}
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
