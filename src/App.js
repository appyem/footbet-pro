import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { submitMatchResult, deleteSeller as deleteSellerFromServer, createMatch, updateMatch, deleteMatch as deleteMatchFromServer } from './services/cloudFunctions';
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged, createUserWithEmailAndPassword } from 'firebase/auth';
import { Phone, LogOut, Home, Ticket, FileText, BarChart3, LockIcon, Settings, Plus, User, Mail, Percent, Calendar, Clock, CheckCircle, AlertCircle, X, Save, Trash2, Download, Award, Users, DollarSign, Database, Star, Crown, BarChart2, Search, RefreshCw, Info } from 'lucide-react';
import { getCurrentDate, getCurrentTime, shouldCloseMatch } from './services/matchService';
import { getCountryFlag, getCountryOptions } from './services/countryFlags';
import PublicDashboard from './components/PublicDashboard';
import PendingBetsView from './components/PendingBetsView';





// Configuración de Firebase
const firebaseConfig = {
  apiKey: "AIzaSyBHz3LsqwCDxQkhmUdj1E86kAYPXnQrkGg",
  authDomain: "footbet-pro.firebaseapp.com",
  projectId: "footbet-pro",
  storageBucket: "footbet-pro.firebasestorage.app",
  messagingSenderId: "768296334899",
  appId: "1:768296334899:web:708aa3e1883b0a89a2d546"
};
// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app); 
// Componente aislado para los inputs del cliente
const CustomerInfoForm = React.memo(({ customerName, customerPhone, onNameChange, onPhoneChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="text-green-100 text-sm font-medium mb-2 flex items-center gap-2">
          <User className="w-4 h-4" />
          Nombre del Cliente
        </label>
        <input
          type="text"
          value={customerName}
          onChange={(e) => onNameChange(e.target.value)}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600"
          placeholder="Nombre completo del cliente"
        />
      </div>
      <div>
        <label className="text-green-100 text-sm font-medium mb-2 flex items-center gap-2">
          <Phone className="w-4 h-4" />
          Teléfono del Cliente
        </label>
        <input
          type="tel"
          value={customerPhone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className="w-full bg-green-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-green-600"
          placeholder="300 123 4567"
        />
      </div>
    </>
  );
});



// Componente aislado para cada partido
const MatchBetCard = React.memo(({ match, selectedBet, onSelectionChange, isTrapMatch }) => {
  // Protección contra match undefined o incompleto
  if (!match || !match.homeTeam || !match.awayTeam) {
    return null;
  }
  return (
    <div className={`bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-gray-600 transition-colors`}>
            <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <span className="text-lg">{getCountryFlag(match.country)}</span>
            <Calendar className="w-3 h-3" />
            {match.league}
          </span>
          <span className="text-gray-500 text-xs mt-1">
            {match.date}
          </span>
        </div>
        <span className="text-gray-400 text-sm flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {match.time}
        </span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-white font-medium text-lg">{match.homeTeam}</span>
        <span className="text-gray-400 text-xl font-bold">vs</span>
        <span className="text-white font-medium text-lg">{match.awayTeam}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
        {/* Local */}
        <button
          onClick={() => onSelectionChange(match.id, '1', match.odds.home)}
          className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
            selectedBet?.selection === '1'
              ? 'bg-green-500 text-white shadow-lg shadow-green-500/50 border-2 border-white/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
          }`}
        >
          <div className="text-xs font-bold">Local</div>
          <div className="text-lg mt-1 text-white drop-shadow-lg">{match.odds.home || '1.0'}</div>
        </button>
        
        {/* Empate */}
        <button
          onClick={() => onSelectionChange(match.id, 'X', match.odds.draw)}
          className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
            selectedBet?.selection === 'X'
              ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50 border-2 border-white/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
          }`}
        >
          <div className="text-xs font-bold">Empate</div>
          <div className="text-lg mt-1 text-white drop-shadow-lg">{match.odds.draw || '1.0'}</div>
        </button>
        
        {/* Visitante */}
        <button
          onClick={() => onSelectionChange(match.id, '2', match.odds.away)}
          className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
            selectedBet?.selection === '2'
              ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 border-2 border-white/30'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
          }`}
        >
          <div className="text-xs font-bold">Visitante</div>
          <div className="text-lg mt-1 text-white drop-shadow-lg">{match.odds.away || '1.0'}</div>
        </button>
      </div>
      {selectedBet && (
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm font-medium">
              {selectedBet.selection === '1' ? 'Ganador Local' : 
               selectedBet.selection === 'X' ? 'Empate' : 'Ganador Visitante'}
            </span>
            <span className="text-green-400 font-bold text-sm bg-green-900/30 px-2 py-1 rounded">
              {selectedBet.odds}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

// Componente para mostrar el ticket generado
const TicketPreviewModal = ({ ticket, onClose, onCopyToWhatsApp, onResend }) => {
  if (!ticket) return null;
  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  const getSelectionText = (selection) => {
    switch (selection) {
      case '1': return 'Ganador Local';
      case 'X': return 'Empate';
      case '2': return 'Ganador Visitante';
      default: return selection;
    }
  };
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-400">🎫 Ticket Generado</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          <div className="bg-gradient-to-r from-green-900/50 to-gray-900 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Código:</div>
              <div className="text-white font-mono">{ticket.id}</div>
              <div className="text-gray-400">Cliente:</div>
              <div className="text-white">{ticket.customerName}</div>
              <div className="text-gray-400">Teléfono:</div>
              <div className="text-white">{ticket.customerPhone}</div>
              <div className="text-gray-400">Vendedor:</div>
              <div className="text-white">{ticket.sellerName}</div>
              <div className="text-gray-400">Fecha:</div>
              <div className="text-white">{ticket.date} {ticket.time}</div>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {ticket.bets.map((bet, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-1">
                  {bet.homeTeam} vs {bet.awayTeam}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">
                    {getSelectionText(bet.selection)}
                  </span>
                  <span className="text-green-400 text-sm">x{bet.odds}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 mb-6">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-lg">Total Apostado:</span>
              <span className="text-white text-xl font-bold">{formatCOP(ticket.totalStake)}</span>
            </div>
            <div className="text-green-100 text-sm mt-1">
              Código de verificación: <span className="font-mono">{ticket.verificationCode}</span>
            </div>
            <div className="text-yellow-300 text-xs mt-2">
              🎯 Premios: 5 aciertos = Recupera Tu jugada | 6 aciertos = Ticket Dorado (10 juegos) | 7 aciertos = $1M
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={onCopyToWhatsApp}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Enviar por WhatsApp
            </button>
            <button
              onClick={onResend}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RefreshCw className="w-5 h-5" />
              Reenviar
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Modal de detalles del ticket
const TicketDetailsModal = ({ ticket, onClose }) => {
  if (!ticket) return null;
  const formatCOP = (amount) => {
    return new Intl.NumberFormat('es-CO', {
      style: 'currency',
      currency: 'COP',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };
  const getSelectionText = (selection) => {
    switch (selection) {
      case '1': return 'Ganador Local';
      case 'X': return 'Empate';
      case '2': return 'Ganador Visitante';
      default: return selection;
    }
  };
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-400">📋 Detalles del Ticket</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          <div className="bg-gradient-to-r from-green-900/50 to-gray-900 rounded-xl p-4 mb-4">
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-400">Código:</div>
              <div className="text-white font-mono">{ticket.id}</div>
              <div className="text-gray-400">Cliente:</div>
              <div className="text-white">{ticket.customerName}</div>
              <div className="text-gray-400">Teléfono:</div>
              <div className="text-white">{ticket.customerPhone}</div>
              <div className="text-gray-400">Vendedor:</div>
              <div className="text-white">{ticket.sellerName}</div>
              <div className="text-gray-400">Fecha:</div>
              <div className="text-white">{ticket.date} {ticket.time}</div>
            </div>
          </div>
          <div className="space-y-3 mb-6">
            {ticket.bets.map((bet, index) => (
              <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                <div className="text-sm text-gray-300 mb-1">
                  {bet.homeTeam} vs {bet.awayTeam}
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">
                    {getSelectionText(bet.selection)}
                  </span>
                  <span className="text-green-400 text-sm">x{bet.odds}</span>
                </div>
              </div>
            ))}
          </div>
          <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4">
            <div className="flex justify-between items-center">
              <span className="text-white font-bold text-lg">Total Apostado:</span>
              <span className="text-white text-xl font-bold">{formatCOP(ticket.totalStake)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
// Modal para reenviar ticket
const ResendTicketModal = ({ ticket, onClose, onResend }) => {
  const [customerPhone, setCustomerPhone] = useState(ticket.customerPhone.replace('+57 ', ''));
  const handleResend = () => {
    if (!customerPhone.trim()) {
      alert('Por favor ingrese un número de teléfono válido');
      return;
    }
    const fullPhone = `+57 ${customerPhone.trim()}`;
    onResend(fullPhone);
    onClose();
  };
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-400">📱 Reenviar Ticket</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white text-2xl"
            >
              ×
            </button>
          </div>
          <div className="mb-6">
            <label className="block text-gray-300 text-sm font-medium mb-2">
              Número de Teléfono (sin +57)
            </label>
            <input
              type="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
              placeholder="300 123 4567"
            />
            <p className="text-gray-400 text-xs mt-2">El código +57 se agregará automáticamente</p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleResend}
              className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Phone className="w-5 h-5" />
              Enviar por WhatsApp
            </button>
            <button
              onClick={onClose}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Modal para crear vendedor
const CreateSellerModal = ({ onClose, onSellerCreated }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');  // ← NUEVO
  const [commission, setCommission] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validaciones
    if (!name.trim() || !email.trim() || !password.trim() || !phone.trim() || !commission) {
      setError('Todos los campos son obligatorios');
      return;
    }
    if (!email.includes('@')) {
      setError('Por favor ingrese un correo electrónico válido');
      return;
    }
    const commissionValue = parseFloat(commission);
    if (isNaN(commissionValue) || commissionValue < 0 || commissionValue > 100) {
      setError('La comisión debe estar entre 0 y 100');
      return;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return;
    }

    const newSeller = {
      id: `seller${Date.now()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      password: password,
      phone: phone.trim(),  // ← NUEVO
      commission: commissionValue
    };

    onSellerCreated(newSeller);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-green-400">Crear Nuevo Vendedor</h2>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          {error && (
            <div className="bg-red-900/50 border border-red-700 rounded-lg p-3 mb-4 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-300 text-sm">{error}</span>
            </div>
          )}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Nombre */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                <User className="w-4 h-4" />
                Nombre del Vendedor
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="Juan Pérez"
                required
              />
            </div>
            {/* Email */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                <Mail className="w-4 h-4" />
                Correo Electrónico (Usuario)
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="vendedor@footbet.com"
                required
              />
            </div>
            {/* Teléfono - NUEVO */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Número de WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="300 123 4567"
                required
              />
              <p className="text-gray-400 text-xs mt-1">Número donde los clientes enviarán Sus jugadas</p>
            </div>
            {/* Contraseña */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                <LockIcon className="w-4 h-4" />
                Contraseña
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="••••••••"
                required
              />
            </div>

            {/* 🔹 WhatsApp */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                <Phone className="w-4 h-4" />
                Número de WhatsApp
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="300 123 4567"
                required
              />
              <p className="text-gray-400 text-xs mt-1">Número donde los clientes enviarán Sus jugadas</p>
            </div>


            {/* Comisión */}
            <div>
              <label className="text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
                <Percent className="w-4 h-4" />
                Porcentaje de Comisión (%)
              </label>
              <input
                type="number"
                value={commission}
                onChange={(e) => setCommission(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="15"
                min="0"
                max="100"
                step="0.1"
                required
              />
              <p className="text-gray-400 text-xs mt-1">Ejemplo: 15 para 15% de comisión</p>
            </div>
            {/* Botones */}
            <div className="flex gap-3 pt-4">
              <button
                type="submit"
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Save className="w-5 h-5" />
                Crear Vendedor
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
// Modal para confirmar eliminación de vendedor
const DeleteSellerModal = ({ seller, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-red-400">Eliminar Vendedor</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-300 mb-6">
            ¿Está seguro que desea eliminar al vendedor <span className="text-white font-medium">{seller.name}</span>? 
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
// Modal para confirmar eliminación de ticket
const DeleteTicketModal = ({ ticket, onConfirm, onCancel }) => {
  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold text-red-400">Eliminar Ticket</h3>
            <button onClick={onCancel} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-300 mb-6">
            ¿Está seguro que desea eliminar el ticket <span className="text-white font-medium">{ticket.id}</span>? 
            Esta acción no se puede deshacer.
          </p>
          <div className="flex gap-3">
            <button
              onClick={onConfirm}
              className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Trash2 className="w-5 h-5" />
              Eliminar
            </button>
            <button
              onClick={onCancel}
              className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};


// Función para formatear COP
const formatCOP = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};
// ✅ FUNCIÓN CORREGIDA PARA IPHONE Y ANDROID
const copyToWhatsApp = (ticket) => {
  if (!ticket) return;
  
  // ✅ 1. Formatear número correctamente (sin espacios, con código país)
  let phoneNumber = ticket.customerPhone.replace(/\D/g, ''); // Solo números
  
  if (!phoneNumber.startsWith('57')) {
    phoneNumber = `57${phoneNumber}`;
  }
  
  // ✅ 2. Crear mensaje
  const message = `🎫 *TICKET DE Tu jugada - ${ticket.id}* 🎫
*Cliente:* ${ticket.customerName}
*Teléfono:* +${phoneNumber}
*Vendedor:* ${ticket.sellerName}
*Fecha:* ${ticket.date} ${ticket.time}
*Tu jugadaS:*
${ticket.bets.map((bet, index) =>
  `${index + 1}. ${bet.homeTeam} vs ${bet.awayTeam}
   - ${bet.selection === '1' ? 'Ganador Local' : bet.selection === 'X' ? 'Empate' : 'Ganador Visitante'} (x${bet.odds})
`).join('')}
*TOTAL APOSTADO:* ${formatCOP(ticket.totalStake)}
*Código de Verificación:* ${ticket.verificationCode}
🏆 *PREMIOS:*
✅ 5 aciertos: Recupera tu Tu jugada ($5,000)
✅ 6 aciertos: ¡Gana un TICKET DORADO! (10 juegos gratis)
✅ 7 aciertos: Gana $1,000,000
¡Gracias por confiar en La Jugada 7! 🍀`;

  // ✅ 3. URL compatible con iOS y Android
  const whatsappUrl = `https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`;
  
  // ✅ 4. Detectar si es iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  // ✅ 5. Abrir WhatsApp (método compatible con iOS)
  if (isIOS) {
    // iOS: Usar window.open directamente
    window.open(whatsappUrl, '_blank');
  } else {
    // Android: Intentar abrir app nativa primero
    window.location.href = whatsappUrl;
    // Fallback a nueva pestaña si no funciona
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 1500);
  }
};

// ✅ FUNCIÓN CORREGIDA PARA ENVIAR PARTIDOS
const sendMatchesToWhatsApp = (message) => {
  const encodedMessage = encodeURIComponent(message);
  const whatsappUrl = `https://wa.me/?text=${encodedMessage}`;
  
  // ✅ Detectar iOS
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
  
  if (isIOS) {
    window.open(whatsappUrl, '_blank');
  } else {
    window.location.href = whatsappUrl;
    setTimeout(() => {
      window.open(whatsappUrl, '_blank');
    }, 1500);
  }
};

// Componente de ventas - versión para vendedor (solo sus ventas)
const SalesView = ({ tickets, currentUser, userRole, onDeleteTicket }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [timeFilter, setTimeFilter] = useState('today');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDeleteTicketModal, setShowDeleteTicketModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [showResendModal, setShowResendModal] = useState(false);
  const [ticketToResend, setTicketToResend] = useState(null);
  const today = getCurrentDate();
  // Filtrar tickets - solo del vendedor actual si es vendedor
  const filteredTickets = useMemo(() => {
    let filtered = [...tickets];
    // Filtrar por fecha
    if (timeFilter === 'today') {
      filtered = filtered.filter(ticket => ticket.date === today);
    }
    // Filtrar por vendedor (solo admin puede ver todos)
    if (userRole === 'seller') {
      filtered = filtered.filter(ticket => ticket.sellerId === currentUser.id);
    }
    // Búsqueda
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(ticket => 
        ticket.customerName.toLowerCase().includes(term) ||
        ticket.customerPhone.includes(term) ||
        ticket.id.toLowerCase().includes(term)
      );
    }
    return filtered.sort((a, b) => new Date(`${b.date} ${b.time}`) - new Date(`${a.date} ${a.time}`));
  }, [tickets, searchTerm, timeFilter, userRole, currentUser, today]);
  const totalSales = filteredTickets.reduce((sum, t) => sum + t.totalStake, 0);
  const averageTicket = filteredTickets.length > 0 ? totalSales / filteredTickets.length : 0;
  const handleShowDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };
  const handleDeleteTicket = (ticket) => {
    setTicketToDelete(ticket);
    setShowDeleteTicketModal(true);
  };
  const handleResendTicket = (ticket) => {
    setTicketToResend(ticket);
    setShowResendModal(true);
  };
  const handleResendConfirm = (newPhone) => {
    const updatedTicket = { ...ticketToResend, customerPhone: newPhone };
    copyToWhatsApp(updatedTicket);
  };
  return (
    <div className="pb-24 px-4">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white text-2xl font-bold">Ventas</h1>
          {userRole === 'admin' && (
            <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
              <Download className="w-4 h-4" />
              Exportar
            </button>
          )}
        </div>
      </div>
      {/* Filtros */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Buscar</label>
            <div className="relative">
              <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg pl-10 pr-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                placeholder="Cliente, teléfono o ticket..."
              />
            </div>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Período</label>
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="w-full bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
            >
              <option value="today">Hoy</option>
              <option value="week">Esta semana</option>
              <option value="month">Este mes</option>
            </select>
          </div>
        </div>
      </div>
      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Total Ventas</p>
              <p className="text-white text-2xl font-bold">{formatCOP(totalSales)}</p>
            </div>
            <DollarSign className="text-green-200 w-8 h-8" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Tickets</p>
              <p className="text-white text-2xl font-bold">{filteredTickets.length}</p>
            </div>
            <Ticket className="text-blue-200 w-8 h-8" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Ticket Promedio</p>
              <p className="text-white text-2xl font-bold">{formatCOP(averageTicket)}</p>
            </div>
            <BarChart2 className="text-purple-200 w-8 h-8" />
          </div>
        </div>
      </div>
      {/* Lista de tickets */}
      <div className="bg-gray-800 rounded-xl p-6">
        <h2 className="text-white text-lg font-bold mb-4">Tickets ({filteredTickets.length})</h2>
        {filteredTickets.length === 0 ? (
          <div className="text-gray-400 text-center py-8">
            <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <p>No hay tickets en este período</p>
          </div>
        ) : (
          <div className="space-y-3 max-h-96 overflow-y-auto">
            {filteredTickets.map(ticket => (
              <div key={ticket.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="text-white font-medium">{ticket.customerName}</h3>
                    <p className="text-gray-400 text-sm">{ticket.customerPhone}</p>
                    <p className="text-gray-500 text-xs">{ticket.date} {ticket.time}</p>
                  </div>
                  <div className="text-right">
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      {formatCOP(ticket.totalStake)}
                    </span>
                    {userRole === 'admin' && (
                      <p className="text-gray-400 text-xs mt-1">{ticket.sellerName}</p>
                    )}
                  </div>
                </div>
                <div className="text-gray-400 text-sm flex items-center gap-2 mb-3">
                  <Ticket className="w-3 h-3" />
                  {ticket.bets.length} Tu jugada(s) • Código: {ticket.id}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleResendTicket(ticket)}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                  >
                    <RefreshCw className="w-3 h-3" />
                    Reenviar
                  </button>
                  <button
                    onClick={() => handleShowDetails(ticket)}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                  >
                    <Info className="w-3 h-3" />
                    Detalles
                  </button>
                  <button
                    onClick={() => handleDeleteTicket(ticket)}
                    className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                  >
                    <Trash2 className="w-3 h-3" />
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      {showDetailsModal && selectedTicket && (
        <TicketDetailsModal
          ticket={selectedTicket}
          onClose={() => setShowDetailsModal(false)}
        />
      )}
      {showDeleteTicketModal && ticketToDelete && (
        <DeleteTicketModal
          ticket={ticketToDelete}
          onConfirm={() => {
            onDeleteTicket(ticketToDelete.id);
            setShowDeleteTicketModal(false);
            setTicketToDelete(null);
          }}
          onCancel={() => {
            setShowDeleteTicketModal(false);
            setTicketToDelete(null);
          }}
        />
      )}
      {showResendModal && ticketToResend && (
        <ResendTicketModal
          ticket={ticketToResend}
          onClose={() => setShowResendModal(false)}
          onResend={handleResendConfirm}
        />
      )}
    </div>
  );
};
// Componente de reportes
// Componente de reportes
const ReportsView = ({ tickets, sellerUsers, matches, userRole, currentUser, matchResults }) => {
  const [activeReport, setActiveReport] = useState('daily');
  const today = getCurrentDate();

  // Función para enviar ticket ganador por WhatsApp
  const sendWinnerToWhatsApp = (ticket) => {
    if (!ticket || !ticket.customerPhone) return;
    let phoneNumber = ticket.customerPhone;
    if (!phoneNumber.startsWith('+57')) {
      phoneNumber = `+57 ${phoneNumber}`;
    }
    const correctBets = ticket.bets.filter(bet => matchResults[bet.matchId] === bet.selection);
    const message = `*🏆 ¡FELICITACIONES, ${ticket.customerName}!* 🏆
` +
      `Tu ticket *${ticket.id}* es ganador con *${ticket.correctPredictions} aciertos*.
` +
      `${ticket.correctPredictions === 5 ? '🎁 Premio: Juego Gratis' : 
        ticket.correctPredictions === 6 ? '🎁 Premio: 10 Juegos Gratis' : 
        '🎉 ¡Felicidades! Premio: $1,000,000'}
` +
      `
*Partidos acertados:*
` +
      correctBets.map(bet => 
        `• ${bet.homeTeam} vs ${bet.awayTeam} → ${bet.selection === '1' ? 'Local' : bet.selection === 'X' ? 'Empate' : 'Visitante'}`
      ).join('\n') +
      `
Gracias por jugar con *La Jugada 7* 💚
`;
    const whatsappUrl = `whatsapp://send?phone=${phoneNumber.replace(/\s+/g, '')}&text=${encodeURIComponent(message)}`;
    window.location.href = whatsappUrl;
    setTimeout(() => {
      window.open(`https://wa.me/${phoneNumber.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
    }, 1000);
  };

  // Datos para reportes
  const dailySales = useMemo(() => {
    const todayTickets = tickets.filter(t => t.date === today);
    const hourlyData = {};
    for (let hour = 0; hour < 24; hour++) {
      const hourStr = hour.toString().padStart(2, '0');
      hourlyData[`${hourStr}:00`] = 0;
    }
    todayTickets.forEach(ticket => {
      const hour = ticket.time.split(':')[0] + ':00';
      if (hourlyData[hour] !== undefined) {
        hourlyData[hour] += ticket.totalStake;
      }
    });
    return hourlyData;
  }, [tickets, today]);

  const sellerPerformance = useMemo(() => {
    const performance = {};
    sellerUsers.forEach(seller => {
      const sellerTickets = tickets.filter(t => t.sellerId === seller.id);
      const totalSales = sellerTickets.reduce((sum, t) => sum + t.totalStake, 0);
      const commission = (totalSales * seller.commission) / 100;
      performance[seller.id] = {
        ...seller,
        totalSales,
        commission,
        tickets: sellerTickets.length,
        averageTicket: sellerTickets.length > 0 ? totalSales / sellerTickets.length : 0
      };
    });
    return Object.values(performance).sort((a, b) => b.totalSales - a.totalSales);
  }, [tickets, sellerUsers]);

  const winningTickets = useMemo(() => {
    if (!matchResults || Object.keys(matchResults).length === 0) {
      return [];
    }
    const allWinners = tickets
      .map(ticket => {
        if (!ticket.bets || ticket.bets.length < 5) return null;
        let correctPredictions = 0;
        ticket.bets.forEach(bet => {
          const actualResult = matchResults[bet.matchId];
          if (actualResult && actualResult === bet.selection) {
            correctPredictions++;
          }
        });
        if (correctPredictions >= 5) {
          return { ...ticket, correctPredictions };
        }
        return null;
      })
      .filter(Boolean);

    // Filtro por vendedor si es el panel del vendedor
    if (userRole === 'seller' && currentUser) {
      return allWinners.filter(ticket => ticket.sellerId === currentUser.id);
    }
    return allWinners; // admin ve todos
  }, [tickets, matchResults, userRole, currentUser]);

  const renderReportContent = () => {
    switch (activeReport) {
      case 'daily':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-white text-lg font-bold mb-4">Ventas por Hora - Hoy</h3>
              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
                {Object.entries(dailySales).map(([hour, sales]) => (
                  <div key={hour} className="bg-gray-700 rounded-lg p-3 text-center">
                    <p className="text-gray-400 text-sm">{hour}</p>
                    <p className="text-white font-bold text-lg">{formatCOP(sales)}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'sellers':
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 rounded-xl p-6">
              <h3 className="text-white text-lg font-bold mb-4">Rendimiento por Vendedor</h3>
              <div className="space-y-4">
                {sellerPerformance.map((seller, index) => (
                  <div key={seller.id} className="bg-gray-700 rounded-lg p-4">
                    <div className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-2">
                        {index === 0 && <Crown className="w-5 h-5 text-yellow-400" />}
                        {index === 1 && <Star className="w-5 h-5 text-gray-400" />}
                        {index === 2 && <Star className="w-5 h-5 text-amber-600" />}
                        <h4 className="text-white font-medium">{seller.name}</h4>
                      </div>
                      <span className="text-green-400 font-bold">{seller.commission}%</span>
                    </div>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Ventas Totales</p>
                        <p className="text-white font-bold">{formatCOP(seller.totalSales)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Comisión</p>
                        <p className="text-green-400 font-bold">{formatCOP(seller.commission)}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Tickets</p>
                        <p className="text-white font-bold">{seller.tickets}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">Ticket Promedio</p>
                        <p className="text-white font-bold">{formatCOP(seller.averageTicket)}</p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      case 'winners':
        return (
          <div className="space-y-6">
            <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-white text-lg font-bold">Tickets Ganadores</h3>
                  <p className="text-purple-200">Premios pendientes de pago</p>
                </div>
                <Award className="text-purple-200 w-8 h-8" />
              </div>
            </div>
            <div className="bg-gray-800 rounded-xl p-6">
              <div className="space-y-4">
                {winningTickets.length === 0 ? (
                  <div className="text-gray-400 text-center py-8">
                    <Award className="w-12 h-12 mx-auto mb-2 opacity-50" />
                    <p>No hay tickets ganadores en este período</p>
                  </div>
                ) : (
                  winningTickets.map(ticket => (
                    <div key={ticket.id} className="bg-gray-700 rounded-lg p-4 border-l-4 border-green-500">
                      <div className="flex justify-between items-start mb-2">
                        <div>
                          <h4 className="text-white font-medium">{ticket.customerName}</h4>
                          <p className="text-gray-400 text-sm">{ticket.customerPhone}</p>
                        </div>
                        <div className="text-right">
                          <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                            {ticket.correctPredictions === 5 && 'Juego Gratis'}
                            {ticket.correctPredictions === 6 && '10 Juegos Gratis'}
                            {ticket.correctPredictions === 7 && '$1,000,000'}
                          </span>
                          <p className="text-gray-400 text-xs mt-1">Ticket: {ticket.id}</p>
                        </div>
                      </div>
                      <div className="text-green-400 text-sm flex items-center gap-2 mb-3">
                        <CheckCircle className="w-4 h-4" />
                        Ganador - {ticket.correctPredictions} aciertos
                      </div>
                      <div className="mt-2">
                        <p className="text-gray-400 text-xs mb-1">Partidos acertados:</p>
                        <div className="space-y-1">
                          {ticket.bets
                            .filter(bet => matchResults[bet.matchId] === bet.selection)
                            .map((bet, idx) => (
                              <div key={idx} className="text-xs text-green-300 bg-green-900/30 px-2 py-1 rounded">
                                {bet.homeTeam} vs {bet.awayTeam} → {bet.selection}
                              </div>
                            ))
                          }
                        </div>
                      </div>
                      <button
                        onClick={() => sendWinnerToWhatsApp(ticket)}
                        className="mt-3 w-full bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                      >
                        <Phone className="w-3 h-3" />
                        Enviar por WhatsApp
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        );
      case 'analytics':
        return (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-white text-lg font-bold mb-4">Resumen General</h3>
                <div className="space-y-4">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Tickets</span>
                    <span className="text-white font-bold">{tickets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Ventas Totales</span>
                    <span className="text-white font-bold">{formatCOP(tickets.reduce((sum, t) => sum + t.totalStake, 0))}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Tickets Ganadores</span>
                    <span className="text-green-400 font-bold">{winningTickets.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Premios Estimados</span>
                    <span className="text-purple-400 font-bold">{formatCOP(winningTickets.reduce((sum, t) => sum + (t.totalStake * 2), 0))}</span>
                  </div>
                </div>
              </div>
              <div className="bg-gray-800 rounded-xl p-6">
                <h3 className="text-white text-lg font-bold mb-4">Partidos Más Apostados</h3>
                <div className="space-y-3">
                  {matches.slice(0, 3).map(match => (
                    <div key={match.id} className="flex justify-between items-center">
                      <span className="text-gray-300 text-sm">{match.homeTeam} vs {match.awayTeam}</span>
                      <span className="text-white font-bold">{Math.floor(Math.random() * 15) + 5}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="pb-24 px-4">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white text-2xl font-bold">Reportes</h1>
          <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2">
            <Download className="w-4 h-4" />
            Exportar Reporte
          </button>
        </div>
      </div>
      {/* Navegación de reportes */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveReport('daily')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeReport === 'daily' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Diario
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveReport('sellers')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeReport === 'sellers' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Por Vendedor
            </button>
          )}
          <button
            onClick={() => setActiveReport('winners')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeReport === 'winners' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Award className="w-4 h-4 inline mr-2" />
            Ganadores
          </button>
          <button
            onClick={() => setActiveReport('analytics')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeReport === 'analytics' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <BarChart3 className="w-4 h-4 inline mr-2" />
            Analíticas
          </button>
        </div>
      </div>
      {renderReportContent()}
    </div>
  );
};
// Componente de configuración
const SettingsView = ({ sellerUsers, setSellerUsers, userRole }) => {
  const [activeTab, setActiveTab] = useState('business');
  const [businessSettings, setBusinessSettings] = useState({
    minBet: 5000,
    maxBet: 10000000,
    defaultCommission: 15,
    currency: 'COP'
  });
  const [systemSettings, setSystemSettings] = useState({
    autoRefresh: true,
    notifications: true,
    theme: 'dark'
  });
  const handleSaveBusiness = () => {
    alert('Configuración de negocio guardada exitosamente');
  };
  const handleSaveSystem = () => {
    alert('Configuración del sistema guardada exitosamente');
  };
  return (
    <div className="pb-24 px-4">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Configuración</h1>
        <p className="text-gray-400">Gestiona la configuración de tu sistema deJugadas</p>
      </div>
      {/* Tabs de configuración */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('business')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'business' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <DollarSign className="w-4 h-4 inline mr-2" />
            Negocio
          </button>
          {userRole === 'admin' && (
            <button
              onClick={() => setActiveTab('users')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === 'users' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              <Users className="w-4 h-4 inline mr-2" />
              Usuarios
            </button>
          )}
          <button
            onClick={() => setActiveTab('system')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'system' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Settings className="w-4 h-4 inline mr-2" />
            Sistema
          </button>
          <button
            onClick={() => setActiveTab('data')}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              activeTab === 'data' ? 'bg-green-600 text-white' : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            <Database className="w-4 h-4 inline mr-2" />
            Datos
          </button>
        </div>
      </div>
      {activeTab === 'business' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-4">Configuración de Negocio</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Tu jugada Mínima (COP)</label>
              <input
                type="number"
                value={businessSettings.minBet}
                onChange={(e) => setBusinessSettings({...businessSettings, minBet: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                disabled
              />
              <p className="text-gray-400 text-xs mt-1">Fijo en $5,000 para tickets de 7 partidos</p>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Tu jugada Máxima (COP)</label>
              <input
                type="number"
                value={businessSettings.maxBet}
                onChange={(e) => setBusinessSettings({...businessSettings, maxBet: parseInt(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Comisión por Defecto (%)</label>
              <input
                type="number"
                value={businessSettings.defaultCommission}
                onChange={(e) => setBusinessSettings({...businessSettings, defaultCommission: parseFloat(e.target.value)})}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
                min="0"
                max="100"
                step="0.1"
              />
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2">Moneda</label>
              <select
                value={businessSettings.currency}
                onChange={(e) => setBusinessSettings({...businessSettings, currency: e.target.value})}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
              >
                <option value="COP">COP - Peso Colombiano</option>
                <option value="USD">USD - Dólar Estadounidense</option>
                <option value="EUR">EUR - Euro</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleSaveBusiness}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar Configuración
          </button>
        </div>
      )}
      {activeTab === 'users' && userRole === 'admin' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-lg font-bold">Gestión de Usuarios</h2>
            <button 
              onClick={() => {
                const newSeller = {
                  id: `seller${Date.now()}`,
                  name: 'Nuevo Vendedor',
                  email: 'nuevo@footbet.com',
                  password: 'password123',
                  phone: '3001234567',
                  commission: 15
                };
                setSellerUsers(prev => [...prev, newSeller]);
              }}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Nuevo Vendedor
            </button>
          </div>
          <div className="space-y-3">
            {sellerUsers.map(seller => (
              <div key={seller.id} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center border border-gray-600">
                <div>
                  <h3 className="text-white font-medium">{seller.name}</h3>
                  <p className="text-gray-400 text-sm">{seller.email}</p>
                </div>
                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <p className="text-green-400 font-bold flex items-center gap-1">
                      <Percent className="w-4 h-4" />
                      {seller.commission}% comisión
                    </p>
                  </div>
                  <button className="text-blue-400 hover:text-blue-300 p-2 rounded-full hover:bg-blue-900/30 transition-colors">
                    <Settings className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {activeTab === 'system' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-4">Configuración del Sistema</h2>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Actualización Automática</p>
                <p className="text-gray-400 text-sm">Refrescar datos cada 30 segundos</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.autoRefresh}
                  onChange={(e) => setSystemSettings({...systemSettings, autoRefresh: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Notificaciones</p>
                <p className="text-gray-400 text-sm">Alertas de ventas y tickets</p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={systemSettings.notifications}
                  onChange={(e) => setSystemSettings({...systemSettings, notifications: e.target.checked})}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
              </label>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-white font-medium">Tema</p>
                <p className="text-gray-400 text-sm">Apariencia de la interfaz</p>
              </div>
              <select
                value={systemSettings.theme}
                onChange={(e) => setSystemSettings({...systemSettings, theme: e.target.value})}
                className="bg-gray-700 text-white rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
              >
                <option value="dark">Oscuro</option>
                <option value="light">Claro</option>
              </select>
            </div>
          </div>
          <button
            onClick={handleSaveSystem}
            className="mt-6 bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors flex items-center gap-2"
          >
            <Save className="w-5 h-5" />
            Guardar Configuración
          </button>
        </div>
      )}
      {activeTab === 'data' && (
        <div className="bg-gray-800 rounded-xl p-6">
          <h2 className="text-white text-lg font-bold mb-4">Gestión de Datos</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Database className="w-6 h-6 text-blue-400" />
                <h3 className="text-white font-medium">Backup</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">Crea copias de seguridad de tus datos</p>
              <button className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                Crear Backup
              </button>
            </div>
            <div className="bg-gray-700/50 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                <Download className="w-6 h-6 text-green-400" />
                <h3 className="text-white font-medium">Exportar Datos</h3>
              </div>
              <p className="text-gray-400 text-sm mb-4">Exporta tus datos a CSV o Excel</p>
              <div className="flex gap-2">
                <button className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  CSV
                </button>
                <button className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium">
                  Excel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
// Panel de resultados en el admin dashboard
const ResultsPanel = ({ matchResults, handleSaveResult, matches }) => {
  // Mostrar TODOS los partidos del día para el administrador (incluyendo cerrados)
const todayMatches = matches;
  return (
    <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6">
      <h2 className="text-white text-lg font-bold mb-4">Marcar Resultados</h2>
      <div className="space-y-3">
        {todayMatches.map(match => (
          <div key={match.id} className="bg-gray-700 rounded-lg p-4">
            <div className="flex justify-between items-center mb-2">
              <span className="text-white font-medium">
                {match.homeTeam} vs {match.awayTeam}
              </span>
              {matchResults[match.id] && (
                <span className="bg-green-600 text-white text-xs px-2 py-1 rounded">
                  {matchResults[match.id] === '1' ? 'Local' : 
                   matchResults[match.id] === 'X' ? 'Empate' : 'Visitante'}
                </span>
              )}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => handleSaveResult(match.id, '1')}
                className={`px-3 py-1 rounded text-sm ${
                  matchResults[match.id] === '1' 
                    ? 'bg-green-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                1
              </button>
              <button
                onClick={() => handleSaveResult(match.id, 'X')}
                className={`px-3 py-1 rounded text-sm ${
                  matchResults[match.id] === 'X' 
                    ? 'bg-yellow-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                X
              </button>
              <button
                onClick={() => handleSaveResult(match.id, '2')}
                className={`px-3 py-1 rounded text-sm ${
                  matchResults[match.id] === '2' 
                    ? 'bg-red-600 text-white' 
                    : 'bg-gray-600 text-gray-300 hover:bg-gray-500'
                }`}
              >
                2
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// Función sincrona: genera mensaje con los partidos YA disponibles
// Función para generar mensaje de los últimos 7 resultados
const generateResultsMessage = (matchResults, allMatches, sellerName) => {
  // Crear un mapa de partidos por ID para búsqueda rápida
  const matchMap = {};
  allMatches.forEach(match => {
    matchMap[match.id] = match;
  });
  // Filtrar solo partidos que ya tienen resultado
  const finishedMatches = Object.entries(matchResults)
    .map(([matchId, result]) => {
      const match = matchMap[matchId];
      if (!match) return null;
      return { ...match, result };
    })
    .filter(Boolean)
    .sort((a, b) => {
      // Usar zona horaria de Colombia explícitamente
      const parseColombiaDateTime = (dateStr, timeStr) => {
        const [year, month, day] = dateStr.split('-').map(Number);
        const [hours, minutes] = timeStr.split(':').map(Number);
        return new Date(Date.UTC(year, month - 1, day, hours - 5, minutes));
      };
      const timeA = parseColombiaDateTime(a.date, a.time);
      const timeB = parseColombiaDateTime(b.date, b.time);
      return timeB - timeA; // más reciente primero
    })
    .slice(0, 7);

  if (finishedMatches.length === 0) {
    return `*📢 La Jugada 7*\nHola! Por ahora no hay resultados disponibles.\n— *${sellerName}* 🟢`;
  }

  let message = `*🏆 ÚLTIMOS RESULTADOS - La Jugada 7* 🏆\n`;
  message += `⚽ *¡Revisa los últimos partidos jugados!* 💰\n`;
  message += `──────────────────────\n`;
  finishedMatches.forEach((match, index) => {
    const timeEmoji = index < 3 ? '🕗' : index < 6 ? '🕘' : '🕙';
    const flagEmoji = match.country === 'Colombia' ? '🇨🇴' :
    match.country === 'España' ? '🇪🇸' :
    match.country === 'Inglaterra' ? '🏴󠁧󠁢󠁥󠁮󠁧󠁿' :
    match.country === 'Italia' ? '🇮🇹' :
    match.country === 'Alemania' ? '🇩🇪' :
    match.country === 'Francia' ? '🇫🇷' :
    match.country === 'Brasil' ? '🇧🇷' :
    match.country === 'Argentina' ? '🇦🇷' :
    match.country === 'México' ? '🇲🇽' :
    match.country === 'Estados Unidos' ? '🇺🇸' :
    match.country === 'Champions League' ? '🏆' :
    match.country === 'Copa Libertadores' ? '🌎' :
    match.country === 'Copa Sudamericana' ? '🌎' :
    match.country === 'Europa League' ? '🇪🇺' : '🌐';

    const resultText = match.result === '1' ? '✅ Local' :
    match.result === 'X' ? '⚪ Empate' : '✅ Visitante';
    message += `${timeEmoji} *${match.time}* | ${flagEmoji} *${match.league}*\n`;
    message += `📊 *${match.homeTeam}* vs *${match.awayTeam}*\n`;
    message += `✅ Resultado: ${resultText}\n\n`;
  });
  message += `📲 *¿Listo para jugar la próxima ronda?* ¡Escríbeme!\n`;
  message += `— *${sellerName} – La Jugada 7* 🟢`;
  return message;
};

const NavigationBar = ({ currentView, setCurrentView, userRole }) => {
  if (currentView === 'login' || currentView === 'bet-selection') return null;
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
      <div className="flex justify-around items-center py-3">
        {userRole === 'admin' ? (
          <>
            <button onClick={() => setCurrentView('admin-dashboard')} className="text-center text-gray-400 hover:text-white">
              <Home className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Inicio</span>
            </button>
            <button onClick={() => setCurrentView('sales')} className="text-center text-gray-400 hover:text-white">
              <FileText className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Ventas</span>
            </button>
            <button onClick={() => setCurrentView('reports')} className="text-center text-gray-400 hover:text-white">
              <BarChart3 className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Reportes</span>
            </button>
            <button onClick={() => setCurrentView('settings')} className="text-center text-gray-400 hover:text-white">
              <Settings className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Config</span>
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setCurrentView('seller-dashboard')} className="text-center text-gray-400 hover:text-white">
              <Home className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Inicio</span>
            </button>
            <button onClick={() => setCurrentView('bet-selection')} className="text-center text-gray-400 hover:text-white">
              <Ticket className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Ticket</span>
            </button>
            <button onClick={() => setCurrentView('sales')} className="text-center text-gray-400 hover:text-white">
              <FileText className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Ventas</span>
            </button>
            <button onClick={() => setCurrentView('reports')} className="text-center text-gray-400 hover:text-white">
              <BarChart3 className="w-5 h-5 mx-auto" />
              <span className="text-xs mt-1">Reportes</span>
            </button>
          </>
        )}
      </div>
    </div>
  );
};

const App = () => {
  
// 🟢 DESPUÉS (solución definitiva)
const [currentView, setCurrentView] = useState('login'); // Siempre login inicial

// ✅ Verificar hash DESPUÉS de montar el componente
useEffect(() => {
  const checkHashOnLoad = () => {
    const hash = window.location.hash;
    console.log('🔍 Hash al cargar:', hash);
    
    if (hash.includes('public-dashboard') || hash.includes('public-bet')) {
      setCurrentView('public-dashboard');
      console.log('✅ Vista cambiada a public-dashboard');
    } else {
      setCurrentView('login');
      console.log('✅ Vista cambiada a login');
    }
  };

  // Ejecutar inmediatamente después de montar
  checkHashOnLoad();

  // También escuchar cambios de hash
  window.addEventListener('hashchange', checkHashOnLoad);
  return () => window.removeEventListener('hashchange', checkHashOnLoad);
}, []);

  
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]); // Para el panel del admin
  const [allMatchesIncludingResults, setAllMatchesIncludingResults] = useState([]);
  const [pendingTickets, setPendingTickets] = useState([]);
  const [selectedBets, setSelectedBets] = useState(new Map());
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [showTicketPreview, setShowTicketPreview] = useState(false);
  const [currentTicket, setCurrentTicket] = useState(null);
  const [showCreateSellerModal, setShowCreateSellerModal] = useState(false);
  const [showDeleteSellerModal, setShowDeleteSellerModal] = useState(false);
  const [sellerToDelete, setSellerToDelete] = useState(null);
  const [showDeleteTicketModal, setShowDeleteTicketModal] = useState(false);
  const [ticketToDelete, setTicketToDelete] = useState(null);
  const [showResendModal, setShowResendModal] = useState(false);
  const [ticketToResend, setTicketToResend] = useState(null);
  const [matchResults, setMatchResults] = useState({});
  const matchResultsRef = useRef(matchResults);
  // eslint-disable-next-line no-empty-pattern
  const [] = useState(false);
  useEffect(() => {
    matchResultsRef.current = matchResults;
  }, [matchResults]);
  const [sellerUsers, setSellerUsers] = useState([
    { id: 'seller1', email: 'juan@footbet.com', password: 'juan123', name: 'Juan Perez', commission: 15 },
    { id: 'seller2', email: 'maria@footbet.com', password: 'maria123', name: 'Maria Garcia', commission: 12 }
  ]);
  // Estados para gestión de partidos
  const [editingMatch, setEditingMatch] = useState(null);
  const [matchForm, setMatchForm] = useState({
    homeTeam: '',
    awayTeam: '',
    league: '',
    time: '20:00',
    country: 'Colombia',
    popularity: 50,
    date: getCurrentDate()
  });

  


useEffect(() => {
  let isMounted = true;
  
  // 🔁 LISTENER EN TIEMPO REAL PARA RESULTADOS
  const unsubscribeResults = onSnapshot(collection(db, 'match_results'), (snapshot) => {
    const resultsData = {};
    snapshot.docs.forEach(doc => {
      const data = doc.data();
      resultsData[data.matchId] = data.result;
    });
    if (isMounted) {
      setMatchResults(resultsData);
    }
  });

  // 🔁 LISTENER EN TIEMPO REAL PARA TODOS LOS PARTIDOS
  const unsubscribeMatches = onSnapshot(collection(db, 'matches'), (snapshot) => {
    const allMatchesData = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    if (isMounted) {
      setAllMatchesIncludingResults(allMatchesData);
    }
    
    // ✅ USA matchResults DIRECTO (NO REF)
    const matchesWithoutResults = allMatchesData.filter(match =>
      matchResultsRef.current[match.id] === undefined
    );
    if (isMounted) {
      setAllMatches(matchesWithoutResults);
    }
    
    // Para el VENDEDOR: solo partidos de hoy disponibles
    const today = getCurrentDate();
    const activeMatches = allMatchesData.filter(match =>
      match &&
      match.hidden !== true &&
      matchResultsRef.current[match.id] === undefined &&  // ✅ USA matchResults DIRECTO
      !shouldCloseMatch(match.date, match.time) &&
      match.date >= today
    );
    
    const finalMatches = activeMatches.slice(0, 7);
    if (isMounted) {
      setMatches(finalMatches);
    }
  });

  // 🔁 LISTENER PARA TICKETS
  const unsubscribeTickets = onSnapshot(collection(db, 'tickets'), (snapshot) => {
    const ticketsData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if (isMounted) setTickets(ticketsData);
  });

  // 🔁 LISTENER PARA VENDEDORES
  const unsubscribeSellers = onSnapshot(collection(db, 'sellers'), (snapshot) => {
    const sellersData = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
    if (isMounted) setSellerUsers(sellersData);
  });

  // 🔁 LISTENER PARA TICKETS PENDIENTES
  const unsubscribePendingTickets = onSnapshot(
    collection(db, 'pending_tickets'),
    (snapshot) => {
      const pendingData = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      console.log('🔍 Pending Tickets cargados:', pendingData.length);
      console.log('🔍 Pending Tickets:', pendingData);
      if (isMounted) setPendingTickets(pendingData);
    },
    (error) => {
      console.error('Error escuchando pending_tickets:', error);
    }
  );

  return () => {
    isMounted = false;
    unsubscribeResults();
    unsubscribeMatches();
    unsubscribeTickets();
    unsubscribeSellers();
    unsubscribePendingTickets();
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps
}, []);  // ✅ Sin dependencias para evitar bucle


  // 🔁 LISTENER DE AUTENTICACIÓN - Persistencia de sesión
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      if (user) {
        console.log('🔍 Usuario autenticado detectado:', user.email);
        
        try {
          // Verificar si es admin
          const adminDocSnap = await getDocs(query(collection(db, 'admin'), where('__name__', '==', user.uid)));
          
          if (!adminDocSnap.empty) {
            const adminData = adminDocSnap.docs[0].data();
            setCurrentUser({
              id: user.uid,
              email: user.email,
              name: adminData.name || 'Administrador',
              role: 'admin'
            });
            setUserRole('admin');
            console.log('✅ Sesión restaurada como ADMIN');
          } else {
            // Verificar si es vendedor
            const sellerDoc = await getDoc(doc(db, 'sellers', user.uid));
            
            if (sellerDoc.exists()) {
              const sellerData = sellerDoc.data();
              setCurrentUser({
                id: sellerDoc.id,
                email: user.email,
                name: sellerData.name,
                phone: sellerData.phone,
                commission: sellerData.commission,
                role: 'seller'
              });
              setUserRole('seller');
              console.log('✅ Sesión restaurada como VENDEDOR');
            }
          }
        } catch (error) {
          console.error('Error verificando rol:', error);
        }
      } else {
        console.log('🔍 No hay usuario autenticado');
      }
    });

    return () => unsubscribeAuth();
  }, []);


    const handleLogin = useCallback(async () => {
    if (!loginEmail.trim() || !loginPassword.trim()) {
      alert('Por favor ingresa email y contraseña');
      return;
    }

    try {
      // ✅ 1. Autenticar con Firebase Auth
      const userCredential = await signInWithEmailAndPassword(auth, loginEmail, loginPassword);
      const firebaseUser = userCredential.user;

      console.log('✅ Usuario autenticado:', firebaseUser.email);
      console.log('✅ UID:', firebaseUser.uid);

      // ✅ 2. Verificar si es ADMIN (buscar en colección 'admins' por UID)
      
      const adminDocSnap = await getDocs(query(collection(db, 'admin'), where('__name__', '==', firebaseUser.uid)));
      
      if (!adminDocSnap.empty) {
        // ✅ ES ADMIN
        const adminData = adminDocSnap.docs[0].data();
        const adminUser = {
          id: firebaseUser.uid,
          email: firebaseUser.email,
          name: adminData.name || 'Administrador',
          role: 'admin'
        };
        
        setCurrentUser(adminUser);
        setUserRole('admin');
        setCurrentView('admin-dashboard');
        console.log('✅ Login como ADMIN exitoso');
        return;
      }

      // ✅ 3. Si no es admin, verificar si es VENDEDOR (buscar por UID)
      const sellerDoc = await getDoc(doc(db, 'sellers', firebaseUser.uid));
      
      if (sellerDoc.exists()) {
        // ✅ ES VENDEDOR
        const sellerData = sellerDoc.data();
        const sellerUser = {
          id: sellerDoc.id,
          email: firebaseUser.email,
          name: sellerData.name,
          phone: sellerData.phone,
          commission: sellerData.commission,
          role: 'seller'
        };
        
        setCurrentUser(sellerUser);
        setUserRole('seller');
        setCurrentView('seller-dashboard');
        console.log('✅ Login como VENDEDOR exitoso');
        return;
      }

      // ✅ 4. Si no es ni admin ni vendedor, cerrar sesión y mostrar error
      await signOut(auth);
      alert('No tienes permisos para acceder al sistema. Contacta al administrador.');
      
    } catch (error) {
      console.error('❌ Error al iniciar sesión:', error);
      
      // ✅ Mensajes de error específicos de Firebase
      let errorMessage = 'Error al iniciar sesión';
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuario no encontrado';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Contraseña incorrecta';
          break;
        case 'auth/invalid-email':
          errorMessage = 'Email inválido';
          break;
        case 'auth/too-many-requests':
          errorMessage = 'Demasiados intentos. Espera un momento';
          break;
        case 'auth/invalid-credential':
          errorMessage = 'Credenciales incorrectas';
          break;
        default:
          errorMessage = error.message;
      }
      
      alert(errorMessage);
    }
  }, [loginEmail, loginPassword]);
    const handleLogout = useCallback(async () => {
    try {
      // ✅ Cerrar sesión en Firebase Auth
      await signOut(auth);
      console.log('✅ Sesión cerrada en Firebase Auth');
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
    }
    
    // ✅ Limpiar estados locales
    setCurrentView('login');
    setUserRole(null);
    setCurrentUser(null);
    setLoginEmail('');
    setLoginPassword('');
    setCustomerName('');
    setCustomerPhone('');
    setSelectedBets(new Map());
  }, []);
  const toggleBetSelection = useCallback((matchId, selection, odds) => {
    // No permitir selección en partidos cerrados
    const match = matches.find(m => m.id === matchId);
    if (match && match.status === 'closed') {
      return;
    }
    setSelectedBets(prev => {
      const newMap = new Map(prev);
      const existingBet = newMap.get(matchId);
      if (existingBet && existingBet.selection === selection) {
        newMap.delete(matchId);
      } else {
        newMap.set(matchId, {
          matchId,
          homeTeam: match?.homeTeam || '',
          awayTeam: match?.awayTeam || '',
          league: match?.league || '',
          time: match?.time || '',
          selection,
          odds,
          stake: 5000
        });
      }
      return newMap;
    });
  }, [matches]);
  const generateTicket = useCallback(async () => {
  if (!customerName || !customerPhone) {
    alert('Por favor complete toda la información del cliente');
    return;
  }
  if (selectedBets.size !== matches.length) {
    alert('Debe seleccionar los 7 partidos para generar el ticket. Monto fijo: $5,000 COP');
    return;
  }
  let formattedPhone = customerPhone.trim();
  if (!formattedPhone.startsWith('+57')) {
    formattedPhone = `+57 ${formattedPhone}`;
  }
  const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();
  const betsArray = Array.from(selectedBets.values()).map(bet => ({
    ...bet,
    stake: 5000
  }));
  const newTicket = {
    id: `TKT${String(tickets.length + 1).padStart(3, '0')}`,
    customerId: `CUST${String(tickets.length + 1).padStart(3, '0')}`,
    customerName: customerName,
    customerPhone: formattedPhone,
    bets: betsArray,
    totalStake: 5000,
    verificationCode,
    sellerId: currentUser.id,
    sellerName: currentUser?.name || 'Invitado',
    date: getCurrentDate(),
    time: getCurrentTime()
  };
  try {
    await addDoc(collection(db, 'tickets'), newTicket);
    setTickets(prev => [...prev, newTicket]);
    setCurrentTicket(newTicket);
    setShowTicketPreview(true);
    setSelectedBets(new Map());
    setCustomerName('');
    setCustomerPhone('');
  } catch (error) {
    console.error('Error al guardar ticket:', error);
    alert('Error al guardar el ticket. Intente nuevamente.');
  }
}, [customerName, customerPhone, selectedBets, currentUser, tickets.length, matches.length]);
  const handleSaveResult = async (matchId, result) => {
  try {
    // ✅ USAR CLOUD FUNCTION (validación del servidor)
    const response = await submitMatchResult(matchId, result);
    
    // Actualizar estado local
    setMatchResults(prev => ({ ...prev, [matchId]: result }));
    
    alert(`✅ ${response.message}`);
  } catch (error) {
    console.error('Error al guardar resultado:', error);
    alert('Error al guardar el resultado: ' + error.message);
  }
};


  const saveMatch = useCallback(async () => {
  if (!matchForm.homeTeam || !matchForm.awayTeam || !matchForm.date) {
    alert('Por favor complete todos los campos obligatorios');
    return;
  }
  try {
    const completeMatch = {
      ...matchForm,
      hidden: false,
      status: 'upcoming',
      odds: { home: 1.0, draw: 2.0, away: 3.0 },
      isTrap: false
    };
    
    // ✅ USAR CLOUD FUNCTION (validación del servidor)
    if (editingMatch) {
      await updateMatch(editingMatch.id, completeMatch);
      alert('✅ Partido actualizado exitosamente');
    } else {
      const result = await createMatch(completeMatch);
      alert(`✅ Partido creado exitosamente (ID: ${result.matchId})`);
    }
    
    setEditingMatch(null);
  } catch (error) {
    console.error('Error al guardar partido:', error);
    alert('Error al guardar el partido: ' + error.message);
  }
}, [matchForm, editingMatch]); // ← Dependencias correctas


  const deleteMatch = async (matchId) => {
    if (window.confirm('¿Seguro que desea eliminar este partido?')) {
      try {
        // ✅ USAR CLOUD FUNCTION (validación del servidor)
        await deleteMatchFromServer(matchId);
        alert('✅ Partido eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar partido:', error);
        alert('Error al eliminar el partido: ' + error.message);
      }
    }
  };

  const hideMatch = async (matchId, hide = true) => {
    try {
    // Buscar el documento en Firebase por matchId
      const matchesQuery = query(collection(db, 'matches'), where('id', '==', matchId));
      const matchesSnapshot = await getDocs(matchesQuery);
      if (!matchesSnapshot.empty) {
        const docRef = doc(db, 'matches', matchesSnapshot.docs[0].id);
        await updateDoc(docRef, { hidden: hide });

        // ✅ Actualizar allMatches para el ADMIN (optimistic update)
        setAllMatches(prev => 
          prev.map(match => 
            match.id === matchId ? { ...match, hidden: hide } : match
          )
        );

        // ✅ Actualizar matches para el VENDEDOR usando la lógica correcta
        const today = getCurrentDate();
        let allAvailableMatches = [];
        let currentDate = today;
        let daysChecked = 0;
        const maxDays = 7;

        const getMatchesForDate = async (date) => {
          const q = query(collection(db, 'matches'), where('date', '==', date));
          const snap = await getDocs(q);
          return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        };

        while (allAvailableMatches.length < 7 && daysChecked < maxDays) {
          const dayMatches = await getMatchesForDate(currentDate);
          const activeMatches = dayMatches.filter(match =>
            match &&
            match.hidden !== true &&
            !shouldCloseMatch(match.date, match.time)
          );
          allAvailableMatches = [...allAvailableMatches, ...activeMatches];
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          currentDate = nextDate.toISOString().split('T')[0];
          daysChecked++;
        }

        allAvailableMatches.sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          const [aH, aM] = a.time.split(':').map(Number);
          const [bH, bM] = b.time.split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });

        const finalMatches = allAvailableMatches.length >= 7 
          ? allAvailableMatches.slice(0, 7) 
          : [];

        setMatches(finalMatches);

        alert(hide ? 'Partido oculto exitosamente' : 'Partido mostrado exitosamente');
      }
  }   catch (error) {
      console.error('Error al ocultar/mostrar partido:', error);
      alert('Error al cambiar visibilidad del partido');
    }
  };

    const handleCreateSeller = async (newSeller) => {
  try {
    // ✅ 1. Guardar credenciales del admin ANTES de cualquier cambio
    const adminEmail = loginEmail;
    const adminPassword = loginPassword;
    
    // ✅ 2. Crear usuario en Firebase Auth (esto cambia la sesión automáticamente)
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      newSeller.email,
      newSeller.password
    );
    const newSellerUid = userCredential.user.uid;
    
    console.log('✅ Usuario Firebase creado con UID:', newSellerUid);
    
    // ✅ 3. Cerrar sesión del vendedor nuevo inmediatamente
    await signOut(auth);
    console.log('✅ Sesión del vendedor cerrada');
    
    // ✅ 4. Volver a iniciar sesión como admin
    await signInWithEmailAndPassword(auth, adminEmail, adminPassword);
    console.log('✅ Sesión de administrador restaurada');
    
    // ✅ 5. Crear el documento en Firestore USANDO EL UID COMO ID (CRÍTICO)
    const sellerData = {
      name: newSeller.name,
      email: newSeller.email.toLowerCase(),
      phone: newSeller.phone,
      commission: newSeller.commission,
      active: true,
      uid: newSellerUid,
      createdAt: new Date().toISOString()
    };
    
    // ✅ USAR setDoc con el UID como ID del documento
    await setDoc(doc(db, 'sellers', newSellerUid), sellerData);
    
    console.log('✅ Vendedor guardado en Firestore con UID como ID:', newSellerUid);
    
    // ✅ 6. Actualizar estado local
    const sellerWithId = { 
      ...sellerData, 
      id: newSellerUid
    };
    setSellerUsers(prev => [...prev, sellerWithId]);
    
    alert('Vendedor creado exitosamente');
  } catch (error) {
    console.error('❌ Error al crear vendedor:', error);
    
    let errorMessage = 'Error al crear el vendedor';
    if (error.code === 'auth/email-already-in-use') {
      errorMessage = 'Este email ya está registrado';
    } else if (error.code === 'auth/weak-password') {
      errorMessage = 'La contraseña debe tener al menos 6 caracteres';
    } else if (error.code === 'auth/invalid-email') {
      errorMessage = 'Email inválido';
    } else if (error.code === 'permission-denied') {
      errorMessage = 'Error de permisos. Verifica las reglas de seguridad.';
    }
    
    alert(errorMessage);
  }
};
  const handleDeleteSeller = async (sellerId) => {
  try {
    // ✅ 1. Eliminar de Firebase
    // ✅ USAR CLOUD FUNCTION (validación del servidor)
    await deleteSellerFromServer(sellerId);
    
    // ✅ 2. Eliminar del estado local
    setSellerUsers(prev => prev.filter(seller => seller.id !== sellerId));
    
    // ✅ 3. Si el vendedor eliminado estaba logueado, cerrar sesión
    if (currentUser && currentUser.id === sellerId) {
      handleLogout();
    }
    
    // ✅ 4. Eliminar tickets asociados al vendedor eliminado (opcional)
    // setTickets(prev => prev.filter(ticket => ticket.sellerId !== sellerId));
    
    alert('Vendedor eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar vendedor:', error);
    alert('Error al eliminar el vendedor. Intente nuevamente.');
  }
};
  const handleDeleteTicket = async (ticketId) => {
  try {
    // ✅ 1. Eliminar de Firebase
    // ✅ Validar que el usuario sea admin antes de eliminar
    if (!currentUser || !currentUser.isAdmin) {
      throw new Error('Solo administradores pueden eliminar tickets');
    }
    await deleteDoc(doc(db, 'tickets', ticketId));
    // ✅ 2. NO es necesario actualizar el estado local manualmente
    //    El listener de onSnapshot lo hará automáticamente
    alert('Ticket eliminado exitosamente');
  } catch (error) {
    console.error('Error al eliminar ticket:', error);
    alert('Error al eliminar el ticket. Intente nuevamente.');
  }
};
  const handleResendTicket = (ticket) => {
    setTicketToResend(ticket);
    setShowResendModal(true);
  };
  const handleResendConfirm = (newPhone) => {
    const updatedTicket = { ...ticketToResend, customerPhone: newPhone };
    copyToWhatsApp(updatedTicket);
    setShowResendModal(false);
    setTicketToResend(null);
  };
  const AdminDashboard = useCallback(() => (
    <div className="pb-24 px-4">
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <h1 className="text-white text-2xl font-bold">Panel Administrativo</h1>
          <button
            onClick={handleLogout}
            className="text-gray-400 hover:text-white transition-colors"
          >
            <LogOut className="w-6 h-6" />
          </button>
        </div>
        <p className="text-gray-400">Bienvenido, {currentUser?.name || 'Vendedor'}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm">Total Vendedores</p>
              <p className="text-white text-2xl font-bold">{sellerUsers.length}</p>
            </div>
            <User className="text-blue-200 w-8 h-8" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm">Ventas Totales</p>
              <p className="text-white text-2xl font-bold">{formatCOP(tickets.reduce((sum, t) => sum + t.totalStake, 0))}</p>
            </div>
            <FileText className="text-green-200 w-8 h-8" />
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 shadow-lg">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-purple-100 text-sm">Tickets Hoy</p>
              <p className="text-white text-2xl font-bold">{tickets.filter(t => t.date === getCurrentDate()).length}</p>
            </div>
            <Ticket className="text-purple-200 w-8 h-8" />
          </div>
        </div>
      </div>
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-gray-700">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-white text-lg font-bold">Vendedores</h2>
          <button 
            onClick={() => setShowCreateSellerModal(true)}
            className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Crear Vendedor
          </button>
        </div>
        <div className="space-y-3">
          {sellerUsers.map(seller => (
            <div key={seller.id} className="bg-gray-700 rounded-lg p-4 flex justify-between items-center border border-gray-600">
              <div>
                <h3 className="text-white font-medium">{seller.name}</h3>
                <p className="text-gray-400 text-sm">{seller.email}</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="text-right">
                  <p className="text-green-400 font-bold flex items-center gap-1">
                    <Percent className="w-4 h-4" />
                    {seller.commission}% comisión
                  </p>
                </div>
                <button
                  onClick={() => {
                    setSellerToDelete(seller);
                    setShowDeleteSellerModal(true);
                  }}
                  className="text-red-400 hover:text-red-300 p-2 rounded-full hover:bg-red-900/30 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Panel de gestión de partidos */}
      <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6">
        <h2 className="text-white text-lg font-bold mb-4">Gestionar Partidos de Hoy</h2>
        
        {/* Formulario */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <input
            type="text"
            placeholder="Equipo Local"
            value={matchForm.homeTeam}
            onChange={(e) => setMatchForm({...matchForm, homeTeam: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Equipo Visitante"
            value={matchForm.awayTeam}
            onChange={(e) => setMatchForm({...matchForm, awayTeam: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <input
            type="text"
            placeholder="Liga"
            value={matchForm.league}
            onChange={(e) => setMatchForm({...matchForm, league: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <input
            type="time"
            value={matchForm.time}
            onChange={(e) => setMatchForm({...matchForm, time: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          />
          <select
            value={matchForm.country}
            onChange={(e) => setMatchForm({...matchForm, country: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          >
            <option value="">Seleccionar País/Torneo</option>
            {getCountryOptions().map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <input
            type="number"
            placeholder="Popularidad (0-100)"
            value={matchForm.popularity}
            onChange={(e) => setMatchForm({...matchForm, popularity: parseInt(e.target.value) || 0})}
            min="0"
            max="100"
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          />
        </div>
          <input
            type="date"
            value={matchForm.date}
            onChange={(e) => setMatchForm({...matchForm, date: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          /> 
        <button
          onClick={saveMatch}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg mb-4"
        >
          {editingMatch ? 'Actualizar Partido' : 'Agregar Partido'}
        </button>
        
        {/* Lista de partidos actuales */}
        <div className="mt-6">
          <h3 className="text-white font-medium mb-2">Partidos de Hoy ({allMatches.length})</h3>
          {allMatches.length === 0 ? (
            <p className="text-gray-400">No hay partidos para hoy</p>
          ) : (
            <div className="space-y-2">
              {[...allMatches]
                .sort((a, b) => {
                  const [aHours, aMinutes] = a.time.split(':').map(Number);
                  const [bHours, bMinutes] = b.time.split(':').map(Number);
                  return aHours * 60 + aMinutes - (bHours * 60 + bMinutes);
                })
                .map(match => (
                  <div key={match.id} className="bg-gray-700 p-3 rounded flex justify-between items-center">
                  <div>
                    <p className="text-white flex items-center gap-2">
                      <span className="text-xl">{getCountryFlag(match.country)}</span>
                      {match.homeTeam} vs {match.awayTeam}
                    </p>
                    <p className="text-gray-400 text-sm flex items-center gap-2">
                      <span>{getCountryFlag(match.country)} {match.league}</span>
                      <span>• {match.time}</span>
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => {
                        setEditingMatch(match);
                        setMatchForm(match);
                      }}
                      className="text-blue-400 hover:text-blue-300"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => deleteMatch(match.id)}
                      className="text-red-400 hover:text-red-300"
                    >
                      Eliminar
                    </button>
                    <button
                      onClick={() => hideMatch(match.id, !match.hidden)}
                      className={`text-${match.hidden ? 'green' : 'gray'}-400 hover:text-${match.hidden ? 'green' : 'gray'}-300`}
                    >
                      {match.hidden ? 'Mostrar' : 'Ocultar'}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Panel de resultados */}
      <ResultsPanel 
        matchResults={matchResults}
        handleSaveResult={handleSaveResult}
        matches={allMatches} // ← Mostrar todos los partidos al admin
      />
    </div>

  ), [currentUser, tickets, sellerUsers, handleLogout, matchResults, matchForm, editingMatch, saveMatch, allMatches]);

  const SellerDashboard = useCallback(() => {
  // 🔍 LOGGING MEJORADO PARA DEPURAR
  console.log('🔍 === SELLER DASHBOARD RENDER ===');
  console.log('🔍 Current User:', currentUser);
  console.log('🔍 Current User ID:', currentUser?.id);
  console.log('🔍 Current User ID Type:', typeof currentUser?.id);
  console.log('🔍 Pending Tickets Totales:', pendingTickets.length);
  
  // ✅ FILTRO CON LOGGING DETALLADO
  const myPendingTickets = pendingTickets.filter(pt => {
  const match = pt.sellerId === currentUser?.id;
  console.log('🔍 Ticket:', {
    ticketId: pt.id,
    sellerId: pt.sellerId,              // ← ESTO ES CLAVE
    sellerIdType: typeof pt.sellerId,
    sellerIdLength: pt.sellerId?.length,
    currentUser: currentUser?.id,
    currentUserType: typeof currentUser?.id,
    currentUserLength: currentUser?.id?.length,
    match: match ? '✅ COINCIDE' : '❌ NO COINCIDE',
    comparison: pt.sellerId === currentUser?.id ? 'IGUALES' : 'DIFERENTES'
  });
  // ✅ LOG ADICIONAL: Mostrar caracter por caracter
  console.log('🔍 sellerId chars:', pt.sellerId?.split('').map((c, i) => `${i}:${c}`).join(' '));
  console.log('🔍 currentUser chars:', currentUser?.id?.split('').map((c, i) => `${i}:${c}`).join(' '));
  return match;
});
  
  console.log('🔍 Pending Tickets para este vendedor:', myPendingTickets.length);
  console.log('🔍 === FIN SELLER DASHBOARD ===');
  
  const todaySales = tickets.filter(t => t.sellerId === currentUser?.id && t.date === getCurrentDate());
    const todayTotal = todaySales.reduce((sum, t) => sum + t.totalStake, 0);
    const commissionAmount = (todayTotal * (currentUser?.commission || 0)) / 100;
    const amountToPay = todayTotal - commissionAmount;
  
    return (
      <div className="pb-24 px-4">
        <div className="mb-6">
          <div className="flex justify-between items-center mb-4">
            <h1 className="text-white text-2xl font-bold">Panel de Vendedor</h1>
            <button
              onClick={handleLogout}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <LogOut className="w-6 h-6" />
            </button>
          </div>
          <p className="text-gray-400">Bienvenido, {currentUser?.name || 'Invitado'}</p>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm">Ventas Hoy</p>
                <p className="text-white text-2xl font-bold">{formatCOP(todayTotal)}</p>
              </div>
              <FileText className="text-green-200 w-8 h-8" />
            </div>
          </div>
          <div className="bg-gradient-to-r from-blue-600 to-blue-800 rounded-xl p-4 shadow-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm">Tu Comisión ({currentUser?.commission || 0}%)</p>
                <p className="text-white text-2xl font-bold">{formatCOP(commissionAmount)}</p>
              </div>
              <Percent className="text-blue-200 w-8 h-8" />
            </div>
          </div>
        </div>
        <div className="bg-gradient-to-r from-purple-600 to-purple-800 rounded-xl p-4 mb-6 shadow-lg">
          <div className="flex justify-between items-center">
            <div>
              <p className="text-purple-100 text-sm">Debes Pagar al Administrador</p>
              <p className="text-white text-2xl font-bold">{formatCOP(amountToPay)}</p>
            </div>
            <AlertCircle className="text-purple-200 w-8 h-8" />
          </div>
        </div>
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-6 shadow-lg border border-gray-700">
          <h2 className="text-white text-lg font-bold mb-4">Acciones Rápidas</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <button
              onClick={() => setCurrentView('bet-selection')}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Generar Ticket
            </button>
           
            <button
              onClick={() => {
                // ✅ USAR EL ID CORRECTO DE FIREBASE
                const sellerId = currentUser?.id;
                const link = `https://footbet-pro-rvdy.vercel.app/#/public-dashboard?seller=${sellerId}`;
                const message = `🍀 ¡Tu suerte empieza aquí! 🍀
            ⚽ *La Jugada 7* - Tu jugada Inteligente
            🎯 PREMIOS:
            ✅ 5 aciertos: Recupera tu Tu jugada
            ✅ 6 aciertos: 10 Juegos GRATIS
            ✅ 7 aciertos: $1.000.000
            💰 *VALOR DEL TICKET:*
            *$5.000 COP*

            💳 *FORMAS DE PAGO:*
            • *Nequi:* 3106524453
            • *Daviplata:* 3106524453
            • *Llave:* 3106524453

            📸 *IMPORTANTE:*
            Enviar pantallazo del pago para confirmar tu juego

           📲 Selecciona tus 7 partidos y envía tu Tu jugada
            👉 Juega ahora: ${link}
            ¡Mucha suerte! 🍀`;
                window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank');
              }}
              className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              📲 Enviar Enlace de Jugadas
            </button>
            <button
              onClick={() => {
                const message = generateResultsMessage(matchResults, allMatchesIncludingResults, currentUser?.name || 'Invitado')
                sendMatchesToWhatsApp(message);
              }}
              className="bg-orange-600 hover:bg-orange-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              📲 Enviar Últimos Resultados
            </button>
            <button
              onClick={() => setCurrentView('reports')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Reportes
            </button>
          </div>
        </div>
        
        {/* Jugadas Pendientes - Componente Seguro con Cloud Functions */}
        <PendingBetsView currentUser={currentUser} />

        <div className="bg-gray-800 rounded-xl p-6 shadow-lg border border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-white text-lg font-bold">Tickets de Hoy</h2>
            <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
              {todaySales.length} tickets
            </span>
          </div>
          <div className="space-y-3">
            {todaySales.length === 0 ? (
              <div className="text-gray-400 text-center py-8">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>No hay tickets generados hoy</p>
              </div>
            ) : (
              todaySales.map(ticket => (
                <div key={ticket.id} className="bg-gray-700 rounded-lg p-4 border border-gray-600 hover:border-green-600 transition-colors">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <h3 className="text-white font-medium">{ticket.customerName}</h3>
                      <p className="text-gray-400 text-sm">{ticket.customerPhone}</p>
                    </div>
                    <span className="bg-green-600 text-white text-xs px-2 py-1 rounded-full">
                      {formatCOP(ticket.totalStake)}
                    </span>
                  </div>
                  <div className="text-gray-400 text-sm flex items-center gap-2 mb-3">
                    <Ticket className="w-3 h-3" />
                    {ticket.bets.length} Tu jugada(s) • {ticket.time}
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleResendTicket(ticket)}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                    >
                      <RefreshCw className="w-3 h-3" />
                      Reenviar
                    </button>
                    <button
                      onClick={() => {
                        setCurrentTicket(ticket);
                        setShowTicketPreview(true);
                      }}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                    >
                      <Info className="w-3 h-3" />
                      Detalles
                    </button>
                    <button
                      onClick={() => {
                        setTicketToDelete(ticket);
                        setShowDeleteTicketModal(true);
                      }}
                      className="flex-1 bg-red-600 hover:bg-red-700 text-white text-xs px-2 py-1 rounded flex items-center justify-center gap-1"
                    >
                      <Trash2 className="w-3 h-3" />
                      Eliminar
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    );
  }, [currentUser, handleLogout, pendingTickets, matchResults, allMatchesIncludingResults, tickets]);
  
    const BetSelectionScreen = useCallback(() => {
      const todayMatches = [...matches]
        .filter(match => {
          const isClosed = shouldCloseMatch(match.date, match.time);
          return match.status === 'upcoming' && !isClosed;
        })
        .sort((a, b) => {
          if (a.date !== b.date) return a.date.localeCompare(b.date);
          const [aH, aM] = a.time.split(':').map(Number);
          const [bH, bM] = b.time.split(':').map(Number);
          return (aH * 60 + aM) - (bH * 60 + bM);
        });
   
    return (
      <div className="min-h-screen bg-gray-900 pb-8">
        <div className="bg-gradient-to-r from-green-600/80 to-green-800/80 backdrop-blur-sm p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setCurrentView('seller-dashboard')}
              className="text-white hover:text-green-200 text-2xl transition-colors"
            >
              ←
            </button>
            <h1 className="text-white text-xl font-bold">SeleccionarJugadas</h1>
            <div className="w-6"></div>
          </div>
          <CustomerInfoForm
            customerName={customerName}
            customerPhone={customerPhone}
            onNameChange={setCustomerName}
            onPhoneChange={setCustomerPhone}
          />
        </div>
        <div className="px-4 py-6">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-white text-xl font-bold">Partidos Disponibles</h2>
            <span className="bg-green-600 text-white text-sm px-3 py-1 rounded-full flex items-center gap-1">
              <Ticket className="w-3 h-3" />
              {selectedBets.size}/7 seleccionados
            </span>
          </div>
          <div className="space-y-4">
            {todayMatches.map(match => (
              <MatchBetCard
                key={match.id}
                match={match}
                selectedBet={selectedBets.get(match.id)}
                onSelectionChange={toggleBetSelection}
                isTrapMatch={match.isTrap}
              />
            ))}
          </div>
          {/* Panel de generación de ticket */}
          <div className="bg-gradient-to-r from-green-600 to-green-800 rounded-xl p-4 mt-6 shadow-lg border border-green-700">
            <div className="text-center mb-3">
              <p className="text-white font-bold text-lg">Monto del Ticket: {formatCOP(5000)}</p>
              <p className="text-green-200 text-sm">
                🎯 Premios: 5 aciertos = Recupera Tu jugada | 6 aciertos = Ticket Dorado (10 juegos) | 7 aciertos = $1M
              </p>
            </div>
            <button
              onClick={generateTicket}
              disabled={selectedBets.size !== 7}
              className={`w-full font-bold py-3 rounded-lg transition-colors shadow-lg transform hover:scale-105 ${
                selectedBets.size === 7
                  ? 'bg-white text-green-800 hover:bg-green-50'
                  : 'bg-gray-500 text-gray-300 cursor-not-allowed'
              }`}
            >
              {selectedBets.size === 7 
                ? 'Generar Ticket - $5,000' 
                : `Selecciona ${7 - selectedBets.size} partidos más`}
            </button>
          </div>
        </div>
      </div>
    );
  }, [matches, customerName, customerPhone, selectedBets, toggleBetSelection, generateTicket]);
  const renderCurrentView = () => {
  // 🔒 Protección crítica: no renderizar dashboards si no hay usuario autenticado
  if (['seller-dashboard', 'admin-dashboard', 'bet-selection', 'sales', 'reports', 'settings'].includes(currentView)) {
    if (!currentUser || !currentUser.id) {
      setCurrentView('login');
      return LoginScreen();
    }
  }

    switch (currentView) {
      case 'login':
        return LoginScreen();
      case 'public-dashboard':
        return <PublicDashboard />;
      
      
      case 'admin-dashboard':
        return AdminDashboard();
      case 'seller-dashboard':
        return SellerDashboard();
      case 'bet-selection':
        return BetSelectionScreen();
      case 'sales':
        return <SalesView 
          tickets={tickets} 
          sellerUsers={sellerUsers} 
          currentUser={currentUser} 
          userRole={userRole}
          onDeleteTicket={handleDeleteTicket}
        />;
      case 'reports':
        return <ReportsView 
          tickets={tickets} 
          sellerUsers={sellerUsers} 
          matches={matches}
          userRole={userRole}
          currentUser={currentUser}
          matchResults={matchResults}
        />;
      case 'settings':
        return <SettingsView 
          sellerUsers={sellerUsers} 
          setSellerUsers={setSellerUsers}
          currentUser={currentUser}
          handleLogout={handleLogout}
          userRole={userRole}
        />;
      default:
        return LoginScreen();
    }
  };
  // Login Screen Component
  const LoginScreen = useCallback(() => (
  <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-green-800 flex items-center justify-center p-4 relative overflow-hidden">
    
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

    <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-500/30 relative z-10">
      
      {/* 🔹 LOGO PRINCIPAL */}
      <div className="text-center mb-8">
        <div className="w-32 h-32 bg-gradient-to-br from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-2xl border-4 border-green-400/30">
          <img 
            src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Logo%20dina%CC%81mico%20de%20La%20Jugada%207.png" 
            alt="La Jugada 7 Logo"
            className="w-62 h-62 object-contain drop-shadow-lg"
          />
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">⚽ La Jugada 7</h1>
        <p className="text-green-300 text-sm">¡Tu suerte comienza aquí!</p>
      </div>

      {/* 🔹 BOTÓN PRINCIPAL - IR A APOSTAR (GRANDE Y ATRACTIVO) */}
      <button
        onClick={() => setCurrentView('public-dashboard')}
        className="w-full bg-gradient-to-r from-green-500 to-green-700 hover:from-green-400 hover:to-green-600 text-white font-bold py-4 rounded-xl transition-all transform hover:scale-105 shadow-2xl hover:shadow-green-500/50 flex items-center justify-center gap-3 mb-6"
      >
        <span className="text-2xl">⚽</span>
        <div className="text-left">
          <div className="text-lg">¡IR A APOSTAR!</div>
          <div className="text-xs text-green-200 font-normal">Sin cuenta • Rápido • Fácil</div>
        </div>
      </button>

      {/* 🔹 PREMIOS DESTACADOS */}
      <div className="bg-gradient-to-r from-purple-900/50 to-purple-800/50 rounded-xl p-4 mb-6 border border-purple-600/30">
        <h3 className="text-white font-bold text-sm mb-2 text-center">🏆 PREMIOS</h3>
        <div className="space-y-1 text-xs text-purple-200">
          <div className="flex justify-between">
            <span>✅ 5 aciertos:</span>
            <span className="text-white">Recupera tu Tu jugada</span>
          </div>
          <div className="flex justify-between">
            <span>✅ 6 aciertos:</span>
            <span className="text-yellow-300">10 juegos GRATIS</span>
          </div>
          <div className="flex justify-between">
            <span>✅ 7 aciertos:</span>
            <span className="text-green-300 font-bold">¡$1.000.000!</span>
          </div>
        </div>
      </div>

      {/* 🔹 SEPARADOR */}
      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-gray-600"></div>
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-4 bg-gray-800/50 text-gray-400 rounded-lg">¿Eres administrador o vendedor?</span>
        </div>
      </div>

      {/* 🔹 LOGIN SECUNDARIO (DISCRETO) */}
      <div className="space-y-4">
        <div>
          <label className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
            <Mail className="w-4 h-4" />
            Correo Electrónico
          </label>
          <input
            type="email"
            value={loginEmail}
            onChange={(e) => setLoginEmail(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
            placeholder="usuario@footbet.com"
          />
        </div>
        <div>
          <label className="text-gray-400 text-sm font-medium mb-2 flex items-center gap-2">
            <LockIcon className="w-4 h-4" />
            Contraseña
          </label>
          <input
            type="password"
            value={loginPassword}
            onChange={(e) => setLoginPassword(e.target.value)}
            className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-500 border border-gray-600"
            placeholder="••••••••"
          />
        </div>
        <button
          onClick={handleLogin}
          className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <LogOut className="w-4 h-4" />
          Iniciar Sesión
        </button>
      </div>

      {/* 🔹 FOOTER */}
      <div className="mt-6 pt-4 border-t border-gray-700 text-center">
        <p className="text-gray-500 text-xs">
          🍀 ¡Mucha suerte en tusJugadas!
        </p>
      </div>
    </div>
  </div>
), [loginEmail, loginPassword, handleLogin, setCurrentView]);
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {renderCurrentView()}

    {currentView !== 'login' && currentView !== 'public-dashboard' && (
      <NavigationBar 
       currentView={currentView}
       setCurrentView={setCurrentView}
       userRole={userRole}
     />
    )} 
      {showTicketPreview && (
        <TicketPreviewModal
          ticket={currentTicket}
          onClose={() => setShowTicketPreview(false)}
          onCopyToWhatsApp={() => copyToWhatsApp(currentTicket)}
          onResend={() => {
            setShowTicketPreview(false);
            handleResendTicket(currentTicket);
          }}
        />
      )}
      {showCreateSellerModal && (
        <CreateSellerModal
          onClose={() => setShowCreateSellerModal(false)}
          onSellerCreated={handleCreateSeller}
        />
      )}
      {showDeleteSellerModal && sellerToDelete && (
        <DeleteSellerModal
          seller={sellerToDelete}
          onConfirm={() => {
            handleDeleteSeller(sellerToDelete.id);
            setShowDeleteSellerModal(false);
            setSellerToDelete(null);
          }}
          onCancel={() => {
            setShowDeleteSellerModal(false);
            setSellerToDelete(null);
          }}
        />
      )}
      {showDeleteTicketModal && ticketToDelete && (
      <DeleteTicketModal
        ticket={ticketToDelete}
        onConfirm={async () => {
          await handleDeleteTicket(ticketToDelete.id);
          setShowDeleteTicketModal(false);
          setTicketToDelete(null);
        }}
        onCancel={() => {
          setShowDeleteTicketModal(false);
          setTicketToDelete(null);
        }}
      />
    )}
      {showResendModal && ticketToResend && (
        <ResendTicketModal
          ticket={ticketToResend}
          onClose={() => setShowResendModal(false)}
          onResend={handleResendConfirm}
        />
      )}
    </div>
  );
};



export default App;