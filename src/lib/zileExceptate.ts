import { createClient } from '@/lib/supabase/client'

let cachedZile: { data_start: string; data_sfarsit: string }[] | null = null
let cacheTime = 0
const CACHE_TTL = 5 * 60 * 1000 // 5 minute

export async function getZileExceptate(): Promise<{ data_start: string; data_sfarsit: string }[]> {
  const now = Date.now()
  if (cachedZile && now - cacheTime < CACHE_TTL) return cachedZile

  const supabase = createClient()
  const { data } = await supabase
    .from('zile_exceptate')
    .select('data_start, data_sfarsit')

  cachedZile = data || []
  cacheTime = now
  return cachedZile
}

export function esteZiExceptata(
  date: string,
  zileExceptate: { data_start: string; data_sfarsit: string }[]
): boolean {
  return zileExceptate.some(z => date >= z.data_start && date <= z.data_sfarsit)
}

export function filtreazaZileExceptate<T extends { date: string }>(
  rows: T[],
  zileExceptate: { data_start: string; data_sfarsit: string }[]
): T[] {
  return rows.filter(r => !esteZiExceptata(r.date, zileExceptate))
}
