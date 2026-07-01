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

/**
 * 🛡️ FUNCIÓN: approvePendingTicket
 * Permite que el vendedor apruebe un ticket pendiente.
 * Crea el ticket en la colección 'tickets' y elimina de 'pending_tickets'.
 */
exports.approvePendingTicket = onCall(async (request) => {
  const { ticketId } = request.data;
  const sellerId = request.auth.uid; // ID del vendedor autenticado

  if (!ticketId) {
    throw new HttpsError("invalid-argument", "Falta el ID del ticket.");
  }

  // 1. Buscar el ticket pendiente
  const pendingTicketRef = db.collection("pending_tickets").doc(ticketId);
  const pendingTicketDoc = await pendingTicketRef.get();

  if (!pendingTicketDoc.exists) {
    throw new HttpsError("not-found", "El ticket pendiente no existe.");
  }

  const pendingTicket = pendingTicketDoc.data();

  // 2. Validar que el vendedor que aprueba sea el dueño del ticket
  if (pendingTicket.sellerId !== sellerId) {
    throw new HttpsError("permission-denied", "No tienes permiso para aprobar este ticket.");
  }

  // 3. Validar que el ticket esté pendiente
  if (pendingTicket.status !== "pending") {
    throw new HttpsError("failed-precondition", "El ticket ya fue procesado.");
  }

    // 3.5. Generar/obtener UID único del cliente (6 dígitos)
  const customerPhone = pendingTicket.customerPhone.replace(/\D/g, '');
  let clientUid;
  
  // Buscar si el teléfono ya tiene UID
  const existingUidQuery = await db.collection("client_uids")
    .where("phone", "==", customerPhone)
    .limit(1)
    .get();
  
  if (!existingUidQuery.empty) {
    // Ya existe, usar el UID existente
    clientUid = existingUidQuery.docs[0].data().uid;
  } else {
    // No existe, generar UID único de 6 dígitos
    let uidGenerated = false;
    while (!uidGenerated) {
      const newUid = Math.floor(100000 + Math.random() * 900000).toString();
      
      // Verificar que no exista ya
      const uidCheck = await db.collection("client_uids")
        .where("uid", "==", newUid)
        .limit(1)
        .get();
      
      if (uidCheck.empty) {
        clientUid = newUid;
        uidGenerated = true;
        
        // Guardar en client_uids
        await db.collection("client_uids").add({
          phone: customerPhone,
          uid: newUid,
          createdAt: new Date().toISOString()
        });
      }
    }
  }

  // 4. Generar código de verificación
  const verificationCode = Math.random().toString(36).substring(2, 10).toUpperCase();



  // 5. Crear el ticket en la colección 'tickets'
  const newTicket = {
    customerName: pendingTicket.customerName,
    customerPhone: pendingTicket.customerPhone,
    sellerId: pendingTicket.sellerId,
    sellerName: pendingTicket.sellerName,
    bets: pendingTicket.bets,
    totalStake: pendingTicket.totalStake,
    verificationCode: verificationCode,
    date: new Date().toISOString().split('T')[0],
    time: new Date().toTimeString().split(' ')[0].substring(0, 5),
    status: "approved",
    approvedAt: new Date().toISOString(),
  };

  const ticketRef = await db.collection("tickets").add(newTicket);

  // 6. Eliminar el ticket de pending_tickets
  await pendingTicketRef.delete();

  // 7. Enviar alerta a Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `🚨 *ALERTA DE SEGURIDAD* 🚨\n\n👤 *Vendedor:* ${pendingTicket.sellerName}\n🎫 *Ticket:* ${ticketRef.id}\n👥 *Cliente:* ${pendingTicket.customerName}\n📱 *Teléfono:* ${pendingTicket.customerPhone}\n💰 *Monto:* $${pendingTicket.totalStake} COP\n🎯 *Partidos:* ${pendingTicket.bets.length} partidos seleccionados\n📝 *Código:* ${verificationCode}\n\n✅ Ticket aprobado exitosamente`;

  try {
    await fetch(`https://api.telegram.org/bot${telegramToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: telegramChatId,
        text: telegramMessage,
        parse_mode: "Markdown"
      })
    });
  } catch (error) {
    console.error("Error enviando alerta a Telegram:", error);
  }

    // 8. Retornar éxito
  return {
    success: true,
    ticketId: ticketRef.id,
    verificationCode: verificationCode,
    clientUid: clientUid,
    message: "Ticket aprobado exitosamente."
  };
});
