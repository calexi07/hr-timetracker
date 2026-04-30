import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, password } = await req.json()

  if (!userId || !password) {
    return NextResponse.json({ error: 'userId si parola sunt obligatorii' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'Parola trebuie sa aiba minimum 6 caractere' }, { status: 400 })
  }

  const supabase = createAdminClient()

  const { error } = await supabase.auth.admin.updateUserById(userId, { password })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
