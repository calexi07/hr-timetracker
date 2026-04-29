import * as XLSX from 'xlsx'
import { ParsedTimesheet } from '@/types'

export function parseTimesheetExcel(buffer: ArrayBuffer): {
  data: ParsedTimesheet[]
  errors: string[]
} {
  const errors: string[] = []
  const wb = XLSX.read(buffer, { type: 'array', cellDates: true })
  const ws = wb.Sheets[wb.SheetNames[0]]
  const raw = XLSX.utils.sheet_to_json(ws, { header: 1, raw: false }) as unknown[][]

  if (!raw || raw.length < 2) {
    return { data: [], errors: ['Fișierul Excel este gol sau nu are date'] }
  }

  const rows: { time: Date; personId: number; name: string; department: string }[] = []

  for (let i = 1; i < raw.length; i++) {
    const row = raw[i] as string[]
    if (!row || row.length < 4) continue

    const timeStr = row[0]
    const personId = parseInt(String(row[1]), 10)
    const name = String(row[2] || '').trim()
    const department = String(row[3] || '').trim()

    if (!timeStr || isNaN(personId) || !name) {
      errors.push(`Rândul ${i + 1}: date invalide — ignorat`)
      continue
    }

    const time = parseDateTime(timeStr)
    if (!time) {
      errors.push(`Rândul ${i + 1}: dată invalidă "${timeStr}" — ignorat`)
      continue
    }

    rows.push({ time, personId, name, department })
  }

  const grouped = new Map<string, typeof rows>()
  for (const row of rows) {
    const dateKey = toDateString(row.time)
    const key = `${row.personId}::${dateKey}`
    if (!grouped.has(key)) grouped.set(key, [])
    grouped.get(key)!.push(row)
  }

  const timesheets: ParsedTimesheet[] = []
  for (const [, dayRows] of grouped) {
    dayRows.sort((a, b) => a.time.getTime() - b.time.getTime())
    const first = dayRows[0]
    const last = dayRows[dayRows.length - 1]

    const diffMs = last.time.getTime() - first.time.getTime()
    const hours = Math.round((diffMs / 3600000) * 100) / 100

    timesheets.push({
      employee_id: first.personId,
      employee_name: normalizeName(first.name),
      department: first.department,
      date: toDateString(first.time),
      check_in: toTimeString(first.time),
      check_out: toTimeString(last.time),
      hours_worked: dayRows.length < 2 ? 0 : hours
    })
  }

  timesheets.sort((a, b) => a.date.localeCompare(b.date) || a.employee_name.localeCompare(b.employee_name))
  return { data: timesheets, errors }
}

function parseDateTime(val: string): Date | null {
  if (!val) return null
  const d = new Date(val)
  if (!isNaN(d.getTime())) return d
  const match = String(val).match(/(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2}):(\d{2})/)
  if (match) {
    return new Date(`${match[1]}-${match[2]}-${match[3]}T${match[4]}:${match[5]}:${match[6]}`)
  }
  return null
}

function toDateString(d: Date): string {
  return d.toISOString().split('T')[0]
}

function toTimeString(d: Date): string {
  return d.toTimeString().split(' ')[0]
}

function normalizeName(name: string): string {
  return name.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()).join(' ')
}
