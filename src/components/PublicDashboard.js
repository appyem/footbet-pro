import React, { useState, useEffect } from 'react';
import { Phone, User, AlertCircle, CheckCircle, Calendar, Clock } from 'lucide-react';
import { db } from '../services/firebase';


import { collection, onSnapshot, addDoc } from 'firebase/firestore';

import { getCountryFlag } from '../services/countryFlags';

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
    <div className={`bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-green-500 transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <span className="text-lg">{getCountryFlag(match.country)}</span>
            <Calendar className="w-3 h-3" />
            {match.league}
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
        {[
          { key: '1', label: 'Local', color: 'bg-green-500', glow: 'shadow-green-500/50' },
          { key: 'X', label: 'Empate', color: 'bg-yellow-500', glow: 'shadow-yellow-500/50' },
          { key: '2', label: 'Visitante', color: 'bg-red-500', glow: 'shadow-red-500/50' }
        ].map((option) => {
          const isSelected = selectedBet?.selection === option.key;
          const odds = option.key === '1' ? match.odds?.home : option.key === 'X' ? match.odds?.draw : match.odds?.away;
          
          return (
            <button
              key={option.key}
              onClick={() => onSelectionChange(match.id, option.key, odds)}
              className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
                isSelected
                  ? `${option.color} text-white shadow-lg ${option.glow} border-2 border-white/30`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
              }`}
            >
              <div className="text-xs font-bold">{option.label}</div>
              <div className="text-lg mt-1 text-white drop-shadow-lg">{odds || '1.0'}</div>
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
  
  // ✅ USAR MISMA FUNCIÓN QUE EL SELLER DASHBOARD
  const getTodayDate = () => {
    const now = new Date();
    // Ajustar a timezone Colombia (UTC-5)
    const colombiaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    return colombiaTime.toISOString().split('T')[0];
  };
  
  const today = getTodayDate();
  console.log('🔍 Fecha hoy (calculada):', today);

  // 🔹 EXTRAER SELLER DE LA URL (si existe)
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.split('?')[1] || '');
  const urlSellerId = hashParams.get('seller');
  console.log('🔍 Hash completo:', hash);
  console.log('🔍 Seller desde hash:', urlSellerId);

  // 🔁 LISTENER EN TIEMPO REAL PARA TODOS LOS PARTIDOS
  const unsubscribeMatches = onSnapshot(
    collection(db, 'matches'),
    (snapshot) => {
      if (!isMounted) return;

      const allMatchesData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log('🔍 Total partidos en Firebase:', allMatchesData.length);
      console.log('🔍 Fechas en Firebase:', [...new Set(allMatchesData.map(m => m.date))]);

      // ✅ FILTRAR PARTIDOS VÁLIDOS (MISMA LÓGICA QUE SELLER DASHBOARD)
      const today = getTodayDate();
      const allAvailableMatches = allMatchesData.filter(match => {
        // Validaciones básicas
        if (!match || !match.homeTeam || !match.awayTeam) return false;
        if (match.hidden === true) return false;
        
        // ✅ Solo partidos de hoy o futuros (NO pasados)
        if (match.date < today) return false;
        
        // ✅ Excluir partidos ya con resultado
        if (match.result || match.status === 'finished') return false;
        
        return true;
      });

      // ✅ ORDENAR POR FECHA Y HORA
      allAvailableMatches.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const [aH, aM] = a.time.split(':').map(Number);
        const [bH, bM] = b.time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      // ✅ TOMAR MÁXIMO 7 PARTIDOS
      const finalMatches = allAvailableMatches.slice(0, 7);

      console.log('🔍 Partidos cargados para público:', finalMatches.length);
      console.log('🔍 Fechas disponibles:', [...new Set(finalMatches.map(m => m.date))]);
      console.log('🔍 Primer partido:', finalMatches[0]);

      setMatches(finalMatches);
      setLoading(false);
    },
    (error) => {
      console.error('Error cargando partidos:', error);
      if (isMounted) {
        setError('Error al cargar los partidos. Intenta recargar.');
        setLoading(false);
      }
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
      
      console.log('🔍 Vendedores cargados:', sellersData.length);
      
      // ✅ PRIORIDAD 1: Usar seller de la URL
      if (urlSellerId && sellersData.find(s => s.id === urlSellerId)) {
        setSelectedSeller(urlSellerId);
        console.log('✅ Seller seleccionado desde URL:', urlSellerId);
      }
      // ✅ PRIORIDAD 2: Usar primer vendedor si no hay URL
      else if (sellersData.length > 0 && !selectedSeller) {
        setSelectedSeller(sellersData[0].id);
        console.log('✅ Seller seleccionado por defecto:', sellersData[0].id);
      }
    }
  );

  return () => {
    isMounted = false;
    unsubscribeMatches();
    unsubscribeSellers();
  };
