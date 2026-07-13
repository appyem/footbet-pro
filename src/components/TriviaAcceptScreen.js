import React, { useState, useEffect } from 'react';
import { ArrowLeft, CheckCircle, XCircle, Wallet, Trophy, AlertCircle } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
import { acceptTriviaGame, rejectTriviaGame } from '../services/cloudFunctions';

const TriviaAcceptScreen = ({ gameId, onBack }) => {
  const [phone, setPhone] = useState('');
  const [uid, setUid] = useState('');
  const [validated, setValidated] = useState(false);
  const [game, setGame] = useState(null);
  const [balance, setBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

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

  const handleValidate = async () => {
    if (!phone.trim() || !uid.trim()) {
      setError('Ingresa tu teléfono y código de acceso');
      return;
    }
    if (uid.length !== 6) {
      setError('El código debe tener 6 dígitos');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const phoneNormalized = phone.replace(/\D/g, '');
      const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
      const uidNormalized = uid.toString().trim();
      const uidQuery = query(
        collection(db, 'client_uids'),
        where('phone', '==', phoneWithCountry),
        where('uid', '==', uidNormalized)
      );
      const uidSnapshot = await getDocs(uidQuery);
      if (uidSnapshot.empty) {
        setError('Código de acceso incorrecto');
        setLoading(false);
        return;
      }
      const balanceRef = doc(db, 'client_balances', phoneWithCountry);
      const balanceDoc = await getDoc(balanceRef);
      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        setBalance((data.balance || 0) - (data.frozenBalance || 0));
      }
      setPhone(phoneWithCountry);
      setValidated(true);
    } catch (err) {
      console.error(err);
      setError('Error al validar');
    } finally {
      setLoading(false);
    }
  };

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
      
      // 🆕 Notificar al creador por WhatsApp
      if (game.creatorPhone) {
        const creatorPhone = game.creatorPhone.replace(/\D/g, '');
        const message = `🎮 *¡ACEPTÉ TU RETO DE TRIVIA!* 🎮\n\n` +
          `Hola! Acepté tu reto de trivia.\n` +
          `💰 *Apuesta:* ${game.betAmount} créditos\n\n` +
          `🎯 *Estoy listo para jugar!*\n` +
          `👉 *Entra al lobby para iniciar el juego.*\n\n` +
          `¡Buena suerte! 🏆`;
        
        // Abrir WhatsApp nativo con el mensaje al creador
        window.location.href = `whatsapp://send?phone=${creatorPhone}&text=${encodeURIComponent(message)}`;
      }
      
      setTimeout(() => { onBack && onBack(); }, 3000);
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

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

  if (!validated) {
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
            <p className="text-blue-300 text-sm mt-1">Valida tu identidad para continuar</p>
          </div>
          {error && <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3"><p className="text-red-200 text-sm">{error}</p></div>}
          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">📱 Teléfono</label>
              <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))} placeholder="3001234567" className="w-full bg-white/10 text-white rounded-lg px-4 py-3 border border-white/20" />
            </div>
            <div>
              <label className="text-white text-sm font-medium mb-2 block">🔐 Código de acceso (6 dígitos)</label>
              <input type="text" value={uid} onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="123456" maxLength={6} className="w-full bg-white/10 text-white rounded-lg px-4 py-3 border border-white/20 font-mono text-center text-lg tracking-widest" />
            </div>
            <button onClick={handleValidate} disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? 'Validando...' : <><CheckCircle className="w-5 h-5" /> Validar</>}
            </button>
            <button onClick={() => onBack && onBack()} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg flex items-center justify-center gap-2">
              <ArrowLeft className="w-4 h-4" /> Volver
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="/video/estadio.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 z-0"></div>
      <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-blue-500/30 shadow-2xl relative z-10">
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