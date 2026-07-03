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

  // 2. Validar que sean exactamente 7 partidos
  if (!Array.isArray(data.bets) || data.bets.length !== 7) {
    throw new HttpsError("invalid-argument", "Debes seleccionar exactamente 7 partidos.");
  }

  // 3. Validar que el vendedor exista y esté activo
  const sellerRef = db.collection("sellers").doc(data.sellerId);
  const sellerDoc = await sellerRef.get();

  if (!sellerDoc.exists) {
    throw new HttpsError("not-found", "El vendedor no existe.");
  }

  const sellerData = sellerDoc.data();
  if (sellerData.active !== true) {
    throw new HttpsError("permission-denied", "El vendedor no está activo.");
  }

  // 4. Normalizar teléfono
  const customerPhone = String(data.customerPhone).trim().replace(/\D/g, '');

  // 5. Verificar si el cliente quiere usar un premio
  let isPrize = false;
  let prizeUsed = null;
  let totalStake = 5000; // Por defecto es pago normal

  if (data.usePrize === true) {
    // Buscar premios del cliente
    const clientPrizeRef = db.collection("client_prizes").doc(customerPhone);
    const clientPrizeDoc = await clientPrizeRef.get();

    if (!clientPrizeDoc.exists) {
      throw new HttpsError("failed-precondition", "No tienes premios disponibles.");
    }

    const clientPrizeData = clientPrizeDoc.data();
    const today = new Date().toISOString().split('T')[0];

    // Buscar el primer premio disponible (FIFO - más antiguo primero)
    const availablePrizes = (clientPrizeData.prizes || []).filter(prize => {
      // Verificar que no esté vencido
      if (prize.expiresAt < today) return false;
      // Verificar que tenga tickets restantes
      if (prize.remainingTickets <= 0) return false;
      // Para premios de 6 aciertos, verificar que no haya usado uno hoy
      if (prize.type === "6_aciertos" && prize.lastUsedDate === today) return false;
      return true;
    });

    if (availablePrizes.length === 0) {
      throw new HttpsError("failed-precondition", "No tienes premios disponibles para usar hoy.");
    }

    // Usar el primer premio disponible
    prizeUsed = availablePrizes[0];
    isPrize = true;
    totalStake = 0; // No se cobra

    // Actualizar el premio usado
    const updatedPrizes = clientPrizeData.prizes.map(prize => {
      if (prize.type === prizeUsed.type && prize.earnedDate === prizeUsed.earnedDate) {
        return {
          ...prize,
          usedTickets: prize.usedTickets + 1,
          remainingTickets: prize.remainingTickets - 1,
          lastUsedDate: today
        };
      }
      return prize;
    });

    const newTotalAvailable = updatedPrizes.reduce((sum, p) => sum + p.remainingTickets, 0);

    await clientPrizeRef.update({
      prizes: updatedPrizes,
      totalAvailable: newTotalAvailable,
      updatedAt: today
    });

    console.log(`🎁 Premio usado por ${customerPhone}: ${prizeUsed.type}`);
  } else {
    // Validar monto exacto ($5,000) solo si no es premio
    if (data.totalStake !== 5000) {
      throw new HttpsError("invalid-argument", "El monto debe ser exactamente $5,000.");
    }
  }

  // 6. Si todo está correcto, guardar en pending_tickets
  const newTicket = {
    customerName: String(data.customerName).trim(),
    customerPhone: customerPhone,
    sellerId: data.sellerId,
    sellerName: sellerData.name,
    bets: data.bets,
    totalStake: totalStake,
    isPrize: isPrize,
    prizeType: prizeUsed ? prizeUsed.type : null,
    status: "pending",
    createdAt: new Date().toISOString(),
  };

  const docRef = await db.collection("pending_tickets").add(newTicket);

  // 7. Enviar notificación a Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  let telegramMessage;
  if (isPrize) {
    telegramMessage = `🏆 *NUEVA APUESTA DE PREMIO* 🏆\n\n👤 *Cliente:* ${newTicket.customerName}\n📱 *Teléfono:* ${newTicket.customerPhone}\n🏪 *Vendedor:* ${newTicket.sellerName}\n🎁 *Tipo:* ${prizeUsed.type}\n⚽ *Partidos:* ${newTicket.bets.length} seleccionados\n🎫 *Ticket ID:* ${docRef.id}\n\n✅ Premio usado - NO COBRAR`;
  } else {
    telegramMessage = `🔔 *NUEVA APUESTA PENDIENTE* 🔔\n\n👤 *Cliente:* ${newTicket.customerName}\n📱 *Teléfono:* ${newTicket.customerPhone}\n🏪 *Vendedor:* ${newTicket.sellerName}\n💰 *Monto:* $${newTicket.totalStake} COP\n⚽ *Partidos:* ${newTicket.bets.length} seleccionados\n🎫 *Ticket ID:* ${docRef.id}\n\n⏰ Esperando aprobación del vendedor...`;
  }

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

  // 8. Retornar éxito al cliente
  return { 
    success: true, 
    ticketId: docRef.id,
    isPrize: isPrize,
    message: isPrize ? "¡Premio usado exitosamente!" : "Apuesta enviada correctamente al vendedor." 
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
    date: new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toISOString().split('T')[0],
    time: new Date(new Date().getTime() - (5 * 60 * 60 * 1000)).toTimeString().split(' ')[0].substring(0, 5),
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




/**
 * 🏆 FUNCIÓN: awardPrize
 * Se ejecuta automáticamente cuando se agrega un resultado a match_results.
 * Verifica si algún ticket tiene 5 o 6 aciertos y acredita el premio.
 */
const { onDocumentCreated } = require("firebase-functions/v2/firestore");

exports.awardPrize = onDocumentCreated("match_results/{resultId}", async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No se recibió datos en el evento");
    return null;
  }

  const newResult = snapshot.data();
  const matchId = newResult.matchId;
  const result = newResult.result;

  console.log(`🏆 Nuevo resultado agregado: Match ${matchId} = ${result}`);

  // 1. Buscar todos los tickets que contengan este partido
  const ticketsSnapshot = await db.collection("tickets")
    .where("bets", "array-contains", matchId)
    .get();

  if (ticketsSnapshot.empty) {
    console.log("No se encontraron tickets con este partido");
    return null;
  }

  console.log(`📋 Encontrados ${ticketsSnapshot.size} tickets con este partido`);

  // 2. Procesar cada ticket
  for (const ticketDoc of ticketsSnapshot.docs) {
    const ticket = ticketDoc.data();
    const ticketId = ticketDoc.id;

    // 2.1. Verificar si ya fue procesado
    if (ticket.prizeProcessed === true) {
      console.log(`⏭️ Ticket ${ticketId} ya fue procesado, saltando`);
      continue;
    }

    // 2.2. Verificar si TODOS los partidos del ticket tienen resultado
    const allMatchesHaveResults = await checkAllMatchesHaveResults(ticket.bets);
    
    if (!allMatchesHaveResults) {
      console.log(`⏳ Ticket ${ticketId} aún no tiene todos los resultados`);
      continue;
    }

    // 2.3. Contar aciertos
    const correctBets = await countCorrectBets(ticket.bets);
    console.log(`🎯 Ticket ${ticketId} tiene ${correctBets} aciertos`);

    // 2.4. Acreditar premio si corresponde
    if (correctBets === 5 || correctBets === 6) {
      await awardPrizeToClient(ticket.customerPhone, correctBets, ticketId);
    }

    // 2.5. Marcar ticket como procesado
    await db.collection("tickets").doc(ticketId).update({
      prizeProcessed: true,
      correctBets: correctBets,
      processedAt: new Date().toISOString()
    });

    console.log(`✅ Ticket ${ticketId} procesado correctamente`);
  }

  return null;
});

