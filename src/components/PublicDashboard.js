import React, { useState, useEffect } from 'react';
import { Phone, User, AlertCircle, CheckCircle, Calendar, Clock } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { getCountryFlag, getTeamFlag } from '../services/countryFlags';
import { shouldCloseMatch } from '../services/matchService';

// Componente aislado para los inputs del cliente (Diseño Claro)



const CustomerInfoForm = ({ customerName, customerPhone, onNameChange, onPhoneChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="text-gray-200 text-sm font-medium mb-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          Nombre Completo
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 placeholder-gray-400 transition-all"
          placeholder="Tu nombre completo"
          required
        />
      </div>
      <div>
        <label className="text-gray-200 text-sm font-medium mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Teléfono (WhatsApp)
        </label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 placeholder-gray-400 transition-all"
          placeholder="300 123 4567"
          required
        />
      </div>
    </>
  );
};

// Componente para cada partido (Diseño Cristal Moderno)
const MatchBetCard = ({ match, selectedBet, onSelectionChange, isTrapMatch, playGoalSound }) => {
  if (!match || !match.homeTeam || !match.awayTeam) return null;
  
  const homeFlag = getTeamFlag(match.homeTeam) || getCountryFlag(match.country);
  const awayFlag = getTeamFlag(match.awayTeam) || getCountryFlag(match.country);
  
  return (
    <div className={`bg-gray-900/40 backdrop-blur-md rounded-2xl p-5 border ${isTrapMatch ? 'border-purple-500/50' : 'border-white/10'} hover:border-green-400/50 transition-all duration-300 shadow-xl`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-green-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="text-lg drop-shadow-md">{getCountryFlag(match.country)}</span>
            {match.league}
          </span>
          <span className="text-gray-400 text-xs mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {match.date} • <Clock className="w-3 h-3" /> {match.time}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6 bg-black/20 p-4 rounded-xl border border-white/5">
        <div className="flex flex-col items-center w-1/3">
          <span className="text-4xl mb-2 drop-shadow-lg filter">{homeFlag}</span>
          <span className="text-white font-bold text-sm text-center leading-tight drop-shadow-md">{match.homeTeam}</span>
        </div>
        <div className="text-gray-400 font-black text-xl italic opacity-50">VS</div>
        <div className="flex flex-col items-center w-1/3">
          <span className="text-4xl mb-2 drop-shadow-lg filter">{awayFlag}</span>
          <span className="text-white font-bold text-sm text-center leading-tight drop-shadow-md">{match.awayTeam}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: '1', label: 'Local', color: 'bg-green-500', glow: 'shadow-green-500/40' },
          { key: 'X', label: 'Empate', color: 'bg-yellow-500', glow: 'shadow-yellow-500/40' },
          { key: '2', label: 'Visitante', color: 'bg-red-500', glow: 'shadow-red-500/40' }
        ].map((option) => {
          const isSelected = selectedBet?.selection === option.key;
          const odds = option.key === '1' ? match.odds?.home : option.key === 'X' ? match.odds?.draw : match.odds?.away;
          
          return (
            <button
              key={option.key}
              onClick={() => {
                onSelectionChange(match.id, option.key, odds);
                if (playGoalSound) playGoalSound();
              }}
              className={`py-3 rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${
                isSelected
                  ? `${option.color} text-white shadow-lg ${option.glow} ring-2 ring-white/40`
                  : 'bg-white/10 text-gray-200 hover:bg-white/20 border border-white/10'
              }`}
            >
              <div className="text-xs opacity-80 mb-1">{option.label}</div>
              <div className="text-lg font-black text-white drop-shadow-sm">{odds || '1.0'}</div>
            </button>
          );
        })}
      </div>
    </div>
  );
};

// Componente principal del Dashboard Público
const PublicDashboard = ({ playGoalSound, audioEnabled }) => {
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);  
  const [modalWhatsappUrl, setModalWhatsappUrl] = useState('');
  
