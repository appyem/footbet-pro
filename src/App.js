import React, { useState, useEffect, useCallback, useMemo } from 'react';

import { Phone, LogOut, Home, Ticket, FileText, BarChart3, LockIcon, Settings, Plus, User, Mail, Percent, Calendar, Clock, CheckCircle, AlertCircle, X, Save, Trash2, Download, Award, Users, DollarSign, Database, Star, Crown, BarChart2, Search, AlertTriangle, RefreshCw, Info } from 'lucide-react';
// Firebase - Configuración correcta para Create React App
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, query, where, doc, deleteDoc, updateDoc } from 'firebase/firestore';
// Importar funciones de servicios
import { getCurrentDate, getCurrentTime, shouldCloseMatch } from './services/matchService';
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
// Componente aislado para los inputs del cliente
const CustomerInfoForm = React.memo(({ customerName, customerPhone, onNameChange, onPhoneChange }) => {
  return (
    <>
      <div className="mb-4">
        <label className="block text-green-100 text-sm font-medium mb-2 flex items-center gap-2">
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
        <label className="block text-green-100 text-sm font-medium mb-2 flex items-center gap-2">
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
    <div className={`bg-gray-800 rounded-xl p-4 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-gray-600 transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <span className="text-green-400 text-sm font-medium flex items-center gap-1">
          <Calendar className="w-3 h-3" />
          {match.league}
          {isTrapMatch && (
            <AlertTriangle className="w-3 h-3 text-purple-400 ml-1" title="Partido especial - Alta volatilidad" />
          )}
        </span>
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
        <button
          onClick={() => onSelectionChange(match.id, '1', match.odds.home)}
          className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedBet?.selection === '1'
              ? 'bg-green-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="font-bold">1</div>
          <div className="text-xs mt-1 opacity-90">{match.odds.home}</div>
        </button>
        <button
          onClick={() => onSelectionChange(match.id, 'X', match.odds.draw)}
          className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedBet?.selection === 'X'
              ? 'bg-yellow-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="font-bold">X</div>
          <div className="text-xs mt-1 opacity-90">{match.odds.draw}</div>
        </button>
        <button
          onClick={() => onSelectionChange(match.id, '2', match.odds.away)}
          className={`px-3 py-2 rounded text-sm font-medium transition-all duration-200 transform hover:scale-105 ${
            selectedBet?.selection === '2'
              ? 'bg-red-600 text-white shadow-lg'
              : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
          }`}
        >
          <div className="font-bold">2</div>
          <div className="text-xs mt-1 opacity-90">{match.odds.away}</div>
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
              🎯 Premios: 5 aciertos = Recupera apuesta | 6 aciertos = Ticket Dorado (10 juegos) | 7 aciertos = $5M
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
  const [commission, setCommission] = useState('');
  const [error, setError] = useState('');
  const handleSubmit = (e) => {
    e.preventDefault();
    // Validaciones
    if (!name.trim() || !email.trim() || !password.trim() || !commission) {
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
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
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
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
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
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
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
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
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
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
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
// Función para copiar a WhatsApp (versión corregida)
const copyToWhatsApp = (ticket) => {
  if (!ticket) return;
  // Asegurar que el número tenga el formato correcto
  let phoneNumber = ticket.customerPhone;
  if (!phoneNumber.startsWith('+57')) {
    phoneNumber = `+57 ${phoneNumber}`;
  }
  const message = `*🎫 TICKET DE APUESTA - ${ticket.id}*
` +
    `*Cliente:* ${ticket.customerName}
` +
    `*Teléfono:* ${phoneNumber}
` +
    `*Vendedor:* ${ticket.sellerName}
` +
    `*Fecha:* ${ticket.date} ${ticket.time}
` +
    `*APUESTAS:*
` +
    ticket.bets.map((bet, index) => 
      `${index + 1}. ${bet.homeTeam} vs ${bet.awayTeam}
` +
      `   - ${bet.selection === '1' ? 'Ganador Local' : bet.selection === 'X' ? 'Empate' : 'Ganador Visitante'} (x${bet.odds})
`
    ).join('\n') +
    `
*TOTAL APOSTADO:* ${formatCOP(ticket.totalStake)}
` +
    `*Código de Verificación:* ${ticket.verificationCode}
` +
    `🏆 *PREMIOS:*
` +
    `✅ 5 aciertos: Recupera tu apuesta ($5,000)
` +
    `✅ 6 aciertos: ¡Gana un TICKET DORADO! (10 juegos gratis)
` +
    `✅ 7 aciertos: Gana $5,000,000
` +
    `¡Gracias por confiar en FootBet Pro! 🏆`;
  // Usar el esquema whatsapp:// para abrir la app nativa
  const whatsappUrl = `whatsapp://send?phone=${phoneNumber.replace(/\s+/g, '')}&text=${encodeURIComponent(message)}`;
  // Intentar abrir WhatsApp nativo
  window.location.href = whatsappUrl;
  // Fallback a web si la app nativa no está disponible
  setTimeout(() => {
    window.open(`https://wa.me/${phoneNumber.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
  }, 1000);
};
// Componente de ventas - versión para vendedor (solo sus ventas)
const SalesView = ({ tickets, sellerUsers, currentUser, userRole, onDeleteTicket }) => {
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
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
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
                  {ticket.bets.length} apuesta(s) • Código: {ticket.id}
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
const ReportsView = ({ tickets, sellerUsers, matches, userRole, currentUser }) => {
  const [activeReport, setActiveReport] = useState('daily');
  const today = getCurrentDate();
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
    // Simular tickets ganadores (30% de probabilidad)
    return tickets.filter(ticket => {
      const randomWin = Math.random();
      return randomWin < 0.3 && ticket.bets.length >= 5;
    });
  }, [tickets]);
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
                            {formatCOP(ticket.totalStake * 2)} {/* Simular premio */}
                          </span>
                          <p className="text-gray-400 text-xs mt-1">Ticket: {ticket.id}</p>
                        </div>
                      </div>
                      <div className="text-green-400 text-sm flex items-center gap-2">
                        <CheckCircle className="w-4 h-4" />
                        Ganador - {ticket.bets.length} aciertos
                      </div>
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
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
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
const SettingsView = ({ sellerUsers, setSellerUsers, currentUser, handleLogout, userRole }) => {
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
        <p className="text-gray-400">Gestiona la configuración de tu sistema de apuestas</p>
      </div>
      {/* Tabs de configuración */}
      <div className="bg-gray-800 rounded-xl p-4 mb-6">
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
              <label className="block text-gray-300 text-sm font-medium mb-2">Apuesta Mínima (COP)</label>
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
              <label className="block text-gray-300 text-sm font-medium mb-2">Apuesta Máxima (COP)</label>
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
    <div className="bg-gray-800 rounded-xl p-6 mb-6">
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
const App = () => {
  const [currentView, setCurrentView] = useState('login');
  const [userRole, setUserRole] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [tickets, setTickets] = useState([]);
  const [matches, setMatches] = useState([]);
  const [allMatches, setAllMatches] = useState([]); // Para el panel del admin
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

  // Función para obtener partidos de un día específico
  const getMatchesForDate = async (date) => {
    try {
      const matchesQuery = query(collection(db, 'matches'), where('date', '==', date));
      const matchesSnapshot = await getDocs(matchesQuery);
      return matchesSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
    } catch (error) {
      console.error('Error en getMatchesForDate:', error);
      return [];
    }
  };

  // Cargar partidos para el ADMIN (todos los del día, sin filtrar por hora)
  const loadAllMatchesForAdmin = async () => {
    try {
      const today = getCurrentDate();
      const todayMatches = await getMatchesForDate(today);
      if (isMounted) setAllMatches(todayMatches);
    } catch (error) {
      console.error('Error en loadAllMatchesForAdmin:', error);
    }
  };

  // Seleccionar 7 partidos para el VENDEDOR (solo partidos activos)
  const selectVisibleMatchesForSeller = async () => {
    try {
      const today = getCurrentDate();
      let allAvailableMatches = [];
      let currentDate = today;
      let daysChecked = 0;
      const maxDays = 7;

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
        const [aH, aM] = a.time.split(':').map(Number);
        const [bH, bM] = b.time.split(':').map(Number);
        return (aH * 60 + aM) - (bH * 60 + bM);
      });

      const finalMatches = allAvailableMatches.slice(0, 7);
      if (isMounted) {
        if (finalMatches.length === 0) {
          setMatches([]);
        } else if (finalMatches.length < 7) {
          const repeated = [];
          while (repeated.length < 7) {
            repeated.push(...finalMatches);
          }
          setMatches(repeated.slice(0, 7));
        } else {
          setMatches(finalMatches);
        }
      }
    } catch (error) {
      console.error('Error en selectVisibleMatchesForSeller:', error);
      if (isMounted) setMatches([]);
    }
  };

  // Cargar datos iniciales (SIN verificación automática de visibilidad)
  const loadData = async () => {
    if (!isMounted) return;
    try {
      // Cargar vendedores
      const sellersSnapshot = await getDocs(collection(db, 'sellers'));
      const sellersData = sellersSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (isMounted) setSellerUsers(sellersData);

      // Cargar tickets
      const ticketsSnapshot = await getDocs(collection(db, 'tickets'));
      const ticketsData = ticketsSnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      if (isMounted) setTickets(ticketsData);

      // Cargar resultados
      const resultsSnapshot = await getDocs(collection(db, 'match_results'));
      const resultsData = {};
      resultsSnapshot.docs.forEach(doc => {
        const data = doc.data();
        resultsData[data.matchId] = data.result;
      });
      if (isMounted) setMatchResults(resultsData);

      // Cargar partidos
      await loadAllMatchesForAdmin();
      await selectVisibleMatchesForSeller();
    } catch (error) {
      console.error('Error al cargar datos iniciales:', error);
      if (isMounted) {
        setMatches([]);
        setAllMatches([]);
      }
    }
  };

  // Ejecutar carga inicial
  loadData();

  // Cleanup
  return () => {
    isMounted = false;
  };
}, []);

// Authentication data
  const adminUsers = useMemo(() => [
    { id: 'admin1', email: 'admin@footbet.com', password: 'admin123', name: 'Administrador' }
  ], []);
  const handleLogin = useCallback(() => {
    const admin = adminUsers.find(u => u.email === loginEmail && u.password === loginPassword);
    if (admin) {
      setCurrentUser(admin);
      setUserRole('admin');
      setCurrentView('admin-dashboard');
      return;
    }
    const seller = sellerUsers.find(u => u.email === loginEmail && u.password === loginPassword);
    if (seller) {
      setCurrentUser(seller);
      setUserRole('seller');
      setCurrentView('seller-dashboard');
      return;
    }
    alert('Credenciales incorrectas');
  }, [loginEmail, loginPassword, adminUsers, sellerUsers]);
  const handleLogout = useCallback(() => {
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
    if (selectedBets.size !== 7) {
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
     sellerName: currentUser.name,
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
  }, [customerName, customerPhone, selectedBets, tickets.length, currentUser]);
  const handleSaveResult = async (matchId, result) => {
    try {
    // 1. Guardar el resultado en Firebase
    const resultData = { // ← ¡Declarar con 'const'!
        matchId,
        result,
        date: getCurrentDate(),
        timestamp: new Date().toISOString()
      };
      await addDoc(collection(db, 'match_results'), resultData);
      setMatchResults(prev => ({ ...prev, [matchId]: result }));

    // 2. Marcar el partido como oculto en Firebase
      const matchesQuery = query(collection(db, 'matches'), where('id', '==', matchId));
      const matchesSnapshot = await getDocs(matchesQuery);
      if (!matchesSnapshot.empty) {
        const docRef = doc(db, 'matches', matchesSnapshot.docs[0].id);
        await updateDoc(docRef, { hidden: true });
      }

    // 3. Eliminar el partido de ambas listas locales
      setAllMatches(prev => prev.filter(match => match.id !== matchId));
      setMatches(prev => prev.filter(match => match.id !== matchId));

    // ✅ Corrección: usar console.log o alert
      console.log('Resultado guardado exitosamente');
    // Opcional: alert('Resultado guardado exitosamente');
    } catch (error) {
      console.error('Error al guardar resultado:', error);
      alert('Error al guardar el resultado');
    }
  };


  const saveMatch = useCallback(async () => {
  if (!matchForm.homeTeam || !matchForm.awayTeam || !matchForm.date) {
    alert('Por favor complete todos los campos obligatorios');
    return;
  }
  try {
    if (editingMatch) {
      await deleteDoc(doc(db, 'matches', editingMatch.id));
    }
    const completeMatch = {
      ...matchForm,
      hidden: false,
      status: 'upcoming',
      odds: { home: 2.0, draw: 3.0, away: 3.0 },
      isTrap: false
    };
    const docRef = await addDoc(collection(db, 'matches'), completeMatch);
    await updateDoc(docRef, { id: docRef.id });
    alert('Partido guardado exitosamente');

    // Recargar partidos
    const today = getCurrentDate();
    const matchesQuery = query(collection(db, 'matches'), where('date', '==', today));
    const matchesSnapshot = await getDocs(matchesQuery);
    const matchesData = matchesSnapshot.docs.map(doc => {
      const data = doc.data();
      return {
        id: doc.id,
        homeTeam: data.homeTeam || 'Equipo Local',
        awayTeam: data.awayTeam || 'Equipo Visitante',
        league: data.league || 'Liga',
        time: data.time || '20:00',
        country: data.country || 'Colombia',
        popularity: data.popularity || 50,
        date: data.date || getCurrentDate(),
        odds: data.odds || { home: 2.0, draw: 3.0, away: 3.0 },
        status: data.status || 'upcoming',
        isTrap: data.isTrap || false,
        hidden: data.hidden || false
      };
    });
    setMatches(matchesData);
    setEditingMatch(null);
  } catch (error) {
    console.error('Error al guardar partido:', error);
    alert('Error al guardar el partido');
  }
}, [matchForm, editingMatch]); // ← Dependencias correctas


  const deleteMatch = async (matchId) => {
    if (window.confirm('¿Seguro que desea eliminar este partido?')) {
      try {
        await deleteDoc(doc(db, 'matches', matchId));
        // Recargar partidos
        const today = getCurrentDate();
        const matchesQuery = query(collection(db, 'matches'), where('date', '==', today));
        const matchesSnapshot = await getDocs(matchesQuery);
        const matchesData = matchesSnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
          status: 'upcoming'
        }));
        setMatches(matchesData);
        alert('Partido eliminado exitosamente');
      } catch (error) {
        console.error('Error al eliminar partido:', error);
        alert('Error al eliminar el partido');
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
      
      // Recargar partidos
        const today = getCurrentDate();
        const matchesQuery2 = query(collection(db, 'matches'), where('date', '==', today));
        const matchesSnapshot2 = await getDocs(matchesQuery2);
        const matchesData = matchesSnapshot2.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setMatches(matchesData);
        alert(hide ? 'Partido oculto exitosamente' : 'Partido mostrado exitosamente');
      }
    } catch (error) {
      console.error('Error al ocultar/mostrar partido:', error);
      alert('Error al cambiar visibilidad del partido');
    }
  };

  const handleCreateSeller = async (newSeller) => {
  try {
    const docRef = await addDoc(collection(db, 'sellers'), newSeller);
    const sellerWithId = { ...newSeller, id: docRef.id };
    setSellerUsers(prev => [...prev, sellerWithId]);
    alert('Vendedor creado exitosamente');
  } catch (error) {
    console.error('Error al crear vendedor:', error);
    alert('Error al crear el vendedor. Intente nuevamente.');
  }
};
  const handleDeleteSeller = (sellerId) => {
    setSellerUsers(prev => prev.filter(seller => seller.id !== sellerId));
    // Si el vendedor eliminado estaba logueado, cerrar sesión
    if (currentUser && currentUser.id === sellerId) {
      handleLogout();
    }
    // Eliminar tickets asociados al vendedor eliminado
    setTickets(prev => prev.filter(ticket => ticket.sellerId !== sellerId));
  };
  const handleDeleteTicket = (ticketId) => {
    setTickets(prev => prev.filter(ticket => ticket.id !== ticketId));
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
        <p className="text-gray-400">Bienvenido, {currentUser?.name}</p>
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
      <div className="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg border border-gray-700">
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
      <div className="bg-gray-800 rounded-xl p-6 mb-6">
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
          <input
            type="text"
            placeholder="País"
            value={matchForm.country}
            onChange={(e) => setMatchForm({...matchForm, country: e.target.value})}
            className="bg-gray-700 text-white rounded-lg px-3 py-2"
          />
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
                    <p className="text-white">{match.homeTeam} vs {match.awayTeam}</p>
                    <p className="text-gray-400 text-sm">{match.league} • {match.time}</p>
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

  ), [currentUser, tickets, sellerUsers, handleLogout, formatCOP, matchResults, matches, matchForm, editingMatch, saveMatch, allMatches]);

  const SellerDashboard = useCallback(() => {
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
          <p className="text-gray-400">Bienvenido, {currentUser?.name}</p>
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
        <div className="bg-gray-800 rounded-xl p-6 mb-6 shadow-lg border border-gray-700">
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
              onClick={() => setCurrentView('reports')}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 transition-colors"
            >
              <BarChart3 className="w-4 h-4" />
              Reportes
            </button>
          </div>
        </div>
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
                    {ticket.bets.length} apuesta(s) • {ticket.time}
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
  }, [currentUser, tickets, handleLogout]);
  const NavigationBar = () => {
    if (currentView === 'login' || currentView === 'bet-selection') return null;
    return (
      <div className="fixed bottom-0 left-0 right-0 bg-gray-900 border-t border-gray-800">
        <div className="flex justify-around items-center py-3">
          {userRole === 'admin' ? (
            <>
              <button
                onClick={() => setCurrentView('admin-dashboard')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'admin-dashboard' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-xs mt-1">Inicio</span>
              </button>
              <button
                onClick={() => setCurrentView('sales')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'sales' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs mt-1">Ventas</span>
              </button>
              <button
                onClick={() => setCurrentView('reports')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'reports' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs mt-1">Reportes</span>
              </button>
              <button
                onClick={() => setCurrentView('settings')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'settings' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <Settings className="w-5 h-5" />
                <span className="text-xs mt-1">Config</span>
              </button>
            </>
          ) : (
            <>
              <button
                onClick={() => setCurrentView('seller-dashboard')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'seller-dashboard' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="text-xs mt-1">Inicio</span>
              </button>
              <button
                onClick={() => setCurrentView('bet-selection')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'bet-selection' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <Ticket className="w-5 h-5" />
                <span className="text-xs mt-1">Ticket</span>
              </button>
              <button
                onClick={() => setCurrentView('sales')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'sales' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <FileText className="w-5 h-5" />
                <span className="text-xs mt-1">Ventas</span>
              </button>
              <button
                onClick={() => setCurrentView('reports')}
                className={`flex flex-col items-center px-4 py-2 rounded-lg transition-colors ${
                  currentView === 'reports' ? 'text-green-400' : 'text-gray-400'
                }`}
              >
                <BarChart3 className="w-5 h-5" />
                <span className="text-xs mt-1">Reportes</span>
              </button>
            </>
          )}
        </div>
      </div>
    );
  };
  const BetSelectionScreen = useCallback(() => {
    const todayMatches = allMatches.filter(match => { // Mostrar TODOS los partidos del día
      // Si el partido ya inició (5 min antes), no se muestra al vendedor
      const isClosed = shouldCloseMatch(match.date, match.time);
      return match.status === 'upcoming' && !isClosed;
    });
    return (
      <div className="min-h-screen bg-gray-900 pb-8">
        <div className="bg-gradient-to-r from-green-600 to-green-800 p-4 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <button 
              onClick={() => setCurrentView('seller-dashboard')}
              className="text-white hover:text-green-200 text-2xl transition-colors"
            >
              ←
            </button>
            <h1 className="text-white text-xl font-bold">Seleccionar Apuestas</h1>
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
            <h2 className="text-white text-xl font-bold">Partidos de Hoy</h2>
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
                🎯 Premios: 5 aciertos = Recupera apuesta | 6 aciertos = Ticket Dorado (10 juegos) | 7 aciertos = $5M
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
    switch (currentView) {
      case 'login':
        return LoginScreen();
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
    <div className="min-h-screen bg-gradient-to-br from-green-900 via-gray-900 to-green-800 flex items-center justify-center p-4">
      <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-700">
        <div className="text-center mb-6">
          <div className="w-20 h-20 bg-gradient-to-r from-green-500 to-green-700 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
            <span className="text-white text-3xl font-bold">⚽</span>
          </div>
          <h1 className="text-3xl font-bold text-white mb-2">FootBet Pro</h1>
          <p className="text-gray-400">Sistema de Apuestas Profesional</p>
        </div>
        <div className="space-y-6">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
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
            <label className="block text-gray-300 text-sm font-medium mb-2 flex items-center gap-2">
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
            className="w-full bg-gradient-to-r from-green-600 to-green-800 hover:from-green-700 hover:to-green-900 text-white font-bold py-3 rounded-lg transition-all transform hover:scale-105 shadow-lg hover:shadow-xl"
          >
            Iniciar Sesión
          </button>
        </div>
      </div>
    </div>
  ), [loginEmail, loginPassword, handleLogin]);
  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {renderCurrentView()}
      <NavigationBar />
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
          onConfirm={() => {
            handleDeleteTicket(ticketToDelete.id);
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