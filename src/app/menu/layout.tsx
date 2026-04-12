import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Menu | The Boma Café - Rustic Restaurant in Paulshof, Sandton',
  description: 'Explore our delicious menu at The Boma Café in Paulshof, Sandton. From hearty breakfasts and flame-grilled steaks to cocktails and desserts. Order via WhatsApp for pickup or delivery.',
};

export default function MenuLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