useEffect(() => {
  let isMounted = true;
  
  const getTodayDate = () => {
    const now = new Date();
    const colombiaTime = new Date(now.getTime() - (5 * 60 * 60 * 1000));
    return colombiaTime.toISOString().split('T')[0];
  };
  
  const today = getTodayDate();
  const hash = window.location.hash;
  const hashParams = new URLSearchParams(hash.split('?')[1] || '');
  const urlSellerId = hashParams.get('seller');

  const unsubscribeMatches = onSnapshot(
    collection(db, 'matches'),
    (snapshot) => {
      if (!isMounted) return;
      const allMatchesData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

      const allAvailableMatches = allMatchesData.filter(match => {
        if (!match || !match.homeTeam || !match.awayTeam) return false;
        if (match.hidden === true) return false;
        if (match.date < today) return false;
        if (match.result || match.status === 'finished') return false;
        if (shouldCloseMatch(match.date, match.time)) return false;
        return true;
      });

      allAvailableMatches.sort((a, b) => {
        if (a.date !== b.date) return a.date.localeCompare(b.date);
        const [aH, aM] = a.time.split(':').map(Number);
        const [bH, bM] = b.time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      const finalMatches = allAvailableMatches.slice(0, 7);

      if (finalMatches.length < 7) {
        if (isMounted) {
          setError(`Solo hay ${finalMatches.length} partidos disponibles. Se necesitan 7 partidos para jugar.`);
          setMatches([]);
          setLoading(false);
          return;
        }
      }

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

  const unsubscribeSellers = onSnapshot(
    collection(db, 'sellers'),
    (snapshot) => {
      if (!isMounted) return;
      const sellersData = snapshot.docs
        .map(doc => ({ ...doc.data(), id: doc.id }))
        .filter(seller => seller.active !== false);
      
      setSellers(sellersData);
      
      if (urlSellerId && sellersData.find(s => s.id === urlSellerId)) {
        setSelectedSeller(urlSellerId);
      } else if (sellersData.length > 0 && !selectedSeller) {
        setSelectedSeller(sellersData[0].id);
      }
    }
  );

  return () => {
    isMounted = false;
    unsubscribeMatches();
    unsubscribeSellers();
  };
}, []); // eslint-disable-line react-hooks/exhaustive-deps

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
    if (sellers.length === 0) {
      setError('Cargando vendedores... espera un momento');
      return;
    }
    if (!selectedSeller || selectedSeller.trim() === '') {
      setError('Selecciona un vendedor antes de enviar');
      return;
    }
    const sellerExists = sellers.find(s => s.id === selectedSeller);
    if (!sellerExists) {
      setError('El vendedor seleccionado no existe. Recarga la página.');
      return;
    }
    if (selectedBets.size !== matches.length || matches.length !== 7) {
      const missingMatches = 7 - selectedBets.size;
      if (missingMatches > 0) {
        setError(`⚠️ Faltan ${missingMatches} partidos por seleccionar. Debes seleccionar los 7 partidos.`);
        return;
      }
    }
    
    setSubmitting(true);
    setError('');
    
    try {
      const sellerData = sellerExists;
      const sellerPhone = sellerData.phone || sellerData.phoneNumber;
      if (!sellerPhone) throw new Error('El vendedor no tiene número de WhatsApp registrado');
      
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
      
      let formattedPhone = customerPhone.trim();
      if (!formattedPhone.startsWith('+57')) formattedPhone = `+57 ${formattedPhone}`;
      
      let message = `*🎫 NUEVA Tu jugada - La Jugada 7* 🎫\n\n`;
      message += `*Cliente:* ${customerName}\n*Teléfono:* ${formattedPhone}\n*Vendedor:* ${sellerData.name}\n\n*Tu jugadaS:*\n`;
      
      betsArray.forEach((bet, index) => {
        const selectionText = bet.selection === '1' ? 'Local' : bet.selection === 'X' ? 'Empate' : 'Visitante';
        message += `${index + 1}. ${bet.homeTeam} vs ${bet.awayTeam}\n   → ${selectionText} (x${bet.odds})\n`;
      });
      message += `\n*Total:* $5.000 COP\n\n*¿Aprobar esta Tu jugada?* ✅`;
      
      const response = await fetch('https://creatependingticket-wxcqdudneq-uc.a.run.app', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ data: { customerName: customerName.trim(), customerPhone: formattedPhone, sellerId: sellerData.id, bets: betsArray, totalStake: 5000 } })
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error?.message || 'Error al enviar la apuesta');
      
      const cleanPhone = sellerPhone.replace(/\D/g, '');
      const whatsappUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
      setModalWhatsappUrl(whatsappUrl);
      setShowConfirmationModal(true);
      setSuccess(true);
      setSelectedBets(new Map());
      setCustomerName('');
      setCustomerPhone('');
      setTimeout(() => setSuccess(false), 5000);
      
    } catch (err) {
      console.error('Error al enviar Tu jugada:', err);
      setError(err.message || 'Error al enviar la Tu jugada. Intenta nuevamente.');
    } finally {
      setSubmitting(false);
    }
  };

  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
      <div className="bg-gray-900/90 rounded-2xl max-w-md w-full shadow-2xl border border-green-500/30">
        <div className="p-6 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-green-400/30">
            <img src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Logo%20dina%CC%81mico%20de%20La%20Jugada%207.png" alt="Logo" className="w-20 h-20 object-contain drop-shadow-lg" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">✅ ¡Jugada Enviada!</h2>
          <p className="text-gray-300 text-sm mb-6">Tu jugada ha sido enviada al vendedor <strong className="text-green-400">{sellers.find(s => s.id === selectedSeller)?.name}</strong> para su aprobación.</p>
          <div className="bg-white/10 rounded-xl p-4 mb-6 border border-white/10">
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm mb-2">
              <CheckCircle className="w-4 h-4" />
              <span>Enviado a: <strong className="text-white">{sellers.find(s => s.id === selectedSeller)?.name}</strong></span>
            </div>
            <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
              <Phone className="w-4 h-4" />
              <span>Se abrirá WhatsApp para confirmar</span>
            </div>
          </div>
          <div className="flex gap-3">
            <button onClick={() => {
              setShowConfirmationModal(false);
              const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
              if (isMobile) {
                const phoneNumber = modalWhatsappUrl.match(/wa\.me\/(\d+)/)?.[1];
                const message = decodeURIComponent(modalWhatsappUrl.split('?text=')[1]);
                const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
                const nativeUrl = isIOS ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}` : `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;
                window.location.href = nativeUrl;
                setTimeout(() => window.open(modalWhatsappUrl, '_blank'), 2000);
              } else {
                window.open(modalWhatsappUrl, '_blank');
              }
            }} className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2">
              <Phone className="w-5 h-5" /> Abrir WhatsApp
            </button>
            <button onClick={() => setShowConfirmationModal(false)} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors">Cancelar</button>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-900 flex items-center justify-center">
        <div className="text-center text-white">
          <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-lg font-bold">Cargando partidos...</p>
        </div>
      </div>
    );
  }

  return (
  <div className="min-h-screen bg-gray-900 pb-24 relative overflow-hidden">
        {/* 🎬 VIDEO DE FONDO */}
    <video
      autoPlay
      loop
      muted
      playsInline
      className="fixed inset-0 w-full h-full object-cover z-0"
    >
      <source src="/video/estadio.mp4" type="video/mp4" />
    </video>
    <div className="fixed inset-0 bg-black/50 z-0"></div>
    
    <div className="py-6 relative z-10">
      <div className="max-w-4xl mx-auto flex flex-col items-center">
        <div className="w-32 h-32 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4 shadow-2xl border-4 border-green-400/30">
          <img src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Logo%20dina%CC%81mico%20de%20La%20Jugada%207.png" alt="Logo" className="w-62 h-62 object-contain drop-shadow-lg" />
        </div>
        <h1 className="text-2xl font-bold text-white mt-4 drop-shadow-lg">⚽ La Jugada 7</h1>
        <p className="text-green-100 text-sm mt-1">Tu conocimiento paga</p>
      </div>
    </div>

    <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
      {success && (
        <div className="bg-green-900/80 border-l-4 border-green-500 p-4 mb-6 rounded-r-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <CheckCircle className="w-6 h-6 text-green-400" />
            <div><p className="text-green-200 font-medium">¡Tu jugada enviada!</p></div>
          </div>
        </div>
      )}
      {error && (
        <div className="bg-red-900/80 border-l-4 border-red-500 p-4 mb-6 rounded-r-lg backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-6 h-6 text-red-400" />
            <p className="text-red-200">{error}</p>
          </div>
        </div>
      )}

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
        <h2 className="text-white text-xl font-bold mb-4 flex items-center gap-2"><User className="w-5 h-5" /> Tus Datos</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <CustomerInfoForm customerName={customerName} customerPhone={customerPhone} onNameChange={setCustomerName} onPhoneChange={setCustomerPhone} />
          <div>
            <label className="block text-gray-200 text-sm font-medium mb-2 items-center gap-2"><User className="w-4 h-4" /> Tu Vendedor Asignado</label>
            <div className="w-full bg-black/20 text-white rounded-lg px-4 py-3 border border-white/10 flex items-center gap-2">
              <CheckCircle className="w-4 h-4 text-green-400" />
              <span className="font-medium">{selectedSeller && sellers.find(s => s.id === selectedSeller)?.name ? sellers.find(s => s.id === selectedSeller)?.name : 'Cargando...'}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-white text-xl font-bold">Partidos Disponibles</h2>
          <span className="bg-green-600/90 text-white text-sm px-3 py-1 rounded-full shadow-lg">
            {selectedBets.size}/{matches.length} seleccionados
          </span>
        </div>
        
        {matches.length === 0 ? (
          <div className="text-center py-12 bg-black/20 rounded-xl">
            <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-300 text-lg font-medium">No hay partidos disponibles</p>
          </div>
        ) : (
          <div className="space-y-4">
            {matches.map(match => (
              <MatchBetCard key={match.id} match={match} selectedBet={selectedBets.get(match.id)} onSelectionChange={toggleSelection} isTrapMatch={match.isTrap} playGoalSound={playGoalSound} />
            ))}
          </div>
        )}
      </div>

      <button
        onClick={handleSubmit}
        disabled={submitting || selectedBets.size !== matches.length}
        className={`w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-500 hover:to-green-700 text-white font-bold py-4 rounded-xl transition-all transform ${
          selectedBets.size === matches.length && !submitting ? 'hover:scale-[1.02] shadow-xl shadow-green-900/50' : 'opacity-70 cursor-not-allowed'
        }`}
      >
        {submitting ? (
          <span className="flex items-center justify-center gap-2"><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Enviando...</span>
        ) : selectedBets.size !== 7 ? (
          `⚠️ Faltan ${7 - selectedBets.size} partidos (Debes seleccionar los 7)`
        ) : (
          <span className="flex items-center justify-center gap-2"><Phone className="w-5 h-5" /> Enviar Tu jugada por WhatsApp</span>
        )}
      </button>

      {matches.length > 0 && (
        <div className="bg-gradient-to-r from-purple-600/40 to-purple-800/40 backdrop-blur-md border border-purple-500/30 rounded-2xl p-4 mt-6 shadow-xl">
          <h3 className="text-white font-bold text-lg mb-2">🏆 Premios</h3>
          <ul className="text-white text-sm space-y-1">
            <li>✅ 5 aciertos: Recupera tu Tu jugada ($5,000)</li>
            <li>✅ 6 aciertos: ¡Ticket Dorado! (10 juegos gratis)</li>
            <li>✅ 7 aciertos: ¡$1,000,000!</li>
          </ul>
        </div>
      )}
    </div>
    
    <div className="fixed bottom-4 right-4 z-50">
      <button onClick={() => window.location.hash = '#/login'} className="bg-black/40 text-gray-400 hover:text-white px-3 py-1 rounded-lg text-xs transition-colors backdrop-blur-sm border border-white/10" title="Acceso Admin"></button>
    </div>
    {showConfirmationModal && <ConfirmationModal />}
  </div>
  );
};

export default PublicDashboard;
