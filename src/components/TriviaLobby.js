import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Wallet, Plus, Clock, CheckCircle, XCircle, Gamepad2, Key } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import { acceptTriviaGame, rejectTriviaGame, cancelTriviaGame, registerClient } from '../services/cloudFunctions';
import TriviaChallengeModal from './TriviaChallengeModal';

const TriviaLobby = ({ onBack }) => {
  const [phone, setPhone] = useState(localStorage.getItem('trivia_phone') || '');
  const [uid, setUid] = useState(localStorage.getItem('trivia_uid') || '');
  const [validated, setValidated] = useState(!!localStorage.getItem('trivia_phone'));
  const [balance, setBalance] = useState(0);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  // 🆕 Estados para el flujo de registro ágil
  const [step, setStep] = useState(!!localStorage.getItem('trivia_phone') ? 'validated' : 'phone');
  const [registeredUid, setRegisteredUid] = useState('');
  
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [myCreatedGames, setMyCreatedGames] = useState([]);
  const [myActiveGames, setMyActiveGames] = useState([]);
  const [myFinishedGames, setMyFinishedGames] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Cargar datos guardados al iniciar
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
        setBalance(data.balance || 0);
        setFrozenBalance(data.frozenBalance || 0);
      }
    } catch (err) {
      console.error('Error cargando balance:', err);
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
      
      // Llamar a registerClient (crea UID y 500 créditos si no existe)
      const registerResult = await registerClient(phoneWithCountry);
      
      if (registerResult.isNew) {
        // 🆕 Usuario nuevo - mostrar UID generado y mensaje de regalo
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
      
      localStorage.setItem('trivia_phone', phone);
      localStorage.setItem('trivia_uid', uidNormalized);
      
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
    localStorage.setItem('trivia_phone', phone);
    localStorage.setItem('trivia_uid', uid);
    
    await loadBalance(phone);
    
    setValidated(true);
    setStep('validated');
  };

  // Listener para actualizar balance en tiempo real
  useEffect(() => {
    if (!validated || !phone) return;
    const balanceRef = doc(db, 'client_balances', phone);
    const unsubscribe = onSnapshot(balanceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance || 0);
        setFrozenBalance(data.frozenBalance || 0);
      }
    });
    return () => unsubscribe();
  }, [validated, phone]);

  // Listener para retos pendientes
  useEffect(() => {
    if (!validated || !phone) return;
    const q = query(collection(db, 'trivia_games'), where('status', '==', 'waiting'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const invitations = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const invitedPlayer = data.invitedPlayers?.find(p => p.phone === phone);
        if (invitedPlayer && invitedPlayer.status === 'pending') {
          invitations.push({ id: docSnap.id, ...data });
        }
      }
      setPendingInvitations(invitations);
    });
    return () => unsubscribe();
  }, [validated, phone]);

  // Listener para juegos que YO creé
  useEffect(() => {
    if (!validated || !phone) return;
    const q = query(collection(db, 'trivia_games'), where('creatorPhone', '==', phone), where('status', '==', 'waiting'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const createdGames = [];
      for (const docSnap of snapshot.docs) {
        createdGames.push({ id: docSnap.id, ...docSnap.data() });
      }
      setMyCreatedGames(createdGames);
    });
    return () => unsubscribe();
  }, [validated, phone]);

  // Listener para juegos activos
  useEffect(() => {
    if (!validated || !phone) return;
    const q = query(collection(db, 'trivia_games'), where('status', '==', 'active'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const activeGames = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const isCreator = data.creatorPhone === phone;
        const isAcceptedInvited = data.invitedPlayers?.some(p => p.phone === phone && p.status === 'accepted');
        if (isCreator || isAcceptedInvited) {
          activeGames.push({ id: docSnap.id, ...data });
        }
      }
      setMyActiveGames(activeGames);
    });
    return () => unsubscribe();
  }, [validated, phone]);

  // Listener para juegos finalizados
  useEffect(() => {
    if (!validated || !phone) return;
    const q = query(collection(db, 'trivia_games'), where('status', '==', 'finished'));
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const finishedGames = [];
      for (const docSnap of snapshot.docs) {
        const data = docSnap.data();
        const isCreator = data.creatorPhone === phone;
        const isAcceptedInvited = data.invitedPlayers?.some(p => p.phone === phone && p.status === 'accepted');
        if (isCreator || isAcceptedInvited) {
          finishedGames.push({ id: docSnap.id, ...data });
        }
      }
      setMyFinishedGames(finishedGames);
    });
    return () => unsubscribe();
  }, [validated, phone]);

  const handleAcceptChallenge = async (gameId) => {
    setLoading(true);
    setError('');
    try {
      const gameRef = doc(db, 'trivia_games', gameId);
      const gameDoc = await getDoc(gameRef);
      if (!gameDoc.exists()) {
        setError('Reto no encontrado');
        setLoading(false);
        return;
      }
      const gameData = gameDoc.data();
      await acceptTriviaGame(gameId, phone, uid);
      alert('✅ ¡Reto aceptado! Esperando a que todos acepten para iniciar el juego.');
      
      if (gameData.creatorPhone) {
        let creatorPhone = gameData.creatorPhone.replace(/\D/g, '');
        if (!creatorPhone.startsWith('57')) creatorPhone = '57' + creatorPhone;
        creatorPhone = creatorPhone.replace('+', '');
        const message = `🎮 *¡ACEPTÉ TU RETO DE TRIVIA!* 🎮\n\nHola! Acepté tu reto de trivia.\n💰 *Apuesta:* ${gameData.betAmount} créditos\n\n🎯 *Estoy listo para jugar!*\n👉 *Entra al lobby para iniciar el juego.*\n\n¡Buena suerte! 🏆`;
        window.open(`https://wa.me/${creatorPhone}?text=${encodeURIComponent(message)}`, '_blank');
      }
    } catch (err) {
      console.error('Error aceptando reto:', err);
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCancelChallenge = async (gameId) => {
    if (!window.confirm('¿Estás seguro de cancelar este reto? Se devolverán tus créditos.')) return;
    setLoading(true);
    setError('');
    try {
      const result = await cancelTriviaGame(gameId, phone, uid);
      alert('✅ ' + result.message);
    } catch (err) {
      console.error('Error cancelando reto:', err);
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRejectChallenge = async (gameId) => {
    setLoading(true);
    setError('');
    try {
      await rejectTriviaGame(gameId, phone, uid);
      alert('Reto rechazado');
    } catch (err) {
      console.error('Error rechazando reto:', err);
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════
  // PANTALLAS DE VALIDACIÓN (Flujo Ágil)
  // ═══════════════════════════════════════════════════════
  if (!validated) {
    
    // PASO 1: Ingresar teléfono
    if (step === 'phone') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
          <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
            <source src="/video/estadio.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-black/60 z-0"></div>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-500/30 relative z-10">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-blue-400/30">
                <Gamepad2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">🧠 Trivia de Fútbol</h1>
              <p className="text-blue-300 text-sm">Ingresa tu teléfono para continuar</p>
            </div>
            {error && <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
            <div className="space-y-4">
              <div>
                <label className="text-white text-sm font-medium mb-2 block">📱 Número de teléfono</label>
                <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="Ej: 3001234567" className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/20" autoFocus />
                <p className="text-gray-400 text-xs mt-2">💡 Si es tu primera vez, se te asignará un código y 500 créditos gratis automáticamente.</p>
              </div>
              <button onClick={handlePhoneSubmit} disabled={loading || !phone.trim()} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Validando...</> : <><CheckCircle className="w-5 h-5" /> Continuar</>}
              </button>
              <button onClick={onBack} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Volver a Juegos
              </button>
            </div>
          </div>
        </div>
      );
    }

    // PASO 2: Usuario nuevo - Mostrar UID generado y regalo
    if (step === 'registered') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
          <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
            <source src="/video/estadio.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-black/60 z-0"></div>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-green-500/30 relative z-10">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-green-400/30">
                <CheckCircle className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">¡Registro Exitoso!</h1>
              <p className="text-green-300 text-sm">Tu cuenta ha sido creada automáticamente</p>
            </div>
            <div className="bg-gradient-to-r from-green-900/50 to-blue-900/50 border border-green-500/30 rounded-xl p-4 mb-4 text-center">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Key className="w-5 h-5 text-yellow-400" />
                <span className="text-yellow-300 text-sm font-bold">Tu código de acceso:</span>
              </div>
              <p className="text-white text-4xl font-mono font-bold tracking-widest my-3">{registeredUid}</p>
              <p className="text-gray-300 text-xs">📱 Teléfono: {phone}</p>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500/30 rounded-lg p-3 mb-6 text-center">
              <p className="text-yellow-200 text-xs">🎁 <strong>¡Felicidades!</strong> Hemos acreditado <strong>500 créditos</strong> de regalo en tu cuenta para que empieces a jugar.</p>
            </div>
            <button onClick={handleContinueAfterRegister} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-2">
              <CheckCircle className="w-5 h-5" /> Continuar al Lobby
            </button>
          </div>
        </div>
      );
    }

    // PASO 3: Usuario existente - Ingresar UID
    if (step === 'uid') {
      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
          <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
            <source src="/video/estadio.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-black/60 z-0"></div>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-500/30 relative z-10">
            <div className="text-center mb-8">
              <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-blue-400/30">
                <Gamepad2 className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-3xl font-bold text-white mb-2">Validar Identidad</h1>
              <p className="text-blue-300 text-sm">Ingresa tu código de acceso</p>
            </div>
            {error && <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
            <div className="space-y-4">
              <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 mb-4 text-center">
                <p className="text-blue-300 text-xs">📱 Teléfono registrado:</p>
                <p className="text-white font-bold text-lg">{phone}</p>
              </div>
              <div>
                <label className="text-white text-sm font-medium mb-2 block">🔐 Código de acceso (6 dígitos)</label>
                <input type="text" value={uid} onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="Ej: 191701" maxLength={6} className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/20 font-mono text-center text-2xl tracking-widest" autoFocus />
              </div>
              <button onClick={handleUidSubmit} disabled={loading || uid.length !== 6} className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-2xl disabled:opacity-50 flex items-center justify-center gap-2">
                {loading ? <><div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div> Validando...</> : <><CheckCircle className="w-5 h-5" /> Ingresar al Lobby</>}
              </button>
              <button onClick={() => { setStep('phone'); setUid(''); setError(''); }} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
                <ArrowLeft className="w-4 h-4" /> Cambiar teléfono
              </button>
            </div>
          </div>
        </div>
      );
    }
    return null;
  }

  // ═══════════════════════════════════════════════════════
  // LOBBY PRINCIPAL (Sin cambios, solo se muestra si validated=true)
  // ═══════════════════════════════════════════════════════
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 pb-8 relative overflow-hidden">
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="/video/estadio.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/50 z-0"></div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-blue-400/30">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">🧠 Trivia de Fútbol</h1>
          <p className="text-blue-300 text-sm">¡Reta a tus amigos!</p>
        </div>

        <div className="bg-gradient-to-r from-yellow-600 to-yellow-800 rounded-xl p-4 mb-6 shadow-lg border border-yellow-500/30">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Wallet className="w-6 h-6 text-yellow-200" />
              <div>
                <p className="text-yellow-100 text-xs">Saldo disponible</p>
                <p className="text-white text-2xl font-bold">{balance - frozenBalance} créditos</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-yellow-100 text-xs">Saldo total</p>
              <p className="text-white text-lg font-bold">{balance}</p>
              {frozenBalance > 0 && <p className="text-yellow-200 text-xs">🔒 {frozenBalance} congelados</p>}
            </div>
          </div>
        </div>

        <button onClick={() => setShowCreateModal(true)} className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-2 mb-6">
          <Plus className="w-6 h-6" /> Crear Nuevo Reto
        </button>

        {/* Mis Retos Creados */}
        {myCreatedGames.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-blue-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-blue-400" /> Mis Retos Creados ({myCreatedGames.length})</h2>
            <div className="space-y-3">
              {myCreatedGames.map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-blue-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">👑 Reto creado por ti</p>
                      <p className="text-blue-400 font-bold text-lg">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">Invitados: {game.invitedPlayers?.length || 0}</p>
                      <p className="text-gray-400 text-xs">Aceptados: {game.invitedPlayers?.filter(p => p.status === 'accepted').length || 0}</p>
                    </div>
                  </div>
                  <div className="bg-blue-900/30 border border-blue-500/30 rounded p-2 mt-2">
                    <p className="text-blue-300 text-xs">⏳ Esperando que los invitados acepten...</p>
                  </div>
                  <button onClick={() => handleCancelChallenge(game.id)} disabled={loading} className="w-full mt-2 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50">
                    <XCircle className="w-4 h-4" /> Cancelar Reto
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Retos Pendientes */}
        {pendingInvitations.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-yellow-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><Clock className="w-5 h-5 text-yellow-400" /> Retos Pendientes ({pendingInvitations.length})</h2>
            <div className="space-y-3">
              {pendingInvitations.map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-yellow-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">📱 Te retó: {game.creatorPhone}</p>
                      <p className="text-yellow-400 font-bold text-lg">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">Expira: {new Date(game.expiresAt).toLocaleString('es-CO')}</p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button onClick={() => handleAcceptChallenge(game.id)} disabled={loading} className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50">
                      <CheckCircle className="w-4 h-4" /> Aceptar
                    </button>
                    <button onClick={() => handleRejectChallenge(game.id)} disabled={loading} className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50">
                      <XCircle className="w-4 h-4" /> Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Juegos Activos */}
        {myActiveGames.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-green-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-green-400" /> Mis Juegos Activos ({myActiveGames.length})</h2>
            <div className="space-y-3">
              {myActiveGames.map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-green-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">{game.creatorPhone === phone ? '👑 Tú creaste' : `🎯 Retado por ${game.creatorPhone}`}</p>
                      <p className="text-green-400 font-bold text-lg">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">Jugadores: {game.invitedPlayers?.filter(p => p.status === 'accepted').length + 1}</p>
                    </div>
                  </div>
                  <button onClick={() => { window.triviaGamePhone = phone; window.triviaGameUid = uid; window.location.hash = `trivia-game/${game.id}`; }} className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1">
                    <Gamepad2 className="w-4 h-4" /> Jugar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Juegos Finalizados */}
        {myFinishedGames.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-purple-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2"><Trophy className="w-5 h-5 text-purple-400" /> Historial ({myFinishedGames.length})</h2>
            <div className="space-y-3">
              {myFinishedGames.slice(0, 5).map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-purple-500/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">{game.winners?.includes(phone) ? '🏆 Ganaste' : '😔 Perdiste'}</p>
                      <p className="text-purple-400 font-bold">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">{new Date(game.finishedAt).toLocaleDateString('es-CO')}</p>
                    </div>
                    {game.winners?.includes(phone) && (
                      <div className="text-right">
                        <p className="text-green-400 font-bold">+{game.prizePerWinner}</p>
                        <p className="text-gray-400 text-xs">créditos</p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {pendingInvitations.length === 0 && myCreatedGames.length === 0 && myActiveGames.length === 0 && myFinishedGames.length === 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No tienes retos pendientes</p>
            <p className="text-gray-500 text-sm mt-2">¡Crea un reto y reta a tus amigos!</p>
          </div>
        )}

        <button onClick={onBack} className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2">
          <ArrowLeft className="w-4 h-4" /> Volver a Juegos
        </button>
      </div>

      {showCreateModal && <TriviaChallengeModal phone={phone} uid={uid} onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};

export default TriviaLobby;