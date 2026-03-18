import React, { useState, useEffect } from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import PublicApp from './PublicApp';
import reportWebVitals from './reportWebVitals';

// Componente wrapper para manejar el routing correctamente
const RootWithRouting = () => {
  const [isPublic, setIsPublic] = useState(false);
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    // Verificar ruta actual
    const checkRoute = () => {
      const hash = window.location.hash || '';
      const pathname = window.location.pathname || '';
      
      const publicRoute = 
        hash.includes('public-dashboard') || 
        hash.includes('public-bet') ||
        pathname === '/public' || 
        pathname.startsWith('/public/');
      
      setIsPublic(publicRoute);
      setChecked(true);
    };

    // Verificar inmediatamente
    checkRoute();

    // Escuchar cambios de hash
    window.addEventListener('hashchange', checkRoute);
    return () => window.removeEventListener('hashchange', checkRoute);
  }, []);

  // Mostrar loading mientras verifica
  if (!checked) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold">Cargando...</p>
        </div>
      </div>
    );
  }

  return isPublic ? <PublicApp /> : <App />;
};

// 🎯 Renderizar la aplicación con routing correcto
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <RootWithRouting />
  </React.StrictMode>
);

reportWebVitals();