import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { parseTimesheetExcel } from '@/lib/excel-parser'

export async function POST(req: NextRequest) {
  const supabase = createAdminClient()

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'Niciun fisier' }, { status: 400 })

  if (!file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
    return NextResponse.json({ error: 'Doar fisiere .xlsx sunt acceptate' }, { status: 400 })
  }

  const buffer = await file.arrayBuffer()
  const { data: timesheets, errors } = parseTimesheetExcel(buffer)

  if (timesheets.length === 0) {
    return NextResponse.json({ error: 'Nu s-au gasit date valide', errors }, { status: 422 })
  }

  const BATCH = 100
  for (let i = 0; i < timesheets.length; i += BATCH) {
    const batch = timesheets.slice(i, i + BATCH)
    const { error } = await supabase
      .from('timesheets')
      .upsert(batch, { onConflict: 'employee_id,date', ignoreDuplicates: false })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  await supabase.from('upload_logs').insert({
    filename: file.name,
    records_inserted: timesheets.length,
    status: 'success'
  })

  return NextResponse.json({
    success: true,
    processed: timesheets.length,
    errors: errors.length > 0 ? errors : undefined
  })
}
