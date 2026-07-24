import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Wallet, Plus, Clock, CheckCircle, XCircle, Gamepad2, Key, Gift, RefreshCw } from 'lucide-react';
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
  const [isPendingActivation, setIsPendingActivation] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [step, setStep] = useState(!!localStorage.getItem('trivia_phone') ? 'validated' : 'phone');
  const [registeredUid, setRegisteredUid] = useState('');
  
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [myCreatedGames, setMyCreatedGames] = useState([]);
  const [myActiveGames, setMyActiveGames] = useState([]);
  const [myFinishedGames, setMyFinishedGames] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);
  
  // 🆕 Estados para el modal de detalles y revancha
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedGame, setSelectedGame] = useState(null);

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
        setIsPendingActivation(data.pendingActivation || false);
      }
    } catch (err) {
      console.error('Error cargando balance:', err);
    }
  };

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
      
      const registerResult = await registerClient(phoneWithCountry);
      
      if (registerResult.isNew) {
        setRegisteredUid(registerResult.uid);
        setPhone(registerResult.phone);
        setUid(registerResult.uid);
        setStep('registered');
        setLoading(false);
        return;
      }
      setPhone(registerResult.phone);
      setStep('uid');
      setLoading(false);
    } catch (err) {
      console.error('Error en registerClient:', err);
      setError('Error al validar: ' + err.message);
      setLoading(false);
    }
  };

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

  const handleContinueAfterRegister = async () => {
    localStorage.setItem('trivia_phone', phone);
    localStorage.setItem('trivia_uid', uid);
    await loadBalance(phone);
    setValidated(true);
    setStep('validated');
  };

  // 🆕 Función para ver detalles de la partida
  const handleViewDetails = (game) => {
    setSelectedGame(game);
    setShowDetailsModal(true);
  };

  // 🆕 Función para preparar la revancha
  const handleRematch = (game) => {
    const opponent = game.creatorPhone === phone 
      ? game.invitedPlayers?.find(p => p.status === 'accepted')?.phone 
      : game.creatorPhone;
    
    // Guardamos en localStorage para que el modal de crear reto lo pre-cargue
    localStorage.setItem('rematch_opponent', opponent || '');
    localStorage.setItem('rematch_bet', game.betAmount || 100);
    
    setShowCreateModal(true);
  };

  // Listener para actualizar balance y estado de activación en tiempo real
  useEffect(() => {
    if (!validated || !phone) return;
    const balanceRef = doc(db, 'client_balances', phone);
    const unsubscribe = onSnapshot(balanceRef, (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setBalance(data.balance || 0);
        setFrozenBalance(data.frozenBalance || 0);
        setIsPendingActivation(data.pendingActivation || false);
      }
    });
    return () => unsubscribe();
  }, [validated, phone]);

  // Listeners de juegos
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
  // PANTALLAS DE VALIDACIÓN
  // ═══════════════════════════════════════════════════════
  if (!validated) {
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
                <p className="text-gray-400 text-xs mt-2">💡 Si es tu primera vez, se te asignará un código y 500 créditos gratis tras verificar tu WhatsApp.</p>
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

    if (step === 'registered') {
      const phoneDisplay = phone.replace('57', '');
      const whatsappMessage = `🎮 ¡Hola FootBet! ⚽\n\nQuiero activar mi cuenta y recibir mis 🎁 500 créditos de regalo.\n\n📱 Mi teléfono: ${phoneDisplay}\n\n¡Estoy listo para jugar! 🏆`;
      const whatsappUrl = `whatsapp://send?phone=573215177902&text=${encodeURIComponent(whatsappMessage)}`;

      return (
        <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
          <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
            <source src="/video/estadio.mp4" type="video/mp4" />
          </video>
          <div className="fixed inset-0 bg-black/60 z-0"></div>
          <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-yellow-500/30 relative z-10">
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-yellow-400/30">
                <Key className="w-12 h-12 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">¡Cuenta Creada!</h1>
              <p className="text-yellow-300 text-sm">Tu código de acceso ha sido generado</p>
            </div>
            
            <div className="bg-gray-900/50 border border-yellow-500/30 rounded-xl p-4 mb-4 text-center">
              <p className="text-gray-300 text-xs mb-1">Tu código de acceso:</p>
              <p className="text-white text-4xl font-mono font-bold tracking-widest my-2">{registeredUid}</p>
              <p className="text-gray-400 text-xs">📱 Teléfono: {phoneDisplay}</p>
            </div>

            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-lg p-4 mb-6">
              <p className="text-yellow-200 text-sm font-bold mb-2 flex items-center gap-2">
                <Gift className="w-4 h-4" />
                ¡Tienes 500 créditos de regalo esperándote!
              </p>
              <p className="text-yellow-100 text-xs mb-3 text-center">
                Para activarlos, toca el botón de abajo. Se abrirá tu WhatsApp con un mensaje listo para enviar.
              </p>
              <div className="bg-gray-900/50 rounded p-3 mb-3 text-left border border-yellow-500/30">
                <p className="text-green-400 text-xs font-mono whitespace-pre-wrap">{whatsappMessage}</p>
              </div>
              <p className="text-yellow-200 text-xs italic text-center">
                Un administrador verificará tu mensaje y activará tus créditos al instante. ⚡
              </p>
            </div>

            <button 
              onClick={() => window.location.href = whatsappUrl} 
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-2 mb-3"
            >
              <svg className="w-6 h-6" fill="currentColor" viewBox="0 0 24 24">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
              </svg>
              Abrir WhatsApp y Enviar
            </button>

            <button 
              onClick={handleContinueAfterRegister} 
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl transition-all flex items-center justify-center gap-2"
            >
              <CheckCircle className="w-5 h-5" /> Entendido, Ir al Lobby
            </button>
          </div>
        </div>
      );
    }

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
                <p className="text-white font-bold text-lg">{phone.replace('57', '')}</p>
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
  // LOBBY PRINCIPAL
  // ═══════════════════════════════════════════════════════
  const phoneDisplay = phone.replace('57', '');

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

        {isPendingActivation && (
          <div className="bg-yellow-900/50 border border-yellow-500/50 rounded-xl p-4 mb-6 flex items-start gap-3 animate-pulse">
            <Clock className="w-6 h-6 text-yellow-400 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-yellow-300 font-bold text-sm mb-1">⏳ Cuenta Pendiente de Activación</h3>
              <p className="text-yellow-100 text-xs">
                Para recibir tus <strong>500 créditos de regalo</strong> y poder crear retos, envía el mensaje 
                <code className="bg-yellow-800 px-1 rounded mx-1 text-white font-mono">ACTIVAR {phoneDisplay}</code> 
                al WhatsApp <strong>+57 321 517 7902</strong>. Tus créditos aparecerán aquí automáticamente en cuanto el admin los apruebe.
              </p>
            </div>
          </div>
        )}

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

        <button 
          onClick={() => isPendingActivation ? alert('⚠️ Primero debes activar tu cuenta enviando el mensaje de WhatsApp para recibir tus 500 créditos de regalo.') : setShowCreateModal(true)} 
          disabled={isPendingActivation}
          className={`w-full py-4 rounded-xl transition-all transform shadow-2xl flex items-center justify-center gap-2 mb-6 font-bold ${
            isPendingActivation 
              ? 'bg-gray-600 text-gray-400 cursor-not-allowed' 
              : 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white hover:scale-105'
          }`}
        >
          <Plus className="w-6 h-6" /> {isPendingActivation ? 'Activa tu cuenta primero' : 'Crear Nuevo Reto'}
        </button>

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

        {/* 🆕 Juegos Finalizados con Detalles y Revancha */}
        {myFinishedGames.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-purple-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-400" /> Historial de Partidas ({myFinishedGames.length})
            </h2>
            <div className="space-y-3">
              {myFinishedGames.slice(0, 5).map(game => {
                const isWinner = game.winners?.includes(phone);
                const userScore = game.scores?.[phone] || 0;
                const opponentPhone = game.creatorPhone === phone 
                  ? game.invitedPlayers?.find(p => p.status === 'accepted')?.phone 
                  : game.creatorPhone;
                const opponentScore = game.scores?.[opponentPhone] || 0;

                return (
                  <div key={game.id} className={`bg-gray-700 rounded-lg p-4 border-2 shadow-lg transition-all ${
                    isWinner ? 'border-yellow-500 shadow-yellow-500/10' : 'border-red-500 shadow-red-500/10'
                  }`}>
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          {isWinner ? (
                            <span className="bg-yellow-500/20 text-yellow-300 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                              <Trophy className="w-3 h-3" /> ¡GANASTE!
                            </span>
                          ) : (
                            <span className="bg-red-500/20 text-red-300 px-2 py-1 rounded text-xs font-bold flex items-center gap-1">
                              <XCircle className="w-3 h-3" /> PERDISTE
                            </span>
                          )}
                        </div>
                        <p className="text-white font-medium text-sm">
                          {game.creatorPhone === phone ? '👑 Reto creado por ti' : `🎯 Retado por ${opponentPhone?.replace('57', '')}`}
                        </p>
                        <p className="text-purple-400 font-bold text-lg">{game.betAmount} créditos</p>
                        <p className="text-gray-400 text-xs">{new Date(game.finishedAt).toLocaleDateString('es-CO')}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-white text-2xl font-bold">{userScore} <span className="text-gray-500 text-sm">pts</span></p>
                        <p className="text-gray-400 text-xs">vs {opponentScore} pts</p>
                        {isWinner && (
                          <p className="text-green-400 font-bold text-sm mt-1">+{game.prizePerWinner} créditos</p>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 mt-3 pt-3 border-t border-gray-600">
                      <button 
                        onClick={() => handleViewDetails(game)}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-3 py-2 rounded flex items-center justify-center gap-1 transition-colors font-medium"
                      >
                        <Gamepad2 className="w-3 h-3" /> Ver Detalles
                      </button>
                      <button 
                        onClick={() => handleRematch(game)}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-3 py-2 rounded flex items-center justify-center gap-1 transition-colors font-medium"
                      >
                        <RefreshCw className="w-3 h-3" /> Revancha
                      </button>
                    </div>
                  </div>
                );
              })}
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

      {/* 🆕 Modal de Detalles de la Partida */}
      {showDetailsModal && selectedGame && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-gray-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto border border-purple-500/30 shadow-2xl">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Gamepad2 className="w-6 h-6 text-purple-400" />
                  Detalles de la Partida
                </h2>
                <button 
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white p-2 transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="bg-gray-900/50 rounded-xl p-4 mb-6 flex justify-around items-center border border-gray-700">
                <div className="text-center">
                  <p className="text-gray-400 text-xs mb-1">Tu puntaje</p>
                  <p className="text-3xl font-bold text-white">{selectedGame.scores?.[phone] || 0}</p>
                </div>
                <div className="text-gray-500 font-bold text-xl">VS</div>
                <div className="text-center">
                  <p className="text-gray-400 text-xs mb-1">Oponente</p>
                  <p className="text-3xl font-bold text-white">
                    {selectedGame.scores?.[selectedGame.creatorPhone === phone ? selectedGame.invitedPlayers?.find(p => p.status === 'accepted')?.phone : selectedGame.creatorPhone] || 0}
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="text-white font-bold text-lg mb-3">Desglose pregunta por pregunta</h3>
                {selectedGame.questions?.map((q, index) => {
                                    const answerData = selectedGame.answers?.[phone]?.[index];
                  const userAnswer = answerData?.selected;
                  const isTimeout = answerData?.isTimeout || false;
                  const correctAnswer = q.correctAnswer;
                  const isCorrect = userAnswer === correctAnswer && !isTimeout;
                  
                  return (
                    <div key={index} className={`rounded-lg p-4 border ${isCorrect ? 'bg-green-900/20 border-green-500/30' : 'bg-red-900/20 border-red-500/30'}`}>
                      <div className="flex items-start gap-3">
                        <div className={`mt-1 w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ${isCorrect ? 'bg-green-500' : 'bg-red-500'}`}>
                          {isCorrect ? <CheckCircle className="w-4 h-4 text-white" /> : <XCircle className="w-4 h-4 text-white" />}
                        </div>
                        <div className="flex-1">
                          <p className="text-white font-medium text-sm mb-2">
                            <span className="text-gray-400">Pregunta {index + 1}:</span> {q.question}
                          </p>
                          <div className="space-y-1 text-sm">
                                                        <p className={isCorrect ? 'text-green-400' : isTimeout ? 'text-orange-400' : 'text-red-400'}>
                              Tu respuesta: <span className="font-bold">
                                {isTimeout ? '⏰ Tiempo agotado' : q.options[userAnswer] !== undefined ? q.options[userAnswer] : 'Sin responder'}
                              </span>
                            </p>
                            {!isCorrect && (
                              <p className="text-green-400">
                                Respuesta correcta: <span className="font-bold">{q.options[correctAnswer]}</span>
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button 
                onClick={() => setShowDetailsModal(false)}
                className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreateModal && <TriviaChallengeModal phone={phone} uid={uid} onClose={() => setShowCreateModal(false)} />}
    </div>
  );
};

export default TriviaLobby;