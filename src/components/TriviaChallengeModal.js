import React, { useState, useEffect } from 'react';
import { X, Send, Trophy, CheckCircle } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { createTriviaGame } from '../services/cloudFunctions';

const TriviaChallengeModal = ({ phone, uid, onClose }) => {
  const [betAmount, setBetAmount] = useState(100);
  const [invitedPhones, setInvitedPhones] = useState('');
  const [availableBalance, setAvailableBalance] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showRules, setShowRules] = useState(true);
  const [gameCreated, setGameCreated] = useState(null);

  useEffect(() => {
    const loadBalance = async () => {
      try {
        const phoneNormalized = phone.replace(/\D/g, '');
        const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
        
        const balanceRef = doc(db, 'client_balances', phoneWithCountry);
        const balanceDoc = await getDoc(balanceRef);
        
        if (balanceDoc.exists()) {
          const data = balanceDoc.data();
          setAvailableBalance((data.balance || 0) - (data.frozenBalance || 0));
        }
      } catch (err) { console.error(err); }
    };
    loadBalance();
  }, [phone]);

  const handleCreateGame = async () => {
    setError(''); setSuccess('');
    if (betAmount < 100) { setError('La apuesta mínima es 100 créditos'); return; }
    if (betAmount > availableBalance) { setError(`Saldo insuficiente. Disponible: ${availableBalance}`); return; }
    
    const phones = invitedPhones.split(/[\n,;]+/).map(p => p.trim()).filter(p => p.length >= 10);
    if (phones.length === 0) { setError('Ingresa al menos un número válido'); return; }
    
    setLoading(true);
    try {
      const result = await createTriviaGame(phone, uid, betAmount, phones);
      setGameCreated({ gameId: result.gameId, invitedPhones: phones, betAmount });
      setSuccess('¡Reto creado exitosamente!');
    } catch (err) { setError('❌ Error: ' + err.message); } finally { setLoading(false); }
  };

  const handleSendWhatsApp = () => {
    if (!gameCreated) return;
    const gameLink = `https://footbet-pro-rvdy.vercel.app/#trivia-accept/${gameCreated.gameId}`;
    const message = `🎮 *¡TE RETO A UNA TRIVIA DE FÚTBOL!* 🎮\n\n` +
      `Hola! Te han invitado a un reto.\n💰 *Apuesta:* ${gameCreated.betAmount} créditos\n\n` +
      `🎯 *Reglas:* 10 preguntas, 15 seg/pregunta, gana el más rápido.\n` +
      `⏳ *Tienes 24 horas para aceptar.*\n\n` +
      `👉 *Acepta el reto aquí:* ${gameLink}\n\n` +
      `¡Buena suerte! 🏆`;
    
    gameCreated.invitedPhones.forEach(p => {
      const clean = p.replace(/\D/g, '');
      const wc = clean.startsWith('57') ? clean : '57' + clean;
      window.open(`https://wa.me/${wc}?text=${encodeURIComponent(message)}`, '_blank');
    });
    setSuccess('✅ Invitaciones enviadas');
  };

  if (showRules) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">🎮 Trivia de Fútbol</h2><button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button></div>
          <div className="space-y-3 text-gray-300 text-sm">
            <div className="bg-green-900/30 border border-green-500/30 p-3 rounded">
              <p className="text-green-400 font-bold mb-1">¿Cómo funciona?</p>
              <ul className="list-disc pl-4 space-y-1"><li>Retas a amigos con créditos</li><li>10 preguntas de fútbol (15 seg)</li><li>Gana el que acierte más rápido</li><li>El ganador se lleva TODO el pozo</li></ul>
            </div>
            <div className="bg-yellow-900/30 border border-yellow-500/30 p-3 rounded">
              <p className="text-yellow-400 font-bold mb-1">⚠️ Importante</p>
              <ul className="list-disc pl-4 space-y-1"><li>Mínimo 100 créditos</li><li>24h para aceptar</li><li>Si nadie acepta, se devuelven</li></ul>
            </div>
            <p className="text-center">💰 Tu saldo: <span className="text-green-400 font-bold">{availableBalance}</span></p>
          </div>
          <button onClick={() => setShowRules(false)} className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl">Continuar →</button>
        </div>
      </div>
    );
  }

  if (gameCreated) {
    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl">
          <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">✅ ¡Reto Creado!</h2><button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button></div>
          <div className="text-center mb-4"><CheckCircle className="w-12 h-12 text-green-400 mx-auto mb-2" /><p className="text-white font-bold">Se congelaron {gameCreated.betAmount} créditos</p><p className="text-gray-400 text-xs mt-1">ID: {gameCreated.gameId}</p></div>
          <button onClick={handleSendWhatsApp} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl mb-3 flex items-center justify-center gap-2"><Send className="w-4 h-4" /> Enviar invitaciones por WhatsApp</button>
          <button onClick={onClose} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">Cerrar</button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between mb-4"><h2 className="text-xl font-bold text-white">🎮 Crear Reto</h2><button onClick={onClose}><X className="w-6 h-6 text-gray-400" /></button></div>
        {error && <div className="mb-3 bg-red-900/50 border border-red-500/50 rounded p-2"><p className="text-red-200 text-sm">{error}</p></div>}
        {success && <div className="mb-3 bg-green-900/50 border border-green-500/50 rounded p-2"><p className="text-green-200 text-sm">{success}</p></div>}
        <div className="space-y-4">
          <div className="bg-blue-900/30 border border-blue-500/30 rounded p-3 flex justify-between"><span className="text-blue-300 text-sm">💰 Saldo disponible:</span><span className="text-white font-bold">{availableBalance}</span></div>
          <div><label className="text-white text-sm mb-1 block">Apuesta (mín 100)</label><input type="number" value={betAmount} onChange={e => setBetAmount(Number(e.target.value)||0)} min="100" step="100" className="w-full bg-white/10 text-white rounded px-3 py-2 border border-white/20" /></div>
          <div><label className="text-white text-sm mb-1 block">📱 Teléfonos invitados</label><textarea value={invitedPhones} onChange={e => setInvitedPhones(e.target.value)} placeholder="3001234567, 3112345678" rows={3} className="w-full bg-white/10 text-white rounded px-3 py-2 border border-white/20 resize-none" /></div>
          <button onClick={handleCreateGame} disabled={loading} className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2">{loading ? 'Creando...' : <><Trophy className="w-4 h-4" /> Crear Reto</>}</button>
        </div>
      </div>
    </div>
  );
};

export default TriviaChallengeModal;