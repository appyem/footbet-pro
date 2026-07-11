import React, { useState, useEffect } from 'react';
import { ArrowLeft, Trophy, Users, Wallet, Plus, Clock, CheckCircle, XCircle, Gamepad2 } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, getDocs, doc, getDoc } from 'firebase/firestore';
import TriviaChallengeModal from './TriviaChallengeModal';

const TriviaLobby = ({ onBack }) => {
  const [phone, setPhone] = useState('');
  const [uid, setUid] = useState('');
  const [validated, setValidated] = useState(false);
  const [balance, setBalance] = useState(0);
  const [frozenBalance, setFrozenBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  
  const [pendingInvitations, setPendingInvitations] = useState([]);
  const [myActiveGames, setMyActiveGames] = useState([]);
  const [myFinishedGames, setMyFinishedGames] = useState([]);
  
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Validar teléfono + UID
  const handleValidate = async () => {
    if (!phone.trim() || !uid.trim()) {
      setError('Ingresa tu teléfono y código de acceso');
      return;
    }
    
    if (uid.length !== 6) {
      setError('El código de acceso debe tener 6 dígitos');
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const phoneNormalized = phone.replace(/\D/g, '');
      const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
      const uidNormalized = uid.toString().trim();
      
      // Verificar UID
      const uidQuery = query(
        collection(db, 'client_uids'),
        where('phone', '==', phoneWithCountry),
        where('uid', '==', uidNormalized),
      );
      const uidSnapshot = await getDocs(uidQuery);
      
      if (uidSnapshot.empty) {
        setError('Código de acceso incorrecto. Verifica que el teléfono y el código coincidan.');
        setLoading(false);
        return;
      }
      
            // Cargar saldo
      const balanceRef = doc(db, 'client_balances', phoneWithCountry);
      const balanceDoc = await getDoc(balanceRef);
      
      if (balanceDoc.exists()) {
        const data = balanceDoc.data();
        setBalance(data.balance || 0);
        setFrozenBalance(data.frozenBalance || 0);
      }
      
      setPhone(phoneWithCountry);
      setValidated(true);
    } catch (err) {
      console.error('Error validando:', err);
      setError('Error al validar. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  // Listener para retos pendientes (donde fui invitado)
  useEffect(() => {
    if (!validated || !phone) return;
    
    // Buscar juegos donde este teléfono está en invitedPlayers
    const q = query(
      collection(db, 'trivia_games'),
      where('status', '==', 'waiting')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const invitations = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        const invitedPlayer = data.invitedPlayers?.find(p => p.phone === phone);
        
        if (invitedPlayer && invitedPlayer.status === 'pending') {
          invitations.push({
            id: doc.id,
            ...data
          });
        }
      }
      
      setPendingInvitations(invitations);
    });
    
    return () => unsubscribe();
  }, [validated, phone]);

  // Listener para juegos activos donde participo
  useEffect(() => {
    if (!validated || !phone) return;
    
    const q = query(
      collection(db, 'trivia_games'),
      where('status', '==', 'active')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const activeGames = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        // Verificar si el jugador es el creador o un invitado aceptado
        const isCreator = data.creatorPhone === phone;
        const isAcceptedInvited = data.invitedPlayers?.some(
          p => p.phone === phone && p.status === 'accepted'
        );
        
        if (isCreator || isAcceptedInvited) {
          activeGames.push({
            id: doc.id,
            ...data
          });
        }
      }
      
      setMyActiveGames(activeGames);
    });
    
    return () => unsubscribe();
  }, [validated, phone]);

  // Listener para juegos finalizados donde participé
  useEffect(() => {
    if (!validated || !phone) return;
    
    const q = query(
      collection(db, 'trivia_games'),
      where('status', '==', 'finished')
    );
    
    const unsubscribe = onSnapshot(q, async (snapshot) => {
      const finishedGames = [];
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        
        const isCreator = data.creatorPhone === phone;
        const isAcceptedInvited = data.invitedPlayers?.some(
          p => p.phone === phone && p.status === 'accepted'
        );
        
        if (isCreator || isAcceptedInvited) {
          finishedGames.push({
            id: doc.id,
            ...data
          });
        }
      }
      
      setMyFinishedGames(finishedGames);
    });
    
    return () => unsubscribe();
  }, [validated, phone]);

  // Pantalla de validación
  if (!validated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video
          autoPlay
          loop
          muted
          playsInline
          className="fixed inset-0 w-full h-full object-cover z-0"
        >
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>

        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-500/30 relative z-10">
          <div className="text-center mb-8">
            <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-blue-400/30">
              <Gamepad2 className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">🧠 Trivia de Fútbol</h1>
            <p className="text-blue-300 text-sm">Reta a tus amigos y gana</p>
          </div>

          {error && (
            <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                📱 Número de teléfono
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej: 3001234567"
                className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/20"
              />
            </div>

            <div>
              <label className="text-white text-sm font-medium mb-2 block">
                🔐 Código de acceso (6 dígitos)
              </label>
              <input
                type="text"
                value={uid}
                onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="Ej: 191701"
                maxLength={6}
                className="w-full bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-400 border border-white/20 font-mono text-center text-lg tracking-widest"
              />
              <p className="text-gray-400 text-xs mt-1">
                Este código te lo enviamos por WhatsApp al aprobar tu primera recarga
              </p>
            </div>

            <button
              onClick={handleValidate}
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 rounded-xl transition-all transform hover:scale-105 shadow-2xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Validando...
                </>
              ) : (
                <>
                  <CheckCircle className="w-5 h-5" />
                  Ingresar al Lobby
                </>
              )}
            </button>

            <button
              onClick={onBack}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Volver a Juegos
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Lobby principal
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-900 to-blue-800 pb-8 relative overflow-hidden">
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

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Header */}
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-blue-400/30">
            <Gamepad2 className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">🧠 Trivia de Fútbol</h1>
          <p className="text-blue-300 text-sm">¡Reta a tus amigos!</p>
        </div>

        {/* Saldo */}
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
              {frozenBalance > 0 && (
                <p className="text-yellow-200 text-xs">🔒 {frozenBalance} congelados</p>
              )}
            </div>
          </div>
        </div>

        {/* Botón Crear Reto */}
        <button
          onClick={() => setShowCreateModal(true)}
          className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-500 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-2xl flex items-center justify-center gap-2 mb-6"
        >
          <Plus className="w-6 h-6" />
          Crear Nuevo Reto
        </button>

        {/* Retos Pendientes (invitaciones) */}
        {pendingInvitations.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-yellow-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Clock className="w-5 h-5 text-yellow-400" />
              Retos Pendientes ({pendingInvitations.length})
            </h2>
            <div className="space-y-3">
              {pendingInvitations.map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-yellow-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">📱 Te retó: {game.creatorPhone}</p>
                      <p className="text-yellow-400 font-bold text-lg">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">
                        Expira: {new Date(game.expiresAt).toLocaleString('es-CO')}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2 mt-3">
                    <button
                      onClick={() => {
                        // TODO: Implementar aceptar reto
                        alert('Función de aceptar reto - Próximamente');
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1"
                    >
                      <CheckCircle className="w-4 h-4" />
                      Aceptar
                    </button>
                    <button
                      onClick={() => {
                        // TODO: Implementar rechazar reto
                        alert('Función de rechazar reto - Próximamente');
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1"
                    >
                      <XCircle className="w-4 h-4" />
                      Rechazar
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
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-green-400" />
              Mis Juegos Activos ({myActiveGames.length})
            </h2>
            <div className="space-y-3">
              {myActiveGames.map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-green-500/50">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-medium">
                        {game.creatorPhone === phone ? '👑 Tú creaste' : `🎯 Retado por ${game.creatorPhone}`}
                      </p>
                      <p className="text-green-400 font-bold text-lg">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">
                        Jugadores: {game.invitedPlayers?.filter(p => p.status === 'accepted').length + 1}
                      </p>
                    </div>
                  </div>
                                    <button
                    onClick={() => {
                      // TODO: Necesitamos pasar phone y uid al componente padre
                      // Por ahora usamos los del estado
                      window.triviaGamePhone = phone;
                      window.triviaGameUid = uid;
                      window.triviaGameId = game.id;
                      window.location.hash = `trivia-game/${game.id}`;
                    }}
                    className="w-full mt-3 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1"
                  >
                    <Gamepad2 className="w-4 h-4" />
                    Jugar
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Juegos Finalizados */}
        {myFinishedGames.length > 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 border border-purple-500/30">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-purple-400" />
                  Historial ({myFinishedGames.length})
            </h2>
            <div className="space-y-3">
              {myFinishedGames.slice(0, 5).map(game => (
                <div key={game.id} className="bg-gray-700 rounded-lg p-4 border border-purple-500/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="text-white font-medium">
                        {game.winners?.includes(phone) ? '🏆 Ganaste' : '😔 Perdiste'}
                      </p>
                      <p className="text-purple-400 font-bold">{game.betAmount} créditos</p>
                      <p className="text-gray-400 text-xs">
                        {new Date(game.finishedAt).toLocaleDateString('es-CO')}
                      </p>
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

        {/* Mensaje si no hay nada */}
        {pendingInvitations.length === 0 && myActiveGames.length === 0 && myFinishedGames.length === 0 && (
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-8 text-center border border-gray-700">
            <Users className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No tienes retos pendientes</p>
            <p className="text-gray-500 text-sm mt-2">¡Crea un reto y reta a tus amigos!</p>
          </div>
        )}

        {/* Botón Volver */}
        <button
          onClick={onBack}
          className="w-full mt-6 bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Volver a Juegos
        </button>
      </div>

      {/* Modal de Crear Reto */}
      {showCreateModal && (
        <TriviaChallengeModal
          phone={phone}
          uid={uid}
          onClose={() => setShowCreateModal(false)}
        />
      )}
    </div>
  );
};

export default TriviaLobby;
