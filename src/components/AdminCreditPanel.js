import React, { useState, useEffect, useCallback } from 'react';
import { CheckCircle, XCircle, Clock, Wallet, TrendingUp, TrendingDown, AlertCircle, RefreshCw, Lock, History, FileText, Calendar } from 'lucide-react';
import { db } from '../services/firebase';
 import { collection, onSnapshot, query, where, limit } from 'firebase/firestore';
import { addCredits, processWithdrawal } from '../services/cloudFunctions';

const formatCOP = (credits) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0
  }).format(credits * 10);
};

const AdminCreditPanel = () => {
  const [pendingRequests, setPendingRequests] = useState([]);
  const [allRequests, setAllRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estado para tabs principales
  const [mainTab, setMainTab] = useState('pending'); // pending, history, manual
  
  // Estado para tabs de historial
  const [historyTab, setHistoryTab] = useState('all'); // all, approved, rejected
  
  // Estado para filtros de historial
  const [historyFilterPhone, setHistoryFilterPhone] = useState('');
  const [historyFilterType, setHistoryFilterType] = useState('all'); // all, deposit, withdraw
  
  // Estado para agregar créditos manualmente
  const [manualPhone, setManualPhone] = useState('');
  const [manualAmount, setManualAmount] = useState(500);
  const [processing, setProcessing] = useState({});

  // Listener para solicitudes pendientes
  useEffect(() => {
    const q = query(
      collection(db, 'withdrawal_requests'),
      where('status', '==', 'pending')
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        return new Date(b.requestedAt) - new Date(a.requestedAt);
      });
      setPendingRequests(requests);
    }, (err) => {
      console.error('Error en listener de withdrawal_requests:', err);
    });
    
    return () => unsubscribe();
  }, []);

  // Listener para TODAS las solicitudes (historial)
  useEffect(() => {
    // Firestore no permite orderBy sin índice compuesto, así que ordenamos en cliente
    const q = query(
      collection(db, 'withdrawal_requests'),
      limit(500) // Limitar a 500 para performance
    );
    
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const requests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).sort((a, b) => {
        return new Date(b.requestedAt) - new Date(a.requestedAt);
      });
      setAllRequests(requests);
    }, (err) => {
      console.error('Error en listener de historial:', err);
    });
    
    return () => unsubscribe();
  }, []);

  const handleApproveDeposit = useCallback(async (request) => {
    if (!window.confirm(`¿Aprobar recarga de ${request.amount} créditos para ${request.phone}?`)) {
      return;
    }
    
    setProcessing(prev => ({ ...prev, [request.id]: true }));
    setError('');
    setSuccess('');
    
    try {
      const result = await addCredits(request.phone, request.amount, request.id);
      setSuccess(`✅ Recarga aprobada: ${request.amount} créditos a ${request.phone}`);
      
      const clientUid = request.clientUid || result.clientUid;
      
      const phoneForWhatsApp = request.phone.replace(/\D/g, '');
      let message = `✅ *RECARGA APROBADA* ✅\n\n` +
        `Hola! Tu recarga ha sido aprobada exitosamente.\n\n` +
        `💰 *Monto acreditado:* ${request.amount} créditos\n` +
        `💵 *Equivalente:* ${formatCOP(request.amount)}\n` +
        `📊 *Saldo actual:* ${result.newBalance} créditos\n\n`;
      
      if (clientUid) {
        message += `🔐 *TU CÓDIGO DE ACCESO:* ${clientUid}\n\n` +
          `⚠️ *GUARDA ESTE CÓDIGO.* Lo necesitarás para:\n` +
          `• Ver tu saldo de créditos\n` +
          `• Solicitar retiros de créditos\n\n` +
          `🔒 *NUNCA compartas este código con nadie.*\n\n`;
      }
      
      message += `¡Gracias por usar FootBet Pro! 🎯`;
      
      const whatsappUrl = `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [request.id]: false }));
    }
  }, []);

  const handleRejectRequest = useCallback(async (request) => {
    if (!window.confirm(`¿Rechazar solicitud de ${request.phone}?`)) {
      return;
    }
    
    setProcessing(prev => ({ ...prev, [request.id]: true }));
    setError('');
    setSuccess('');
    
    try {
      if (request.type === 'withdraw') {
        await processWithdrawal(request.id, false);
      } else {
        const { doc, updateDoc } = await import('firebase/firestore');
        await updateDoc(doc(db, 'withdrawal_requests', request.id), {
          status: 'rejected',
          processedAt: new Date().toISOString()
        });
      }
      setSuccess(`✅ Solicitud rechazada`);
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [request.id]: false }));
    }
  }, []);

  const handleApproveWithdraw = useCallback(async (request) => {
    if (!window.confirm(`¿Aprobar retiro de ${request.amount} créditos para ${request.phone}?\n\nComisión: ${request.commission} créditos\nNeto: ${request.netAmount} créditos\nCOP: ${formatCOP(request.netAmount)}`)) {
      return;
    }
    
    setProcessing(prev => ({ ...prev, [request.id]: true }));
    setError('');
    setSuccess('');
    
    try {
      const result = await processWithdrawal(request.id, true);
      setSuccess(`✅ Retiro aprobado: ${request.netAmount} créditos a ${request.phone}`);
      
      const phoneForWhatsApp = request.phone.replace(/\D/g, '');
      const message = `✅ *RETIRO APROBADO* ✅\n\n` +
        `Hola! Tu solicitud de retiro ha sido aprobada.\n\n` +
        `💰 *Monto solicitado:* ${request.amount} créditos\n` +
        `📊 *Comisión (10%):* ${request.commission} créditos\n` +
        `💵 *Neto a recibir:* ${request.netAmount} créditos\n` +
        `💵 *Equivalente COP:* ${formatCOP(request.netAmount)}\n` +
        `💳 *Método:* ${request.paymentMethod}\n` +
        `🏦 *Cuenta:* ${request.accountNumber}\n\n` +
        `📊 *Saldo actual:* ${result.newBalance || 'consulta en la app'} créditos\n\n` +
        `El pago se procesará en las próximas horas.\n\n` +
        `¡Gracias por usar FootBet Pro! 🎯`;
      
      const whatsappUrl = `https://wa.me/${phoneForWhatsApp}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setProcessing(prev => ({ ...prev, [request.id]: false }));
    }
  }, []);

  const handleManualAddCredits = useCallback(async () => {
    if (!manualPhone.trim()) {
      setError('Ingresa un número de teléfono');
      return;
    }
    
    if (manualAmount <= 0) {
      setError('La cantidad debe ser mayor a 0');
      return;
    }
    
    if (!window.confirm(`¿Agregar ${manualAmount} créditos a ${manualPhone}?`)) {
      return;
    }
    
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const phoneNormalized = manualPhone.replace(/\D/g, '');
      await addCredits(phoneNormalized, manualAmount, null);
      setSuccess(`✅ ${manualAmount} créditos agregados a ${phoneNormalized}`);
      setManualPhone('');
      setManualAmount(500);
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  }, [manualPhone, manualAmount]);

  // Filtrar solicitudes pendientes
  const pendingDeposits = pendingRequests.filter(r => r.type === 'deposit');
  const pendingWithdraws = pendingRequests.filter(r => r.type === 'withdraw');

  // Filtrar historial
  const filteredHistory = allRequests.filter(r => {
    // Filtro por estado
    if (historyTab === 'approved' && r.status !== 'completed') return false;
    if (historyTab === 'rejected' && r.status !== 'rejected') return false;
    
    // Filtro por teléfono
    if (historyFilterPhone && !r.phone.includes(historyFilterPhone)) return false;
    
    // Filtro por tipo
    if (historyFilterType !== 'all' && r.type !== historyFilterType) return false;
    
    return true;
  });

  // Estadísticas del historial
  const stats = {
    totalApproved: allRequests.filter(r => r.status === 'completed').length,
    totalRejected: allRequests.filter(r => r.status === 'rejected').length,
    totalDepositsApproved: allRequests
      .filter(r => r.status === 'completed' && r.type === 'deposit')
      .reduce((sum, r) => sum + (r.amount || 0), 0),
    totalWithdrawsApproved: allRequests
      .filter(r => r.status === 'completed' && r.type === 'withdraw')
      .reduce((sum, r) => sum + (r.netAmount || 0), 0),
  };

  return (
    <div className="space-y-6">
      {/* Mensajes */}
      {error && (
        <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 text-red-400" />
          <span className="text-red-300 text-sm">{error}</span>
        </div>
      )}
      
      {success && (
        <div className="bg-green-900/50 border border-green-700 rounded-lg p-3 flex items-center gap-2">
          <CheckCircle className="w-4 h-4 text-green-400" />
          <span className="text-green-300 text-sm">{success}</span>
        </div>
      )}

      {/* Tabs principales */}
      <div className="flex gap-2 bg-gray-800/70 backdrop-blur-sm rounded-xl p-2 border border-gray-700">
        <button
          onClick={() => setMainTab('pending')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            mainTab === 'pending' 
              ? 'bg-green-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Clock className="w-4 h-4" />
          Pendientes ({pendingRequests.length})
        </button>
        <button
          onClick={() => setMainTab('history')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            mainTab === 'history' 
              ? 'bg-purple-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <History className="w-4 h-4" />
          Historial ({allRequests.length})
        </button>
        <button
          onClick={() => setMainTab('manual')}
          className={`flex-1 py-3 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${
            mainTab === 'manual' 
              ? 'bg-yellow-600 text-white' 
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <Wallet className="w-4 h-4" />
          Manual
        </button>
      </div>

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: PENDIENTES */}
      {/* ═══════════════════════════════════════════════════════ */}
      {mainTab === 'pending' && (
        <>
          {/* Resumen */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-green-100 text-sm">Recargas Pendientes</p>
                  <p className="text-white text-2xl font-bold">{pendingDeposits.length}</p>
                </div>
                <TrendingUp className="text-green-200 w-8 h-8" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-blue-100 text-sm">Retiros Pendientes</p>
                  <p className="text-white text-2xl font-bold">{pendingWithdraws.length}</p>
                </div>
                <TrendingDown className="text-blue-200 w-8 h-8" />
              </div>
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 shadow-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-purple-100 text-sm">Total Solicitudes</p>
                  <p className="text-white text-2xl font-bold">{pendingRequests.length}</p>
                </div>
                <Wallet className="text-purple-200 w-8 h-8" />
              </div>
            </div>
          </div>

          {/* Recargas pendientes */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingUp className="w-5 h-5 text-green-400" />
              Recargas Pendientes ({pendingDeposits.length})
            </h2>
            
            {pendingDeposits.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay recargas pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingDeposits.map(request => (
                  <div key={request.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-medium">📱 {request.phone}</p>
                        <p className="text-green-400 font-bold text-lg">{request.amount} créditos</p>
                        <p className="text-gray-400 text-sm">Equivalente: {formatCOP(request.amount)}</p>
                        <p className="text-gray-500 text-xs mt-1">
                          Método: {request.paymentMethod} • ID: {request.id}
                        </p>
                        {request.clientUid && (
                          <p className="text-purple-400 text-xs mt-1 flex items-center gap-1">
                            <Lock className="w-3 h-3" /> UID: {request.clientUid}
                          </p>
                        )}
                        <p className="text-gray-500 text-xs">
                          <Clock className="w-3 h-3 inline" /> {new Date(request.requestedAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveDeposit(request)}
                        disabled={processing[request.id]}
                        className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {processing[request.id] ? 'Procesando...' : 'Aprobar'}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request)}
                        disabled={processing[request.id]}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Retiros pendientes */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <TrendingDown className="w-5 h-5 text-blue-400" />
              Retiros Pendientes ({pendingWithdraws.length})
            </h2>
            
            {pendingWithdraws.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <CheckCircle className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay retiros pendientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {pendingWithdraws.map(request => (
                  <div key={request.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <p className="text-white font-medium">📱 {request.phone}</p>
                        <p className="text-blue-400 font-bold text-lg">{request.amount} créditos</p>
                        <div className="text-sm mt-1 space-y-1">
                          <p className="text-yellow-400">
                            Comisión (10%): {request.commission} créditos
                          </p>
                          <p className="text-green-400 font-bold">
                            Neto: {request.netAmount} créditos ({formatCOP(request.netAmount)})
                          </p>
                          <p className="text-gray-400">
                            {request.paymentMethod}: {request.accountNumber}
                          </p>
                        </div>
                        <p className="text-gray-500 text-xs mt-1">
                          ID: {request.id}
                        </p>
                        <p className="text-gray-500 text-xs">
                          <Clock className="w-3 h-3 inline" /> {new Date(request.requestedAt).toLocaleString('es-CO')}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleApproveWithdraw(request)}
                        disabled={processing[request.id]}
                        className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <CheckCircle className="w-4 h-4" />
                        {processing[request.id] ? 'Procesando...' : 'Aprobar Retiro'}
                      </button>
                      <button
                        onClick={() => handleRejectRequest(request)}
                        disabled={processing[request.id]}
                        className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <XCircle className="w-4 h-4" />
                        Rechazar
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: HISTORIAL */}
      {/* ═══════════════════════════════════════════════════════ */}
      {mainTab === 'history' && (
        <>
          {/* Estadísticas */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 shadow-lg">
              <p className="text-green-100 text-sm">Recargas Aprobadas</p>
              <p className="text-white text-2xl font-bold">{stats.totalApproved}</p>
              <p className="text-green-200 text-xs mt-1">Total: {formatCOP(stats.totalDepositsApproved)}</p>
            </div>
            <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 shadow-lg">
              <p className="text-blue-100 text-sm">Retiros Aprobados</p>
              <p className="text-white text-2xl font-bold">
                {allRequests.filter(r => r.status === 'completed' && r.type === 'withdraw').length}
              </p>
              <p className="text-blue-200 text-xs mt-1">Total: {formatCOP(stats.totalWithdrawsApproved)}</p>
            </div>
            <div className="bg-gradient-to-r from-red-600 to-red-800 rounded-xl p-4 shadow-lg">
              <p className="text-red-100 text-sm">Rechazadas</p>
              <p className="text-white text-2xl font-bold">{stats.totalRejected}</p>
            </div>
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 shadow-lg">
              <p className="text-purple-100 text-sm">Total Historial</p>
              <p className="text-white text-2xl font-bold">{allRequests.length}</p>
            </div>
          </div>

          {/* Tabs de historial */}
          <div className="flex gap-2 bg-gray-800/70 backdrop-blur-sm rounded-xl p-2 border border-gray-700">
            <button
              onClick={() => setHistoryTab('all')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${
                historyTab === 'all' 
                  ? 'bg-purple-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todas ({allRequests.length})
            </button>
            <button
              onClick={() => setHistoryTab('approved')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${
                historyTab === 'approved' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Aprobadas ({stats.totalApproved})
            </button>
            <button
              onClick={() => setHistoryTab('rejected')}
              className={`flex-1 py-2 rounded-lg font-medium transition-colors text-sm ${
                historyTab === 'rejected' 
                  ? 'bg-red-600 text-white' 
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Rechazadas ({stats.totalRejected})
            </button>
          </div>

          {/* Filtros */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
            <h3 className="text-white text-sm font-bold mb-3 flex items-center gap-2">
              <FileText className="w-4 h-4" /> Filtros
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">
                  Teléfono
                </label>
                <input
                  type="text"
                  value={historyFilterPhone}
                  onChange={(e) => setHistoryFilterPhone(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600"
                  placeholder="Buscar por teléfono..."
                />
              </div>
              <div>
                <label className="text-gray-300 text-xs font-medium mb-1 block">
                  Tipo
                </label>
                <select
                  value={historyFilterType}
                  onChange={(e) => setHistoryFilterType(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600"
                >
                  <option value="all">Todos</option>
                  <option value="deposit">Recargas</option>
                  <option value="withdraw">Retiros</option>
                </select>
              </div>
            </div>
          </div>

          {/* Lista de historial */}
          <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700">
            <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
              <History className="w-5 h-5 text-purple-400" />
              Historial ({filteredHistory.length})
            </h2>
            
            {filteredHistory.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay transacciones en el historial</p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredHistory.map(request => (
                  <div key={request.id} className={`bg-gray-700 rounded-lg p-4 border-2 ${
                    request.status === 'completed' ? 'border-green-600' :
                    request.status === 'rejected' ? 'border-red-600' :
                    'border-yellow-600'
                  }`}>
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            request.status === 'completed' ? 'bg-green-600 text-white' :
                            request.status === 'rejected' ? 'bg-red-600 text-white' :
                            'bg-yellow-600 text-white'
                          }`}>
                            {request.status === 'completed' ? '✅ APROBADA' :
                             request.status === 'rejected' ? '❌ RECHAZADA' :
                             '⏳ PENDIENTE'}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                            request.type === 'deposit' ? 'bg-green-700 text-green-100' :
                            'bg-blue-700 text-blue-100'
                          }`}>
                            {request.type === 'deposit' ? '💰 RECARGA' : '💸 RETIRO'}
                          </span>
                        </div>
                        <p className="text-white font-medium">📱 {request.phone}</p>
                        <p className={`font-bold text-lg ${
                          request.type === 'deposit' ? 'text-green-400' : 'text-blue-400'
                        }`}>
                          {request.amount} créditos
                        </p>
                        {request.type === 'withdraw' && (
                          <div className="text-sm mt-1 space-y-1">
                            <p className="text-yellow-400">
                              Comisión: {request.commission} créditos
                            </p>
                            <p className="text-green-400 font-bold">
                              Neto: {request.netAmount} créditos ({formatCOP(request.netAmount)})
                            </p>
                            <p className="text-gray-400">
                              {request.paymentMethod}: {request.accountNumber}
                            </p>
                          </div>
                        )}
                        <p className="text-gray-500 text-xs mt-2">
                          ID: {request.id}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-gray-400 text-xs flex items-center gap-1 justify-end">
                          <Calendar className="w-3 h-3" />
                          {new Date(request.requestedAt).toLocaleDateString('es-CO')}
                        </p>
                        <p className="text-gray-500 text-xs">
                          {new Date(request.requestedAt).toLocaleTimeString('es-CO')}
                        </p>
                        {request.processedAt && (
                          <p className="text-gray-500 text-xs mt-1">
                            Procesada: {new Date(request.processedAt).toLocaleDateString('es-CO')}
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ═══════════════════════════════════════════════════════ */}
      {/* TAB: AGREGAR MANUALMENTE */}
      {/* ═══════════════════════════════════════════════════════ */}
      {mainTab === 'manual' && (
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 shadow-lg border border-gray-700">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <Wallet className="w-5 h-5 text-yellow-400" />
            Agregar Créditos Manualmente
          </h2>
          
          <div className="space-y-3">
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Teléfono del cliente
              </label>
              <input
                type="tel"
                value={manualPhone}
                onChange={(e) => setManualPhone(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-600"
                placeholder="3113003606"
              />
            </div>
            
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 block">
                Cantidad de créditos
              </label>
              <input
                type="number"
                value={manualAmount}
                onChange={(e) => setManualAmount(parseInt(e.target.value) || 0)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-yellow-500 border border-gray-600"
                min="1"
                step="100"
              />
              <p className="text-yellow-400 text-sm mt-1">
                Equivalente: {formatCOP(manualAmount)}
              </p>
            </div>
            
            <button
              onClick={handleManualAddCredits}
              disabled={loading}
              className="w-full bg-yellow-600 hover:bg-yellow-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              {loading ? 'Agregando...' : 'Agregar Créditos'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminCreditPanel;