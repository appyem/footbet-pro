// src/services/cloudFunctions.js
// Servicio centralizado para llamar a Cloud Functions de forma segura

const FUNCTIONS = {
  createPendingTicket: 'https://creatependingticket-wxcqdudneq-uc.a.run.app',
  approvePendingTicket: 'https://approvependingticket-wxcqdudneq-uc.a.run.app',
  submitMatchResult: 'https://submitmatchresult-wxcqdudneq-uc.a.run.app',
  manageSeller: 'https://manageseller-wxcqdudneq-uc.a.run.app',
  manageMatch: 'https://managematch-wxcqdudneq-uc.a.run.app'
};

/**
 * Función auxiliar para llamar a cualquier Cloud Function
 */
const callFunction = async (functionName, data) => {
  const url = FUNCTIONS[functionName];
  
  if (!url) {
    throw new Error(`Función ${functionName} no encontrada`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ data })
  });

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result.error?.message || 'Error al procesar la solicitud');
  }

  return result.result;
};

/**
 * Crear ticket pendiente (cliente público)
 */
export const createPendingTicket = async (ticketData) => {
  return callFunction('createPendingTicket', ticketData);
};

/**
 * Aprobar ticket pendiente (vendedor)
 */
export const approvePendingTicket = async (ticketId) => {
  return callFunction('approvePendingTicket', { ticketId });
};

/**
 * Marcar resultado de partido (admin)
 */
export const submitMatchResult = async (matchId, result) => {
  return callFunction('submitMatchResult', { matchId, result });
};

/**
 * Crear vendedor (admin)
 */
export const createSeller = async (sellerData) => {
  return callFunction('manageSeller', { action: 'create', sellerData });
};

/**
 * Actualizar vendedor (admin)
 */
export const updateSeller = async (sellerId, sellerData) => {
  return callFunction('manageSeller', { action: 'update', sellerId, sellerData });
};

/**
 * Eliminar vendedor (admin)
 */
export const deleteSeller = async (sellerId) => {
  return callFunction('manageSeller', { action: 'delete', sellerId });
};

/**
 * Crear partido (admin)
 */
export const createMatch = async (matchData) => {
  return callFunction('manageMatch', { action: 'create', matchData });
};

/**
 * Actualizar partido (admin)
 */
export const updateMatch = async (matchId, matchData) => {
  return callFunction('manageMatch', { action: 'update', matchId, matchData });
};

/**
 * Eliminar partido (admin)
 */
export const deleteMatch = async (matchId) => {
  return callFunction('manageMatch', { action: 'delete', matchId });
};

/**
 * Ocultar/mostrar partido (admin)
 */
export const hideMatch = async (matchId, hidden) => {
  return callFunction('manageMatch', { action: 'hide', matchId, hidden });
};
