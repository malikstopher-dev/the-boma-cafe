import QRCode from 'qrcode'

const qrCache = new Map<string, string>()

export async function generateQrDataUri(url: string): Promise<string> {
  const cached = qrCache.get(url)
  if (cached) return cached

  const dataUri = await QRCode.toDataURL(url, {
    width: 200,
    margin: 1,
    color: {
      dark: '#1A0F0A',
      light: '#FFFFFF',
    },
  })

  qrCache.set(url, dataUri)
  return dataUri
}
