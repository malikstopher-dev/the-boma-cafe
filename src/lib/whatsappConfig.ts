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
    lat: -26.0444,
    lng: 28.0594,
  },
  openingHours: [
    { day: 'Monday', hours: '8:00 AM - 10:00 PM' },
    { day: 'Tuesday', hours: '8:00 AM - 10:00 PM' },
    { day: 'Wednesday', hours: '8:00 AM - 10:00 PM' },
    { day: 'Thursday', hours: '8:00 AM - 10:00 PM' },
    { day: 'Friday', hours: '8:00 AM - 11:00 PM' },
    { day: 'Saturday', hours: '8:00 AM - 11:00 PM' },
    { day: 'Sunday', hours: '8:00 AM - 10:00 PM' },
  ],
  social: {
    facebook: 'https://facebook.com/thebomacafe',
    instagram: 'https://instagram.com/thebomacafe',
  },
  priceRange: 'R',
  servesCuisine: 'South African, Café, Pub Food',
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
      message += ` - ${item.selectedSize}`;
    }
    message += ` - R${item.price * item.quantity}`;
    
    if (item.selectedAddOns && item.selectedAddOns.length > 0) {
      message += `\n   Add-ons: ${item.selectedAddOns.join(', ')}`;
    }
    
    if (item.quantity > 1) {
      message += ` (x${item.quantity} @ R${item.price} each)`;
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
