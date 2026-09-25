import {StrictMode} from 'react';
import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';

import { registerSW } from 'virtual:pwa-register';

// Register service worker automatically for PWA installation & offline functionality
registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log('محتوى جديد متوفر للتطبيق.');
  },
  onOfflineReady() {
    console.log('التطبيق جاهز للعمل دون اتصال بالإنترنت.');
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
