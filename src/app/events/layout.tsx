import { ReactNode } from 'react';
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Events at The Boma Café | Live Music, Buffet & Venue Hire in Sandton',
  description: 'Discover upcoming events, live music nights, weekend buffet experiences, celebrations, and venue hire highlights at The Boma Café in Paulshof, Sandton.',
  alternates: {
    canonical: 'https://www.thebomacafe.co.za/events',
  },
  openGraph: {
    title: 'Events at The Boma Café | Live Music & Buffet in Sandton',
    description: 'Discover upcoming events, live music nights, weekend buffet experiences, and venue hire at The Boma Café in Paulshof, Sandton.',
    url: 'https://www.thebomacafe.co.za/events',
    siteName: 'The Boma Café',
  },
  twitter: {
    title: 'Events at The Boma Café | Live Music & Buffet in Sandton',
    description: 'Discover upcoming events and venue hire at The Boma Café.',
  },
};

export default function EventsLayout({ children }: { children: ReactNode }) {
  return children;
}