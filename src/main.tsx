import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BrandProvider } from './config/BrandContext.tsx';
import './index.css';

// Silently unregister any legacy PWA service workers & clear stale precaches for returning visitors
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) => {
      registrations.forEach((registration) => {
        registration.unregister().catch(() => {});
      });
    })
    .catch(() => {});

  if ('caches' in window) {
    caches
      .keys()
      .then((cacheNames) => {
        cacheNames.forEach((name) => {
          if (name.includes('workbox') || name.includes('pwa')) {
            caches.delete(name).catch(() => {});
          }
        });
      })
      .catch(() => {});
  }
}

createRoot(document.getElementById('root')!).render(
  <BrandProvider>
    <App />
  </BrandProvider>
);
