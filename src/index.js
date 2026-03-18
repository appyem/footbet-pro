import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PublicApp from './PublicApp';
import reportWebVitals from './reportWebVitals';

// 🔍 Detectar si es ruta pública
const isPublicRoute = () => {
  const hash = window.location.hash;
  const pathname = window.location.pathname;
  
  // Verificar hash para dashboard público
  if (hash.includes('public-dashboard') || hash.includes('public-bet')) {
    return true;
  }
  
  // Verificar path (por si usas /public en el futuro)
  if (pathname === '/public' || pathname.startsWith('/public/')) {
    return true;
  }
  
  return false;
};

// 🎯 Renderizar la aplicación correspondiente
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    {isPublicRoute() ? <PublicApp /> : <App />}
  </React.StrictMode>
);

reportWebVitals();