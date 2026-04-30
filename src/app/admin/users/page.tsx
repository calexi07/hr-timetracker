'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Save, Trash2, UserPlus, X, Eye, EyeOff } from 'lucide-react'

const ROLURI = [
  { value: 'employee', label: 'Angajat' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'admin', label: 'Administrator' },
]

const ROLURI_CU_MANAGER = ['employee', 'manager', 'admin', 'director']

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { role: string; employee_id: string; name: string; manager_id: string }>>({})
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', employee_id: '', manager_id: '' })
  const [creating, setCreating] = useState(false)
  const supabase = createClient()

  useEffect(() => { load() }, [])

  const load = async () => {
    const { data } = await supabase
      .from('app_users')
      .select('*')
      .order('name')
    setUsers(data || [])
    setLoading(false)
  }

  const getPosibiliManageri = (excludeId?: string) => {
    return users.filter(u =>
      (u.role === 'manager' || u.role === 'director') && u.id !== excludeId
    )
  }

  const handleSave = async (user: any) => {
    const edit = edits[user.id]
    if (!edit) return
    setSaving(user.id)

    const { error } = await supabase
      .from('app_users')
      .update({
        name: edit.name,
        role: edit.role,
        employee_id: edit.employee_id ? parseInt(edit.employee_id) : null,
        manager_id: edit.manager_id || null
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Eroare: ' + error.message)
    } else {
      toast.success('Utilizator actualizat')
      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, name: edit.name, role: edit.role, employee_id: edit.employee_id ? parseInt(edit.employee_id) : null, manager_id: edit.manager_id || null }
          : u
      ))
      const next = { ...edits }
      delete next[user.id]
      setEdits(next)
    }
    setSaving(null)
  }

  const handleDelete = async (user: any) => {
    if (!confirm(`Stergi contul lui ${user.name || user.email}?`)) return
    setDeleting(user.id)

    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    })

    if (!res.ok) {
      const d = await res.json()
      toast.error('Eroare: ' + d.error)
    } else {
      toast.success('Utilizator sters')
      setUsers(prev => prev.filter(u => u.id !== user.id))
    }
    setDeleting(null)
  }

  const handleCreate = async () => {
    if (!newUser.email || !newUser.password || !newUser.name) {
      toast.error('Completeaza numele, emailul si parola')
      return
    }
    setCreating(true)

    const res = await fetch('/api/users/create', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(newUser)
    })

    const d = await res.json()
    if (!res.ok) {
      toast.error('Eroare: ' + d.error)
    } else {
      toast.success('Utilizator creat')
      setShowForm(false)
      setNewUser({ name: '', email: '', password: '', role: 'employee', employee_id: '', manager_id: '' })
      await load()
    }
    setCreating(false)
  }

  const setEdit = (userId: string, field: string, value: string, user: any) => {
    setEdits(prev => ({
      ...prev,
      [userId]: {
        name: prev[userId]?.name ?? user.name ?? '',
        role: prev[userId]?.role ?? user.role,
        employee_id: prev[userId]?.employee_id ?? String(user.employee_id || ''),
        manager_id: prev[userId]?.manager_id ?? String(user.manager_id || ''),
        [field]: value
      }
    }))
  }

  if (loading) return <div className="p-8 text-slate-400">Se incarca...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestionare angajati</h1>
          <p className="text-slate-500 mt-1">Adauga, editeaza sau sterge conturi. Asigneaza manageri si roluri.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <UserPlus size={16} />
          Adauga utilizator
        </button>
      </div>

      <div className="card p-4 mb-6 bg-blue-50 border-blue-100 text-sm text-blue-800">
        <strong>Ierarhie:</strong> Un manager poate fi subordonat altui manager sau director.
        Managerul de nivel superior vede automat intreaga echipa recursiv.
        Directorul vede pe toata lumea.
      </div>

      {showForm && (
        <div className="card p-6 mb-6 bg-blue-50 border-blue-100">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Utilizator nou</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nume complet</label>
              <input type="text" placeholder="Ion Popescu" value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input type="email" placeholder="ion.popescu@krka.biz" value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })} className="input" />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Parola initiala</label>
              <div className="relative">
                <input type={showPass ? 'text' : 'password'} placeholder="minimum 6 caractere"
                  value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="input pr-10" />
                <button type="button" onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })} className="input">
                {ROLURI.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ID Angajat (din Excel)</label>
              <input type="number" placeholder="ex: 21" value={newUser.employee_id}
                onChange={e => setNewUser({ ...newUser, employee_id: e.target.value })} className="input" />
            </div>
            {ROLURI_CU_MANAGER.includes(newUser.role) && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Manager / Director direct</label>
                <select value={newUser.manager_id}
                  onChange={e => setNewUser({ ...newUser, manager_id: e.target.value })} className="input">
                  <option value="">— Fara superior —</option>
                  {getPosibiliManageri().map(m => (
                    <option key={m.id} value={m.id}>
                      {m.name} ({m.role === 'director' ? 'Director' : 'Manager'})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? 'Se creeaza...' : <><UserPlus size={15} />Creeaza cont</>}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">Anuleaza</button>
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-4 py-3 font-medium text-slate-500">Email</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Nume</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Rol</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">ID Angajat</th>
              <th className="text-left px-4 py-3 font-medium text-slate-500">Superior direct</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {users.map(user => {
              const edit = edits[user.id]
              const currentRole = edit?.role ?? user.role
              const showManagerField = ROLURI_CU_MANAGER.includes(currentRole)
              const currentManagerId = edit?.manager_id ?? String(user.manager_id || '')

              return (
                <tr key={user.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-blue-700 text-xs font-semibold shrink-0">
                        {(edit?.name || user.name)?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <span className="text-slate-500 text-xs">{user.email}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <input type="text" value={edit?.name ?? user.name ?? ''}
                      onChange={e => setEdit(user.id, 'name', e.target.value, user)}
                      className="input py-1.5 w-40" />
                  </td>
                  <td className="px-4 py-3">
                    <select value={currentRole}
                      onChange={e => setEdit(user.id, 'role', e.target.value, user)}
                      className="input py-1.5 w-36">
                      {ROLURI.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
                    </select>
                  </td>
                  <td className="px-4 py-3">
                    <input type="number" placeholder="ex: 21"
                      value={edit?.employee_id ?? String(user.employee_id || '')}
                      onChange={e => setEdit(user.id, 'employee_id', e.target.value, user)}
                      className="input py-1.5 w-24" />
                  </td>
                  <td className="px-4 py-3">
                    {showManagerField ? (
                      <select
                        value={currentManagerId}
                        onChange={e => setEdit(user.id, 'manager_id', e.target.value, user)}
                        className="input py-1.5 w-48">
                        <option value="">— Fara superior —</option>
                        {getPosibiliManageri(user.id).map(m => (
                          <option key={m.id} value={m.id}>
                            {m.name} ({m.role === 'director' ? 'Director' : 'Manager'})
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className="text-slate-300 text-xs">—</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {edit && (
                        <button onClick={() => handleSave(user)} disabled={saving === user.id}
                          className="btn-primary text-xs py-1.5">
                          {saving === user.id ? '...' : <><Save size={12} />Salveaza</>}
                        </button>
                      )}
                      <button onClick={() => handleDelete(user)} disabled={deleting === user.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all">
                        {deleting === user.id ? '...' : <Trash2 size={15} />}
                      </button>
                    </div>
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
