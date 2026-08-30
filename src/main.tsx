import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// A stale service worker / cached index.html can reference JS chunk files that no longer exist
// after a new deploy, causing dynamic imports to fail and the app to never mount (blank page).
// Vite fires this event when that happens; reload once to fetch the current build.
window.addEventListener('vite:preloadError', () => {
  if (sessionStorage.getItem('hussayni_chunk_reload_once')) return;
  sessionStorage.setItem('hussayni_chunk_reload_once', '1');
  window.location.reload();
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
