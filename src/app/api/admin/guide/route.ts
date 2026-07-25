import { NextResponse } from 'next/server'
import { renderToBuffer } from '@react-pdf/renderer'
import { AdminGuidePDF } from '@/lib/pdf/AdminGuidePDF'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const pdfBuffer = await renderToBuffer(<AdminGuidePDF />)

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="The-Boma-Cafe-Administrator-Guide-v1.0.pdf"',
        'Content-Length': pdfBuffer.length.toString(),
        'Cache-Control': 'public, max-age=3600',
      },
    })
  } catch (err) {
    console.error('Admin guide PDF generation failed:', err)
    return NextResponse.json({ error: 'Failed to generate guide' }, { status: 500 })
  }
}
