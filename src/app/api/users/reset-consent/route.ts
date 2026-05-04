import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { userId, all } = await req.json()
  const supabase = createAdminClient()

  if (all) {
    // Reseteaza pentru toti utilizatorii
    const { error } = await supabase
      .from('app_users')
      .update({ terms_accepted: false, terms_accepted_at: null })
      .neq('id', '00000000-0000-0000-0000-000000000000')

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  if (userId) {
    // Reseteaza pentru un singur utilizator
    const { error } = await supabase
      .from('app_users')
      .update({ terms_accepted: false, terms_accepted_at: null })
      .eq('id', userId)

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'userId sau all sunt obligatorii' }, { status: 400 })
}
