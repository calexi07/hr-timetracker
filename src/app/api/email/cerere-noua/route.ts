import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

async function sendEmail(to: string, subject: string, html: string) {
  const response = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Pontaj HR <no-reply@itassetflow.app>',
      to: [to],
      subject,
      html,
    }),
  })
  if (!response.ok) {
    const error = await response.json()
    throw new Error(JSON.stringify(error))
  }
}

export async function POST(req: NextRequest) {
  // Doar utilizatori autentificati
  const supabaseUser = createClient()
  const { data: { user } } = await supabaseUser.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Neautentificat' }, { status: 401 })
  }

  const { cerereId } = await req.json()
  if (!cerereId) {
    return NextResponse.json({ error: 'cerereId lipsa' }, { status: 400 })
  }

  const supabase = createAdminClient()

  // Cererea trebuie sa apartina utilizatorului curent (previne spoofing)
  const { data: cerere } = await supabase
    .from('cereri_concediu')
    .select('*, angajat:angajat_id(id, name, email, manager_id)')
    .eq('id', cerereId)
    .eq('angajat_id', user.id)
    .single()

  if (!cerere) {
    return NextResponse.json({ error: 'Cerere inexistenta' }, { status: 404 })
  }

  const managerId = cerere.angajat?.manager_id
  if (!managerId) {
    return NextResponse.json({ success: true, skipped: 'fara manager' })
  }

  const { data: manager } = await supabase
    .from('app_users')
    .select('email, name')
    .eq('id', managerId)
    .single()

  if (!manager?.email) {
    return NextResponse.json({ success: true, skipped: 'manager fara email' })
  }

  const isMedical = cerere.tip === 'medical'
  const subject = isMedical
    ? `Concediu medical inregistrat — ${cerere.angajat.name}`
    : `Cerere noua de concediu — ${cerere.angajat.name}`

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || ''
  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#1e293b">
      <h2 style="color:#1d4ed8">${isMedical ? 'Concediu medical inregistrat' : 'Cerere noua de concediu'}</h2>
      <p>Buna, ${manager.name},</p>
      <p><strong>${cerere.angajat.name}</strong> a ${isMedical ? 'inregistrat un concediu medical (aprobat automat)' : 'depus o cerere de concediu de odihna care asteapta decizia ta'}.</p>
      <table style="border-collapse:collapse;width:100%;font-size:14px">
        <tr><td style="padding:6px 0;color:#64748b">Perioada:</td><td><strong>${cerere.data_start} — ${cerere.data_sfarsit}</strong></td></tr>
        <tr><td style="padding:6px 0;color:#64748b">Zile lucratoare:</td><td><strong>${cerere.zile_lucratoare}</strong></td></tr>
        ${cerere.motiv ? `<tr><td style="padding:6px 0;color:#64748b">Motiv:</td><td>${cerere.motiv}</td></tr>` : ''}
      </table>
      ${appUrl ? `<p style="margin-top:20px"><a href="${appUrl}/concedii" style="background:#1d4ed8;color:#fff;padding:10px 18px;border-radius:8px;text-decoration:none">Vezi cererea</a></p>` : ''}
      <p style="color:#94a3b8;font-size:12px;margin-top:24px">Email automat — Pontaj HR</p>
    </div>
  `

  try {
    await sendEmail(manager.email, subject, html)
  } catch (e: any) {
    // Nu blocam fluxul daca emailul esueaza
    return NextResponse.json({ success: false, error: e.message }, { status: 502 })
  }

  return NextResponse.json({ success: true })
}
