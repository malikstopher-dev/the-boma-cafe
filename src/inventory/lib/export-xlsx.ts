export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number | null | undefined
  width?: number
}

export async function exportRowsToXlsx<T>(opts: {
  filename: string
  sheetName: string
  columns: ExportColumn<T>[]
  rows: T[]
}): Promise<number> {
  const XLSX = await import('xlsx')
  const header = opts.columns.map(c => c.header)
  const body = opts.rows.map(row =>
    opts.columns.map(c => {
      const v = c.value(row)
      return v === null || v === undefined ? '' : v
    }),
  )
  const ws = XLSX.utils.aoa_to_sheet([header, ...body])
  ws['!cols'] = opts.columns.map(c => ({ wch: c.width ?? 18 }))
  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, ws, opts.sheetName.slice(0, 31))
  if (typeof window !== 'undefined') {
    XLSX.writeFile(wb, opts.filename)
  } else {
    const fs = await import('fs')
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })
    fs.writeFileSync(opts.filename, buf)
  }
  return opts.rows.length
}