import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PublicApp from './PublicApp';
import reportWebVitals from './reportWebVitals';

// 🔍 Detectar si es ruta pública (versión robusta)
const isPublicRoute = () => {
  // Esperar un tick para asegurar que el hash está disponible
  const hash = window.location.hash || '';
  const pathname = window.location.pathname || '';
  
  console.log('🔍 Route Detection:', { hash, pathname });
  
  // Verificar hash para dashboard público
  if (hash.includes('public-dashboard') || hash.includes('public-bet')) {
    console.log('✅ Public Route Detected');
    return true;
  }
  
  // Verificar path (por si usas /public en el futuro)
  if (pathname === '/public' || pathname.startsWith('/public/')) {
    console.log('✅ Public Path Detected');
    return true;
  }
  
  console.log('❌ Private Route (Login)');
  return false;
};

// 🎯 Renderizar la aplicación correspondiente
const root = ReactDOM.createRoot(document.getElementById('root'));

// Renderizar inmediatamente con la detección actual
root.render(
  <React.StrictMode>
    {isPublicRoute() ? <PublicApp /> : <App />}
  </React.StrictMode>
);

reportWebVitals();