'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import toast from 'react-hot-toast'
import { Save, Trash2, UserPlus, X, Eye, EyeOff } from 'lucide-react'

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [edits, setEdits] = useState<Record<string, { role: string; employee_id: string; name: string }>>({})
  const [showForm, setShowForm] = useState(false)
  const [showPass, setShowPass] = useState(false)
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '', role: 'employee', employee_id: '' })
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

  const handleSave = async (user: any) => {
    const edit = edits[user.id]
    if (!edit) return
    setSaving(user.id)

    const { error } = await supabase
      .from('app_users')
      .update({
        name: edit.name,
        role: edit.role,
        employee_id: edit.employee_id ? parseInt(edit.employee_id) : null
      })
      .eq('id', user.id)

    if (error) {
      toast.error('Eroare: ' + error.message)
    } else {
      toast.success('Angajat actualizat')
      setUsers(prev => prev.map(u =>
        u.id === user.id
          ? { ...u, name: edit.name, role: edit.role, employee_id: edit.employee_id ? parseInt(edit.employee_id) : null }
          : u
      ))
      const next = { ...edits }
      delete next[user.id]
      setEdits(next)
    }
    setSaving(null)
  }

  const handleDelete = async (user: any) => {
    if (!confirm(`Stergi contul lui ${user.name || user.email}? Aceasta actiune este ireversibila.`)) return
    setDeleting(user.id)

    const res = await fetch('/api/users/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: user.id })
    })

    if (!res.ok) {
      const d = await res.json()
      toast.error('Eroare la stergere: ' + d.error)
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
      toast.success('Utilizator creat cu succes')
      setShowForm(false)
      setNewUser({ name: '', email: '', password: '', role: 'employee', employee_id: '' })
      await load()
    }
    setCreating(false)
  }

  if (loading) return <div className="p-8 text-slate-400">Se incarca...</div>

  return (
    <div className="p-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Gestionare angajati</h1>
          <p className="text-slate-500 mt-1">Adauga, editeaza sau sterge conturi de utilizatori.</p>
        </div>
        <button onClick={() => setShowForm(!showForm)} className="btn-primary">
          <UserPlus size={16} />
          Adauga utilizator
        </button>
      </div>

      {/* Formular de creare */}
      {showForm && (
        <div className="card p-6 mb-6 border-blue-100 bg-blue-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Utilizator nou</h2>
            <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600">
              <X size={18} />
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Nume complet</label>
              <input
                type="text"
                placeholder="Ion Popescu"
                value={newUser.name}
                onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Email</label>
              <input
                type="email"
                placeholder="ion.popescu@krka.biz"
                value={newUser.email}
                onChange={e => setNewUser({ ...newUser, email: e.target.value })}
                className="input"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Parola initiala</label>
              <div className="relative">
                <input
                  type={showPass ? 'text' : 'password'}
                  placeholder="minimum 6 caractere"
                  value={newUser.password}
                  onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                  className="input pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Rol</label>
              <select
                value={newUser.role}
                onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                className="input"
              >
                <option value="employee">Angajat</option>
                <option value="admin">Administrator</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">ID Angajat (din Excel)</label>
              <input
                type="number"
                placeholder="ex: 21"
                value={newUser.employee_id}
                onChange={e => setNewUser({ ...newUser, employee_id: e.target.value })}
                className="input"
              />
            </div>
          </div>
          <div className="mt-4 flex gap-3">
            <button onClick={handleCreate} disabled={creating} className="btn-primary">
              {creating ? 'Se creeaza...' : <><UserPlus size={15} />Creeaza cont</>}
            </button>
            <button onClick={() => setShowForm(false)} className="btn-secondary">
              Anuleaza
            </button>
          </div>
        </div>
      )}

      {/* Tabel utilizatori */}
      <div className="card overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50">
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Angajat</th>
              <th className="text-left px-5 py-3.5 font-medium text-slate-500">Nume</th>
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
                        {(edit?.name || user.name)?.charAt(0)?.toUpperCase() || user.email?.charAt(0)?.toUpperCase() || '?'}
                      </div>
                      <p className="text-slate-400 text-xs">{user.email}</p>
                    </div>
                  </td>
                  <td className="px-5 py-3.5">
                    <input
                      type="text"
                      placeholder="Nume complet"
                      value={edit?.name ?? user.name ?? ''}
                      onChange={e => setEdits(prev => ({
                        ...prev,
                        [user.id]: {
                          name: e.target.value,
                          role: prev[user.id]?.role ?? user.role,
                          employee_id: prev[user.id]?.employee_id ?? String(user.employee_id || '')
                        }
                      }))}
                      className="input py-1.5 w-48"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <select
                      value={edit?.role ?? user.role}
                      onChange={e => setEdits(prev => ({
                        ...prev,
                        [user.id]: {
                          name: prev[user.id]?.name ?? user.name ?? '',
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
                          name: prev[user.id]?.name ?? user.name ?? '',
                          role: prev[user.id]?.role ?? user.role,
                          employee_id: e.target.value
                        }
                      }))}
                      className="input py-1.5 w-28"
                    />
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2 justify-end">
                      {edit && (
                        <button
                          onClick={() => handleSave(user)}
                          disabled={saving === user.id}
                          className="btn-primary text-xs py-1.5"
                        >
                          {saving === user.id ? 'Se salveaza...' : <><Save size={12} />Salveaza</>}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(user)}
                        disabled={deleting === user.id}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-all"
                        title="Sterge utilizator"
                      >
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
