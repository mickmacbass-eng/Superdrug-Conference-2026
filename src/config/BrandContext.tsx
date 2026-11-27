import React, { createContext, useContext, useState, useEffect } from 'react';
import { BrandConfig, DEFAULT_BRAND_CONFIG } from './brandConfig';

interface BrandContextType {
  config: BrandConfig;
  updateConfig: (newConfig: Partial<BrandConfig>) => void;
  resetToDefault: () => void;
}

const BrandContext = createContext<BrandContextType | undefined>(undefined);

export const BrandProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [config, setConfig] = useState<BrandConfig>(() => {
    // Local storage persistence (merged with defaults so new feature flags always resolve cleanly)
    try {
      const saved = localStorage.getItem('conference_brand_config');
      if (saved) {
        const parsed = JSON.parse(saved) as Partial<BrandConfig>;
        return {
          ...DEFAULT_BRAND_CONFIG,
          ...parsed,
          colors: {
            ...DEFAULT_BRAND_CONFIG.colors,
            ...(parsed.colors || {}),
          },
          logo: {
            ...DEFAULT_BRAND_CONFIG.logo,
            ...(parsed.logo || {}),
          },
          features: {
            ...DEFAULT_BRAND_CONFIG.features,
            ...(parsed.features
              ? Object.fromEntries(
                  Object.entries(parsed.features).filter(([key]) => key in DEFAULT_BRAND_CONFIG.features)
                )
              : {}),
          },
        };
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

  const resetToDefault = () => {
    setConfig(DEFAULT_BRAND_CONFIG);
    try {
      localStorage.removeItem('conference_brand_config');
    } catch {
      // ignore
    }
  };

  return (
    <BrandContext.Provider
      value={{
        config,
        updateConfig,
        resetToDefault,
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
