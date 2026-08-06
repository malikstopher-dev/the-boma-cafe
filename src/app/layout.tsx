import "./globals.css";
import "@/components/pos/pos-tokens.css";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { Playfair_Display, Poppins } from "next/font/google";
import { AuthProvider } from "@/lib/auth-context";
import { CartProvider } from "@/lib/cart";
import { BookingProvider } from "@/lib/booking";
import CartButton from "@/components/ui/CartButton";
import ScrollToTopButton from "@/components/ui/ScrollToTopButton";
import { BUSINESS_INFO } from "@/lib/whatsappConfig";
import MobileBottomBar from "@/components/ui/MobileBottomBar";
import ScrollArrows from "@/components/ui/ScrollArrows";
import { getAllSettings } from "@/lib/cms-supabase";

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "600", "700"],
  variable: "--font-display",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-body",
});

const getSettings = cache(async () => {
  try {
    return await getAllSettings();
  } catch {
    return {};
  }
});

export async function generateMetadata() {
  const settings = await getSettings();
  const seo = settings.seo || {};
  const branding = settings.branding || {};
  const siteName = branding.siteName || BUSINESS_INFO.name;
  const url = BUSINESS_INFO.website;

  return {
    title: seo.homepageTitle || `${siteName} | Rustic Open-Air Restaurant in Paulshof, Sandton`,
    description: seo.homepageDescription || "Escape the city at The Boma Café — Sandton's hidden rustic gem. Breakfast, lunch & dinner under a thatched roof with firepits, kids play area, and live entertainment. 127 Wroxham Rd, Paulshof.",
    keywords: seo.homepageKeywords || "The Boma Café, restaurant Paulshof, restaurant Sandton, outdoor dining Johannesburg, Boma Cafe, events venue Paulshof, rustic restaurant South Africa, firepit dining, Paulshof cafe, Sandton restaurant, Johannesburg restaurant",
    icons: {
      icon: '/favicon.ico',
    },
    openGraph: {
      type: "website",
      locale: "en_ZA",
      url,
      siteName,
      title: seo.homepageTitle || `${siteName} | Rustic Restaurant in Paulshof, Sandton`,
      description: seo.homepageDescription || "Open-air rustic dining, wood-fired pizza, braai platters, kids play area & live entertainment. Sandton's best kept secret.",
      images: [
        {
          url: seo.ogImage || `${url}/assets/images/og-hero.jpg`,
          width: 1200,
          height: 630,
          alt: `${siteName} - Rustic Open-Air Restaurant`,
        }
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: seo.homepageTitle || `${siteName} | Paulshof, Sandton`,
      description: seo.homepageDescription || "Rustic open-air dining in the heart of Sandton.",
      images: [seo.ogImage || `${url}/assets/images/og-hero.jpg`],
    },
    alternates: {
      canonical: url,
    },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();
  const branding = settings.branding || {};
  const contact = settings.contact || {};

  const name = branding.siteName || BUSINESS_INFO.name;
  const website = BUSINESS_INFO.website;
  const social = {
    facebook: branding.facebook || BUSINESS_INFO.social.facebook,
    instagram: branding.instagram || BUSINESS_INFO.social.instagram,
  };

  const localBusinessSchema = {
    "@context": "https://schema.org",
    "@type": "Restaurant",
    name,
    url: website,
    telephone: contact.phone || BUSINESS_INFO.phone,
    email: contact.email || BUSINESS_INFO.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: BUSINESS_INFO.address.street,
      addressLocality: BUSINESS_INFO.address.suburb,
      addressRegion: BUSINESS_INFO.address.city,
      postalCode: BUSINESS_INFO.address.postalCode,
      addressCountry: 'South Africa',
    },
    geo: {
      "@type": "GeoCoordinates",
      latitude: BUSINESS_INFO.coordinates.lat,
      longitude: BUSINESS_INFO.coordinates.lng,
    },
    openingHours: "Mo-Su 08:00-23:59",
    servesCuisine: BUSINESS_INFO.servesCuisine,
    priceRange: BUSINESS_INFO.priceRange,
    hasMap: "https://maps.google.com/?q=127+Wroxham+Road+Paulshof+Sandton",
    sameAs: [
      social.facebook,
      social.instagram,
    ],
    amenityFeature: [
      {"@type":"LocationFeatureSpecification","name":"Kids Play Area","value":true},
      {"@type":"LocationFeatureSpecification","name":"Outdoor Seating","value":true},
      {"@type":"LocationFeatureSpecification","name":"Firepits","value":true},
      {"@type":"LocationFeatureSpecification","name":"Live Entertainment","value":true},
    ],
  };

  const websiteSchema = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url: website,
    author: {
      "@type": "Person",
      name: "Stopher Malik",
    },
    creator: {
      "@type": "Organization",
      name: "SMK Web Design",
      url: "https://stopher-malik.co.za",
    },
    potentialAction: {
      "@type": "SearchAction",
      target: {
        "@type": "EntryPoint",
        urlTemplate: `${website}/menu?q={search_term_string}`,
      },
      "query-input": "required name=search_term_string",
    },
  };

  return (
    <html lang="en">
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1a0f0a" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="Boma POS" />
        <link rel="apple-touch-icon" href="/icons/icon.svg" />
        <meta name="mobile-web-app-capable" content="yes" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(localBusinessSchema) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteSchema) }}
        />
        <script
          type="text/javascript"
          dangerouslySetInnerHTML={{
            __html: `
              (function(c,l,a,r,i,t,y){
                c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "xid2ylu7y2");
            `,
          }}
        />
      </head>
      <body className={`min-h-screen ${playfair.variable} ${poppins.variable}`}>
        <AuthProvider>
          <CartProvider>
            <BookingProvider>
              {children}
              <ScrollToTopButton />
              <ScrollArrows />
              <CartButton />
              <MobileBottomBar />
            </BookingProvider>
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
