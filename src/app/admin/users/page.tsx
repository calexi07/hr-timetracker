'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Save } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { role: string; employee_id: string }>>({})
  const supabase = createClient()

  useEffect(() => {
    const load = async () => {
      const { data } = await supabase
        .from('app_users')
        .select('*')
        .order('name')
      setUsers(data || [])
      setLoading(false)
    }
    load()
  }, [])

  const handleSave = async (user: any) => {
    const edit = edits[user.id]
    if (!edit) return
    setSaving(user.id)

    const { error } = await supabase
      .from('app_users')
      .update({
        role: edit.role,
        employee_id: edit.employee_id ? parseInt(edit.employee_id) : null
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Eroare la actualizare: ' + error.message)
    } else {
      toast.success('Angajat actualizat')
      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, role: edit.role, employee_id: edit.employee_id ? parseInt(edit.employee_id) : null }
          : u
      ))
      const next = { ...edits }
      delete next[user.id]
      setEdits(next)
    }
    setSaving(null)
  }

  if (loading) return <div className="p-8 text-slate-400">Se incarca angajatii…</div>

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Gestionare angajati</h1>
        <p className="text-slate-500 mt-1">
          Asociaza conturile cu ID-ul din sistemul de acces pentru a vedea pontajul.
        </p>
      </div>

      <div className="card p-4 mb-6 bg-amber-50 border-amber-200 text-sm text-amber-800">
        <strong>Cum functioneaza:</strong> Cand un angajat se logheaza prima oara, apare in aceasta lista.
        Introdu in campul <em>ID Angajat</em> numarul din coloana <em>Person ID</em> din fisierul Excel
        (ex: 21 = Califar Daniela, 12 = Tataru Amelia).
      </div>

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Angajat</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Rol</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">ID Angajat</th>
              <th className="px-5 py-3.5" />
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const edit = edits[user.id]
              return (
                <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold">
                        {user.name?.charAt(0) || user.email?.charAt(0) || '?'}
                      </div>
                      <div>
                        <p className="font-medium text-slate-900">{user.name || '—'}</p>
                        <p className="text-slate-400 text-xs">{user.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={edit?.role ?? user.role}
                      onChange={e => setEdits(prev => ({
                        ...prev,
                        [user.id]: {
                          role: e.target.value,
                          employee_id: prev[user.id]?.employee_id ?? String(user.employee_id || '')
                        }
                      }))}
                      className="input py-1.5 w-40"
                    >
                      <option value="employee">Angajat</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </td>
                  <td className="px-5 py-3.5">
                    <input
                      type="number"
                      placeholder="ex: 21"
                      value={edit?.employee_id ?? String(user.employee_id || '')}
                      onChange={e => setEdits(prev => ({
                        ...prev,
                        [user.id]: {
                          employee_id: e.target.value,
                          role: prev[user.id]?.role ?? user.role
                        }
                      }))}
                      className="input py-1.5 w-28"
                    />
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    {edit && (
                      <button
                        onClick={() => handleSave(user)}
                        disabled={saving === user.id}
                        className="btn-primary text-xs py-1.5"
                      >
                        {saving === user.id
                          ? 'Se salveaza…'
                          : <><Save size={12} />Salveaza</>
                        }
                      </button>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
