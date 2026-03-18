import React, { useState, useEffect } from 'react';
import { AlertCircle, CheckCircle, Phone, RefreshCw } from 'lucide-react';
import { db } from '../services/firebase';
import { 
  doc, 
  getDoc, 
  query, 
  collection, 
  where, 
  getDocs, 
  addDoc, 
  onSnapshot 
} from 'firebase/firestore';
import { 
  getCurrentDate, 
  getCurrentTime, 
  shouldCloseMatch 
} from '../services/matchService';
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
  const [matchResults, setMatchResults] = useState({});

  useEffect(() => {
    // ✅ EXTRAER sellerId de la URL (soporta múltiples formatos)
    const params = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const extractedSellerId = params.get('seller');
    
    if (!extractedSellerId || extractedSellerId.trim() === '') {
      setError('Link inválido. Solicita un nuevo enlace al vendedor.');
      setLoading(false);
      return;
    }

    setSellerId(extractedSellerId);

    // 🔁 LISTENER EN TIEMPO REAL PARA RESULTADOS (excluir partidos ya jugados)
    const unsubscribeResults = onSnapshot(collection(db, 'match_results'), (snapshot) => {
      const resultsData = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        resultsData[data.matchId] = data.result;
      });
      setMatchResults(resultsData);
    });

    // 🔁 CARGAR INFORMACIÓN DEL VENDEDOR
    const loadSeller = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'sellers', extractedSellerId));
        if (docSnap.exists()) {
          setSellerInfo({ id: docSnap.id, ...docSnap.data() });
        } else {
          console.warn('Vendedor no encontrado en Firestore:', extractedSellerId);
        }
      } catch (e) {
        console.error('Error cargando vendedor:', e);
      }
    };

    // 🔁 CARGAR PARTIDOS DISPONIBLES (HOY + días futuros si es necesario)
    const loadAvailableMatches = async () => {
      try {
        const today = getCurrentDate();
        let allAvailableMatches = [];
        let currentDate = today;
        let daysChecked = 0;
        const maxDays = 3; // Buscar máximo 3 días hacia adelante

        // Buscar partidos día por día hasta tener 7 disponibles
        while (allAvailableMatches.length < 7 && daysChecked < maxDays) {
          const q = query(
            collection(db, 'matches'),
            where('date', '==', currentDate),
            where('hidden', '!=', true) // Incluir documentos sin 'hidden' o hidden=false
          );
          
          const snapshot = await getDocs(q);
          
          const dayMatches = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Filtrar partidos válidos
          const validMatches = dayMatches.filter(match => 
            match &&
            match.homeTeam && 
            match.awayTeam &&
            !match.hidden && // Asegurar hidden=false
            matchResults[match.id] === undefined && // Sin resultado guardado
            !shouldCloseMatch(match.date, match.time) // No cerrado por horario
          );

          allAvailableMatches = [...allAvailableMatches, ...validMatches];
          
          // Avanzar al siguiente día
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          currentDate = nextDate.toLocaleString('en-CA', { 
            timeZone: 'America/Bogota' 
          }).split(',')[0];
          
          daysChecked++;
        }

        // Ordenar cronológicamente y tomar máximo 7
        allAvailableMatches.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          const [aH, aM] = a.time.split(':').map(Number);
          const [bH, bM] = b.time.split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });

        const finalMatches = allAvailableMatches.slice(0, 7);

        if (finalMatches.length === 0) {
          setError('No hay partidos disponibles en este momento. Intenta más tarde.');
        } else {
          setMatches(finalMatches);
        }
      } catch (e) {
        console.error('Error cargando partidos:', e);
        setError('Error al cargar los partidos. Inténtalo de nuevo más tarde.');
      } finally {
        setLoading(false);
      }
    };

    loadSeller();
    loadAvailableMatches();

    return () => {
      unsubscribeResults();
    };
  }, [matchResults]);

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
      alert('Completa nombre y teléfono.');
      return;
    }
    if (selectedBets.size !== matches.length) {
      alert(`Selecciona los ${matches.length} partidos.`);
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

      await addDoc(collection(db, 'pending_tickets'), {
        sellerId,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        bets: betsArray,
        totalStake: 5000 * betsArray.length,
        status: 'pending_approval',
        createdAt: new Date().toISOString(),
        submittedAt: getCurrentTime()
      });
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
          <p className="text-gray-400 text-sm mt-2">Espera unos segundos</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center text-white">
        <div className="text-center p-6 bg-gray-800 rounded-xl max-w-md">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-lg font-bold mb-2">⚠️ {error}</p>
          {sellerInfo && (
            <p className="text-gray-300 mt-2">
              Contacta a {sellerInfo.name} para más información.
            </p>
          )}
          <button
            onClick={() => window.location.reload()}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 mx-auto"
          >
            <RefreshCw className="w-4 h-4" />
            Reintentar
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
          <p className="mt-2 text-gray-400">El vendedor revisará tu apuesta pronto.</p>
          {sellerInfo && sellerInfo.phone && (
            <button
              onClick={() => {
                const cleanPhone = sellerInfo.phone.replace(/\D/g, '');
                const msg = `Hola ${sellerInfo.name}, acabo de enviar mi apuesta en FootBet Pro. Por favor revísala. ¡Gracias!`;
                // ✅ Enlace WhatsApp nativo SIN espacio después de 57
                window.open(`https://wa.me/57${cleanPhone}?text=${encodeURIComponent(msg)}`, '_blank');
              }}
              className="mt-4 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center justify-center gap-2 mx-auto"
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
        <p className="text-gray-400 text-xs text-center mt-4">
          📱 Al enviar, el vendedor recibirá tu apuesta y te contactará para confirmar
        </p>
      </div>
    </div>
  );
};

export default PublicBetForm;