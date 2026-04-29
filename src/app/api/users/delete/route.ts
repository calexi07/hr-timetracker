import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId } = await req.json()

  if (!userId) {
    return NextResponse.json({ error: 'userId lipsa' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Sterge din app_users
  await supabase.from('app_users').delete().eq('id', userId)

  // Sterge din Supabase Auth
  const { error } = await supabase.auth.admin.deleteUser(userId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
