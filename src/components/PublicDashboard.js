import React, { useState, useEffect } from 'react';
import { Phone, User, AlertCircle, CheckCircle, Calendar, Clock, AlertTriangle } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, query, collection, where, onSnapshot, addDoc } from 'firebase/firestore';
import { getCurrentDate, shouldCloseMatch } from '../services/matchService';

// Componente aislado para los inputs del cliente
const CustomerInfoForm = ({ customerName, customerPhone, onNameChange, onPhoneChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          Nombre Completo
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
          placeholder="Tu nombre completo"
          required
        />
      </div>
      <div>
        <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Teléfono (WhatsApp)
        </label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
          placeholder="300 123 4567"
          required
        />
      </div>
    </>
  );
};

// Componente para cada partido
const MatchBetCard = ({ match, selectedBet, onSelectionChange, isTrapMatch }) => {
  if (!match || !match.homeTeam || !match.awayTeam) return null;
  
  return (
    <div className={`bg-gray-800 rounded-xl p-4 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-green-500 transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <Calendar className="w-3 h-3" />
            {match.league}
            {isTrapMatch && (
              <AlertTriangle className="w-3 h-3 text-purple-400 ml-1" title="Partido especial" />
            )}
          </span>
          <span className="text-gray-500 text-xs">{match.date}</span>
        </div>
        <span className="text-gray-400 text-sm flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {match.time}
        </span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-white font-medium">{match.homeTeam}</span>
        <span className="text-gray-400">vs</span>
        <span className="text-white font-medium">{match.awayTeam}</span>
      </div>
      <div className="grid grid-cols-3 gap-2">
        {['1', 'X', '2'].map((selection) => {
          const isSelected = selectedBet?.selection === selection;
          const odds = selection === '1' ? match.odds?.home : selection === 'X' ? match.odds?.draw : match.odds?.away;
          
          return (
            <button
              key={selection}
              onClick={() => onSelectionChange(match.id, selection, odds)}
              className={`px-3 py-2 rounded text-sm font-medium transition-all ${
                isSelected
                  ? selection === '1' ? 'bg-green-600' : selection === 'X' ? 'bg-yellow-600' : 'bg-red-600'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <div className="font-bold">{selection}</div>
              <div className="text-xs mt-1 opacity-90">{odds || '1.0'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Componente principal del Dashboard Público
const PublicDashboard = () => {
  const [matches, setMatches] = useState([]);
  const [sellers, setSellers] = useState([]);
  const [selectedBets, setSelectedBets] = useState(new Map());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [selectedSeller, setSelectedSeller] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const today = getCurrentDate();

    // 🔁 Escuchar partidos disponibles HOY
    const unsubscribeMatches = onSnapshot(
      query(collection(db, 'matches'), where('date', '==', today)),
      (snapshot) => {
        if (!isMounted) return;
        
        const matchesData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(match => 
            match &&
            !match.hidden &&
            !shouldCloseMatch(match.date, match.time)
          )
          .slice(0, 7); // Máximo 7 partidos

        setMatches(matchesData);
        setLoading(false);
      },
      (error) => {
        console.error('Error cargando partidos:', error);
        setError('Error al cargar los partidos. Intenta recargar.');
        setLoading(false);
      }
    );

    // 🔁 Escuchar vendedores activos
    const unsubscribeSellers = onSnapshot(
      collection(db, 'sellers'),
      (snapshot) => {
        if (!isMounted) return;
        
        const sellersData = snapshot.docs
          .map(doc => ({ id: doc.id, ...doc.data() }))
          .filter(seller => seller.active !== false);
        
        setSellers(sellersData);
        
        // Seleccionar primer vendedor por defecto
        if (sellersData.length > 0 && !selectedSeller) {
          setSelectedSeller(sellersData[0].id);
        }
      }
    );

    return () => {
      isMounted = false;
      unsubscribeMatches();
      unsubscribeSellers();
    };
  }, [selectedSeller]);

  const toggleSelection = (matchId, selection, odds) => {
    setSelectedBets(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(matchId);
      
      if (existing && existing.selection === selection) {
        newMap.delete(matchId);
      } else {
        newMap.set(matchId, { matchId, selection, odds: odds || 1.0 });
      }
      
      return newMap;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!customerName.trim() || !customerPhone.trim()) {
      setError('Completa tu nombre y teléfono');
      return;
    }
    
    if (!selectedSeller) {
      setError('Selecciona un vendedor');
      return;
    }
    
    if (selectedBets.size !== matches.length) {
      setError(`Selecciona los ${matches.length} partidos`);
      return;
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      // Obtener datos del vendedor seleccionado
      const sellerDoc = await getDoc(doc(db, 'sellers', selectedSeller));
      if (!sellerDoc.exists()) {
        throw new Error('Vendedor no encontrado');
      }
      
      const sellerData = sellerDoc.data();
      const sellerPhone = sellerData.phone || sellerData.phoneNumber;
      
      if (!sellerPhone) {
        throw new Error('El vendedor no tiene número de WhatsApp registrado');
      }
      
      // Preparar datos de la apuesta
      const betsArray = Array.from(selectedBets.values()).map(bet => {
        const match = matches.find(m => m.id === bet.matchId);
        return {
          matchId: bet.matchId,
          homeTeam: match?.homeTeam || '',
          awayTeam: match?.awayTeam || '',
          league: match?.league || '',
          time: match?.time || '',
          selection: bet.selection,
          odds: bet.odds
        };
      });
      
      // Formatear número del cliente
      let formattedPhone = customerPhone.trim();
      if (!formattedPhone.startsWith('+57')) {
        formattedPhone = `+57 ${formattedPhone}`;
      }
      
      // Generar mensaje para WhatsApp
      let message = `*🎫 NUEVA APUESTA - FootBet Pro* 🎫\n\n`;
      message += `*Cliente:* ${customerName}\n`;
      message += `*Teléfono:* ${formattedPhone}\n`;
      message += `*Vendedor:* ${sellerData.name}\n\n`;
      message += `*APUESTAS:*\n`;
      
      betsArray.forEach((bet, index) => {
        const selectionText = bet.selection === '1' ? 'Local' : bet.selection === 'X' ? 'Empate' : 'Visitante';
        message += `${index + 1}. ${bet.homeTeam} vs ${bet.awayTeam}\n`;
        message += `   → ${selectionText} (x${bet.odds})\n`;
      });
      
      message += `\n*Total:* $${betsArray.length * 5000} COP\n`;
      message += `\n*¿Aprobar esta apuesta?* ✅`;
      
      // Guardar apuesta pendiente en Firestore
      await addDoc(collection(db, 'pending_tickets'), {
        customerName: customerName.trim(),
        customerPhone: formattedPhone,
        sellerId: selectedSeller,
        sellerName: sellerData.name,
        bets: betsArray,
        totalStake: betsArray.length * 5000,
        status: 'pending',
        createdAt: new Date().toISOString(),
        submittedAt: new Date().toLocaleTimeString('es-CO', {
          timeZone: 'America/Bogota',
          hour: '2-digit',
          minute: '2-digit'
        })
      });
      
      // Abrir WhatsApp con el mensaje
      const cleanPhone = sellerPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
      
      // Abrir en nueva pestaña
      window.open(whatsappUrl, '_blank');
      
      // Mostrar éxito
      setSuccess(true);
      setSelectedBets(new Map());
      setCustomerName('');
      setCustomerPhone('');
      
      // Resetear después de 5 segundos
      setTimeout(() => {
        setSuccess(false);
      }, 5000);
      
    } catch (err) {
      console.error('Error al enviar apuesta:', err);
      setError(err.message || 'Error al enviar la apuesta. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold">Cargando partidos...</p>
          <p className="text-gray-400 mt-2">Espera unos segundos</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 pb-24">
      {/* Header */}
      <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 shadow-lg">
        <div className="max-w-4xl mx-auto text-center">
          <h1 className="text-2xl font-bold text-white">⚽ FootBet Pro</h1>
          <p className="text-green-100 mt-1">Tu casa de apuestas confiable</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6">
        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-900 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-200 font-medium">¡Apuesta enviada!</p>
                <p className="text-green-300 text-sm mt-1">
                  El vendedor recibirá tu apuesta y te contactará para confirmar.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Mensaje de error */}
        {error && (
          <div className="bg-red-900/50 border-l-4 border-red-700 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-6 h-6 text-red-400" />
              <p className="text-red-200">{error}</p>
            </div>
          </div>
        )}

        {/* Formulario de cliente y vendedor */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2">
            <User className="w-5 h-5" />
            Tus Datos
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <CustomerInfoForm
              customerName={customerName}
              customerPhone={customerPhone}
              onNameChange={setCustomerName}
              onPhoneChange={setCustomerPhone}
            />
            
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Selecciona tu Vendedor
              </label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
              >
                {sellers.map(seller => (
                  <option key={seller.id} value={seller.id}>
                    {seller.name} {seller.commission ? `(${seller.commission}% comisión)` : ''}
                  </option>
                ))}
              </select>
              <p className="text-gray-400 text-xs mt-1">
                El vendedor recibirá tu apuesta y te contactará para confirmar
              </p>
            </div>
          </div>
        </div>

        {/* Partidos del día */}
        <div className="bg-gray-800 rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-bold">Partidos de Hoy</h2>
            <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full">
              {selectedBets.size}/{matches.length} seleccionados
            </span>
          </div>
          
          {matches.length === 0 ? (
            <div className="text-center py-12">
              <AlertCircle className="w-12 h-12 text-gray-600 mx-auto mb-4" />
              <p className="text-gray-400">No hay partidos disponibles en este momento</p>
              <p className="text-gray-500 text-sm mt-2">Vuelve más tarde o contacta a un vendedor</p>
            </div>
          ) : (
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
          )}
        </div>

        {/* Botón de envío */}
        <button
          onClick={handleSubmit}
          disabled={submitting || selectedBets.size !== matches.length}
          className={`w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-bold py-4 rounded-xl transition-all transform ${
            selectedBets.size === matches.length && !submitting
              ? 'hover:scale-[1.02] shadow-lg'
              : 'opacity-70 cursor-not-allowed'
          }`}
        >
          {submitting ? (
            <span className="flex items-center justify-center gap-2">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              Enviando...
            </span>
          ) : selectedBets.size !== matches.length ? (
            `Selecciona los ${matches.length} partidos primero`
          ) : (
            <span className="flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" />
              Enviar Apuesta por WhatsApp
            </span>
          )}
        </button>

        {/* Premios */}
        {matches.length > 0 && (
          <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 mt-6">
            <h3 className="text-white font-bold text-lg mb-2">🏆 Premios</h3>
            <ul className="text-white text-sm space-y-1">
              <li>✅ 5 aciertos: Recupera tu apuesta ($5,000)</li>
              <li>✅ 6 aciertos: ¡Ticket Dorado! (10 juegos gratis)</li>
              <li>✅ 7 aciertos: ¡$1,000,000!</li>
            </ul>
          </div>
        )}
      </div>
      {/* Botón oculto para acceso al login (solo para administradores) */}
        <div className="fixed bottom-4 right-4">
        <button
            onClick={() => window.location.hash = '#/login'}
            className="bg-gray-700 text-gray-400 hover:bg-gray-600 hover:text-white px-3 py-1 rounded-lg text-xs transition-colors"
            title="Acceso Admin"
        >
            🔐
        </button>
        </div>
    </div>
  );
};

export default PublicDashboard;