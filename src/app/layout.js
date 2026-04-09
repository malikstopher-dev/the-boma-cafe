import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import CartButton from "@/components/ui/CartButton";

const playfair = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  variable: "--font-body",
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
});

export const metadata = {
  title: "The Boma Cafe | Sandton - Where the Rustic Meets the Soulful",
  description: "Experience authentic rustic charm at The Boma Cafe in Sandton. A premium outdoor restaurant and events venue featuring firepits, thatched roofing, and soulful ambiance.",
  keywords: "restaurant Sandton, Boma Cafe, outdoor dining Johannesburg, events venue, rustic restaurant, firepit dining, South African cuisine",
  openGraph: {
    title: "The Boma Cafe | Sandton",
    description: "Where the Rustic Meets the Soulful - Premium dining and events in Sandton",
    type: "website",
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${playfair.variable} ${poppins.variable}`}>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link 
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700&family=Poppins:wght@300;400;500;600;700&display=swap" 
          rel="stylesheet" 
        />
        <link 
          rel="stylesheet" 
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css" 
          integrity="sha512-iecdLmaskl7CVkqkXNQ/ZH/XLlvWZOJyj7Yy7tcenmpD1ypASozpmT/E0iPtmFIB46ZmdtAc9eNBvH0H/ZpiBw==" 
          crossOrigin="anonymous" 
          referrerPolicy="no-referrer"
        />
      </head>
      <body className="min-h-screen">
        <AuthProvider>
          <CartProvider>
            {children}
            <CartButton />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}