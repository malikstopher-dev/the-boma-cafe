import { Playfair_Display, Poppins } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth";
import { CartProvider } from "@/lib/cart";
import CartButton from "@/components/ui/CartButton";
import { BUSINESS_INFO } from "@/lib/whatsappConfig";

const localBusinessSchema = {
  "@context": "https://schema.org",
  "@type": "Restaurant",
  "name": BUSINESS_INFO.name,
  "image": "https://images.unsplash.com/photo-1550966871-3ed3cdb5ed0c?w=1200&h=600&fit=crop",
  "url": BUSINESS_INFO.website,
  "telephone": BUSINESS_INFO.phone,
  "email": BUSINESS_INFO.email,
  "address": {
    "@type": "PostalAddress",
    "streetAddress": BUSINESS_INFO.address.street,
    "addressLocality": BUSINESS_INFO.address.suburb,
    "addressRegion": BUSINESS_INFO.address.city,
    "postalCode": BUSINESS_INFO.address.postalCode,
    "addressCountry": BUSINESS_INFO.address.country
  },
  "geo": {
    "@type": "GeoCoordinates",
    "latitude": BUSINESS_INFO.coordinates.lat,
    "longitude": BUSINESS_INFO.coordinates.lng
  },
  "openingHoursSpecification": BUSINESS_INFO.openingHours.map(h => ({
    "@type": "OpeningHoursSpecification",
    "dayOfWeek": h.day,
    "opens": h.hours.split(' - ')[0],
    "closes": h.hours.split(' - ')[1]
  })),
  "servesCuisine": BUSINESS_INFO.servesCuisine,
  "priceRange": BUSINESS_INFO.priceRange,
  "menu": BUSINESS_INFO.menuUrl,
  "sameAs": [
    BUSINESS_INFO.social.facebook,
    BUSINESS_INFO.social.instagram
  ]
};

const websiteSchema = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  "name": BUSINESS_INFO.name,
  "url": BUSINESS_INFO.website,
  "potentialAction": {
    "@type": "SearchAction",
    "target": {
      "@type": "EntryPoint",
      "urlTemplate": `${BUSINESS_INFO.website}/menu?q={search_term_string}`
    },
    "query-input": "required name=search_term_string"
  }
};

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
  title: "The Boma Café | Rustic Restaurant in Paulshof, Sandton, Johannesburg",
  description: "Experience authentic rustic charm at The Boma Café in Paulshof, Sandton. A premium outdoor restaurant and events venue featuring firepits, thatched roofing, and soulful ambiance. Located at 127B Wroxham Road. Order via WhatsApp.",
  keywords: "The Boma Café, restaurant Paulshof, restaurant Sandton, outdoor dining Johannesburg, Boma Cafe, events venue Paulshof, rustic restaurant South Africa, firepit dining, Paulshof cafe, Sandton restaurant, Johannesburg restaurant",
  icons: {
    icon: '/favicon.ico',
  },
  openGraph: {
    title: "The Boma Café | Rustic Restaurant in Paulshof, Sandton",
    description: "Where the Rustic Meets the Soulful - Premium dining and events venue in Paulshof, Sandton, Johannesburg. Order via WhatsApp.",
    type: "website",
    locale: "en_ZA",
    siteName: "The Boma Café",
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
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
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