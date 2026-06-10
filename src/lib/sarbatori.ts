/**
 * Sarbatori legale in Romania + calcul zile lucratoare.
 * Sarbatorile mobile (Pastele ortodox si Rusaliile) sunt calculate automat.
 */

/** Pastele ortodox (duminica) pentru un an dat — algoritm Meeus iulian, convertit la calendar gregorian (+13 zile, valabil 1900–2099). */
function pasteOrtodox(an: number): Date {
  const a = an % 4
  const b = an % 7
  const c = an % 19
  const d = (19 * c + 15) % 30
  const e = (2 * a + 4 * b - d + 34) % 7
  const luna = Math.floor((d + e + 114) / 31) // luna iuliana
  const zi = ((d + e + 114) % 31) + 1 // zi iuliana
  // conversie la gregorian: +13 zile
  return new Date(Date.UTC(an, luna - 1, zi + 13))
}

function dataPlus(d: Date, zile: number): Date {
  const r = new Date(d)
  r.setUTCDate(r.getUTCDate() + zile)
  return r
}

function cheie(d: Date): string {
  return d.toISOString().slice(0, 10)
}

const cache: Record<number, Set<string>> = {}

/** Set cu toate sarbatorile legale (format 'yyyy-MM-dd') pentru un an. */
export function sarbatoriLegale(an: number): Set<string> {
  if (cache[an]) return cache[an]

  const fixe = [
    `${an}-01-01`, // Anul Nou
    `${an}-01-02`, // a doua zi de Anul Nou
    `${an}-01-06`, // Boboteaza
    `${an}-01-07`, // Sf. Ioan Botezatorul
    `${an}-01-24`, // Unirea Principatelor
    `${an}-05-01`, // Ziua Muncii
    `${an}-06-01`, // Ziua Copilului
    `${an}-08-15`, // Adormirea Maicii Domnului
    `${an}-11-30`, // Sf. Andrei
    `${an}-12-01`, // Ziua Nationala
    `${an}-12-25`, // Craciunul
    `${an}-12-26`, // a doua zi de Craciun
  ]

  const paste = pasteOrtodox(an)
  const mobile = [
    cheie(dataPlus(paste, -2)), // Vinerea Mare
    cheie(paste),               // Pastele
    cheie(dataPlus(paste, 1)),  // a doua zi de Paste
    cheie(dataPlus(paste, 49)), // Rusaliile
    cheie(dataPlus(paste, 50)), // a doua zi de Rusalii
  ]

  cache[an] = new Set([...fixe, ...mobile])
  return cache[an]
}

export function esteSarbatoare(data: Date): boolean {
  return sarbatoriLegale(data.getFullYear()).has(
    `${data.getFullYear()}-${String(data.getMonth() + 1).padStart(2, '0')}-${String(data.getDate()).padStart(2, '0')}`
  )
}

/** Numarul de zile lucratoare intre doua date (inclusiv), excluzand weekendurile si sarbatorile legale. */
export function zileLucratoare(start: string, end: string): number {
  if (!start || !end) return 0
  const s = new Date(start + 'T00:00:00')
  const e = new Date(end + 'T00:00:00')
  if (e < s) return 0

  let count = 0
  const cursor = new Date(s)
  while (cursor <= e) {
    const ziSapt = cursor.getDay()
    if (ziSapt !== 0 && ziSapt !== 6 && !esteSarbatoare(cursor)) count++
    cursor.setDate(cursor.getDate() + 1)
  }
  return count
}
