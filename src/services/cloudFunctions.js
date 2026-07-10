// src/services/cloudFunctions.js
import { getAuth } from 'firebase/auth';
import { app } from './firebase'; // Asegúrate de que esta ruta sea correcta

const auth = getAuth(app);

const FUNCTIONS = {
  createPendingTicket: 'https://creatependingticket-wxcqdudneq-uc.a.run.app',
  approvePendingTicket: 'https://approvependingticket-wxcqdudneq-uc.a.run.app',
  submitMatchResult: 'https://submitmatchresult-wxcqdudneq-uc.a.run.app',
  manageSeller: 'https://manageseller-wxcqdudneq-uc.a.run.app',
  manageMatch: 'https://managematch-wxcqdudneq-uc.a.run.app',
  // 💰 Sistema de Créditos
  requestCreditPurchase: 'https://requestcreditpurchase-wxcqdudneq-uc.a.run.app',
  addCredits: 'https://addcredits-wxcqdudneq-uc.a.run.app',
  requestWithdrawal: 'https://requestwithdrawal-wxcqdudneq-uc.a.run.app',
  processWithdrawal: 'https://processwithdrawal-wxcqdudneq-uc.a.run.app',
  getBalance: 'https://getbalance-wxcqdudneq-uc.a.run.app'
};

/**
 * Función auxiliar para llamar a cualquier Cloud Function con Autenticación
 */
const callFunction = async (functionName, data) => {
  const url = FUNCTIONS[functionName];
  
  if (!url) {
    throw new Error(`Función ${functionName} no encontrada`);
  }

  // ✅ 1. Obtener el token del usuario actual
  const user = auth.currentUser;
  if (!user) {
    throw new Error('Debes iniciar sesión para realizar esta acción');
  }

  const token = await user.getIdToken();

  // ✅ 2. Hacer la petición incluyendo el token en el header
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}` // <--- ESTO ES LO QUE FALTABA
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
 * Gestionar vendedores (admin)
 */
export const createSeller = async (sellerData) => {
  return callFunction('manageSeller', { action: 'create', sellerData });
};

export const updateSeller = async (sellerId, sellerData) => {
  return callFunction('manageSeller', { action: 'update', sellerId, sellerData });
};

export const deleteSeller = async (sellerId) => {
  return callFunction('manageSeller', { action: 'delete', sellerId });
};

/**
 * Gestionar partidos (admin)
 */
export const createMatch = async (matchData) => {
  return callFunction('manageMatch', { action: 'create', matchData });
};

export const updateMatch = async (matchId, matchData) => {
  return callFunction('manageMatch', { action: 'update', matchId, matchData });
};

export const deleteMatch = async (matchId) => {
  return callFunction('manageMatch', { action: 'delete', matchId });
};

export const hideMatch = async (matchId, hidden) => {
  return callFunction('manageMatch', { action: 'hide', matchId, hidden });
};


// ═══════════════════════════════════════════════════
// 💰 SISTEMA DE CRÉDITOS - Funciones públicas (sin auth)
// ═══════════════════════════════════════════════════

/**
 * Función auxiliar para llamar a Cloud Functions SIN autenticación
 */
const callPublicFunction = async (functionName, data) => {
  const url = FUNCTIONS[functionName];
  
  if (!url) {
    throw new Error(`Función ${functionName} no encontrada`);
  }

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
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
 * Consultar saldo de créditos (público)
 */
export const getBalance = async (phone, uid) => {
  return callPublicFunction('getBalance', { phone, uid });
};

/**
 * Solicitar recarga de créditos (público)
 * Si el cliente no tiene UID, se crea automáticamente
 */
export const requestCreditPurchase = async (phone, amount, paymentMethod) => {
  return callPublicFunction('requestCreditPurchase', { phone, amount, paymentMethod });
};

/**
 * Solicitar retiro de créditos (público) - REQUIERE UID
 */
export const requestWithdrawal = async (phone, uid, amount, paymentMethod, accountNumber) => {
  return callPublicFunction('requestWithdrawal', { phone, uid, amount, paymentMethod, accountNumber });
};

// ═══════════════════════════════════════════════════
// 💰 SISTEMA DE CRÉDITOS - Funciones admin (con auth)
// ═══════════════════════════════════════════════════

/**
 * Agregar créditos (solo admin)
 */
export const addCredits = async (phone, amount, requestId) => {
  return callFunction('addCredits', { phone, amount, requestId });
};

/**
 * Procesar retiro (solo admin)
 */
export const processWithdrawal = async (requestId, approve) => {
  return callFunction('processWithdrawal', { requestId, approve });
};
