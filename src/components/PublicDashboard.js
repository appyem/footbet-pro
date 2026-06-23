import React, { useState, useEffect } from 'react';
import { Phone, User, AlertCircle, CheckCircle, Calendar, Clock } from 'lucide-react';
import { db } from '../services/firebase';


import { collection, onSnapshot } from 'firebase/firestore';

import { getCountryFlag, getTeamFlag } from '../services/countryFlags';
import { shouldCloseMatch } from '../services/matchService';

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
  
  const homeFlag = getTeamFlag(match.homeTeam) || getCountryFlag(match.country);
  const awayFlag = getTeamFlag(match.awayTeam) || getCountryFlag(match.country);
  
  return (
    <div className={`bg-gray-800/70 backdrop-blur-sm rounded-xl p-5 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-green-500 transition-all duration-300 shadow-lg`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex flex-col">
          <span className="text-green-400 text-xs font-bold uppercase tracking-wider flex items-center gap-1">
            <span className="text-sm">{getCountryFlag(match.country)}</span>
            {match.league}
          </span>
          <span className="text-gray-500 text-xs mt-1 flex items-center gap-1">
            <Calendar className="w-3 h-3" /> {match.date} • <Clock className="w-3 h-3" /> {match.time}
          </span>
        </div>
      </div>
      
      <div className="flex justify-between items-center mb-6 bg-gray-900/50 p-3 rounded-lg">
        <div className="flex flex-col items-center w-1/3">
          <span className="text-3xl mb-1">{homeFlag}</span>
          <span className="text-white font-bold text-sm text-center leading-tight">{match.homeTeam}</span>
        </div>
        <div className="text-gray-500 font-bold text-lg italic">VS</div>
        <div className="flex flex-col items-center w-1/3">
          <span className="text-3xl mb-1">{awayFlag}</span>
          <span className="text-white font-bold text-sm text-center leading-tight">{match.awayTeam}</span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {[
          { key: '1', label: 'Local', color: 'bg-green-600', glow: 'shadow-green-600/40' },
          { key: 'X', label: 'Empate', color: 'bg-yellow-600', glow: 'shadow-yellow-600/40' },
          { key: '2', label: 'Visitante', color: 'bg-red-600', glow: 'shadow-red-600/40' }
        ].map((option) => {
          const isSelected = selectedBet?.selection === option.key;
          const odds = option.key === '1' ? match.odds?.home : option.key === 'X' ? match.odds?.draw : match.odds?.away;
          
          return (
            <button
              key={option.key}
              onClick={() => onSelectionChange(match.id, option.key, odds)}
              className={`py-3 rounded-xl text-sm font-bold transition-all transform hover:scale-105 active:scale-95 ${
                isSelected
                  ? `${option.color} text-white shadow-lg ${option.glow} ring-2 ring-white/50`
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600 hover:text-white'
              }`}
            >
              <div className="text-xs opacity-80 mb-1">{option.label}</div>
              <div className="text-lg font-black">{odds || '1.0'}</div>
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
  const [showConfirmationModal, setShowConfirmationModal] = useState(false);  

  const [modalWhatsappUrl, setModalWhatsappUrl] = useState('');
  
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

        // ✅ CRÍTICO: Excluir partidos que YA INICIARON por horario
        if (shouldCloseMatch(match.date, match.time)) return false;
        
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

// ✅ VALIDAR QUE HAYA SUFICIENTES PARTIDOS (MÍNIMO 7)
if (finalMatches.length < 7) {
  console.log('⚠️ No hay suficientes partidos disponibles:', finalMatches.length);
  if (isMounted) {
    setError(`Solo hay ${finalMatches.length} partidos disponibles. Se necesitan 7 partidos para jugar.`);
    setMatches([]);  // ← NO mostrar partidos si no hay 7
    setLoading(false);
    return;  // ← SALIR SIN GUARDAR PARTIDOS
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

  // 🔁 Escuchar vendedores activos
const unsubscribeSellers = onSnapshot(
  collection(db, 'sellers'),
  (snapshot) => {
    if (!isMounted) return;
    
    // ✅ CORRECCIÓN: El id debe ser SIEMPRE doc.id (Firebase)
    const sellersData = snapshot.docs
      .map(doc => {
        const data = doc.data();
        return {
          ...data,
          id: doc.id  // ← ESTO SOBRESCRIBE CUALQUIER CAMPO id DEL DOCUMENTO
        };
      })
      .filter(seller => seller.active !== false);
    
    setSellers(sellersData);
    
    console.log('🔍 Vendedores cargados:', sellersData.length);
    console.log('🔍 URL Seller ID:', urlSellerId);
    console.log('🔍 Vendedores con IDs:', sellersData.map(s => ({ name: s.name, id: s.id })));
    
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
  
  // ✅ 5. Validar que haya seleccionado TODOS los partidos (CRÍTICO)
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
    // ✅ LLAMAR A LA CLOUD FUNCTION (segura en el servidor)
    const response = await fetch('https://creatependingticket-wxcqdudneq-uc.a.run.app', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        data: {
          customerName: customerName.trim(),
          customerPhone: formattedPhone,
          sellerId: sellerData.id,
          bets: betsArray,
          totalStake: 5000,
        }
      })
    });

    const result = await response.json();

    // ✅ Manejar errores de la Cloud Function
    if (!response.ok) {
      throw new Error(result.error?.message || 'Error al enviar la apuesta');
    }

    console.log('✅ Apuesta guardada en pending_tickets');
    console.log('🔍 sellerId guardado:', selectedSeller);
    console.log('🔍 sellerData:', sellerData);
    
    // ✅ 11. PREPARAR WHATSAPP PERO NO ABRIR TODAVÍA
    const cleanPhone = sellerPhone.replace(/\D/g, ''); // Solo números
    const whatsappUrl = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(message)}`;
    
    // ✅ GUARDAR EL NÚMERO Y MENSAJE EN ESTADO
   
    setModalWhatsappUrl(whatsappUrl);
    
    // ✅ 12. MOSTRAR MODAL DE CONFIRMACIÓN (EN VEZ DE ABRIR WHATSAPP DIRECTO)
    setShowConfirmationModal(true);
    
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

  // 🔹 MODAL DE CONFIRMACIÓN - ANTES DE ABRIR WHATSAPP
  const ConfirmationModal = () => (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full shadow-2xl border border-green-500/30">
        <div className="p-6 text-center">
          {/* 🔹 LOGO DE LA APLICACIÓN */}
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-green-400/30">
            <img 
              src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Logo%20dina%CC%81mico%20de%20La%20Jugada%207.png" 
              alt="La Jugada 7 Logo"
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
          </div>
          
          {/* 🔹 TÍTULO */}
          <h2 className="text-2xl font-bold text-white mb-2">
            ✅ ¡Jugada Enviada!
          </h2>
          
          {/* 🔹 MENSAJE */}
          <p className="text-gray-300 text-sm mb-6">
            Tu jugada ha sido enviada al vendedor <strong className="text-green-400">{sellers.find(s => s.id === selectedSeller)?.name}</strong> para su aprobación.
          </p>
          
          {/* 🔹 INFORMACIÓN ADICIONAL */}
          <div className="bg-gray-700/50 rounded-xl p-4 mb-6">
            <div className="flex items-center justify-center gap-2 text-green-400 text-sm mb-2">
              <CheckCircle className="w-4 h-4" />
              <span>Enviado a: <strong className="text-white">{sellers.find(s => s.id === selectedSeller)?.name}</strong></span>
            </div>
            <div className="flex items-center justify-center gap-2 text-blue-400 text-sm">
              <Phone className="w-4 h-4" />
              <span>Se abrirá WhatsApp para confirmar</span>
            </div>
          </div>
          
          {/* 🔹 BOTONES */}
          <div className="flex gap-3">
            <button
  onClick={() => {
    setShowConfirmationModal(false);
    
    // ✅ DETECTAR SI ES MÓVIL Y ABRIR WHATSAPP NATIVO
    const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
    
    if (isMobile) {
      // ✅ EXTRAER NÚMERO DE modalWhatsappUrl
      const phoneNumber = modalWhatsappUrl.match(/wa\.me\/(\d+)/)?.[1];
      const message = decodeURIComponent(modalWhatsappUrl.split('?text=')[1]);
      
      // ✅ USAR ESQUEMA NATIVO SEGÚN PLATAFORMA
      const isIOS = /iPhone|iPad|iPod/i.test(navigator.userAgent);
      const nativeUrl = isIOS 
        ? `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`  // iOS requiere https
        : `whatsapp://send?phone=${phoneNumber}&text=${encodeURIComponent(message)}`;  // Android
      
      // ✅ INTENTAR ABRIR APP NATIVA
      window.location.href = nativeUrl;
      
      // ✅ FALLBACK A WEB SI NO ABRE EN 2 SEGUNDOS
      setTimeout(() => {
        window.open(modalWhatsappUrl, '_blank');
      }, 2000);
    } else {
      // ✅ EN ESCRITORIO, ABRIR WEB NORMALMENTE
      window.open(modalWhatsappUrl, '_blank');
    }
  }}
  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
>
  <Phone className="w-5 h-5" />
  Abrir WhatsApp
</button>
            <button
              onClick={() => setShowConfirmationModal(false)}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-xl transition-colors"
            >
              Cancelar
            </button>
          </div>
          
          {/* 🔹 NOTA INFORMATIVA */}
          <p className="text-gray-500 text-xs mt-4">
            El vendedor recibirá tu jugada y te contactará para confirmar
          </p>
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
            
            {/* 🔹 CAMBIO: Reemplazar dropdown por nombre del vendedor */}
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 items-center gap-2">
                <User className="w-4 h-4" />
                Tu Vendedor Asignado
              </label>
              <div className="w-full bg-gray-700/50 text-white rounded-lg px-4 py-3 border border-gray-600 flex items-center gap-2">
                <CheckCircle className="w-4 h-4 text-green-400" />
                <span className="font-medium">
                  {selectedSeller && sellers.find(s => s.id === selectedSeller)?.name 
                    ? sellers.find(s => s.id === selectedSeller)?.name 
                    : 'Cargando...'}
                </span>
              </div>
              {selectedSeller && (
                <p className="text-green-400 text-xs mt-2 flex items-center gap-1">
                  <CheckCircle className="w-3 h-3" />
                  Tu jugada será enviada directamente a este vendedor
                </p>
              )}
              {!selectedSeller && sellers.length > 0 && (
                <p className="text-yellow-400 text-xs mt-2 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  No se especificó un vendedor en el enlace
                </p>
              )}
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
    <p className="text-gray-400 text-lg font-medium">No hay partidos disponibles en este momento</p>
    <p className="text-yellow-400 text-sm mt-2 font-medium">⚠️ Se necesitan 7 partidos para jugar</p>
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
) : matches.length === 0 ? (
  `⚠️ No hay partidos disponibles (Se necesitan 7)`
) : selectedBets.size !== 7 ? (
  `⚠️ Faltan ${7 - selectedBets.size} partidos (Debes seleccionar los 7)`
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
            
        </button>
        </div>
        {showConfirmationModal && <ConfirmationModal />}
    </div>
  );
};

export default PublicDashboard;