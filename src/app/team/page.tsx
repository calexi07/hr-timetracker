const loadSummaries = async (members: any[], f: string, t: string) => {
  setLoadingSummaries(true)
  const results: MemberSummary[] = []

  // Incarca zilele exceptate o singura data
  const { data: zileEx } = await supabase
    .from('zile_exceptate')
    .select('data_start, data_sfarsit')

  const zileExceptate = zileEx || []

  for (const member of members) {
    if (!member.employee_id) {
      results.push({ member, totalOre: 0, zile: 0, norma: 0, diffMin: 0 })
      continue
    }

    const normaZi = member.norma_ore ?? DEFAULT_NORMA

    const { data: tsData } = await supabase
      .from('timesheets')
      .select('date, hours_worked, motivatie_status, motivatie_tip_aprobare')
      .eq('employee_id', Number(member.employee_id))
      .gte('date', f)
      .lte('date', t)

    const { data: obsData } = await supabase
      .from('observatii_zile')
      .select('date, motivatie_status, motivatie_tip_aprobare')
      .eq('employee_id', Number(member.employee_id))
      .gte('date', f)
      .lte('date', t)

    const obsMap: Record<string, any> = {}
    for (const obs of obsData || []) {
      obsMap[obs.date] = obs
    }

    // Filtreaza weekendurile SI zilele exceptate
    const rows = (tsData || []).filter((r: any) => {
      const d = new Date(r.date)
      const dow = d.getDay()
      if (dow === 0 || dow === 6) return false
      // Verifica daca e zi exceptata
      const esteExceptata = zileExceptate.some(
        (z: any) => r.date >= z.data_start && r.date <= z.data_sfarsit
      )
      return !esteExceptata
    })

    const totalOre = rows.reduce((s: number, r: any) => {
      const obs = obsMap[r.date]
      const motivatieStatus = r.motivatie_status || obs?.motivatie_status || null
      const tipAprobare = r.motivatie_tip_aprobare || obs?.motivatie_tip_aprobare || null
      if (motivatieStatus === 'aprobat' && tipAprobare !== 'cu_recuperare') return s + normaZi
      return s + Number(r.hours_worked)
    }, 0)

    const zile = rows.length
    const norma = zile * normaZi
    const diffMin = Math.round((totalOre - norma) * 60)
    results.push({ member, totalOre, zile, norma, diffMin })
  }

  setSummaries(results)
  setLoadingSummaries(false)
}
