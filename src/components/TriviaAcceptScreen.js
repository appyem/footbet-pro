import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Wallet, Trophy, AlertCircle, Key, Phone } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { acceptTriviaGame, rejectTriviaGame, registerClient } from '../services/cloudFunctions';

const TriviaAcceptScreen = ({ gameId, onBack }) => {
  const [phone, setPhone] = useState('');
  const [uid, setUid] = useState('');
  const [validated, setValidated] = useState(false);
  const [game, setGame] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [step, setStep] = useState('phone'); // 'phone', 'uid', 'registered'
  const [registeredUid, setRegisteredUid] = useState('');

  // Cargar datos del juego
  useEffect(() => {
    const loadGame = async () => {
      if (!gameId) return;
      try {
        const gameRef = doc(db, 'trivia_games', gameId);
        const gameDoc = await getDoc(gameRef);
        if (!gameDoc.exists()) {
          setError('Reto no encontrado');
          return;
        }
        setGame({ id: gameDoc.id, ...gameDoc.data() });
      } catch (err) {
        console.error(err);
        setError('Error al cargar el reto');
      }
    };
    loadGame();
  }, [gameId]);

  // Verificar si ya está validado en localStorage
  useEffect(() => {
    const savedPhone = localStorage.getItem('trivia_phone');
    const savedUid = localStorage.getItem('trivia_uid');
    if (savedPhone && savedUid) {
      setPhone(savedPhone);
      setUid(savedUid);
      setValidated(true);
      setStep('validated');
      loadBalance(savedPhone);
    }
  }, []);

  const loadBalance = async (phoneNumber) => {
    try {
      const balanceRef = doc(db, 'client_balances', phoneNumber);
      const balanceDoc = await getDoc(balanceRef);
      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        setBalance((data.balance || 0) - (data.frozenBalance || 0));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // PASO 1: Validar teléfono (verificar si existe o crear UID)
  const handlePhoneSubmit = async () => {
    if (!phone.trim()) {
      setError('Ingresa tu teléfono');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const phoneNormalized = phone.replace(/\D/g, '');
      const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
      
      // Llamar a registerClient (crea UID si no existe)
      const registerResult = await registerClient(phoneWithCountry);
      
      if (registerResult.isNew) {
        // 🆕 Usuario nuevo - mostrar UID generado
        setRegisteredUid(registerResult.uid);
        setPhone(registerResult.phone);
        setUid(registerResult.uid);
        setStep('registered');
        setLoading(false);
        return;
      }
      
      // Usuario existente - pedir UID
      setPhone(registerResult.phone);
      setStep('uid');
      setLoading(false);
      
    } catch (err) {
      console.error('Error en registerClient:', err);
      setError('Error al validar: ' + err.message);
      setLoading(false);
    }
  };

  // PASO 2: Validar UID (solo para usuarios existentes)
  const handleUidSubmit = async () => {
    if (!uid.trim()) {
      setError('Ingresa tu código de acceso');
      return;
    }
    
    if (uid.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const uidNormalized = uid.toString().trim();
      const uidQuery = query(
        collection(db, 'client_uids'),
        where('phone', '==', phone),
        where('uid', '==', uidNormalized)
      );
      const uidSnapshot = await getDocs(uidQuery);
      
      if (uidSnapshot.empty) {
        setError('Código de acceso incorrecto');
        setLoading(false);
        return;
      }
      
      // Guardar en localStorage
      localStorage.setItem('trivia_phone', phone);
      localStorage.setItem('trivia_uid', uidNormalized);
      
      // Cargar balance
      await loadBalance(phone);
      
      setValidated(true);
      setStep('validated');
      setLoading(false);
      
    } catch (err) {
      console.error(err);
      setError('Error al validar: ' + err.message);
      setLoading(false);
    }
  };

  // Continuar después de registro automático
  const handleContinueAfterRegister = async () => {
    // Guardar en localStorage
    localStorage.setItem('trivia_phone', phone);
    localStorage.setItem('trivia_uid', uid);
    
    // Cargar balance
    await loadBalance(phone);
    
    setValidated(true);
    setStep('validated');
  };

  // Aceptar reto
  const handleAccept = async () => {
    if (!game || !validated) return;
    if (balance < game.betAmount) {
      setError(`Saldo insuficiente. Necesitas ${game.betAmount} créditos. Disponible: ${balance}`);
      return;
    }
    setLoading(true);
    setError('');
    try {
      await acceptTriviaGame(gameId, phone, uid);
      setSuccess('✅ ¡Reto aceptado! Esperando a que inicie el juego...');
      
      // Notificar al creador por WhatsApp
      if (game.creatorPhone) {
        const creatorPhone = game.creatorPhone.replace(/\D/g, '');
        const message = `🎮 *¡ACEPTÉ TU RETO DE TRIVIA!* 🎮\n\n` +
          `Hola! Acepté tu reto de trivia.\n` +
          `💰 *Apuesta:* ${game.betAmount} créditos\n\n` +
          `🎯 *Estoy listo para jugar!*\n` +
          `👉 *Entra al lobby para iniciar el juego.*\n\n` +
          `¡Buena suerte! 🏆`;
        
        window.location.href = `whatsapp://send?phone=${creatorPhone}&text=${encodeURIComponent(message)}`;
      }
      
      setTimeout(() => { onBack && onBack(); }, 3000);
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Rechazar reto
  const handleReject = async () => {
    if (!game || !validated) return;
    setLoading(true);
    setError('');
    try {
      await rejectTriviaGame(gameId, phone, uid);
      setSuccess('Reto rechazado');
      setTimeout(() => { onBack && onBack(); }, 2000);
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // PANTALLA 1: Ingresar teléfono
  // ═══════════════════════════════════════════════════════
  if (step === 'phone') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-blue-500/30 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-blue-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Aceptar Reto</h1>
            <p className="text-blue-300 text-sm mt-1">Ingresa tu teléfono para continuar</p>
          </div>
          {error && <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Teléfono
              </label>
              <input 
                type="tel" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} 
                placeholder="3001234567" 
                className="w-full bg-white/10 text-white rounded-lg px-4 py-3 border border-white/20 text-lg"
                autoFocus
              />
              <p className="text-gray-400 text-xs mt-2">
                💡 Si es tu primera vez, se te asignará un código automáticamente
              </p>
            </div>
            
            <button 
              onClick={handlePhoneSubmit} 
              disabled={loading || !phone.trim()} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Validando...' : <><CheckCircle className="w-5 h-5" /> Continuar</>}
            </button>
            <button onClick={() => onBack && onBack()} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // PANTALLA 2: Usuario nuevo - Mostrar UID generado
  // ═══════════════════════════════════════════════════════
  if (step === 'registered') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">¡Registro Exitoso!</h1>
            <p className="text-green-300 text-sm mt-1">Tu cuenta ha sido creada automáticamente</p>
          </div>
          
          <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-xl p-4 mb-4">
            <div className="flex items-center gap-2 mb-2">
              <Key className="w-5 h-5 text-yellow-400" />
              <span className="text-yellow-300 text-sm font-bold">Tu código de acceso:</span>
            </div>
            <p className="text-white text-4xl font-mono font-bold text-center tracking-widest my-3">
              {registeredUid}
            </p>
            <p className="text-gray-300 text-xs text-center">
              📱 Teléfono: {phone}
            </p>
          </div>
          
          <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <p className="text-yellow-200 text-xs">
              ⚠️ <strong>GUARDA ESTE CÓDIGO.</strong> Lo necesitarás para:
            </p>
            <ul className="text-yellow-200 text-xs mt-2 space-y-1 list-disc pl-4">
              <li>Aceptar futuros retos</li>
              <li>Crear tus propios retos</li>
              <li>Consultar tu saldo</li>
            </ul>
          </div>
          
          <button
            onClick={handleContinueAfterRegister}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <CheckCircle className="w-5 h-5" />
            Continuar al Reto
          </button>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // PANTALLA 3: Usuario existente - Ingresar UID
  // ═══════════════════════════════════════════════════════
  if (step === 'uid') {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-blue-500/30 shadow-2xl relative z-10">
          <div className="text-center mb-6">
            <Trophy className="w-16 h-16 text-blue-400 mx-auto mb-3" />
            <h1 className="text-2xl font-bold text-white">Validar Identidad</h1>
            <p className="text-blue-300 text-sm mt-1">Ingresa tu código de acceso</p>
          </div>
          {error && <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
          <div className="space-y-4">
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 mb-4">
              <p className="text-blue-300 text-xs">📱 Teléfono:</p>
              <p className="text-white font-bold">{phone}</p>
            </div>
            <div>
              <label className="text-white text-sm font-medium mb-2 flex items-center gap-2">
                <Key className="w-4 h-4" />
                Código de acceso (6 dígitos)
              </label>
              <input 
                type="text" 
                value={uid} 
                onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 6))} 
                placeholder="123456" 
                maxLength={6} 
                className="w-full bg-white/10 text-white rounded-lg px-4 py-3 border border-white/20 font-mono text-center text-2xl tracking-widest"
                autoFocus
              />
            </div>
            
            <button 
              onClick={handleUidSubmit} 
              disabled={loading || uid.length !== 6} 
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Validando...' : <><CheckCircle className="w-5 h-5" /> Validar</>}
            </button>
            <button onClick={() => { setStep('phone'); setUid(''); setError(''); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Cambiar teléfono
            </button>
          </div>
        </div>
      </div>
    );
  }

     // ═══════════════════════════════════════════════════════
  // PANTALLA 4: Detalles del reto y aceptación
  // ═══════════════════════════════════════════════════════
  if (!validated) return null;

  // 🆕 LOGS DE DEPURACIÓN
  console.log('🔍 === PANTALLA 4 DEBUG ===');
  console.log('💰 Balance:', balance);
  console.log('🎮 Apuesta del reto:', game?.betAmount);
  console.log('✅ Condición balance === 500:', balance === 500);
  console.log('✅ Condición game?.betAmount <= 500:', game?.betAmount <= 500);
  console.log('✅ isNewUser:', balance === 500 && game?.betAmount <= 500);

  // Detectar si es usuario nuevo (balance inicial de 500 = regalo)
  const isNewUser = balance === 500 && game?.betAmount <= 500;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="/video/estadio.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 z-0"></div>
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-blue-500/30 shadow-2xl relative z-10">
        
        {/* 🎁 MENSAJE DE BIENVENIDA ANIMADO (solo usuarios nuevos) */}
        {isNewUser && (
          <div className="mb-4 relative overflow-hidden">
            {/* Fondo animado con gradiente */}
            <div className="absolute inset-0 bg-gradient-to-r from-yellow-500/20 via-orange-500/20 to-pink-500/20 animate-pulse"></div>
            
            {/* Confetti animado */}
            <div className="absolute inset-0 pointer-events-none">
              {[...Array(20)].map((_, i) => (
                <div
                  key={i}
                  className="absolute w-2 h-2 bg-yellow-400 rounded-full animate-bounce"
                  style={{
                    left: `${Math.random() * 100}%`,
                    top: `${Math.random() * 100}%`,
                    animationDelay: `${Math.random() * 2}s`,
                    animationDuration: `${1 + Math.random() * 2}s`
                  }}
                ></div>
              ))}
            </div>
            
            {/* Contenido del mensaje */}
            <div className="relative bg-gradient-to-r from-yellow-900/80 via-orange-900/80 to-pink-900/80 border-2 border-yellow-400 rounded-xl p-4 shadow-2xl animate-pulse">
              <div className="text-center">
                <div className="text-5xl mb-2 animate-bounce">🎉</div>
                <h2 className="text-xl font-bold text-yellow-300 mb-1">
                  ¡Bienvenido!
                </h2>
                <p className="text-yellow-100 text-sm mb-2">
                  Te regalamos <span className="text-2xl font-bold text-yellow-300">500 créditos</span> por ser nuevo
                </p>
                <p className="text-yellow-200 text-xs">
                  💰 ¡Ya puedes aceptar este reto!
                </p>
              </div>
            </div>
          </div>
        )}
        
        <div className="text-center mb-6">
          <Trophy className="w-16 h-16 text-blue-400 mx-auto mb-3" />
          <h1 className="text-2xl font-bold text-white">¡Te han retado!</h1>
        </div>
        {error && <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
        {success && <div className="mb-4 bg-green-900/50 border border-green-500/50 rounded-lg p-3"><p className="text-green-200 text-sm">{success}</p></div>}
        {game && (
          <>
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-4 mb-4">
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span className="text-blue-300">👤 Retador:</span><span className="text-white font-bold">{game.creatorPhone}</span></div>
                <div className="flex justify-between"><span className="text-blue-300">💰 Apuesta:</span><span className="text-yellow-400 font-bold">{game.betAmount} créditos</span></div>
                <div className="flex justify-between"><span className="text-blue-300">⏳ Expira:</span><span className="text-white">{new Date(game.expiresAt).toLocaleString('es-CO')}</span></div>
              </div>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-4 mb-4">
              <div className="flex items-center gap-2 mb-2">
                <Wallet className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 text-sm">Tu saldo disponible:</span>
              </div>
              <p className="text-white text-2xl font-bold">{balance} créditos</p>
              {balance < game.betAmount && (
                <div className="mt-2 flex items-center gap-2 text-red-400 text-sm">
                  <AlertCircle className="w-4 h-4" />
                  <span>Saldo insuficiente. Necesitas recargar.</span>
                </div>
              )}
            </div>
            <div className="space-y-3">
              <button onClick={handleAccept} disabled={loading || balance < game.betAmount} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Procesando...' : <><CheckCircle className="w-5 h-5" /> Aceptar Reto</>}
              </button>
              <button onClick={handleReject} disabled={loading} className="w-full bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? 'Procesando...' : <><XCircle className="w-5 h-5" /> Rechazar</>}
              </button>
              <button onClick={() => onBack && onBack()} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver al inicio
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default TriviaAcceptScreen;