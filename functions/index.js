const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");

// Inicializar Firebase Admin (acceso privilegiado al servidor)
initializeApp();
const db = getFirestore();

/**
 * 🛡️ FUNCIÓN: createPendingTicket
 * Permite que un usuario público envíe una apuesta pendiente.
 * Se ejecuta en el servidor, por lo que es 100% segura.
 */
exports.createPendingTicket = onCall(async (request) => {
  const data = request.data;

  // 1. Validar que existan los datos
  if (!data) {
    throw new HttpsError("invalid-argument", "Faltan datos de la apuesta.");
  }

  // 2. Validar monto exacto ($5,000)
  if (data.totalStake !== 5000) {
    throw new HttpsError("invalid-argument", "El monto debe ser exactamente $5,000.");
  }

  // 3. Validar que sean exactamente 7 partidos
  if (!Array.isArray(data.bets) || data.bets.length !== 7) {
    throw new HttpsError("invalid-argument", "Debes seleccionar exactamente 7 partidos.");
  }

  // 4. Validar que el vendedor exista y esté activo
  const sellerRef = db.collection("sellers").doc(data.sellerId);
  const sellerDoc = await sellerRef.get();

  if (!sellerDoc.exists) {
    throw new HttpsError("not-found", "El vendedor no existe.");
  }

  const sellerData = sellerDoc.data();
  if (sellerData.active !== true) {
    throw new HttpsError("permission-denied", "El vendedor no está activo.");
  }

  // 5. Si todo está correcto, guardar en pending_tickets
  const newTicket = {
    customerName: String(data.customerName).trim(),
    customerPhone: String(data.customerPhone).trim(),
    sellerId: data.sellerId,
    sellerName: sellerData.name,
    bets: data.bets,
    totalStake: 5000,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const docRef = await db.collection("pending_tickets").add(newTicket);

  // 6. Retornar éxito al cliente
  return { 
    success: true, 
    ticketId: docRef.id,
    message: "Apuesta enviada correctamente al vendedor." 
  };
});
