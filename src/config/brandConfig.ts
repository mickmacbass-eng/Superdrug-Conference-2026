/**
 * Central Brand & Event Configuration Engine
 * Allows any AI agent or human operator to rebrand, customize, and configure
 * the universal conference web app without touching component code.
 */

export interface BrandConfig {
  id: string;
  name: string; // e.g. "SUPERDRUG"
  subTitle: string; // e.g. "SUPPLIER CONFERENCE"
  eventName: string; // e.g. "Superdrug Supplier Conference 2026"
  tagline: string;
  date: string;
  dateShort: string;
  venue: string;
  venueAddress: string;
  delegateRoleLabel: string; // e.g. "Supplier Delegate" or "Store Manager"
  
  // Theme & Color Design Tokens
  colors: {
    primaryAccent: string; // e.g. "#E5007D" (Superdrug Pink)
    primaryAccentHover: string; // e.g. "#c4006b"
    background: string; // "#FFFFFF"
    textPrimary: string; // "#000000"
    textMuted: string; // "#6B7280"
    surfaceDark: string; // "#000000"
  };

  // Brand Icon / SVG Mark
  logo: {
    type: 'svg-star' | 'svg-custom' | 'text-only';
    symbolText?: string;
    customSvgPath?: string;
  };

  // Feature Flags
  features: {
    enableHub: boolean;
    enableRunningOrder: boolean;
    enableInteractions: boolean;
    enableFloorMap: boolean;
    enableCalendarExport: boolean;
  };
}

export const DEFAULT_BRAND_CONFIG: BrandConfig = {
  id: 'superdrug-supplier',
  name: 'SUPERDRUG',
  subTitle: 'SUPPLIER CONFERENCE',
  eventName: 'Superdrug Supplier Conference 2026',
  tagline: 'Partnering for Growth · Innovation & Retail Leadership',
  date: 'Thursday 15th October 2026',
  dateShort: '15 Oct 2026',
  venue: 'The Brewery, London',
  venueAddress: '52 Chiswell Street, London EC1Y 4SD',
  delegateRoleLabel: 'Supplier Delegate',
  colors: {
    primaryAccent: '#E5007D',
    primaryAccentHover: '#c4006b',
    background: '#FFFFFF',
    textPrimary: '#000000',
    textMuted: '#6B7280',
    surfaceDark: '#000000',
  },
  logo: {
    type: 'svg-star',
  },
  features: {
    enableHub: true,
    enableRunningOrder: true,
    enableInteractions: true,
    enableFloorMap: true,
    enableCalendarExport: true,
  },
};
