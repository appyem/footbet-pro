import React, { useState, useEffect } from 'react';
import { Clock, Eye, CheckCircle, XCircle, X } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, onSnapshot, updateDoc, doc } from 'firebase/firestore';
import { approvePendingTicket } from '../services/cloudFunctions';

const formatCOP = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const PendingBetsView = ({ currentUser }) => {
  const [pendingTickets, setPendingTickets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  useEffect(() => {
    // Suscribirse a cambios en pending_tickets
    const q = query(
      collection(db, 'pending_tickets'),
      where('sellerId', '==', currentUser.id),
      where('status', '==', 'pending_approval')
    );
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const tickets = [];
      querySnapshot.forEach((doc) => {
        tickets.push({ id: doc.id, ...doc.data() });
      });
      setPendingTickets(tickets);
      setLoading(false);
    }, (error) => {
      console.error("Error al obtener tickets pendientes:", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser.id]);

  const handleViewDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowDetailsModal(true);
  };

  const handleApprove = async () => {
    if (!selectedTicket) return;
    
    try {
      // ✅ USAR CLOUD FUNCTION (validación del servidor)
      const result = await approvePendingTicket(selectedTicket.id);
      
      // Notificar al cliente por WhatsApp
      const message = `¡Buenas noticias! Tu Tu jugada ha sido aprobada. Código de verificación: ${result.verificationCode}. ¡Mucha suerte!`;
      window.open(`https://wa.me/${selectedTicket.customerPhone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
      
      setShowApproveModal(false);
      setShowDetailsModal(false);
      alert('Tu jugada aprobada y notificada al cliente');
    } catch (error) {
      console.error('Error al aprobar Tu jugada:', error);
      alert('Error al aprobar la Tu jugada: ' + error.message);
    }
  };

  const handleReject = async () => {
    if (!selectedTicket || !rejectReason.trim()) {
      alert('Por favor ingresa un motivo para rechazar la Tu jugada');
      return;
    }
    
    try {
      // Actualizar estado del ticket pendiente
      await updateDoc(doc(db, 'pending_tickets', selectedTicket.id), {
        status: 'rejected',
        rejectedAt: new Date().toISOString(),
        rejectReason: rejectReason.trim()
      });
      
      // Notificar al cliente por WhatsApp
      const message = `Lamentamos informarte que tu Tu jugada ha sido rechazada. Motivo: ${rejectReason}. Si tienes preguntas, contacta a tu vendedor.`;
      window.open(`https://wa.me/${selectedTicket.customerPhone.replace(/\s+/g, '')}?text=${encodeURIComponent(message)}`, '_blank');
      
      setShowRejectModal(false);
      setShowDetailsModal(false);
      setRejectReason('');
      alert('Tu jugada rechazada y notificada al cliente');
    } catch (error) {
      console.error('Error al rechazar Tu jugada:', error);
      alert('Error al rechazar la Tu jugada');
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="w-12 h-12 border-4 border-green-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 px-4">
      <div className="mb-6">
        <h1 className="text-white text-2xl font-bold">Tu jugadas Pendientes</h1>
        <p className="text-gray-400 mt-1">Revisa y aprueba lasJugadas enviadas por los clientes</p>
      </div>

      {pendingTickets.length === 0 ? (
        <div className="bg-gray-800 rounded-xl p-8 text-center">
          <Clock className="w-12 h-12 text-gray-500 mx-auto mb-4" />
          <p className="text-gray-400">No tienesJugadas pendientes</p>
        </div>
      ) : (
        <div className="space-y-4">
          {pendingTickets.map(ticket => (
            <div key={ticket.id} className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="text-white font-medium">{ticket.customerName}</h3>
                  <p className="text-gray-400 text-sm">{ticket.customerPhone}</p>
                  <p className="text-gray-500 text-xs mt-1">
                    Enviado: {new Date(ticket.submittedAt).toLocaleString()}
                  </p>
                </div>
                <div className="text-right">
                  <span className="bg-yellow-600 text-white text-xs px-2 py-1 rounded-full">
                    Pendiente
                  </span>
                  <p className="text-white font-bold mt-1">
                    {formatCOP(ticket.totalStake)}
                  </p>
                </div>
              </div>
              
              <div className="text-gray-400 text-sm mb-3">
                {ticket.bets.length} Tu jugada(s)
              </div>
              
              <div className="flex gap-2">
                <button
                  onClick={() => handleViewDetails(ticket)}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <Eye className="w-4 h-4" />
                  Ver Detalles
                </button>
                <button
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowApproveModal(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <CheckCircle className="w-4 h-4" />
                  Aprobar
                </button>
                <button
                  onClick={() => {
                    setSelectedTicket(ticket);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded-lg flex items-center justify-center gap-1"
                >
                  <XCircle className="w-4 h-4" />
                  Rechazar
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal de detalles */}
      {showDetailsModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-green-400">Detalles de Tu jugada</h2>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="text-gray-400 hover:text-white text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="bg-gray-700 rounded-xl p-4 mb-4">
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="text-gray-400">Cliente:</div>
                  <div className="text-white">{selectedTicket.customerName}</div>
                  <div className="text-gray-400">Teléfono:</div>
                  <div className="text-white">{selectedTicket.customerPhone}</div>
                  <div className="text-gray-400">Enviado:</div>
                  <div className="text-white">{new Date(selectedTicket.submittedAt).toLocaleString()}</div>
                  <div className="text-gray-400">Total:</div>
                  <div className="text-white font-bold">{formatCOP(selectedTicket.totalStake)}</div>
                </div>
              </div>
              
              <div className="space-y-3 mb-6">
                <h3 className="text-white font-medium">Tu jugadas</h3>
                {selectedTicket.bets.map((bet, index) => (
                  <div key={index} className="bg-gray-700/50 rounded-lg p-3">
                    <div className="text-sm text-gray-300 mb-1">
                      {bet.homeTeam} vs {bet.awayTeam}
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-white font-medium">
                        {bet.selection === '1' ? 'Ganador Local' : 
                         bet.selection === 'X' ? 'Empate' : 'Ganador Visitante'}
                      </span>
                      <span className="text-green-400 text-sm">x{bet.odds}</span>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowApproveModal(true);
                  }}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-5 h-5" />
                  Aprobar
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    setShowRejectModal(true);
                  }}
                  className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <XCircle className="w-5 h-5" />
                  Rechazar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de aprobación */}
      {showApproveModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-green-400">Aprobar Tu jugada</h2>
              <button
                onClick={() => setShowApproveModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <p className="text-gray-300 mb-6">
              ¿Estás seguro que deseas aprobar la Tu jugada de <span className="text-white font-medium">{selectedTicket.customerName}</span> por <span className="text-white font-bold">{formatCOP(selectedTicket.totalStake)}</span>?
            </p>
            
            <div className="flex gap-3">
              <button
                onClick={handleApprove}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <CheckCircle className="w-5 h-5" />
                Aprobar
              </button>
              <button
                onClick={() => setShowApproveModal(false)}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de rechazo */}
      {showRejectModal && selectedTicket && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50">
          <div className="bg-gray-800 rounded-2xl max-w-md w-full p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-red-400">Rechazar Tu jugada</h2>
              <button
                onClick={() => setShowRejectModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-300 text-sm font-medium mb-2">
                Motivo del rechazo
              </label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                className="w-full bg-gray-700 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-red-500 border border-gray-600"
                rows="3"
                placeholder="Ingresa el motivo por el cual rechazas esta Tu jugada..."
              ></textarea>
            </div>
            
            <div className="flex gap-3">
              <button
                onClick={handleReject}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white font-bold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <XCircle className="w-5 h-5" />
                Rechazar
              </button>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white font-bold py-3 rounded-lg transition-colors"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PendingBetsView;