/**
 * Función auxiliar: Verifica si todos los partidos tienen resultado
 */
async function checkAllMatchesHaveResults(bets) {
  for (const matchId of bets) {
    const resultQuery = await db.collection("match_results")
      .where("matchId", "==", matchId)
      .limit(1)
      .get();
    
    if (resultQuery.empty) {
      return false;
    }
  }
  return true;
}

/**
 * Función auxiliar: Cuenta cuántos aciertos tiene un ticket
 */
async function countCorrectBets(bets) {
  let correctCount = 0;

  for (const matchId of bets) {
    // Buscar el resultado del partido
    const resultQuery = await db.collection("match_results")
      .where("matchId", "==", matchId)
      .limit(1)
      .get();

    if (!resultQuery.empty) {
      const matchResult = resultQuery.docs[0].data();
      
      // Buscar la apuesta del cliente para este partido
      const ticketQuery = await db.collection("tickets")
        .where("bets", "array-contains", matchId)
        .get();

      for (const ticketDoc of ticketQuery.docs) {
        const ticket = ticketDoc.data();
        const bet = ticket.bets.find(b => b.matchId === matchId);
        
        if (bet && bet.selection === matchResult.result) {
          correctCount++;
        }
      }
    }
  }

  return correctCount;
}

/**
 * Función auxiliar: Acredita el premio al cliente
 */
