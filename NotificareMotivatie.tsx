import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, password, email } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId este obligatoriu' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const updates: { password?: string; email?: string } = {}

  if (password) {
    if (password.length < 6) {
      return NextResponse.json({ error: 'Parola trebuie sa aiba minimum 6 caractere' }, { status: 400 })
    }
    updates.password = password
  }

  if (email) {
    updates.email = email
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: 'Nimic de actualizat' }, { status: 400 })
  }

  const { error } = await supabase.auth.admin.updateUserById(userId, updates)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Daca s-a schimbat emailul, actualizeaza si in app_users
  if (email) {
    await supabase.from('app_users').update({ email }).eq('id', userId)
  }

  return NextResponse.json({ success: true })
}
