import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const { name, email, password, role, employee_id } = await req.json()

  if (!email || !password || !name) {
    return NextResponse.json({ error: 'Completeaza toate campurile obligatorii' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Creeaza userul in Supabase Auth
  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true
  })

  if (authError) {
    return NextResponse.json({ error: authError.message }, { status: 400 })
  }

  // Upsert in app_users
  const { error: dbError } = await supabase
    .from('app_users')
    .upsert({
      id: authData.user.id,
      email,
      name,
      role,
      employee_id: employee_id ? parseInt(employee_id) : null
    })

  if (dbError) {
    return NextResponse.json({ error: dbError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
