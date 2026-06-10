import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

type GuardResult =
  | { ok: true; userId: string; role: string }
  | { ok: false; response: NextResponse }

/**
 * Verifica sesiunea utilizatorului curent si rolul acestuia.
 * Folosit pentru a proteja rutele API care utilizeaza service-role key.
 */
export async function requireRole(allowedRoles: string[]): Promise<GuardResult> {
  const supabase = createClient()

  const { data: { user }, error } = await supabase.auth.getUser()
  if (error || !user) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Neautentificat' }, { status: 401 }),
    }
  }

  const { data: appUser } = await supabase
    .from('app_users')
    .select('id, role')
    .eq('id', user.id)
    .single()

  if (!appUser || !allowedRoles.includes(appUser.role)) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acces interzis' }, { status: 403 }),
    }
  }

  return { ok: true, userId: appUser.id, role: appUser.role }
}

export const requireAdmin = () => requireRole(['admin'])
