import React, { useState, useEffect } from 'react';
import { collection, addDoc, getDoc, doc } from 'firebase/firestore';
import { Phone, AlertCircle, CheckCircle, Calendar, AlertTriangle, Clock } from 'lucide-react';
import { getCurrentTime, shouldCloseMatch } from '../services/matchService';
import { db } from '../services/firebase';
import CustomerInfoForm from './CustomerInfoForm';

// Componente aislado para cada partido
const MatchBetCard = React.memo(({ match, selectedBet, onSelectionChange, isTrapMatch }) => {
  // Protección contra match undefined o incompleto
  if (!match || !match.homeTeam || !match.awayTeam) {
    return null;
  }
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-gray-600 transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {match.league}
            {isTrapMatch && (
              <AlertTriangle className="w-3 h-3 text-purple-400 ml-1" title="Partido especial - Alta volatilidad" />
            )}
          </span>
          <span className="text-gray-500 text-xs mt-1">
            {match.date}
          </span>
        </div>
        <span className="text-gray-400 text-sm flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {match.time}
        </span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-white font-medium text-lg">{match.homeTeam}</span>
        <span className="text-gray-400 text-xl font-bold">vs</span>
        <span className="text-white font-medium text-lg">{match.awayTeam}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        <button
          onClick={() => onSelectionChange(match.id, '1', match.odds.home)}
          className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedBet?.selection === '1'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="font-bold">1</div>
          <div className="text-xs mt-1 opacity-90">{match.odds.home}</div>
        </button>
        <button
          onClick={() => onSelectionChange(match.id, 'X', match.odds.draw)}
          className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedBet?.selection === 'X'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="font-bold">X</div>
          <div className="text-xs mt-1 opacity-90">{match.odds.draw}</div>
        </button>
        <button
          onClick={() => onSelectionChange(match.id, '2', match.odds.away)}
          className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedBet?.selection === '2'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="font-bold">2</div>
          <div className="text-xs mt-1 opacity-90">{match.odds.away}</div>
        </button>
      </div>
      {selectedBet && (
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm font-medium">
              {selectedBet.selection === '1' ? 'Ganador Local' : 
               selectedBet.selection === 'X' ? 'Empate' : 'Ganador Visitante'}
            </span>
            <span className="text-green-400 font-bold text-sm bg-green-900/30 px-2 py-1 rounded">
              {selectedBet.odds}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Componente público para que el cliente marque sus apuestas
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
    // Obtener parámetros de la URL
    const hash = window.location.hash;
    const hashParams = new URLSearchParams(hash.split('?')[1] || '');
    const currentSellerId = hashParams.get('seller');
    const matchIdsParam = hashParams.get('s');

    if (!currentSellerId || !matchIdsParam) {
      setError('Link inválido o incompleto');
      setLoading(false);
      return;
    }
    
    setSellerId(currentSellerId);
    const matchIds = matchIdsParam.split(',');

    // Cargar información del vendedor
    const loadSellerInfo = async () => {
      try {
        const sellerDoc = await getDoc(doc(db, 'users', currentSellerId));
        if (sellerDoc.exists()) {
          setSellerInfo({ id: sellerDoc.id, ...sellerDoc.data() });
        } else {
          setError('Vendedor no encontrado');
          setLoading(false);
        }
      } catch (err) {
        console.error('Error al cargar información del vendedor:', err);
        setError('Error al cargar información del vendedor');
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
            // Validar que los campos necesarios existan
            if (!data.date || !data.time || !data.homeTeam || !data.awayTeam) return null;
            // Verificar si ya está cerrado
            if (shouldCloseMatch(data.date, data.time)) return null;
            if (data.status === 'closed' || data.hidden === true) return null;
            return { id: docSnap.id, ...data };
          })
          .filter(Boolean);

        if (loadedMatches.length === 0) {
          setError('Los partidos ya no están disponibles.');
        } else {
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
        setError('Error al cargar los partidos. Intente nuevamente.');
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
      alert('Por favor complete su nombre y teléfono.');
      return;
    }
    if (selectedBets.size !== matches.length) {
      alert(`Debe seleccionar todos los partidos (${matches.length}).`);
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

      await addDoc(collection(db, 'pending_tickets'), pendingTicket);
      setSubmitted(true);
    } catch (err) {
      console.error('Error al enviar apuesta:', err);
      alert('Error al enviar su apuesta. Intente nuevamente.');
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
          <p className="text-lg font-bold">Error</p>
          <p>{error}</p>
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
          <p className="mt-2">El vendedor revisará tu apuesta pronto.</p>
          {sellerInfo && (
            <button
              onClick={() => {
                const msg = `Hola, acabo de enviar mi apuesta en FootBet Pro. Por favor revísala. ¡Gracias!`;
                window.open(`https://wa.me/${sellerInfo.phone}?text=${encodeURIComponent(msg)}`, '_blank');
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