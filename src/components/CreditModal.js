import React, { useState, useEffect } from 'react';
import { X, DollarSign, TrendingUp, AlertCircle, CheckCircle, Wallet } from 'lucide-react';
import { getBalance, requestCreditPurchase, requestWithdrawal } from '../services/cloudFunctions';

const CreditModal = ({ phone, onClose }) => {
  const [activeTab, setActiveTab] = useState('balance'); // balance, deposit, withdraw
  const [balance, setBalance] = useState(null);
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

  // Cargar saldo al abrir el modal
  useEffect(() => {
    loadBalance();
  }, [phone]);

  const loadBalance = async () => {
    if (!phone) return;
    setLoading(true);
    try {
      const result = await getBalance(phone);
      setBalance(result.balance || 0);
    } catch (err) {
      console.error('Error cargando saldo:', err);
      setBalance(0);
    } finally {
      setLoading(false);
    }
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
      setSuccess(`✅ Solicitud enviada. ID: ${result.requestId}`);
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
      const result = await requestWithdrawal(phone, withdrawAmount, withdrawMethod, accountNumber);
      setSuccess(`✅ Solicitud de retiro enviada. ID: ${result.requestId}`);
      setWithdrawAmount(5000);
      setAccountNumber('');
      loadBalance(); // Recargar saldo
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

          {/* Contenido de tabs */}
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
        </div>
      </div>
    </div>
  );
};

export default CreditModal;
