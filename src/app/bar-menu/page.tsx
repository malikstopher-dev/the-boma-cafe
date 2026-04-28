import { Metadata } from 'next';
import BarMenuClient from './BarMenuClient';

export const metadata: Metadata = {
  title: 'Bar Menu | Cocktails & Drinks at The Boma Café Sandton',
  description: 'Explore The Boma Café bar menu with signature cocktails, classic cocktails, non-alcoholic drinks, beers, wines, and refreshing beverages in Paulshof, Sandton.',
};

export default function BarMenuPage() {
  return <BarMenuClient />;
}