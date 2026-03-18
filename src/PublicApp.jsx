import React, { useState, useEffect } from 'react';
import { db } from './services/firebase';
import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { getCurrentDate, shouldCloseMatch } from './services/matchService';
import PublicDashboard from './components/PublicDashboard';
import PublicBetForm from './components/PublicBetForm';

const PublicApp = () => {
  const [currentView, setCurrentView] = useState('public-dashboard');
  const [loading, setLoading] = useState(true);

  // Determinar vista inicial basada en el hash
  useEffect(() => {
    const hash = window.location.hash;
    if (hash.includes('public-bet')) {
      setCurrentView('public-bet');
    } else {
      setCurrentView('public-dashboard');
    }
    setLoading(false);
  }, []);

  // Listener para cambios de hash en tiempo real
  useEffect(() => {
    const handleHashChange = () => {
      const hash = window.location.hash;
      if (hash.includes('public-bet')) {
        setCurrentView('public-bet');
      } else {
        setCurrentView('public-dashboard');
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold">Cargando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900">
      {currentView === 'public-dashboard' && <PublicDashboard />}
      {currentView === 'public-bet' && <PublicBetForm />}
    </div>
  );
};

export default PublicApp;