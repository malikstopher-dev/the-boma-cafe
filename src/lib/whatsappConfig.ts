export const WHATSAPP_CONFIG = {
  phoneNumber: '27715921190',
  businessName: 'The Boma Café',
  defaultMessage: 'Hello! I would like to place an order.',
};

export const BUSINESS_INFO = {
  name: 'The Boma Café',
  address: {
    street: '127B Wroxham Road',
    suburb: 'Paulshof',
    city: 'Sandton',
    postalCode: '2191',
    country: 'South Africa',
    full: '127B Wroxham Road, Paulshof, Sandton, 2191, South Africa',
  },
  phone: '+27 71 592 1190',
  phoneRaw: '27715921190',
  email: 'info@thebomacafe.co.za',
  website: 'https://thebomacafe.co.za',
  coordinates: {
    lat: -26.035,
    lng: 28.059,
  },
  openingHours: [
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
  },
  priceRange: 'R50–R250',
  servesCuisine: ['South African', 'Wood-Fired Pizza', 'Braai', 'Burgers', 'Curries'],
  menuUrl: 'https://thebomacafe.co.za/menu',
};

export function formatWhatsAppUrl(message: string): string {
  const encodedMessage = encodeURIComponent(message);
  return `https://wa.me/${WHATSAPP_CONFIG.phoneNumber}?text=${encodedMessage}`;
}

export function generateOrderMessage(
  items: Array<{
    name: string;
    price: number;
    quantity: number;
    selectedSize?: string;
    selectedAddOns?: string[];
    spiceLevel?: string;
    basting?: string;
    starch?: string;
    dietaryFlags?: string[];
    notes?: string;
  }>,
  total: number,
  customerInfo?: {
    name?: string;
    phone?: string;
    orderType?: 'Pickup' | 'Delivery';
    requestedTime?: string;
    address?: string;
    notes?: string;
  }
): string {
  let message = `Hello ${BUSINESS_INFO.name}, I would like to place an order:\n\n`;

  items.forEach((item, index) => {
    message += `${index + 1}. ${item.name}`;
    if (item.selectedSize) {
      message += ` (${item.selectedSize})`;
    }
    message += ` × ${item.quantity} — R${item.price * item.quantity}`;
    
    const customizations: string[] = [];
    if (item.spiceLevel && item.spiceLevel !== 'none') {
      customizations.push(`Spice: ${item.spiceLevel}`);
    }
    if (item.basting && item.basting !== 'none') {
      customizations.push(`Basting: ${item.basting}`);
    }
    if (item.starch && item.starch !== 'none') {
      customizations.push(`Starch: ${item.starch}`);
    }
    if (item.selectedAddOns && item.selectedAddOns.length > 0) {
      customizations.push(`+ ${item.selectedAddOns.join(', ')}`);
    }
    if (item.dietaryFlags && item.dietaryFlags.length > 0) {
      customizations.push(`Dietary: ${item.dietaryFlags.join(', ')}`);
    }
    
    if (customizations.length > 0) {
      message += `\n   ${customizations.join(' · ')}`;
    }
    
    if (item.notes) {
      message += `\n   Note: ${item.notes}`;
    }
    
    message += '\n';
  });

  message += `\n📋 Order Total: R${total}\n`;

  if (customerInfo) {
    message += '\n---\n';
    message += '📝 Order Details:\n';
    
    if (customerInfo.name) {
      message += `• Name: ${customerInfo.name}\n`;
    }
    if (customerInfo.phone) {
      message += `• Phone: ${customerInfo.phone}\n`;
    }
    if (customerInfo.orderType) {
      message += `• ${customerInfo.orderType === 'Delivery' ? '🚚 Delivery' : '🏪 Pickup'}: ${customerInfo.orderType}\n`;
    }
    if (customerInfo.requestedTime) {
      message += `• Requested Time: ${customerInfo.requestedTime}\n`;
    }
    if (customerInfo.address && customerInfo.orderType === 'Delivery') {
      message += `• Delivery Address: ${customerInfo.address}\n`;
    }
    if (customerInfo.notes) {
      message += `• Notes: ${customerInfo.notes}\n`;
    }
    message += '---\n';
  }

  message += `\nPlease confirm availability. Thank you! 🙏`;

  return message;
}
