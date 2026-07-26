import { NextRequest, NextResponse } from 'next/server'
import { getAdminClient } from '@/lib/supabase'
import { downloadPdfBuffer } from '@/lib/pdf/storage'

export const dynamic = 'force-dynamic'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const client = await getAdminClient()
    const { id: quoteId } = await params

    const { data: quote, error: quoteError } = await client
      .from('quotes')
      .select('storage_path, pdf_path, quote_number')
      .eq('id', quoteId)
      .single()

    if (quoteError || !quote) {
      return NextResponse.json({ error: 'Quote not found' }, { status: 404 })
    }

    const filePath = quote.storage_path || quote.pdf_path
    if (!filePath) {
      return NextResponse.json({ error: 'No PDF generated for this quote' }, { status: 404 })
    }

    const pdfBuffer = await downloadPdfBuffer(filePath)
    if (!pdfBuffer) {
      return NextResponse.json({ error: 'PDF file not found in storage' }, { status: 404 })
    }

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${quote.quote_number}.pdf"`,
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Download PDF error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
