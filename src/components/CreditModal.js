import React, { useState, useCallback } from 'react';
import { DollarSign, TrendingUp, AlertCircle, CheckCircle, Wallet, Lock } from 'lucide-react';
import { getBalance, requestCreditPurchase, requestWithdrawal } from '../services/cloudFunctions';

const CreditModal = ({ phone, onClose }) => {
  const [activeTab, setActiveTab] = useState('deposit');
  const [balance, setBalance] = useState(null);
  const [uid, setUid] = useState('');
  const [uidVerified, setUidVerified] = useState(false);
  const [generatedUid, setGeneratedUid] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Estados para depósito
  const [depositAmount, setDepositAmount] = useState(500);
  const [depositMethod, setDepositMethod] = useState('nequi');
  
  // Estados para retiro
  const [withdrawAmount, setWithdrawAmount] = useState(5000);
  const [withdrawMethod, setWithdrawMethod] = useState('nequi');
  const [accountNumber, setAccountNumber] = useState('');

  const loadBalance = useCallback(async () => {
    if (!phone || !uid) {
      setBalance(null);
      return;
    }
    setLoading(true);
    setError('');
    try {
      const result = await getBalance(phone, uid);
      setBalance(result.balance || 0);
      setUidVerified(true);
    } catch (err) {
      console.error('Error cargando saldo:', err);
      setError('❌ Código UID incorrecto');
      setBalance(null);
      setUidVerified(false);
    } finally {
      setLoading(false);
    }
  }, [phone, uid]);

  const handleVerifyUid = async () => {
    if (!uid || uid.length !== 6) {
      setError('Ingresa un código de 6 dígitos');
      return;
    }
    await loadBalance();
  };

  const handleDeposit = async () => {
    setError('');
    setSuccess('');
    
    if (depositAmount < 500) {
      setError('La cantidad mínima es 500 créditos');
      return;
    }
    
    setLoading(true);
    try {
      const result = await requestCreditPurchase(phone, depositAmount, depositMethod);
      
      // 🔒 Si se generó un UID nuevo, mostrarlo al usuario
      if (result.uid && !uidVerified) {
        setGeneratedUid(result.uid);
        setUid(result.uid);
        setSuccess(`✅ Solicitud enviada. Tu código UID es: ${result.uid}. GUÁRDALO para futuras operaciones.`);
      } else {
        setSuccess(`✅ Solicitud enviada. ID: ${result.requestId}`);
      }
      
      setDepositAmount(500);
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async () => {
    setError('');
    setSuccess('');
    
    if (withdrawAmount < 5000) {
      setError('La cantidad mínima para retirar es 5,000 créditos');
      return;
    }
    
    if (!accountNumber.trim()) {
      setError('Ingresa tu número de cuenta');
      return;
    }
    
    if (balance !== null && withdrawAmount > balance) {
      setError('Saldo insuficiente');
      return;
    }
    
    setLoading(true);
    try {
      const result = await requestWithdrawal(phone, uid, withdrawAmount, withdrawMethod, accountNumber);
      setSuccess(`✅ Solicitud de retiro enviada. ID: ${result.requestId}`);
      setWithdrawAmount(5000);
      setAccountNumber('');
      loadBalance();
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const formatCOP = (credits) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0
    }).format(credits * 10);
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          {/* Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-400 flex items-center gap-2">
              <Wallet className="w-6 h-6" />
              Mis Créditos
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>

          {/* 🔒 Pantalla de validación UID */}
          {!uidVerified && !generatedUid && activeTab !== 'deposit' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-full">
                    <Lock className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Verifica tu identidad</p>
                    <p className="text-purple-200 text-sm">Ingresa tu código de 6 dígitos</p>
                  </div>
                </div>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">
                  Código UID (6 dígitos)
                </label>
                <input
                  type="text"
                  value={uid}
                  onChange={(e) => setUid(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  className="w-full bg-gray-700 text-white text-center text-2xl tracking-widest rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-gray-600"
                  placeholder="000000"
                  maxLength="6"
                />
                <p className="text-gray-400 text-xs mt-2">
                  💡 Este código te fue entregado al solicitar tu primera recarga
                </p>
              </div>

              <button
                onClick={handleVerifyUid}
                disabled={loading || uid.length !== 6}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Verificando...' : '🔓 Verificar Código'}
              </button>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                <p className="text-blue-300 text-xs">
                  ℹ️ <strong>¿No tienes código?</strong> Solicita una recarga primero y se te asignará un código único automáticamente.
                </p>
              </div>

              <button
                onClick={() => { setActiveTab('deposit'); setError(''); setSuccess(''); }}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                💰 Ir a Recargar (sin código)
              </button>
            </div>
          )}

          {/* 🎉 Mostrar UID generado después de recarga */}
          {generatedUid && !uidVerified && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-6 text-center">
                <CheckCircle className="w-16 h-16 text-white mx-auto mb-3" />
                <h3 className="text-white text-xl font-bold mb-2">¡Recarga Solicitada!</h3>
                <p className="text-green-200 text-sm mb-4">
                  Tu solicitud ha sido enviada al administrador
                </p>
                
                <div className="bg-white/20 rounded-lg p-4 mt-4">
                  <p className="text-white text-sm mb-2">🔐 Tu código UID es:</p>
                  <p className="text-white text-4xl font-bold tracking-widest">{generatedUid}</p>
                  <p className="text-green-200 text-xs mt-3">
                    ⚠️ GUARDA ESTE CÓDIGO. Lo necesitarás para ver tu saldo y retirar créditos.
                  </p>
                </div>
              </div>

              <button
                onClick={() => setUidVerified(true)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Continuar al Panel
              </button>
            </div>
          )}

          {/* 💰 Formulario de recarga (disponible sin UID) */}
          {!uidVerified && activeTab === 'deposit' && !generatedUid && (
            <div className="space-y-4">
              <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 mb-4">
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-3 rounded-full">
                    <TrendingUp className="w-8 h-8 text-white" />
                  </div>
                  <div>
                    <p className="text-white font-bold">Solicitar Recarga</p>
                    <p className="text-green-200 text-sm">Se te asignará un código UID único</p>
                  </div>
                </div>
              </div>

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

              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">
                  Cantidad de créditos
                </label>
                <input
                  type="number"
                  value={depositAmount}
                  onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                  min="500"
                  step="100"
                />
                <p className="text-gray-400 text-xs mt-1">
                  Mínimo: 500 créditos ({formatCOP(500)})
                </p>
                <p className="text-green-400 text-sm mt-1">
                  Equivalente: {formatCOP(depositAmount)}
                </p>
              </div>

              <div>
                <label className="text-gray-300 text-sm font-medium mb-2 block">
                  Método de pago
                </label>
                <select
                  value={depositMethod}
                  onChange={(e) => setDepositMethod(e.target.value)}
                  className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                >
                  <option value="nequi">Nequi</option>
                  <option value="daviplata">Daviplata</option>
                  <option value="bancolombia">Bancolombia</option>
                  <option value="transferencia">Transferencia</option>
                </select>
              </div>

              <button
                onClick={handleDeposit}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? 'Enviando...' : 'Solicitar Recarga'}
              </button>

              <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3">
                <p className="text-blue-300 text-xs">
                  ℹ️ Después de solicitar, el administrador verificará tu pago y acreditará los créditos.
                </p>
              </div>

              <button
                onClick={() => setActiveTab('verify')}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 rounded-lg transition-colors text-sm"
              >
                🔐 Ya tengo mi código UID
              </button>
            </div>
          )}

          {/* ✅ Panel completo (solo si está verificado) */}
          {uidVerified && (
            <>
              {/* Saldo actual */}
              <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 mb-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm">Saldo Disponible</p>
                    <p className="text-white text-3xl font-bold">
                      {loading ? '...' : `${balance || 0} créditos`}
                    </p>
                    <p className="text-green-200 text-sm mt-1">
                      Equivalente: {formatCOP(balance || 0)}
                    </p>
                  </div>
                  <DollarSign className="text-green-200 w-12 h-12" />
                </div>
              </div>

              {/* Tabs */}
              <div className="flex gap-2 mb-6">
                <button
                  onClick={() => { setActiveTab('deposit'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'deposit' 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <TrendingUp className="w-4 h-4 inline mr-2" />
                  Recargar
                </button>
                <button
                  onClick={() => { setActiveTab('withdraw'); setError(''); setSuccess(''); }}
                  className={`flex-1 py-2 rounded-lg font-medium transition-colors ${
                    activeTab === 'withdraw' 
                      ? 'bg-blue-600 text-white' 
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  <DollarSign className="w-4 h-4 inline mr-2" />
                  Retirar
                </button>
              </div>

              {/* Mensajes */}
              {error && (
                <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-400" />
                  <span className="text-red-300 text-sm">{error}</span>
                </div>
              )}
              
              {success && (
                <div className="bg-green-900/50 border border-green-700 rounded-lg p-3 mb-4 flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-green-400" />
                  <span className="text-green-300 text-sm">{success}</span>
                </div>
              )}

              {/* Formulario de recarga */}
              {activeTab === 'deposit' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      Cantidad de créditos
                    </label>
                    <input
                      type="number"
                      value={depositAmount}
                      onChange={(e) => setDepositAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                      min="500"
                      step="100"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Mínimo: 500 créditos ({formatCOP(500)})
                    </p>
                    <p className="text-green-400 text-sm mt-1">
                      Equivalente: {formatCOP(depositAmount)}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      Método de pago
                    </label>
                    <select
                      value={depositMethod}
                      onChange={(e) => setDepositMethod(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                    >
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="bancolombia">Bancolombia</option>
                      <option value="transferencia">Transferencia</option>
                    </select>
                  </div>

                  <button
                    onClick={handleDeposit}
                    disabled={loading}
                    className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Solicitar Recarga'}
                  </button>

                  <div className="bg-blue-900/30 border border-blue-700 rounded-lg p-3 mt-4">
                    <p className="text-blue-300 text-xs">
                      ℹ️ Después de solicitar, el administrador verificará tu pago y acreditará los créditos.
                    </p>
                  </div>
                </div>
              )}

              {/* Formulario de retiro */}
              {activeTab === 'withdraw' && (
                <div className="space-y-4">
                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      Cantidad a retirar
                    </label>
                    <input
                      type="number"
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(parseInt(e.target.value) || 0)}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                      min="5000"
                      step="500"
                    />
                    <p className="text-gray-400 text-xs mt-1">
                      Mínimo: 5,000 créditos ({formatCOP(5000)})
                    </p>
                    <p className="text-blue-400 text-sm mt-1">
                      Comisión (10%): {Math.floor(withdrawAmount * 0.10)} créditos
                    </p>
                    <p className="text-green-400 text-sm">
                      Recibirás: {formatCOP(withdrawAmount - Math.floor(withdrawAmount * 0.10))}
                    </p>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      Método de pago
                    </label>
                    <select
                      value={withdrawMethod}
                      onChange={(e) => setWithdrawMethod(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                    >
                      <option value="nequi">Nequi</option>
                      <option value="daviplata">Daviplata</option>
                      <option value="bancolombia">Bancolombia</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-gray-300 text-sm font-medium mb-2 block">
                      Número de cuenta
                    </label>
                    <input
                      type="tel"
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500 border border-gray-600"
                      placeholder="300 123 4567"
                    />
                  </div>

                  <button
                    onClick={handleWithdraw}
                    disabled={loading}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50"
                  >
                    {loading ? 'Enviando...' : 'Solicitar Retiro'}
                  </button>

                  <div className="bg-yellow-900/30 border border-yellow-700 rounded-lg p-3 mt-4">
                    <p className="text-yellow-300 text-xs">
                      ⚠️ La comisión del 10% se descuenta automáticamente. El pago se procesará en máximo 24 horas.
                    </p>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default CreditModal;