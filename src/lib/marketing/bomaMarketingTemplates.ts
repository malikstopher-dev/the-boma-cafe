/**
 * THE BOMA CAFÉ - MARKETING GENERATOR TEMPLATE DEFINITIONS
 * 
 * Lead UI/UX & Design System Architect
 * 
 * Derived from Brand Kit:
 * - Colors: #E31B23 (Red), #FF5500 (Orange), #FFCC00 (Yellow), #0A0A0A (Dark), #FFFFFF (White)
 * - Typography: Script Accent, Bold Sans-Serif (Headers), Clean Sans-Serif (Body)
 */

export type BomaAssetType = 
  | "Flyer" 
  | "SocialMediaPost" 
  | "PosterLarge" 
  | "GiftVoucher" 
  | "LoyaltyCard" 
  | "TableTent" 
  | "EventPoster" 
  | "QRCodeStand";

export type BomaElementType = 'text' | 'image_placeholder' | 'logo' | 'shape' | 'qr_code';

export interface Position {
  x: number; // Percentage from top-left (0-100)
  y: number; // Percentage from top-left (0-100)
  width?: number; // Percentage of canvas width
  height?: number; // Percentage of canvas height
  rotation?: number; // Degrees
  zIndex: number;
}

export interface TextStyle {
  fontFamily: 'BomaScript' | 'BomaHeaderBold' | 'BomaBody' | 'BomaBodyItalic';
  fontSize: number; // Reference size (will scale with canvas)
  color: string; // Hex code
  textAlign: 'left' | 'center' | 'right';
  textTransform?: 'uppercase' | 'none';
  lineHeight?: number;
}

export interface BomaElement {
  id: string;
  type: BomaElementType;
  position: Position;
  content?: string; // Text content or asset key
  style?: TextStyle | Record<string, any>; // style specific to type
}

export interface BomaTemplate {
  id: string;
  name: string;
  type: BomaAssetType;
  canvasSize: {
    width: number; // px
    height: number; // px
    aspectRatio: string;
  };
  backgroundStyle: {
    baseColor: string;
    overlayImage?: string; // e.g., 'wood_texture', 'flame_gradient'
    gradientType?: 'split_red_dark' | 'bottom_fade' | 'none';
  };
  elements: BomaElement[];
}

// System Constant for Contact Block
const BOMA_CONTACT_BLOCK_TEXT = "CONTACT: 071 592 1190 | info@thebomacafe.co.za | 127 Wroxham Road, Paulshof, Sandton";

