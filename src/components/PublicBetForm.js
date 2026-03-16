import React, { useState, useEffect } from 'react';
import { Phone, AlertCircle, CheckCircle, X } from 'lucide-react';
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
    // ✅ PARSEO CORRECTO DE LA URL (solución definitiva)
    const hash = window.location.hash; // Ej: "#/public-bet?seller=abc&s=123,456"
    
    // Extraer solo la parte de query params (después del ?)
    const queryString = hash.split('?')[1] || '';
    
    // Parsear manualmente los parámetros (más robusto que URLSearchParams para hashes)
    const params = {};
    queryString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });

    const currentSellerId = params.seller;
    const matchIdsParam = params.s;

    // ✅ Validación estricta
    if (!currentSellerId || !matchIdsParam || !matchIdsParam.trim()) {
      setError('Link inválido o incompleto. Por favor solicita un nuevo enlace al vendedor.');
      setLoading(false);
      console.error('Parámetros faltantes:', { currentSellerId, matchIdsParam });
      return;
    }

    setSellerId(currentSellerId);
    const matchIds = matchIdsParam.split(',').filter(id => id.trim());

    if (matchIds.length === 0) {
      setError('No hay partidos seleccionados en el enlace. Por favor solicita un nuevo enlace al vendedor.');
      setLoading(false);
      return;
    }

    // Cargar información del vendedor
    const loadSellerInfo = async () => {
      try {
        const sellerDoc = await getDoc(doc(db, 'users', currentSellerId));
        if (sellerDoc.exists()) {
          setSellerInfo({ id: sellerDoc.id, ...sellerDoc.data() });
        } else {
          console.warn('Vendedor no encontrado:', currentSellerId);
        }
      } catch (err) {
        console.error('Error al cargar información del vendedor:', err);
      }
    };

    // Cargar partidos
    const loadMatches = async () => {
      try {
        const docs = await Promise.all(matchIds.map(id => getDoc(doc(db, 'matches', id))));
        const loadedMatches = docs
          .map(docSnap => {
            if (!docSnap.exists()) return null;
            const data = docSnap.data();
            // Validar campos obligatorios
            if (!data.date || !data.time || !data.homeTeam || !data.awayTeam) return null;
            // Verificar si ya está cerrado
            if (shouldCloseMatch(data.date, data.time)) return null;
            if (data.status === 'closed' || data.hidden === true) return null;
            return { id: docSnap.id, ...data };
          })
          .filter(Boolean);

        if (loadedMatches.length === 0) {
          setError('Los partidos ya no están disponibles para apostar.');
        } else {
          // Ordenar cronológicamente
          loadedMatches.sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            const [aH, aM] = a.time.split(':').map(Number);
            const [bH, bM] = b.time.split(':').map(Number);
            return (aH * 60 + aM) - (bH * 60 + bM);
          });
          setMatches(loadedMatches);
        }
      } catch (err) {
        console.error('Error al cargar partidos:', err);
        setError('Error al cargar los partidos. Por favor recarga la página.');
      } finally {
        setLoading(false);
      }
    };

    loadSellerInfo();
    loadMatches();
  }, []);

  const toggleSelection = (matchId, selection, odds) => {
    setSelectedBets(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(matchId);
      if (existing && existing.selection === selection) {
        newMap.delete(matchId);
      } else {
        newMap.set(matchId, { matchId, selection, odds });
      }
      return newMap;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!customerName.trim() || !customerPhone.trim()) {
      alert('Por favor completa tu nombre y teléfono.');
      return;
    }
    if (selectedBets.size !== matches.length) {
      alert(`Debes seleccionar todos los partidos (${matches.length}).`);
      return;
    }
    setSubmitting(true);
    try {
      const betsArray = Array.from(selectedBets.values()).map(bet => {
        const match = matches.find(m => m.id === bet.matchId);
        return {
          matchId: bet.matchId,
          homeTeam: match?.homeTeam || '',
          awayTeam: match?.awayTeam || '',
          league: match?.league || '',
          time: match?.time || '',
          selection: bet.selection,
          odds: bet.odds,
          stake: 5000
        };
      });

      const pendingTicket = {
        sellerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        bets: betsArray,
        totalStake: 5000 * betsArray.length,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
        submittedAt: getCurrentTime()
      };

      // ✅ Guardar en pending_tickets (colección correcta)
      const { addDoc, collection } = await import('firebase/firestore');
      await addDoc(collection(db, 'pending_tickets'), pendingTicket);
      setSubmitted(true);
    } catch (err) {
      console.error('Error al enviar apuesta:', err);
      alert('Error al enviar tu apuesta. Intente nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="mt-4">Cargando partidos...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center p-6 bg-gray-800 rounded-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-bold mb-2">Error</p>
          <p className="text-gray-300">{error}</p>
          <button
            onClick={() => window.location.href = 'https://footbet-pro.web.app'}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
          >
            <X className="w-4 h-4" />
            Volver al inicio
          </button>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center p-6 bg-gray-800 rounded-xl max-w-md">
          <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <p className="text-lg font-bold">¡Apuesta enviada!</p>
          <p className="mt-2 text-gray-300">El vendedor revisará tu apuesta pronto.</p>
          {sellerInfo && (
            <button
              onClick={() => {
                const msg = `Hola ${sellerInfo.name}, acabo de enviar mi apuesta en FootBet Pro. Por favor revísala. ¡Gracias!`;
                window.open(`https://wa.me/57${sellerInfo.phone.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 mx-auto"
            >
              <Phone className="w-4 h-4" />
              Avisar al vendedor por WhatsApp
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-8">
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 shadow-lg">
        <h1 className="text-white text-xl font-bold text-center">FootBet Pro</h1>
        {sellerInfo && (
          <p className="text-green-100 text-center text-sm mt-1">
            Vendedor: {sellerInfo.name}
          </p>
        )}
        <CustomerInfoForm
          customerName={customerName}
          customerPhone={customerPhone}
          onNameChange={setCustomerName}
          onPhoneChange={setCustomerPhone}
        />
      </div>
      <div className="px-4 py-6">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-bold">Selecciona tus apuestas</h2>
          <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full">
            {selectedBets.size}/{matches.length}
          </span>
        </div>
        <div className="space-y-4">
          {matches.map(match => (
            <MatchBetCard
              key={match.id}
              match={match}
              selectedBet={selectedBets.get(match.id)}
              onSelectionChange={toggleSelection}
              isTrapMatch={match.isTrap}
            />
          ))}
        </div>
        <button
          onClick={handleSubmit}
          disabled={submitting || selectedBets.size !== matches.length}
          className={`w-full font-bold py-3 rounded-lg mt-6 transition-colors shadow-lg ${
            selectedBets.size === matches.length
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-gray-600 text-gray-400 cursor-not-allowed'
          }`}
        >
          {submitting ? 'Enviando...' : 'Enviar Apuesta al Vendedor'}
        </button>
      </div>
    </div>
  );
};

export default PublicBetForm;