import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery | The Boma Café · Photos of Food, Venue & Events',
  description: 'Explore our gallery featuring photos of delicious food, our rustic venue, live events, and memorable moments at The Boma Café in Paulshof, Sandton.',
  alternates: {
    canonical: 'https://www.thebomacafe.co.za/gallery',
  },
  openGraph: {
    title: 'Gallery | The Boma Café',
    description: 'Explore our gallery featuring photos of delicious food, our rustic venue, and live events.',
    url: 'https://www.thebomacafe.co.za/gallery',
    siteName: 'The Boma Café',
  },
};

export default function GalleryLayout({ children }: { children: React.ReactNode }) {
  return children;
}