async function awardPrizeToClient(phone, correctBets, sourceTicketId) {
  const phoneNormalized = phone.replace(/\D/g, '');
  
  // Calcular premios
  const prizeData = {
    "5_aciertos": { totalTickets: 1, type: "5_aciertos" },
    "6_aciertos": { totalTickets: 10, type: "6_aciertos" }
  };

  const prize = prizeData[`${correctBets}_aciertos`];
  
  if (!prize) {
    console.log(`❌ No hay premio definido para ${correctBets} aciertos`);
    return;
  }

  // Buscar si el cliente ya tiene premios
  const clientPrizeRef = db.collection("client_prizes").doc(phoneNormalized);
  const clientPrizeDoc = await clientPrizeRef.get();

  const today = new Date().toISOString().split('T')[0];
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const newPrize = {
    type: prize.type,
    totalTickets: prize.totalTickets,
    usedTickets: 0,
    remainingTickets: prize.totalTickets,
    earnedDate: today,
    expiresAt: expiresAt,
    sourceTicketId: sourceTicketId,
    status: "available"
  };

  if (clientPrizeDoc.exists) {
    // Actualizar documento existente
    const existingData = clientPrizeDoc.data();
    const updatedPrizes = [...(existingData.prizes || []), newPrize];
    const totalAvailable = updatedPrizes.reduce((sum, p) => sum + p.remainingTickets, 0);

    await clientPrizeRef.update({
      prizes: updatedPrizes,
      totalAvailable: totalAvailable,
      updatedAt: today
    });

    console.log(`🎁 Premio actualizado para ${phoneNormalized}: ${prize.totalTickets} tickets de ${prize.type}`);
  } else {
    // Crear nuevo documento
    await clientPrizeRef.set({
      phone: phoneNormalized,
      prizes: [newPrize],
      totalAvailable: prize.totalTickets,
      updatedAt: today
    });

    console.log(`🎁 Nuevo premio creado para ${phoneNormalized}: ${prize.totalTickets} tickets de ${prize.type}`);
  }

  // Enviar notificación a Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `🏆 *¡PREMIO ACREDITADO!* 🏆\n\n👤 *Cliente:* ${phoneNormalized}\n🎯 *Aciertos:* ${correctBets}\n🎫 *Tickets ganados:* ${prize.totalTickets}\n📅 *Vence:* ${expiresAt}\n🎫 *Ticket origen:* ${sourceTicketId}\n\n✅ Premio disponible para usar`;

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
}
