export const businessInfo = {
  name: 'The Boma Café',
  phone: '+27 71 592 1190',
  phoneRaw: '27715921190',
  email: 'info@thebomacafe.co.za',
  website: 'https://www.thebomacafe.co.za',
  address: {
    street: '127B Wroxham Road',
    suburb: 'Paulshof',
    city: 'Sandton',
    postalCode: '2191',
    country: 'South Africa',
    full: '127B Wroxham Road, Paulshof, Sandton, 2191, South Africa',
  },
  coordinates: {
    lat: -26.035,
    lng: 28.059,
  },
  openingHours: 'Mon-Sun 10:00 - 22:00',
  openingHoursArray: [
    { day: 'Monday', hours: '10:00 - 22:00' },
    { day: 'Tuesday', hours: '10:00 - 22:00' },
    { day: 'Wednesday', hours: '10:00 - 22:00' },
    { day: 'Thursday', hours: '10:00 - 22:00' },
    { day: 'Friday', hours: '10:00 - 22:00' },
    { day: 'Saturday', hours: '10:00 - 22:00' },
    { day: 'Sunday', hours: '10:00 - 22:00' },
  ],
  social: {
    facebook: 'https://www.facebook.com/thebomacafe/',
    instagram: 'https://www.instagram.com/the_boma_cafe/',
    tiktok: 'https://www.tiktok.com/@thebomacafe',
    youtube: '',
  },
  priceRange: 'R50–R250',
  servesCuisine: ['South African', 'Wood-Fired Pizza', 'Braai', 'Burgers', 'Curries'],
  menuUrl: 'https://www.thebomacafe.co.za/menu',
};

export const reservationMessage = `Hi The Boma Café, I would like to book a table.
Name:
Date:
Time:
Number of guests:
Special request:`;

export const eventEnquiryMessage = `Hi The Boma Café, I would like to enquire about venue hire/private event booking.
Event type:
Date:
Number of guests:
Contact name:`;

export function formatWhatsAppLink(message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${businessInfo.phoneRaw}?text=${encodedMessage}`;
}

export function getReservationLink(): string {
  return formatWhatsAppLink(reservationMessage);
}

export function getEventEnquiryLink(): string {
  return formatWhatsAppLink(eventEnquiryMessage);
}