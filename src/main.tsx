import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { BrandProvider } from './config/BrandContext.tsx';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <BrandProvider>
    <App />
  </BrandProvider>
);
