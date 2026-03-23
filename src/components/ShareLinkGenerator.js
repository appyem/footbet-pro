import React, { useState } from 'react';
import { Share2, X, Copy, CheckCircle, Phone } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

// Generar código corto único (6 caracteres alfanuméricos)
const generateShortCode = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
};

const ShareLinkGenerator = ({ matches, currentUser }) => {
  const [selectedMatches, setSelectedMatches] = useState([]);
  const [generatedLink, setGeneratedLink] = useState('');
  const [showLinkModal, setShowLinkModal] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [generating, setGenerating] = useState(false);

  const toggleMatchSelection = (matchId) => {
    setSelectedMatches(prev => {
      if (prev.includes(matchId)) {
        return prev.filter(id => id !== matchId);
      } else {
        return [...prev, matchId];
      }
    });
  };

  const generateShareLink = async () => {
    if (selectedMatches.length === 0) {
      alert('Por favor selecciona al menos un partido');
      return;
    }

    setGenerating(true);
    try {
      // 1. Generar código corto único
      const code = generateShortCode();
      
      // 2. Guardar configuración en Firestore
      await addDoc(collection(db, 'public_bets'), {
        code,
        sellerId: currentUser.id,
        matchIds: selectedMatches,
        createdAt: serverTimestamp(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 horas
      });
      
      // 3. Generar enlace corto
      const baseUrl = window.location.origin;
      const link = `${baseUrl}/#/public-bet?code=${code}`;
      
      setGeneratedLink(link);
      setShowLinkModal(true);
    } catch (err) {
      console.error('Error generando enlace:', err);
      alert('Error al generar el enlace. Inténtalo nuevamente.');
    } finally {
      setGenerating(false);
    }
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(generatedLink);
    setLinkCopied(true);
    setTimeout(() => setLinkCopied(false), 3000);
  };

  const sendToWhatsApp = () => {
    const message = `¡Hola! Te invito a jugar en La Jugada 7. Haz clic en este enlace para seleccionar tusJugadas:\n${generatedLink}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
  };

  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6">
      <h2 className="text-white text-xl font-bold mb-4">Generar Enlace para Clientes</h2>
      <p className="text-gray-400 mb-4">Selecciona los partidos que quieres incluir en el enlace para que tus clientes puedan apostar.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6 max-h-96 overflow-y-auto">
        {matches.map(match => (
          <div 
            key={match.id} 
            className={`bg-gray-700 rounded-lg p-3 cursor-pointer border transition-all ${
              selectedMatches.includes(match.id) 
                ? 'border-green-500 bg-gray-600' 
                : 'border-gray-600 hover:border-gray-500'
            }`}
            onClick={() => toggleMatchSelection(match.id)}
          >
            <div className="flex justify-between items-center mb-2">
              <span className="text-green-400 text-xs">{match.league}</span>
              <input
                type="checkbox"
                checked={selectedMatches.includes(match.id)}
                onChange={() => {}}
                className="w-4 h-4 text-green-600 bg-gray-700 border-gray-600 rounded focus:ring-green-500"
              />
            </div>
            <div className="text-white font-medium text-sm mb-1">
              {match.homeTeam} vs {match.awayTeam}
            </div>
            <div className="text-gray-400 text-xs">
              {match.date} {match.time}
            </div>
          </div>
        ))}
      </div>
      
      <div className="flex justify-between items-center">
        <span className="text-gray-400">
          {selectedMatches.length} partido(s) seleccionado(s)
        </span>
        <button
          onClick={generateShareLink}
          disabled={generating || selectedMatches.length === 0}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
        >
          {generating ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Generando...
            </>
          ) : (
            <>
              <Share2 className="w-4 h-4" />
              Generar Enlace
            </>
          )}
        </button>
      </div>

      {/* Modal para mostrar el enlace generado */}
      {showLinkModal && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-bold text-green-400">Enlace Generado</h3>
              <button
                onClick={() => setShowLinkModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="bg-gray-700 rounded-lg p-3 mb-4">
              <p className="text-gray-300 text-xs mb-2">Enlace para compartir:</p>
              <div className="bg-gray-900 rounded p-2 text-xs text-green-400 break-all">
                {generatedLink}
              </div>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={copyToClipboard}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
              >
                {linkCopied ? <CheckCircle className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                {linkCopied ? 'Copiado' : 'Copiar'}
              </button>
              <button
                onClick={sendToWhatsApp}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg flex items-center justify-center gap-2"
              >
                <Phone className="w-4 h-4" />
                WhatsApp
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ShareLinkGenerator;