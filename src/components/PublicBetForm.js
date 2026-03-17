import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, X, Phone } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { getCurrentTime, shouldCloseMatch } from '../services/matchService';
import CustomerInfoForm from './CustomerInfoForm';
import MatchBetCard from './MatchBetCard';

const PublicBetForm = () => {
  const [matches, setMatches] = useState([]);
  const [selectedBets, setSelectedBets] = useState(new Map());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [sellerId, setSellerId] = useState(null);
  const [sellerInfo, setSellerInfo] = useState(null);

  useEffect(() => {
    // 🔥 SOLUCIÓN NUCLEAR: Extraer parámetros de CUALQUIER formato de URL
    const extractParam = (key) => {
      // Método 1: Desde search params normales (?seller=xxx)
      const searchParams = new URLSearchParams(window.location.search);
      let value = searchParams.get(key);
      
      // Método 2: Desde hash (#/public-bet?seller=xxx)
      if (!value) {
        const hash = window.location.hash;
        const qIndex = hash.indexOf('?');
        if (qIndex !== -1) {
          const hashParams = new URLSearchParams(hash.substring(qIndex + 1));
          value = hashParams.get(key);
        }
      }
      
      // Método 3: Regex directo (último recurso)
      if (!value) {
        const regex = new RegExp(`[?&]${key}=([^&#]*)`);
        const match = window.location.href.match(regex);
        if (match) value = decodeURIComponent(match[1]);
      }
      
      return value ? decodeURIComponent(value) : null;
    };

    const sellerParam = extractParam('seller');
    const sParam = extractParam('s');

    if (!sellerParam || !sParam) {
      setError('Link inválido. Solicita un nuevo enlace al vendedor.');
      setLoading(false);
      console.error('Parámetros faltantes:', { sellerParam, sParam });
      return;
    }

    setSellerId(sellerParam);
    const matchIds = sParam.split(',').map(id => id.trim()).filter(id => id);

    if (matchIds.length === 0) {
      setError('No hay partidos en el enlace. Solicita uno nuevo.');
      setLoading(false);
      return;
    }

    // Cargar vendedor
    const loadSeller = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'users', sellerParam));
        if (docSnap.exists()) setSellerInfo({ id: docSnap.id, ...docSnap.data() });
      } catch (e) { console.error('Error cargando vendedor:', e); }
    };

    // Cargar partidos
    const loadMatches = async () => {
      try {
        const docs = await Promise.all(matchIds.map(id => getDoc(doc(db, 'matches', id))));
        const validMatches = docs
          .map(docSnap => {
            if (!docSnap.exists()) return null;
            const d = docSnap.data();
            if (!d.date || !d.time || !d.homeTeam || !d.awayTeam) return null;
            if (shouldCloseMatch(d.date, d.time)) return null;
            if (d.hidden || d.status === 'closed') return null;
            return { id: docSnap.id, ...d };
          })
          .filter(Boolean)
          .sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const [aH, aM] = a.time.split(':').map(Number);
            const [bH, bM] = b.time.split(':').map(Number);
            return (aH * 60 + aM) - (bH * 60 + bM);
          });

        if (validMatches.length === 0) {
          setError('Partidos no disponibles.');
        } else {
          setMatches(validMatches);
        }
      } catch (e) {
        console.error('Error cargando partidos:', e);
        setError('Error al cargar partidos.');
      } finally {
        setLoading(false);
      }
    };

    loadSeller();
    loadMatches();
  }, []);

  const toggleSelection = (matchId, selection, odds) => {
    setSelectedBets(prev => {
      const m = new Map(prev);
      const existing = m.get(matchId);
      if (existing && existing.selection === selection) m.delete(matchId);
      else m.set(matchId, { matchId, selection, odds });
      return m;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Completa nombre y teléfono.');
      return;
    }
    if (selectedBets.size !== matches.length) {
      alert(`Selecciona los ${matches.length} partidos.`);
      return;
    }
    setSubmitting(true);
    try {
      const bets = Array.from(selectedBets.values()).map(bet => {
        const m = matches.find(x => x.id === bet.matchId);
        return { ...bet, homeTeam: m?.homeTeam, awayTeam: m?.awayTeam, league: m?.league, time: m?.time };
      });

      await import('firebase/firestore').then(({ addDoc, collection }) => 
        addDoc(collection(db, 'pending_tickets'), {
          sellerId,
          customerName: customerName.trim(),
          customerPhone: customerPhone.trim(),
          bets,
          totalStake: 5000 * bets.length,
          status: 'pending_approval',
          createdAt: new Date().toISOString(),
          submittedAt: getCurrentTime()
        })
      );
      setSubmitted(true);
    } catch (e) {
      console.error('Error:', e);
      alert('Error al enviar apuesta.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center">
      <div className="text-center text-white">
        <div className="w-8 h-8 border-2 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
        <p>Cargando partidos...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center p-6 bg-gray-800 rounded-xl max-w-md text-white">
        <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <p className="text-lg font-bold mb-2">Error</p>
        <p className="text-gray-300 mb-4">{error}</p>
        <button onClick={() => window.location.href = '/'} 
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto">
          <X className="w-4 h-4" /> Volver al inicio
        </button>
      </div>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="text-center p-6 bg-gray-800 rounded-xl max-w-md text-white">
        <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
        <p className="text-lg font-bold mb-2">¡Apuesta enviada!</p>
        <p className="text-gray-300 mb-4">El vendedor revisará tu apuesta pronto.</p>
        {sellerInfo && (
          <button onClick={() => {
            const msg = `Hola ${sellerInfo.name}, envié mi apuesta en FootBet Pro. ¡Gracias!`;
            window.open(`https://wa.me/57${sellerInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
          }} className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2">
            <Phone className="w-4 h-4" /> Avisar al vendedor
          </button>
        )}
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-900 pb-8">
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 shadow-lg">
        <h1 className="text-white text-xl font-bold text-center">FootBet Pro</h1>
        {sellerInfo && <p className="text-green-100 text-center text-sm mt-1">Vendedor: {sellerInfo.name}</p>}
        <CustomerInfoForm customerName={customerName} customerPhone={customerPhone} 
                         onNameChange={setCustomerName} onPhoneChange={setCustomerPhone} />
      </div>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-bold">Tus apuestas</h2>
          <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full">
            {selectedBets.size}/{matches.length}
          </span>
        </div>
        <div className="space-y-4">
          {matches.map(m => (
            <MatchBetCard key={m.id} match={m} selectedBet={selectedBets.get(m.id)} 
                         onSelectionChange={toggleSelection} isTrapMatch={m.isTrap} />
          ))}
        </div>
        <button onClick={handleSubmit} disabled={submitting || selectedBets.size !== matches.length}
                className={`w-full font-bold py-3 rounded-lg mt-6 transition-colors ${
                  selectedBets.size === matches.length ? 'bg-green-600 hover:bg-green-700 text-white' 
                                                       : 'bg-gray-600 text-gray-400 cursor-not-allowed'
                }`}>
          {submitting ? 'Enviando...' : 'Enviar Apuesta'}
        </button>
      </div>
    </div>
  );
};

export default PublicBetForm;