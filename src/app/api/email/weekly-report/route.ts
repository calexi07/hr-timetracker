import { NextResponse } from 'next/server'
import { Resend } from 'resend'
import { createClient } from '@supabase/supabase-js'

const resend = new Resend(process.env.RESEND_API_KEY)

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const secret = searchParams.get('secret')
    if (secret !== process.env.CRON_SECRET) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: manageri } = await supabase
      .from('app_users')
      .select('id, name, email, role')
      .in('role', ['manager', 'director'])

    if (!manageri || manageri.length === 0) {
      return NextResponse.json({ message: 'No managers found' })
    }

    const results = []

    for (const manager of manageri) {
      const { data: notificari } = await supabase
        .from('notificari')
        .select('*')
        .eq('destinatar_id', manager.id)
        .eq('rezolvata', false)
        .order('created_at', { ascending: false })

      if (!notificari || notificari.length === 0) continue

      const peAngajat: Record<string, { name: string; count: number }> = {}
      for (const n of notificari) {
        if (!peAngajat[n.angajat_id]) {
          peAngajat[n.angajat_id] = { name: n.angajat_name, count: 0 }
        }
        peAngajat[n.angajat_id].count++
      }

      const listaAngajati = Object.values(peAngajat)
      const totalMotivatie = notificari.length
      const firstName = manager.name?.split(' ')[0] || manager.name

      const listaRO = listaAngajati.map(a =>
        `<li style="margin-bottom:8px;"><strong>${a.name}</strong> — ${a.count} motivatie${a.count > 1 ? 'i' : ''} in asteptare</li>`
      ).join('')

      const listaEN = listaAngajati.map(a =>
        `<li style="margin-bottom:8px;"><strong>${a.name}</strong> — ${a.count} pending justification${a.count > 1 ? 's' : ''}</li>`
      ).join('')

      const htmlEmail = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background:white;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
          
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#1e3a8a,#3b82f6);padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <p style="margin:0;color:#bfdbfe;font-size:13px;font-weight:500;letter-spacing:1px;text-transform:uppercase;">Pontaj HR · Krka Romania</p>
                    <h1 style="margin:8px 0 0;color:white;font-size:24px;font-weight:700;">Raport Saptamanal</h1>
                    <p style="margin:8px 0 0;color:#bfdbfe;font-size:13px;">Pentru: ${manager.name}</p>
                  </td>
                  <td align="right">
                    <div style="background:rgba(255,255,255,0.15);border-radius:12px;padding:12px 16px;text-align:center;">
                      <p style="margin:0;color:white;font-size:28px;font-weight:800;">${totalMotivatie}</p>
                      <p style="margin:4px 0 0;color:#bfdbfe;font-size:11px;">in asteptare</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Sectiunea Romana -->
          <tr>
            <td style="padding:32px 40px 16px;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">🇷🇴 Română</p>
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;font-weight:600;">Buna ziua, ${firstName}!</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                Ai <strong style="color:#1e3a8a;">${totalMotivatie} motivatie${totalMotivatie > 1 ? 'i' : ''}</strong> in asteptare de la membrii echipei tale.
                Te rugam sa le analizezi si sa le aprobi sau respingi cat mai curand prin accesarea platformei Pontaj HR.
              </p>
              
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;">Angajati cu motivatii in asteptare:</p>
                <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                  ${listaRO}
                </ul>
              </div>
            </td>
          </tr>

          <!-- Delimitator -->
          <tr>
            <td style="padding:16px 40px;">
              <hr style="border:none;border-top:2px dashed #e2e8f0;margin:0;">
            </td>
          </tr>

          <!-- Sectiunea Engleza -->
          <tr>
            <td style="padding:0 40px 32px;">
              <p style="margin:0 0 4px;color:#6b7280;font-size:12px;font-weight:600;letter-spacing:1px;text-transform:uppercase;">🇬🇧 English</p>
              <h2 style="margin:0 0 16px;color:#0f172a;font-size:18px;font-weight:600;">Good morning, ${firstName}!</h2>
              <p style="margin:0 0 16px;color:#475569;font-size:15px;line-height:1.6;">
                You have <strong style="color:#1e3a8a;">${totalMotivatie} pending justification${totalMotivatie > 1 ? 's' : ''}</strong> from your team members.
                Please review and approve or reject them as soon as possible by accessing the Pontaj HR platform.
              </p>
              
              <div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:12px;padding:20px;">
                <p style="margin:0 0 12px;color:#374151;font-size:14px;font-weight:600;">Team members with pending justifications:</p>
                <ul style="margin:0;padding-left:20px;color:#475569;font-size:14px;line-height:1.8;">
                  ${listaEN}
                </ul>
              </div>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background:#f8fafc;padding:20px 40px;border-top:1px solid #e2e8f0;">
              <p style="margin:0;color:#94a3b8;font-size:12px;text-align:center;">
                Pontaj HR · Krka Romania · Trimis automat in fiecare luni la 10:00<br>
                Acest email este generat automat. Nu raspunde la acest mesaj.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `

      const { error: emailError } = await resend.emails.send({
        from: 'Pontaj HR <onboarding@resend.dev>',
        to: ['cristianstefan.alexiu@gmail.com'], // TEST — schimba cu manager.email dupa verificarea domeniului
        subject: `📋 [${manager.name}] ${totalMotivatie} motivatie${totalMotivatie > 1 ? 'i' : ''} in asteptare — Raport Saptamanal`,
        html: htmlEmail,
      })

      if (emailError) {
        results.push({ manager: manager.email, error: emailError.message })
      } else {
        results.push({ manager: manager.email, sent: true, motivatii: totalMotivatie })
      }
    }

    return NextResponse.json({ success: true, results })

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
