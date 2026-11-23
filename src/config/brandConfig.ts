/**
 * Central Brand & Event Configuration Engine
 * Allows any AI agent or human operator to rebrand, customize, and configure
 * the universal conference PWA without touching component code.
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
    enableMyPass: boolean;
    enableFloorMap: boolean;
    enableCalendarExport: boolean;
    enablePWAInstall: boolean;
    enableStagePrompter: boolean;
  };
}

export const BRAND_PRESETS: Record<string, BrandConfig> = {
  'superdrug-supplier': {
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
      enableMyPass: true,
      enableFloorMap: true,
      enableCalendarExport: true,
      enablePWAInstall: true,
      enableStagePrompter: true,
    },
  },
  'superdrug-annual': {
    id: 'superdrug-annual',
    name: 'SUPERDRUG',
    subTitle: 'ANNUAL CONFERENCE',
    eventName: 'Superdrug Annual Conference 2026',
    tagline: 'The Future of Health & Beauty · Store Excellence',
    date: '19th - 20th October 2026',
    dateShort: '19-20 Oct 2026',
    venue: 'Manchester Central',
    venueAddress: 'Windmill St, Manchester M2 3GX',
    delegateRoleLabel: 'Store Colleague / Manager',
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
      enableMyPass: true,
      enableFloorMap: true,
      enableCalendarExport: true,
      enablePWAInstall: true,
      enableStagePrompter: true,
    },
  },
  'boots-conference': {
    id: 'boots-conference',
    name: 'BOOTS',
    subTitle: 'SUPPLIER SUMMIT',
    eventName: 'Boots Commercial Summit 2026',
    tagline: 'Championing Health & Beauty Across Every Community',
    date: 'Wednesday 18th November 2026',
    dateShort: '18 Nov 2026',
    venue: 'ICC Birmingham',
    venueAddress: 'Broad St, Birmingham B1 2EA',
    delegateRoleLabel: 'Brand Account Executive',
    colors: {
      primaryAccent: '#004B87',
      primaryAccentHover: '#003866',
      background: '#FFFFFF',
      textPrimary: '#000000',
      textMuted: '#6B7280',
      surfaceDark: '#001D38',
    },
    logo: {
      type: 'svg-custom',
      symbolText: 'B',
      customSvgPath: 'M6 4h7a5 5 0 0 1 0 10H6zm0 10h8a5 5 0 0 1 0 10H6z',
    },
    features: {
      enableHub: true,
      enableRunningOrder: true,
      enableInteractions: true,
      enableMyPass: true,
      enableFloorMap: true,
      enableCalendarExport: true,
      enablePWAInstall: true,
      enableStagePrompter: true,
    },
  },
  'sephora-summit': {
    id: 'sephora-summit',
    name: 'SEPHORA',
    subTitle: 'BRAND PARTNER FORUM',
    eventName: 'Sephora Global Brand Forum 2026',
    tagline: 'The Infinite Canvas of Beauty & Prestige',
    date: 'Tuesday 24th November 2026',
    dateShort: '24 Nov 2026',
    venue: 'ExCeL London',
    venueAddress: 'Royal Victoria Dock, 1 Western Gateway, London',
    delegateRoleLabel: 'Prestige Brand Partner',
    colors: {
      primaryAccent: '#000000',
      primaryAccentHover: '#262626',
      background: '#FFFFFF',
      textPrimary: '#000000',
      textMuted: '#737373',
      surfaceDark: '#000000',
    },
    logo: {
      type: 'text-only',
      symbolText: 'S',
    },
    features: {
      enableHub: true,
      enableRunningOrder: true,
      enableInteractions: true,
      enableMyPass: true,
      enableFloorMap: true,
      enableCalendarExport: true,
      enablePWAInstall: true,
      enableStagePrompter: true,
    },
  },
};

export const DEFAULT_BRAND_CONFIG: BrandConfig = BRAND_PRESETS['superdrug-supplier'];
