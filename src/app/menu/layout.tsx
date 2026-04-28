import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Our Menu | The Boma Café · Paulshof, Sandton',
  description: 'Browse the full Boma Café menu — breakfast, burgers, wood-fired pizza, braai platters, curries & more. Customise and order via WhatsApp.',
  alternates: {
    canonical: 'https://www.thebomacafe.co.za/menu',
  },
  openGraph: {
    title: 'Our Menu | The Boma Café',
    description: 'Browse the full Boma Café menu — breakfast, burgers, wood-fired pizza, braai platters, curries & more.',
    url: 'https://www.thebomacafe.co.za/menu',
    siteName: 'The Boma Café',
  },
  twitter: {
    title: 'Our Menu | The Boma Café',
    description: 'Browse the full Boma Café menu.',
  },
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
