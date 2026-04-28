import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Contact & Reservations | The Boma Café · Paulshof, Sandton',
  description: 'Book a table or enquire about events at The Boma Café. 127 Wroxham Rd, Paulshof, Sandton. Call 072 996 2212.',
  alternates: {
    canonical: 'https://www.thebomacafe.co.za/contact',
  },
  openGraph: {
    title: 'Contact & Reservations | The Boma Café',
    description: 'Book a table or enquire about events at The Boma Café.',
    url: 'https://www.thebomacafe.co.za/contact',
    siteName: 'The Boma Café',
  },
  twitter: {
    title: 'Contact & Reservations | The Boma Café',
    description: 'Book a table at The Boma Café.',
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return children;
}