// eslint-disable-next-line react-hooks/exhaustive-deps
}, []);

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
  
  // ✅ 1. Validar nombre y teléfono
  if (!customerName.trim() || !customerPhone.trim()) {
    setError('Completa tu nombre y teléfono');
    return;
  }
  
  // ✅ 2. Validar que haya vendedores cargados
  if (sellers.length === 0) {
    setError('Cargando vendedores... espera un momento');
    return;
  }
  
  // ✅ 3. Validar que haya un vendedor seleccionado (CRÍTICO)
  if (!selectedSeller || selectedSeller.trim() === '') {
    setError('Selecciona un vendedor antes de enviar');
    return;
  }
  
  // ✅ 4. Validar que el vendedor exista en la lista
  const sellerExists = sellers.find(s => s.id === selectedSeller);
  if (!sellerExists) {
    setError('El vendedor seleccionado no existe. Recarga la página.');
    return;
  }
  
  // ✅ 5. Validar que haya seleccionado los 7 partidos
  if (selectedBets.size !== matches.length) {
    setError(`Selecciona los ${matches.length} partidos`);
    return;
  }
  
  setSubmitting(true);
  setError('');
  
  try {
    // ✅ 6. Usar datos del vendedor ya cargados (NO hacer getDoc)
    const sellerData = sellerExists;
    const sellerPhone = sellerData.phone || sellerData.phoneNumber;
    
    if (!sellerPhone) {
      throw new Error('El vendedor no tiene número de WhatsApp registrado');
    }
    
    // ✅ 7. Preparar datos de la apuesta
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
    
    // ✅ 8. Formatear número del cliente
    let formattedPhone = customerPhone.trim();
    if (!formattedPhone.startsWith('+57')) {
      formattedPhone = `+57 ${formattedPhone}`;
    }
    
    // ✅ 9. Generar mensaje para WhatsApp
    let message = `*🎫 NUEVA Tu jugada - La Jugada 7* 🎫\n\n`;
    message += `*Cliente:* ${customerName}\n`;
    message += `*Teléfono:* ${formattedPhone}\n`;
    message += `*Vendedor:* ${sellerData.name}\n\n`;
    message += `*Tu jugadaS:*\n`;
    
    betsArray.forEach((bet, index) => {
      const selectionText = bet.selection === '1' ? 'Local' : bet.selection === 'X' ? 'Empate' : 'Visitante';
      message += `${index + 1}. ${bet.homeTeam} vs ${bet.awayTeam}\n`;
      message += `   → ${selectionText} (x${bet.odds})\n`;
    });
    
    message += `\n*Total:* $5.000 COP\n`;
    message += `\n*¿Aprobar esta Tu jugada?* ✅`;
    
    // ✅ 10. Guardar en pending_tickets (CON sellerId VALIDADO)
    await addDoc(collection(db, 'pending_tickets'), {
      customerName: customerName.trim(),
      customerPhone: formattedPhone,
      sellerId: sellerData.id,  // ← ESTE ES EL CAMPO CRÍTICO
      sellerName: sellerData.name,
      bets: betsArray,
      totalStake: 5000,
      status: 'pending',
      createdAt: new Date().toISOString(),
      submittedAt: new Date().toLocaleTimeString('es-CO', {
        timeZone: 'America/Bogota',
        hour: '2-digit',
        minute: '2-digit'
      })
    });

    console.log('✅ Apuesta guardada en pending_tickets');
    console.log('🔍 sellerId guardado:', selectedSeller);
    console.log('🔍 sellerData:', sellerData);
    
    // ✅ 11. Abrir WhatsApp
    const cleanPhone = sellerPhone.replace(/\D/g, '');
    const whatsappUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
    
    // ✅ 12. Mostrar éxito y limpiar formulario
    setSuccess(true);
    setSelectedBets(new Map());
    setCustomerName('');
    setCustomerPhone('');
    
    setTimeout(() => {
      setSuccess(false);
    }, 5000);
    
  } catch (err) {
    console.error('Error al enviar Tu jugada:', err);
    setError(err.message || 'Error al enviar la Tu jugada. Intenta nuevamente.');
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
  <div className="min-h-screen bg-gray-900 pb-24 relative overflow-hidden">
    
    {/* 🔹 FONDO MARCA DE AGUA */}
    <div 
      className="absolute inset-0 opacity-10 pointer-events-none"
      style={{
        backgroundImage: `url(https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Trofe%CC%81os%20dorados%20en%20un%20estadio%20vibrante.png)`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundRepeat: 'no-repeat'
      }}
    ></div>
      {/* Header - Logo en Contenedor Redondo */}
      <div className="py-6 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4 shadow-2xl border-4 border-green-400/30">
            <img 
              src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Logo%20dina%CC%81mico%20de%20La%20Jugada%207.png" 
              alt="La Jugada 7 Logo"
              className="w-62 h-62 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mt-4">⚽ La Jugada 7</h1>
          <p className="text-green-100 text-sm mt-1">Tu conocimiento paga</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Mensaje de éxito */}
        {success && (
          <div className="bg-green-900 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg">
            <div className="flex items-center gap-3">
              <CheckCircle className="w-6 h-6 text-green-400" />
              <div>
                <p className="text-green-200 font-medium">¡Tu jugada enviada!</p>
                <p className="text-green-300 text-sm mt-1">
                  El vendedor recibirá tus resultados y te contactará para confirmar.
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
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6">
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
              <label className="block text-gray-300 text-sm font-medium mb-2 items-center gap-2">
                <User className="w-4 h-4" />
                Selecciona tu Vendedor
              </label>
              <select
                value={selectedSeller}
                onChange={(e) => setSelectedSeller(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                disabled={loading || sellers.length === 0}
              >
                {loading || sellers.length === 0 ? (
                  <option value="">Cargando vendedores...</option>
                ) : (
                  sellers.map(seller => (
                    <option key={seller.id} value={seller.id}>
                      {seller.name}
                    </option>
                  ))
                )}
              </select>
              {selectedSeller && (
                <p className="text-green-400 text-xs mt-1 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Vendedor seleccionado: {sellers.find(s => s.id === selectedSeller)?.name}
                </p>
              )}
              <p className="text-gray-400 text-xs mt-1">
                El vendedor recibirá tus resultados y te contactará para confirmar
              </p>
            </div>
          </div>
        </div>

        {/* Partidos del día */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-bold">Partidos Disponibles</h2>
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
              Enviar Tu jugada por WhatsApp
            </span>
          )}
        </button>

        {/* Premios */}
        {matches.length > 0 && (
          <div className="bg-gradient-to-r from-purple-600/80 to-purple-800/80 backdrop-blur-sm rounded-xl p-4 mt-6">
            <h3 className="text-white font-bold text-lg mb-2">🏆 Premios</h3>
            <ul className="text-white text-sm space-y-1">
              <li>✅ 5 aciertos: Recupera tu Tu jugada ($5,000)</li>
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