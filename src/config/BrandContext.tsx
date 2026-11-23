import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandConfig, BRAND_PRESETS, DEFAULT_BRAND_CONFIG } from './brandConfig';

interface BrandContextType {
  config: BrandConfig;
  updateConfig: (newConfig: Partial<BrandConfig>) => void;
  setPreset: (presetId: string) => void;
  resetToDefault: () => void;
  presets: Record<string, BrandConfig>;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<BrandConfig>(() => {
    // 1. URL Parameter Brand Resolution (e.g. ?brand=boots, ?brand=sephora, ?client=superdrug)
    if (typeof window !== 'undefined') {
      try {
        const params = new URLSearchParams(window.location.search);
        const urlBrand = params.get('brand') || params.get('client');
        if (urlBrand) {
          const directMatch = BRAND_PRESETS[urlBrand];
          if (directMatch) return directMatch;
          
          const partialKey = Object.keys(BRAND_PRESETS).find((k) =>
            k.toLowerCase().includes(urlBrand.toLowerCase())
          );
          if (partialKey && BRAND_PRESETS[partialKey]) {
            return BRAND_PRESETS[partialKey];
          }
        }
      } catch {
        // fallback
      }
    }

    // 2. Local storage persistence
    try {
      const saved = localStorage.getItem('conference_brand_config');
      if (saved) {
        return JSON.parse(saved);
      }
    } catch {
      // fallback
    }
    return DEFAULT_BRAND_CONFIG;
  });

  // Apply CSS custom properties dynamically to document root
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--brand-pink', config.colors.primaryAccent);
    root.style.setProperty('--brand-accent-hover', config.colors.primaryAccentHover);
    root.style.setProperty('--brand-surface-dark', config.colors.surfaceDark);
    
    // Save to localStorage
    try {
      localStorage.setItem('conference_brand_config', JSON.stringify(config));
    } catch {
      // ignore
    }
  }, [config]);

  const updateConfig = (partial: Partial<BrandConfig>) => {
    setConfig((prev) => ({
      ...prev,
      ...partial,
      colors: {
        ...prev.colors,
        ...(partial.colors || {}),
      },
      features: {
        ...prev.features,
        ...(partial.features || {}),
      },
    }));
  };

  const setPreset = (presetId: string) => {
    const preset = BRAND_PRESETS[presetId];
    if (preset) {
      setConfig(preset);
    }
  };

  const resetToDefault = () => {
    setConfig(DEFAULT_BRAND_CONFIG);
    localStorage.removeItem('conference_brand_config');
  };

  return (
    <BrandContext.Provider
      value={{
        config,
        updateConfig,
        setPreset,
        resetToDefault,
        presets: BRAND_PRESETS,
      }}
    >
      {children}
    </BrandContext.Provider>
  );
};

export const useBrand = () => {
  const context = useContext(BrandContext);
  if (!context) {
    throw new Error('useBrand must be used within a BrandProvider');
  }
  return context;
};