export const BOMA_TEMPLATES: BomaTemplate[] = [
  // 1. Flyer Generator (A4 Print Layout)
  {
    id: "boma_flyer_a4_001",
    name: "Breakfast Buffet Flyer (Standard A4)",
    type: "Flyer",
    canvasSize: { width: 2480, height: 3508, aspectRatio: "1:1.414" },
    backgroundStyle: {
      baseColor: "#0A0A0A",
      gradientType: "split_red_dark", // Top curve red, bottom dark
    },
    elements: [
      {
        id: "main_header_script",
        type: "text",
        position: { x: 50, y: 12, zIndex: 10 },
        content: "Breakfast",
        style: { fontFamily: 'BomaScript', fontSize: 180, color: '#FFCC00', textAlign: 'center' }
      },
      {
        id: "subheader_buffet",
        type: "text",
        position: { x: 50, y: 18, zIndex: 11 },
        content: "BUFFET",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 70, color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase' }
      },
      {
        id: "food_photo_frame",
        type: "image_placeholder",
        position: { x: 50, y: 50, width: 85, height: 40, zIndex: 5 },
        style: { borderRadius: '50px', border: '15px solid #FFCC00', objectFit: 'cover' }
      },
      {
        id: "price_tag_kids",
        type: "shape",
        position: { x: 15, y: 65, width: 20, zIndex: 15, rotation: -10 },
        style: { shapeType: 'scallop_circle', fillColor: '#E31B23' }
      },
      {
        id: "price_text_kids",
        type: "text",
        position: { x: 15, y: 65, zIndex: 16, rotation: -10 },
        content: "KIDS U10\nR45",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 45, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.1 }
      },
      {
        id: "price_tag_adults",
        type: "shape",
        position: { x: 85, y: 65, width: 20, zIndex: 15, rotation: 10 },
        style: { shapeType: 'scallop_circle', fillColor: '#FFCC00' }
      },
      {
        id: "price_text_adults",
        type: "text",
        position: { x: 85, y: 65, zIndex: 16, rotation: 10 },
        content: "ADULTS\nR89",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 45, color: '#0A0A0A', textAlign: 'center', lineHeight: 1.1 }
      },
      {
        id: "tagline_script",
        type: "text",
        position: { x: 70, y: 80, zIndex: 10 },
        content: "Outdoor Dining\nAt Its Best",
        style: { fontFamily: 'BomaScript', fontSize: 100, color: '#FFFFFF', textAlign: 'center' }
      },
      {
        id: "main_logo",
        type: "logo",
        position: { x: 25, y: 92, width: 35, zIndex: 20 }
      },
      {
        id: "contact_block",
        type: "text",
        position: { x: 75, y: 92, width: 45, zIndex: 20 },
        content: BOMA_CONTACT_BLOCK_TEXT,
        style: { fontFamily: 'BomaBody', fontSize: 28, color: '#0A0A0A', textAlign: 'left' }
      }
    ]
  },

  // 2. Social Media Post (1080x1080 Square)
  {
    id: "boma_social_sq_001",
    name: "Square Promotion (Instagram/FB)",
    type: "SocialMediaPost",
    canvasSize: { width: 1080, height: 1080, aspectRatio: "1:1" },
    backgroundStyle: {
      baseColor: "#0A0A0A",
      gradientType: "none",
      overlayImage: 'wood_texture_dark'
    },
    elements: [
      {
        id: "main_logo_top",
        type: "logo",
        position: { x: 50, y: 15, width: 40, zIndex: 20 }
      },
      {
        id: "event_title_script",
        type: "text",
        position: { x: 50, y: 40, zIndex: 10 },
        content: "Live Music Weekends",
        style: { fontFamily: 'BomaScript', fontSize: 80, color: '#FFCC00', textAlign: 'center' }
      },
      {
        id: "food_photo_central",
        type: "image_placeholder",
        position: { x: 50, y: 65, width: 90, height: 40, zIndex: 5 },
        style: { borderRadius: '12px', objectFit: 'cover' }
      },
      {
        id: "cta_text",
        type: "text",
        position: { x: 50, y: 90, zIndex: 10 },
        content: "BOOK YOUR TABLE NOW",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 36, color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase', backgroundColor: '#E31B23', padding: '10px 20px' }
      }
    ]
  },

  // 3. Poster Generator (Large Format A2)
  {
    id: "boma_poster_a2_001",
    name: "Large Format A2 Roadside Poster",
    type: "PosterLarge",
    canvasSize: { width: 4961, height: 7016, aspectRatio: "1:1.414" },
    backgroundStyle: {
      baseColor: "#0A0A0A",
      gradientType: "split_red_dark",
    },
    elements: [
      {
        id: "main_headline",
        type: "text",
        position: { x: 50, y: 15, zIndex: 10 },
        content: "WE ARE OPEN",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 400, color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase' }
      },
      {
        id: "rustic_divider",
        type: "shape",
        position: { x: 50, y: 25, width: 80, height: 2, zIndex: 5 },
        style: { shapeType: 'rect', fillColor: '#FFCC00' }
      },
      {
        id: "featured_image",
        type: "image_placeholder",
        position: { x: 50, y: 55, width: 100, height: 50, zIndex: 1 },
        style: { objectFit: 'cover' }
      },
      {
        id: "main_logo_bottom",
        type: "logo",
        position: { x: 50, y: 90, width: 60, zIndex: 20 }
      },
      {
        id: "address_large",
        type: "text",
        position: { x: 50, y: 96, zIndex: 20 },
        content: "127 Wroxham Road, Paulshof",
        style: { fontFamily: 'BomaBody', fontSize: 90, color: '#FFFFFF', textAlign: 'center' }
      }
    ]
  },

  // 4. Gift Voucher (Landscape Card 3:1)
  {
    id: "boma_voucher_3x1_001",
    name: "Gift Voucher Standard (Landscape)",
    type: "GiftVoucher",
    canvasSize: { width: 1800, height: 600, aspectRatio: "3:1" },
    backgroundStyle: {
      baseColor: "#FFFFFF",
      overlayImage: 'wood_texture_light_fade'
    },
    elements: [
      {
        id: "border_flame_pattern",
        type: "shape",
        position: { x: 0, y: 0, width: 100, height: 100, zIndex: 1 },
        style: { shapeType: 'border_pattern', assetKey: 'flame_border_red', opacity: 0.1 }
      },
      {
        id: "voucher_header",
        type: "text",
        position: { x: 10, y: 20, zIndex: 10 },
        content: "Gift Voucher",
        style: { fontFamily: 'BomaScript', fontSize: 72, color: '#E31B23', textAlign: 'left' }
      },
      {
        id: "logo_right",
        type: "logo",
        position: { x: 85, y: 25, width: 20, zIndex: 10 }
      },
      {
        id: "value_display",
        type: "shape",
        position: { x: 50, y: 50, width: 25, height: 50, zIndex: 5 },
        style: { shapeType: 'scallop_circle', fillColor: '#FFCC00' }
      },
      {
        id: "value_text",
        type: "text",
        position: { x: 50, y: 50, zIndex: 6 },
        content: "R500",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 100, color: '#0A0A0A', textAlign: 'center' }
      },
      {
        id: "to_from_lines",
        type: "text",
        position: { x: 10, y: 80, zIndex: 10 },
        content: "To: ____________________  From: ____________________",
        style: { fontFamily: 'BomaBody', fontSize: 24, color: '#0A0A0A', textAlign: 'left' }
      }
    ]
  },

  // 5. Loyalty Card (Business Card Size)
  {
    id: "boma_loyalty_bc_001",
    name: "Loyalty Card (Coffee/Meal)",
    type: "LoyaltyCard",
    canvasSize: { width: 1050, height: 600, aspectRatio: "3.5:2" },
    backgroundStyle: { baseColor: "#0A0A0A" },
    elements: [
      {
        id: "logo_loyalty",
        type: "logo",
        position: { x: 20, y: 25, width: 25, zIndex: 10 }
      },
      {
        id: "loyalty_title",
        type: "text",
        position: { x: 55, y: 25, zIndex: 10 },
        content: "Boma Buddy Rewards",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 42, color: '#FFFFFF', textAlign: 'left' }
      },
      {
        id: "loyalty_grid",
        type: "shape",
        position: { x: 50, y: 65, width: 90, height: 50, zIndex: 5 },
        style: { shapeType: 'grid_circles', rows: 2, cols: 5, strokeColor: '#FFCC00', strokeWidth: 3 }
      },
      {
        id: "stamp_10_flame",
        type: "shape",
        position: { x: 88, y: 77, width: 8, zIndex: 6 },
        style: { shapeType: 'icon', assetKey: 'boma_flame_icon', fillColor: '#FF5500' }
      },
      {
        id: "loyalty_instruction",
        type: "text",
        position: { x: 50, y: 92, zIndex: 10 },
        content: "Buy 9 Meals, Get the 10th FREE!",
        style: { fontFamily: 'BomaBodyItalic', fontSize: 20, color: '#FFCC00', textAlign: 'center' }
      }
    ]
  },

  // 6. Table Tent (Vertical Tabletop Display)
  {
    id: "boma_tabletent_vert_001",
    name: "Table Tent (Vertical Special)",
    type: "TableTent",
    canvasSize: { width: 1240, height: 1748, aspectRatio: "1:1.41" },
    backgroundStyle: {
      baseColor: "#FFFFFF",
      overlayImage: 'wood_texture_light'
    },
    elements: [
      {
        id: "top_flame_header",
        type: "shape",
        position: { x: 50, y: 10, width: 100, height: 20, zIndex: 1 },
        style: { shapeType: 'rect_gradient', colorStart: '#E31B23', colorEnd: '#FF5500', rotation: 180 }
      },
      {
        id: "special_title",
        type: "text",
        position: { x: 50, y: 10, zIndex: 10 },
        content: "Today's Special",
        style: { fontFamily: 'BomaScript', fontSize: 90, color: '#FFFFFF', textAlign: 'center' }
      },
      {
        id: "food_photo_square",
        type: "image_placeholder",
        position: { x: 50, y: 40, width: 80, height: 35, zIndex: 5 },
        style: { borderRadius: '8px', objectFit: 'cover' }
      },
      {
        id: "item_name",
        type: "text",
        position: { x: 50, y: 65, zIndex: 10 },
        content: "Boma Braai Platter",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 56, color: '#0A0A0A', textAlign: 'center' }
      },
      {
        id: "item_description",
        type: "text",
        position: { x: 50, y: 75, width: 80, zIndex: 10 },
        content: "Sirloin, Boerewors, Chops, Pap & Sheba",
        style: { fontFamily: 'BomaBody', fontSize: 32, color: '#0A0A0A', textAlign: 'center', lineHeight: 1.3 }
      },
      {
        id: "price_scallop_table",
        type: "shape",
        position: { x: 80, y: 60, width: 15, zIndex: 15 },
        style: { shapeType: 'scallop_circle', fillColor: '#E31B23' }
      },
      {
        id: "price_text_table",
        type: "text",
        position: { x: 80, y: 60, zIndex: 16 },
        content: "R185",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 36, color: '#FFFFFF', textAlign: 'center' }
      },
      {
        id: "logo_bottom_center",
        type: "logo",
        position: { x: 50, y: 92, width: 30, zIndex: 20 }
      }
    ]
  },

  // 7. Event Poster (Tall Portrait 4:5)
  {
    id: "boma_event_4x5_001",
    name: "Event Poster (Social/Print Portrait)",
    type: "EventPoster",
    canvasSize: { width: 1080, height: 1350, aspectRatio: "4:5" },
    backgroundStyle: {
      baseColor: "#0A0A0A",
      gradientType: "bottom_fade",
      overlayImage: 'event_background_placeholder'
    },
    elements: [
      {
        id: "event_date_badge",
        type: "shape",
        position: { x: 15, y: 10, width: 15, zIndex: 15 },
        style: { shapeType: 'rect', fillColor: '#E31B23', borderRadius: '5px' }
      },
      {
        id: "event_date_text",
        type: "text",
        position: { x: 15, y: 10, zIndex: 16 },
        content: "OCT\n26",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 36, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.1 }
      },
      {
        id: "event_headline",
        type: "text",
        position: { x: 50, y: 50, width: 90, zIndex: 10 },
        content: "Potjiekos\nCompetition",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 110, color: '#FFCC00', textAlign: 'center', textTransform: 'uppercase', lineHeight: 0.9 }
      },
      {
        id: "event_time",
        type: "text",
        position: { x: 50, y: 65, zIndex: 10 },
        content: "STARTS 11:00 AM",
        style: { fontFamily: 'BomaBody', fontSize: 32, color: '#FFFFFF', textAlign: 'center', textTransform: 'uppercase' }
      },
      {
        id: "qr_code_register",
        type: "qr_code",
        position: { x: 50, y: 80, width: 20, zIndex: 20 },
        style: { foregroundColor: '#FFFFFF', backgroundColor: 'transparent' }
      },
      {
        id: "qr_label",
        type: "text",
        position: { x: 50, y: 90, zIndex: 20 },
        content: "Scan to Register Team",
        style: { fontFamily: 'BomaBody', fontSize: 24, color: '#FFFFFF', textAlign: 'center' }
      },
      {
        id: "logo_corner",
        type: "logo",
        position: { x: 90, y: 92, width: 15, zIndex: 20 }
      }
    ]
  },

  // 8. QR Code Stand (Tabletop QR Acrylic Display)
  {
    id: "boma_qr_stand_001",
    name: "Acrylic Table QR (Review/Menu)",
    type: "QRCodeStand",
    canvasSize: { width: 800, height: 1200, aspectRatio: "1:1.5" },
    backgroundStyle: {
      baseColor: "#0A0A0A",
    },
    elements: [
      {
        id: "flame_graphic_top",
        type: "shape",
        position: { x: 50, y: 15, width: 40, height: 25, zIndex: 5 },
        style: { shapeType: 'icon', assetKey: 'boma_flame_large', fillColor: '#FF5500' }
      },
      {
        id: "instruction_header",
        type: "text",
        position: { x: 50, y: 35, width: 80, zIndex: 10 },
        content: "View Our\nDigital Menu",
        style: { fontFamily: 'BomaHeaderBold', fontSize: 64, color: '#FFFFFF', textAlign: 'center', lineHeight: 1.1 }
      },
      {
        id: "rustic_divider_yellow",
        type: "shape",
        position: { x: 50, y: 45, width: 30, height: 1, zIndex: 5 },
        style: { shapeType: 'rect', fillColor: '#FFCC00' }
      },
      {
        id: "main_qr_code",
        type: "qr_code",
        position: { x: 50, y: 65, width: 55, zIndex: 20 },
        style: { foregroundColor: '#0A0A0A', backgroundColor: '#FFFFFF', padding: 20, borderRadius: '15px' }
      },
      {
        id: "logo_bottom_small",
        type: "logo",
        position: { x: 50, y: 90, width: 30, zIndex: 20 }
      },
      {
        id: "wifi_info",
        type: "text",
        position: { x: 50, y: 96, zIndex: 10 },
        content: "FREE WIFI: BomaCafe | Pass: GreatService",
        style: { fontFamily: 'BomaBody', fontSize: 20, color: '#FFCC00', textAlign: 'center' }
      }
    ]
  }
];