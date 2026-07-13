const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { onCall, HttpsError } = require("firebase-functions/v2/https");
const admin = require('firebase-admin');

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

  // 1. Buscar TODOS los tickets y filtrar en memoria
  const allTicketsSnapshot = await db.collection("tickets").get();

  if (allTicketsSnapshot.empty) {
    console.log("No hay tickets en el sistema");
    return null;
  }

  // Filtrar tickets que contengan este matchId en su array bets
  const ticketsWithMatch = allTicketsSnapshot.docs.filter(doc => {
    const ticket = doc.data();
    return ticket.bets && Array.isArray(ticket.bets) && 
           ticket.bets.some(bet => bet.matchId === matchId);
  });

  if (ticketsWithMatch.length === 0) {
    console.log(`No se encontraron tickets con el partido ${matchId}`);
    return null;
  }

  console.log(`📋 Encontrados ${ticketsWithMatch.length} tickets con este partido`);

  // 2. Procesar cada ticket
  for (const ticketDoc of ticketsWithMatch) {
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

    console.log(`✅ Ticket ${ticketId} procesado correctamente con ${correctBets} aciertos`);
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

  for (const bet of bets) {
    const matchId = bet.matchId;
    
    // Buscar el resultado del partido
    const resultQuery = await db.collection("match_results")
      .where("matchId", "==", matchId)
      .limit(1)
      .get();

    if (!resultQuery.empty) {
      const matchResult = resultQuery.docs[0].data();
      
      // Comparar la selección del cliente con el resultado real
      if (bet.selection === matchResult.result) {
        correctCount++;
        console.log(`  ✅ Acierto: ${bet.homeTeam} vs ${bet.awayTeam} - Selección: ${bet.selection}, Resultado: ${matchResult.result}`);
      } else {
        console.log(`  ❌ Fallo: ${bet.homeTeam} vs ${bet.awayTeam} - Selección: ${bet.selection}, Resultado: ${matchResult.result}`);
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



// ═══════════════════════════════════════════════════
// 💰 SISTEMA DE CRÉDITOS - FASE 1
// ═══════════════════════════════════════════════════

/**
 * Función: Solicitar compra de créditos
 * El cliente solicita recargar créditos y se notifica al admin por Telegram
 */
exports.requestCreditPurchase = onCall(async (request) => {
  const { phone, amount, paymentMethod } = request.data;
  
  if (!phone || !amount || amount < 500) {
    throw new HttpsError('invalid-argument', 'Teléfono y cantidad mínima (500 créditos) son requeridos');
  }
  
    const phoneNormalized = phone.replace(/\D/g, '');
  // 🌎 Agregar código de país 57 automáticamente si no lo tiene
  const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
  const copAmount = amount * 10; // 1 crédito = 10 COP
  
  // 🔒 SEGURIDAD: Verificar si el cliente ya tiene UID, si no, crear uno
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneWithCountry)
    .limit(1)
    .get();
  
  let clientUid = null;
  
  if (uidQuery.empty) {
    // Generar UID de 6 dígitos único
    const generateUniqueUID = async () => {
      let uid;
      let exists = true;
      while (exists) {
        uid = Math.floor(100000 + Math.random() * 900000).toString(); // 6 dígitos
        const check = await db.collection('client_uids')
          .where('uid', '==', uid)
          .limit(1)
          .get();
        exists = !check.empty;
      }
      return uid;
    };
    
    clientUid = await generateUniqueUID();
    
        // Guardar UID en client_uids
    await db.collection('client_uids').add({
      phone: phoneWithCountry,
      uid: clientUid,
      createdAt: new Date().toISOString()
    });
    
    console.log(`✅ UID creado para ${phoneNormalized}: ${clientUid}`);
  } else {
    clientUid = uidQuery.docs[0].data().uid;
  }
  
      // Crear solicitud de recarga
  const purchaseRequest = {
    phone: phoneWithCountry,
    type: 'deposit',
    amount: amount,
    copAmount: copAmount,
    paymentMethod: paymentMethod || 'nequi',
    clientUid: clientUid, // 🔒 Guardar UID para que el admin lo vea
    status: 'pending',
    requestedAt: new Date().toISOString()
  };
  
  const requestRef = await db.collection('withdrawal_requests').add(purchaseRequest);
  
  // Enviar notificación a Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `💰 *SOLICITUD DE RECARGA* 💰\n\n👤 *Teléfono:* ${phoneWithCountry}\n💵 *Monto:* ${amount} créditos\n💰 *COP:* $${copAmount.toLocaleString()}\n💳 *Método:* ${paymentMethod || 'nequi'}\n📋 *ID:* ${requestRef.id}\n\n✅ Pendiente de aprobación`;
  
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
    console.error("Error enviando notificación a Telegram:", error);
  }
  
    return { 
    success: true, 
    requestId: requestRef.id,
    message: 'Solicitud enviada al administrador. Recibirás tu código por WhatsApp cuando sea aprobada.' 
  };
});

/**
 * Función: Agregar créditos (solo admin)
 * El admin agrega créditos al saldo del cliente
 */
exports.addCredits = onCall(async (request) => {
  // Verificar que sea admin
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }
  
  const adminRef = db.collection('admin').doc(request.auth.uid);
  const adminDoc = await adminRef.get();
  
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden agregar créditos');
  }
  
  const { phone, amount, requestId } = request.data;
  
  if (!phone || !amount || amount <= 0) {
    throw new HttpsError('invalid-argument', 'Teléfono y cantidad positiva son requeridos');
  }
  
  const phoneNormalized = phone.replace(/\D/g, '');
  
  // Obtener o crear balance del cliente
  const balanceRef = db.collection('client_balances').doc(phoneNormalized);
  const balanceDoc = await balanceRef.get();
  
  let currentBalance = 0;
  if (balanceDoc.exists) {
    currentBalance = balanceDoc.data().balance || 0;
  }
  
  const newBalance = currentBalance + amount;
  
  // Actualizar balance
  await balanceRef.set({
    phone: phoneNormalized,
    balance: newBalance,
    totalDeposited: (balanceDoc.exists ? balanceDoc.data().totalDeposited || 0 : 0) + amount,
    updatedAt: new Date().toISOString()
  }, { merge: true });
  
  // Registrar transacción
  await db.collection('transactions').add({
    phone: phoneNormalized,
    type: 'deposit',
    amount: amount,
    description: 'Recarga de créditos',
    balanceBefore: currentBalance,
    balanceAfter: newBalance,
    reference: requestId || 'manual',
    createdAt: new Date().toISOString()
  });
  
    // Actualizar solicitud si existe
  if (requestId) {
    await db.collection('withdrawal_requests').doc(requestId).update({
      status: 'completed',
      processedAt: new Date().toISOString()
    });
  }
  
  // 🔒 Obtener UID del cliente para enviar por WhatsApp
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneNormalized)
    .limit(1)
    .get();
  
  const clientUid = uidQuery.empty ? null : uidQuery.docs[0].data().uid;
  
  return { 
    success: true, 
    newBalance: newBalance, 
    clientUid: clientUid,
    message: `${amount} créditos agregados exitosamente` 
  };
});

/**
 * Función: Solicitar retiro de créditos
 * El cliente solicita retirar créditos (comisión 10%, mínimo 5000 créditos)
 */
exports.requestWithdrawal = onCall(async (request) => {
  const { phone, uid, amount, paymentMethod, accountNumber } = request.data;
  
  if (!phone || !uid || !amount || amount < 5000) {
    throw new HttpsError('invalid-argument', 'Teléfono, código UID y cantidad mínima (5000 créditos) son requeridos');
  }
  
  if (!paymentMethod || !accountNumber) {
    throw new HttpsError('invalid-argument', 'Método de pago y número de cuenta son requeridos');
  }
  
    const phoneNormalized = phone.replace(/\D/g, '');
  // 🌎 Agregar código de país 57 automáticamente si no lo tiene
  const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
  const uidNormalized = uid.toString().trim();
  
  // 🔒 SEGURIDAD: Verificar que el UID coincida con el teléfono
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneWithCountry)
    .where('uid', '==', uidNormalized)
    .limit(1)
    .get();
  
  if (uidQuery.empty) {
    throw new HttpsError('permission-denied', 'Código UID incorrecto o no registrado');
  }
  
  // Verificar que el cliente tenga saldo suficiente
  const balanceRef = db.collection('client_balances').doc(phoneWithCountry);
  const balanceDoc = await balanceRef.get();
  
  if (!balanceDoc.exists || balanceDoc.data().balance < amount) {
    throw new HttpsError('failed-precondition', 'Saldo insuficiente');
  }
  
  const commission = Math.floor(amount * 0.10); // 10% de comisión
  const netAmount = amount - commission;
  const copAmount = netAmount * 10; // 1 crédito = 10 COP
  
    // Crear solicitud de retiro
  const withdrawalRequest = {
    phone: phoneWithCountry,
    type: 'withdraw',
    amount: amount,
    commission: commission,
    netAmount: netAmount,
    copAmount: copAmount,
    paymentMethod: paymentMethod,
    accountNumber: accountNumber,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };
  
  const requestRef = await db.collection('withdrawal_requests').add(withdrawalRequest);
  
  // Enviar notificación a Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `💸 *SOLICITUD DE RETIRO* 💸\n\n👤 *Teléfono:* ${phoneWithCountry}\n💵 *Monto:* ${amount} créditos\n📊 *Comisión (10%):* ${commission} créditos\n💰 *Neto:* ${netAmount} créditos\n💵 *COP:* $${copAmount.toLocaleString()}\n💳 *Método:* ${paymentMethod}\n🏦 *Cuenta:* ${accountNumber}\n📋 *ID:* ${requestRef.id}\n\n✅ Pendiente de aprobación`;
  
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
    console.error("Error enviando notificación a Telegram:", error);
  }
  
  return { success: true, requestId: requestRef.id, message: 'Solicitud de retiro enviada al administrador' };
});

/**
 * Función: Procesar retiro (solo admin)
 * El admin aprueba o rechaza una solicitud de retiro
 */
exports.processWithdrawal = onCall(async (request) => {
  // Verificar que sea admin
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'Debe estar autenticado');
  }
  
  const adminRef = db.collection('admin').doc(request.auth.uid);
  const adminDoc = await adminRef.get();
  
  if (!adminDoc.exists) {
    throw new HttpsError('permission-denied', 'Solo administradores pueden procesar retiros');
  }
  
  const { requestId, approve } = request.data;
  
  if (!requestId) {
    throw new HttpsError('invalid-argument', 'ID de solicitud es requerido');
  }
  
  const requestRef = db.collection('withdrawal_requests').doc(requestId);
  const requestDoc = await requestRef.get();
  
  if (!requestDoc.exists) {
    throw new HttpsError('not-found', 'Solicitud no encontrada');
  }
  
  const requestData = requestDoc.data();
  
  if (requestData.status !== 'pending') {
    throw new HttpsError('failed-precondition', 'Solicitud ya procesada');
  }
  
  if (approve) {
    // Aprobar retiro
    const phoneNormalized = requestData.phone;
    const amount = requestData.amount;
    
    // Obtener balance actual
    const balanceRef = db.collection('client_balances').doc(phoneNormalized);
    const balanceDoc = await balanceRef.get();
    
    const currentBalance = balanceDoc.exists ? balanceDoc.data().balance || 0 : 0;
    
    if (currentBalance < amount) {
      throw new HttpsError('failed-precondition', 'Saldo insuficiente');
    }
    
    const newBalance = currentBalance - amount;
    
    // Actualizar balance
    await balanceRef.update({
      balance: newBalance,
      totalWithdrawn: (balanceDoc.data().totalWithdrawn || 0) + amount,
      updatedAt: new Date().toISOString()
    });
    
    // Registrar transacción
    await db.collection('transactions').add({
      phone: phoneNormalized,
      type: 'withdraw',
      amount: amount,
      commission: requestData.commission,
      description: 'Retiro de créditos',
      balanceBefore: currentBalance,
      balanceAfter: newBalance,
      reference: requestId,
      createdAt: new Date().toISOString()
    });
    
    // Actualizar solicitud
    await requestRef.update({
      status: 'completed',
      processedAt: new Date().toISOString()
    });
    
    return { success: true, newBalance: newBalance, message: 'Retiro aprobado y procesado' };
  } else {
    // Rechazar retiro
    await requestRef.update({
      status: 'rejected',
      processedAt: new Date().toISOString()
    });
    
    return { success: true, message: 'Retiro rechazado' };
  }
});

/**
 * Función: Consultar saldo (SEGURA - requiere UID)
 * Solo el cliente con el código UID correcto puede ver su saldo
 */
exports.getBalance = onCall(async (request) => {
  const { phone, uid } = request.data;
  
  if (!phone || !uid) {
    throw new HttpsError('invalid-argument', 'Teléfono y código UID son requeridos');
  }
  
    const phoneNormalized = phone.replace(/\D/g, '');
  // 🌎 Agregar código de país 57 automáticamente si no lo tiene
  const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
  const uidNormalized = uid.toString().trim();
  
  // Verificar que el UID coincida con el teléfono
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneWithCountry)
    .where('uid', '==', uidNormalized)
    .limit(1)
    .get();
  
  if (uidQuery.empty) {
    throw new HttpsError('permission-denied', 'Código UID incorrecto o no registrado');
  }
  
    const balanceRef = db.collection('client_balances').doc(phoneWithCountry);
  const balanceDoc = await balanceRef.get();
  
  if (!balanceDoc.exists) {
    return { success: true, balance: 0, message: 'No hay saldo registrado' };
  }
  
  const balanceData = balanceDoc.data();
  
  return {
    success: true,
    balance: balanceData.balance || 0,
    totalDeposited: balanceData.totalDeposited || 0,
    totalWithdrawn: balanceData.totalWithdrawn || 0,
    updatedAt: balanceData.updatedAt
  };
});

// ═══════════════════════════════════════════════════════════════════
// 🎮 JUEGO DE TRIVIA - Sistema de retos entre amigos
// ═══════════════════════════════════════════════════════════════════

/**
 * Función auxiliar: Verificar que el UID sea válido para el teléfono
 */
const verifyClientUid = async (phone, uid) => {
  const phoneNormalized = phone.replace(/\D/g, '');
  const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
  const uidNormalized = uid.toString().trim();
  
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneWithCountry)
    .where('uid', '==', uidNormalized)
    .limit(1)
    .get();
  
  if (uidQuery.empty) {
    throw new HttpsError('permission-denied', 'Código UID incorrecto o no registrado');
  }
  
  return phoneWithCountry;
};

/**
 * Función: Crear reto de trivia
 * El retador congela créditos y envía invitaciones
 */
exports.createTriviaGame = onCall(async (request) => {
  const { phone, uid, betAmount, invitedPlayers, maxPlayers } = request.data;
  
  // Validaciones básicas
  if (!phone || !uid) {
    throw new HttpsError('invalid-argument', 'Teléfono y UID son requeridos');
  }
  
  if (!betAmount || betAmount < 100) {
    throw new HttpsError('invalid-argument', 'La apuesta mínima es 100 créditos');
  }
  
  // Validar maxPlayers (mínimo 2, máximo 10)
  const maxPlayersValid = maxPlayers && maxPlayers >= 2 && maxPlayers <= 10 ? maxPlayers : 2;
  
  // Permitir retos abiertos (sin invitados específicos)
  const hasInvitedPlayers = invitedPlayers && Array.isArray(invitedPlayers) && invitedPlayers.length > 0;
  
  // Verificar UID del retador
  const creatorPhone = await verifyClientUid(phone, uid);
  
  // Verificar saldo disponible (balance - frozen)
  const balanceRef = db.collection('client_balances').doc(creatorPhone);
  const balanceDoc = await balanceRef.get();
  
  const currentBalance = balanceDoc.exists ? (balanceDoc.data().balance || 0) : 0;
  const currentFrozen = balanceDoc.exists ? (balanceDoc.data().frozenBalance || 0) : 0;
  const availableBalance = currentBalance - currentFrozen;
  
  if (availableBalance < betAmount) {
    throw new HttpsError('failed-precondition', 
      `Saldo insuficiente. Disponible: ${availableBalance} créditos. Necesitas: ${betAmount} créditos. Recarga más créditos para crear el reto.`);
  }
  
  // Normalizar teléfonos de invitados (si existen)
  const normalizedInvited = hasInvitedPlayers ? invitedPlayers.map(p => {
    const phoneDigits = p.replace(/\D/g, '');
    return phoneDigits.startsWith('57') ? phoneDigits : '57' + phoneDigits;
  }) : [];
  
  // Verificar que el retador no se invite a sí mismo
  if (hasInvitedPlayers && normalizedInvited.includes(creatorPhone)) {
    throw new HttpsError('invalid-argument', 'No puedes invitarte a ti mismo');
  }
  
  // Crear el juego usando transacción para congelar créditos atómicamente
  const gameRef = db.collection('trivia_games').doc();
  
  await db.runTransaction(async (transaction) => {
    // Congelar créditos del retador
    transaction.update(balanceRef, {
      frozenBalance: currentFrozen + betAmount,
      updatedAt: new Date().toISOString()
    });
    
    // Crear documento del juego
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24); // 24 horas para aceptar
    
    transaction.set(gameRef, {
      creatorPhone: creatorPhone,
      creatorUid: uid,
      betAmount: betAmount,
      maxPlayers: maxPlayersValid, // 🆕 Máximo de jugadores
      invitedPlayers: normalizedInvited.map(phone => ({
        phone: phone,
        status: 'pending',
        uid: null,
        acceptedAt: null
      })),
      status: 'waiting',
      totalPlayers: 1, // Solo el creador al inicio
      questions: [],
      answers: {},
      winner: null,
      createdAt: new Date().toISOString(),
      expiresAt: expiresAt.toISOString(),
      startedAt: null,
      finishedAt: null
    });
  });
  
  // Notificación Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `🎮 *NUEVO RETO DE TRIVIA* 🎮\n\n` +
    `👤 *Retador:* ${creatorPhone}\n` +
    `💰 *Apuesta:* ${betAmount} créditos\n` +
    `👥 *Máximo jugadores:* ${maxPlayersValid}\n` +
    `📋 *ID:* ${gameRef.id}\n\n` +
    `⏳ Esperando aceptación (24h)`;
  
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
    console.error("Error enviando notificación a Telegram:", error);
  }
  
  return { 
    success: true, 
    gameId: gameRef.id,
    message: `Reto creado exitosamente. Se congelaron ${betAmount} créditos. Máximo ${maxPlayersValid} jugadores.`
  };
});

/**
 * Función: Aceptar reto de trivia
 * El retado debe congelar el mismo monto que el retador
 */
exports.acceptTriviaGame = onCall(async (request) => {
  const { gameId, phone, uid } = request.data;
  
  if (!gameId || !phone || !uid) {
    throw new HttpsError('invalid-argument', 'ID del juego, teléfono y UID son requeridos');
  }

  // Verificar UID del retado
  const playerPhone = await verifyClientUid(phone, uid);
  
  const gameRef = db.collection('trivia_games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Juego no encontrado');
  }
  
  const gameData = gameDoc.data();
  
  // Validar estado del juego
  if (gameData.status !== 'waiting') {
    throw new HttpsError('failed-precondition', 'El juego ya no está esperando jugadores');
  }
  
  // Validar expiración
  const now = new Date();
  const expiresAt = new Date(gameData.expiresAt);
  if (now > expiresAt) {
    throw new HttpsError('failed-precondition', 'El tiempo para aceptar ha expirado');
  }
  
  // Verificar que el jugador no sea el creador
  if (gameData.creatorPhone === playerPhone) {
    throw new HttpsError('failed-precondition', 'No puedes aceptar tu propio reto');
  }
  
  // Verificar si ya hay 2 jugadores (reto cerrado)
  const currentPlayers = [
    gameData.creatorPhone,
    ...(gameData.invitedPlayers || [])
      .filter(p => p.status === 'accepted')
      .map(p => p.phone)
  ];
  
  if (currentPlayers.length >= 2) {
    throw new HttpsError('failed-precondition', 'El reto ya está completo');
  }
  
  // Verificar si ya aceptó
  const alreadyAccepted = (gameData.invitedPlayers || []).some(p => p.phone === playerPhone && p.status === 'accepted');
  if (alreadyAccepted) {
    throw new HttpsError('already-exists', 'Ya aceptaste este reto');
  }
  
  const betAmount = gameData.betAmount;
  
  // Verificar saldo disponible del retado
  const balanceRef = db.collection('client_balances').doc(playerPhone);
  const balanceDoc = await balanceRef.get();
  
  const currentBalance = balanceDoc.exists ? (balanceDoc.data().balance || 0) : 0;
  const currentFrozen = balanceDoc.exists ? (balanceDoc.data().frozenBalance || 0) : 0;
  const availableBalance = currentBalance - currentFrozen;
  
  if (availableBalance < betAmount) {
    throw new HttpsError('failed-precondition', 
      `SALDO_INSUFFICIENT|${betAmount}|${availableBalance}|No tienes suficientes créditos para aceptar. Necesitas ${betAmount} créditos. Recarga para aceptar el reto.`);
  }
  
  // Actualizar estado del juego y congelar créditos del retado
  await db.runTransaction(async (transaction) => {
    // Congelar créditos del retado
    transaction.update(balanceRef, {
      frozenBalance: currentFrozen + betAmount,
      updatedAt: new Date().toISOString()
    });
    
    // Agregar jugador a la lista de invitados aceptados
    const updatedInvited = [...(gameData.invitedPlayers || [])];
    
    // Verificar si ya estaba en la lista (reto cerrado)
    const existingIndex = updatedInvited.findIndex(p => p.phone === playerPhone);
    
    if (existingIndex !== -1) {
      // Actualizar jugador existente
      updatedInvited[existingIndex] = {
        ...updatedInvited[existingIndex],
        status: 'accepted',
        uid: uid,
        acceptedAt: new Date().toISOString()
      };
    } else {
      // Agregar nuevo jugador (reto abierto)
      updatedInvited.push({
        phone: playerPhone,
        status: 'accepted',
        uid: uid,
        acceptedAt: new Date().toISOString()
      });
    }
    
    // Actualizar juego
    transaction.update(gameRef, {
      invitedPlayers: updatedInvited,
      totalPlayers: 1 + updatedInvited.filter(p => p.status === 'accepted').length,
      status: 'active',
      startedAt: new Date().toISOString()
    });
  });
  
  return { 
    success: true, 
    message: `Reto aceptado. Se congelaron ${betAmount} créditos. ¡A jugar!`
  };
});

/**
 * Función: Rechazar reto de trivia
 */
exports.rejectTriviaGame = onCall(async (request) => {
  const { gameId, phone, uid } = request.data;
  
  if (!gameId || !phone || !uid) {
    throw new HttpsError('invalid-argument', 'ID del juego, teléfono y UID son requeridos');
  }
  
  // Verificar UID del retado
  const playerPhone = await verifyClientUid(phone, uid);
  
  const gameRef = db.collection('trivia_games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Juego no encontrado');
  }
  
  const gameData = gameDoc.data();
  
  // Validar estado del juego
  if (gameData.status !== 'waiting') {
    throw new HttpsError('failed-precondition', 'El juego ya no está esperando jugadores');
  }
  
  // Verificar que el jugador fue invitado
  const playerIndex = gameData.invitedPlayers.findIndex(p => p.phone === playerPhone);
  if (playerIndex === -1) {
    throw new HttpsError('permission-denied', 'No fuiste invitado a este juego');
  }
  
  // Actualizar estado del jugador (no se congelan créditos porque no aceptó)
  const updatedInvited = [...gameData.invitedPlayers];
  updatedInvited[playerIndex] = {
    ...updatedInvited[playerIndex],
    status: 'rejected',
    rejectedAt: new Date().toISOString()
  };
  
  await gameRef.update({
    invitedPlayers: updatedInvited
  });
  
  return { 
    success: true, 
    message: 'Reto rechazado'
  };
});

/**
 * Función: Generar preguntas de trivia con Gemini AI
 * Genera 10 preguntas de fútbol con 4 opciones cada una
 */
exports.generateTriviaQuestions = onCall(async (request) => {
  const { gameId, category, difficulty } = request.data;
  
  // 🔒 SEGURIDAD: Validar que gameId existe
  if (!gameId) {
    throw new HttpsError('invalid-argument', 'gameId es requerido');
  }
  
  // Configuración de Gemini API
  const GEMINI_API_KEY = 'AIzaSyC_ddOzNgFyz9cPZgX_EXXGQhJFynPFxYI';
  const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${GEMINI_API_KEY}`;
  
  // Prompt para generar preguntas
  const prompt = `Genera exactamente 10 preguntas de trivia sobre fútbol en español.
  
Categoría: ${category || 'general'}
Dificultad: ${difficulty || 'medio'}

Formato requerido (JSON válido):
{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "category": "categoría específica",
      "difficulty": 1-5
    }
  ]
}

Reglas:
- correctAnswer es el índice (0-3) de la opción correcta
- Las preguntas deben ser variadas y entretenidas
- Incluye preguntas sobre: historia, jugadores famosos, mundiales, equipos, reglas, récords
- Dificultad 1-5 donde 1 es muy fácil y 5 es muy difícil
- NO incluyas explicaciones, solo el JSON puro
- Asegúrate de que el JSON sea válido y esté bien formateado`;

  try {
    const response = await fetch(GEMINI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        generationConfig: {
          temperature: 0.7,
          topK: 40,
          topP: 0.95,
          maxOutputTokens: 2048
        }
      })
    });

    if (!response.ok) {
      throw new Error(`Error de Gemini API: ${response.status}`);
    }

    const data = await response.json();
    const textResponse = data.candidates[0].content.parts[0].text;
    
    // Extraer JSON de la respuesta (puede venir con markdown)
    const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No se pudo extraer JSON de la respuesta');
    }
    
    const parsedResponse = JSON.parse(jsonMatch[0]);
    
    // Validar que tenga exactamente 10 preguntas
    if (!parsedResponse.questions || parsedResponse.questions.length !== 10) {
      throw new Error('La respuesta no contiene exactamente 10 preguntas');
    }
    
    // Validar estructura de cada pregunta
    for (const q of parsedResponse.questions) {
      if (!q.question || !q.options || q.options.length !== 4 || 
          q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
        throw new Error('Estructura de pregunta inválida');
      }
    }
    
    // 🔥 IMPORTANTE: Guardar preguntas en Firestore y cambiar status a 'active'
    const gameRef = db.collection('trivia_games').doc(gameId);
        await gameRef.update({
      questions: parsedResponse.questions,
      status: 'active',
      startedAt: new Date().toISOString()
    });
    
    console.log(`✅ Preguntas generadas y guardadas para juego ${gameId}`);
    
    return {
      success: true,
      questions: parsedResponse.questions
    };
    
  } catch (error) {
    console.error('Error generando preguntas:', error);
    throw new HttpsError('internal', `Error al generar preguntas: ${error.message}`);
  }
});

/**
 * Función: Enviar respuesta a pregunta de trivia
 * Registra la respuesta con timestamp para calcular tiempo
 */
exports.submitTriviaAnswer = onCall(async (request) => {
  const { gameId, phone, uid, questionIndex, selectedOption } = request.data;
  
  // Validaciones básicas
  if (!gameId || !phone || !uid) {
    throw new HttpsError('invalid-argument', 'ID del juego, teléfono y UID son requeridos');
  }
  
  if (questionIndex === undefined || questionIndex < 0 || questionIndex > 9) {
    throw new HttpsError('invalid-argument', 'Índice de pregunta inválido (debe ser 0-9)');
  }
  
  if (selectedOption === undefined || selectedOption < 0 || selectedOption > 3) {
    throw new HttpsError('invalid-argument', 'Opción seleccionada inválida (debe ser 0-3)');
  }
  
  // Verificar UID del jugador
  const playerPhone = await verifyClientUid(phone, uid);
  
  const gameRef = db.collection('trivia_games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Juego no encontrado');
  }
  
  const gameData = gameDoc.data();
  
  // Validar estado del juego
  if (gameData.status !== 'active') {
    throw new HttpsError('failed-precondition', 'El juego no está activo');
  }
  
  // Verificar que el jugador participa en el juego (retador o invitado aceptado)
  const isCreator = gameData.creatorPhone === playerPhone;
  const invitedPlayer = gameData.invitedPlayers.find(p => p.phone === playerPhone);
  const isAcceptedInvited = invitedPlayer && invitedPlayer.status === 'accepted';
  
  if (!isCreator && !isAcceptedInvited) {
    throw new HttpsError('permission-denied', 'No estás participando en este juego');
  }
  
  // Verificar que no haya respondido ya esta pregunta
  const currentAnswers = gameData.answers || {};
  const playerAnswers = currentAnswers[playerPhone] || {};
  
  if (playerAnswers[questionIndex]) {
    throw new HttpsError('already-exists', 'Ya respondiste esta pregunta');
  }
  
  // Registrar respuesta con timestamp
  const newAnswers = {
    ...currentAnswers,
    [playerPhone]: {
      ...playerAnswers,
      [questionIndex]: {
        selected: selectedOption,
        timestamp: new Date().toISOString()
      }
    }
  };
  
  await gameRef.update({
    answers: newAnswers
  });
  
  return {
    success: true,
    message: 'Respuesta registrada'
  };
});

/**
 * Función: Finalizar juego de trivia
 * Calcula ganador y distribuye créditos
 * Solo puede ser llamada por el creador del juego
 */
exports.finishTriviaGame = onCall(async (request) => {
  const { gameId, phone, uid } = request.data;
  
  console.log('🏁 Iniciando finishTriviaGame para juego:', gameId);
  
  if (!gameId || !phone || !uid) {
    throw new HttpsError('invalid-argument', 'ID del juego, teléfono y UID son requeridos');
  }
  
  const creatorPhone = await verifyClientUid(phone, uid);
  console.log('✅ Creador verificado:', creatorPhone);
  
  const gameRef = db.collection('trivia_games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Juego no encontrado');
  }
  
  const gameData = gameDoc.data();
  console.log('📊 Estado del juego:', gameData.status);
  
  if (gameData.creatorPhone !== creatorPhone) {
    throw new HttpsError('permission-denied', 'Solo el creador puede finalizar el juego');
  }
  
  if (gameData.status !== 'active') {
    throw new HttpsError('failed-precondition', 'El juego no está activo');
  }
  
  const allActivePlayers = [
    gameData.creatorPhone,
    ...gameData.invitedPlayers
      .filter(p => p.status === 'accepted')
      .map(p => p.phone)
  ];
  
  console.log('👥 Todos los jugadores activos:', allActivePlayers);
  
  if (allActivePlayers.length < 2) {
    throw new HttpsError('failed-precondition', 'Se necesitan al menos 2 jugadores para finalizar');
  }
  
  const totalQuestions = gameData.questions.length;
  const answers = gameData.answers || {};
  
  const maxPlayers = gameData.maxPlayers || 2;
  const playersWithAllAnswers = [];
  const playersWithPartialAnswers = [];
  
  for (const playerPhone of allActivePlayers) {
    const playerAnswers = answers[playerPhone] || {};
    const answeredCount = Object.keys(playerAnswers).length;
    
    if (answeredCount >= totalQuestions) {
      playersWithAllAnswers.push(playerPhone);
    } else {
      playersWithPartialAnswers.push(playerPhone);
    }
  }
  
  console.log('✅ Jugadores con todas las respuestas:', playersWithAllAnswers);
  console.log('⚠️ Jugadores con respuestas parciales:', playersWithPartialAnswers);
  
  const canFinishByMaxPlayers = playersWithAllAnswers.length >= maxPlayers;
  const startedAt = gameData.startedAt ? new Date(gameData.startedAt) : null;
  const hoursSinceStart = startedAt ? (Date.now() - startedAt.getTime()) / (1000 * 60 * 60) : 0;
  const canFinishByTimeout = hoursSinceStart >= 2;
  
  console.log(`🔍 ¿Se alcanzó maxPlayers? ${canFinishByMaxPlayers} (${playersWithAllAnswers.length}/${maxPlayers})`);
  console.log(`🔍 ¿Pasaron 2 horas? ${canFinishByTimeout} (${hoursSinceStart.toFixed(2)}h)`);
  
  if (!canFinishByMaxPlayers && !canFinishByTimeout) {
    throw new HttpsError('failed-precondition', 
      `No se puede finalizar aún. Necesitas que ${maxPlayers} jugadores respondan todas las preguntas, o esperar 2 horas. Han pasado ${hoursSinceStart.toFixed(1)} horas.`);
  }
  
  const finalPlayers = playersWithAllAnswers;
  
  if (finalPlayers.length < 2) {
    throw new HttpsError('failed-precondition', 
      `Se necesitan al menos 2 jugadores que hayan respondido todas las preguntas. Solo ${finalPlayers.length} lo hicieron.`);
  }
  
  const scores = {};
  
  for (const playerPhone of finalPlayers) {
    let correctCount = 0;
    const playerAnswers = answers[playerPhone] || {};
    
    for (let i = 0; i < totalQuestions; i++) {
      const answer = playerAnswers[i];
      const correctAnswer = gameData.questions[i].correctAnswer;
      
      if (answer && answer.selected === correctAnswer) {
        correctCount++;
      }
    }
    
    scores[playerPhone] = correctCount;
    console.log(`✅ ${playerPhone}: ${correctCount} respuestas correctas`);
  }
  
  const maxScore = Math.max(...Object.values(scores));
  const winners = finalPlayers.filter(p => scores[p] === maxScore);
  
  console.log('🏆 Ganadores:', winners, 'con puntaje:', maxScore);
  
  const finalWinners = winners;
  
  const totalPool = gameData.betAmount * finalPlayers.length;
  const prizePerWinner = Math.floor(totalPool / finalWinners.length);
  
  console.log('💰 Pozo total:', totalPool, 'Premio por ganador:', prizePerWinner);
  
  try {
    await db.runTransaction(async (transaction) => {
      console.log('🔄 Iniciando transacción...');
      
      const balances = {};
      
      for (const playerPhone of finalPlayers) {
        console.log(`📖 Leyendo balance de: ${playerPhone}`);
        const balanceRef = db.collection('client_balances').doc(playerPhone);
        const balanceDoc = await transaction.get(balanceRef);
        
        balances[playerPhone] = {
          ref: balanceRef,
          exists: balanceDoc.exists,
          currentBalance: balanceDoc.exists ? (balanceDoc.data().balance || 0) : 0,
          currentFrozen: balanceDoc.exists ? (balanceDoc.data().frozenBalance || 0) : 0
        };
      }
      
      console.log('💾 Aplicando cambios...');
      
      for (const playerPhone of finalPlayers) {
        const { ref, currentBalance, currentFrozen } = balances[playerPhone];
        const isWinner = finalWinners.includes(playerPhone);
        
        let newFrozen = currentFrozen - gameData.betAmount;
        let newBalance = currentBalance;
        
                if (isWinner) {
          // 🆕 CORRECCIÓN CRÍTICA: Calcular premio neto
          const netPrize = prizePerWinner - gameData.betAmount;
          newBalance = currentBalance + netPrize;
          console.log(`💰 ${playerPhone}: Ganador - Premio bruto ${prizePerWinner}, Apuesta ${gameData.betAmount}, Neto ${netPrize}`);
        } else {
          // 🆕 CORRECCIÓN CRÍTICA: Perdedor PIERDE su apuesta
          newBalance = currentBalance - gameData.betAmount;
          console.log(`💸 ${playerPhone}: Perdedor - Pierde apuesta ${gameData.betAmount}, Balance ${currentBalance} -> ${newBalance}`);
        }
        
        console.log(`✅ ${playerPhone}: Balance ${currentBalance} -> ${newBalance}, Frozen ${currentFrozen} -> ${newFrozen}, Ganador: ${isWinner}`);
        
        transaction.set(ref, {
          balance: newBalance,
          frozenBalance: Math.max(0, newFrozen),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        const transactionRef = db.collection('transactions').doc();
        transaction.set(transactionRef, {
          phone: playerPhone,
          type: isWinner ? 'trivia_win' : 'trivia_loss',
          amount: isWinner ? prizePerWinner : 0,
          betAmount: gameData.betAmount,
          description: isWinner 
            ? `Ganó trivia - ${scores[playerPhone]}/${totalQuestions} correctas`
            : `Perdió trivia - ${scores[playerPhone]}/${totalQuestions} correctas`,
          gameId: gameId,
          balanceBefore: currentBalance,
          balanceAfter: newBalance,
          createdAt: new Date().toISOString()
        });
      }
      
      for (const playerPhone of playersWithPartialAnswers) {
        console.log(`💸 Devolviendo créditos a ${playerPhone} (no respondió todas)`);
        const balanceRef = db.collection('client_balances').doc(playerPhone);
        const balanceDoc = await transaction.get(balanceRef);
        
        const currentBalance = balanceDoc.exists ? (balanceDoc.data().balance || 0) : 0;
        const currentFrozen = balanceDoc.exists ? (balanceDoc.data().frozenBalance || 0) : 0;
        
        const newFrozen = currentFrozen - gameData.betAmount;
        
        transaction.set(balanceRef, {
          balance: currentBalance,
          frozenBalance: Math.max(0, newFrozen),
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        const transactionRef = db.collection('transactions').doc();
        transaction.set(transactionRef, {
          phone: playerPhone,
          type: 'trivia_refund',
          amount: 0,
          betAmount: gameData.betAmount,
          description: `Devolución - No respondió todas las preguntas`,
          gameId: gameId,
          balanceBefore: currentBalance,
          balanceAfter: currentBalance,
          createdAt: new Date().toISOString()
        });
      }
      
      console.log('🎮 Actualizando estado del juego...');
      transaction.update(gameRef, {
        status: 'finished',
        finishedAt: new Date().toISOString(),
        winners: finalWinners,
        scores: scores,
        totalPool: totalPool,
        prizePerWinner: prizePerWinner,
        finalPlayers: finalPlayers,
        refundedPlayers: playersWithPartialAnswers
      });
      
      console.log('✅ Transacción completada exitosamente');
    });
    
    console.log('🎉 Juego finalizado exitosamente');
  } catch (txError) {
    console.error('❌ Error en transacción:', txError.message);
    throw new HttpsError('internal', 'Error en transacción: ' + txError.message);
  }
  
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const winnersText = finalWinners.map(w => `${w} (${scores[w]}/${totalQuestions})`).join(', ');
  const refundedText = playersWithPartialAnswers.length > 0 
    ? `\n💸 *Devoluciones:* ${playersWithPartialAnswers.join(', ')}`
    : '';
  
  const telegramMessage = `🏆 *TRIVIA FINALIZADA* 🏆\n\n` +
    `📋 *ID:* ${gameId}\n` +
    `💰 *Pozo total:* ${totalPool} créditos\n` +
    `👑 *Ganador(es):* ${winnersText}\n` +
    `💵 *Premio:* ${prizePerWinner} créditos c/u\n` +
    refundedText +
    `\n\n📊 *Resultados:*\n` +
    finalPlayers.map(p => `• ${p}: ${scores[p]}/${totalQuestions}`).join('\n');
  
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
    console.error("Error enviando notificación a Telegram:", error);
  }
  
  return {
    success: true,
    winners: finalWinners,
    scores: scores,
    totalPool: totalPool,
    prizePerWinner: prizePerWinner,
    finalPlayers: finalPlayers,
    refundedPlayers: playersWithPartialAnswers,
    message: `Juego finalizado. Ganador(es): ${finalWinners.join(', ')}`
  };
});



/**
 * Función: Cancelar reto de trivia
 * Solo el creador puede cancelar si nadie ha aceptado
 * Devuelve los créditos congelados automáticamente
 */
exports.cancelTriviaGame = onCall(async (request) => {
  const { gameId, phone, uid } = request.data;
  
  if (!gameId || !phone || !uid) {
    throw new HttpsError('invalid-argument', 'ID del juego, teléfono y UID son requeridos');
  }
  
  console.log('🚫 Iniciando cancelTriviaGame para juego:', gameId);
  
  // Verificar UID del creador
  const creatorPhone = await verifyClientUid(phone, uid);
  console.log('✅ Creador verificado:', creatorPhone);
  
  const gameRef = db.collection('trivia_games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Juego no encontrado');
  }
  
  const gameData = gameDoc.data();
  
  // Solo el creador puede cancelar
  if (gameData.creatorPhone !== creatorPhone) {
    throw new HttpsError('permission-denied', 'Solo el creador puede cancelar el reto');
  }
  
  // Solo se puede cancelar si está en estado "waiting"
  if (gameData.status !== 'waiting') {
    throw new HttpsError('failed-precondition', 'El reto ya no se puede cancelar (ya inició o finalizó)');
  }
  
  // Verificar que NADIE haya aceptado
  const invitedPlayers = gameData.invitedPlayers || [];
  const acceptedPlayers = invitedPlayers.filter(p => p.status === 'accepted');
  
  if (acceptedPlayers.length > 0) {
    throw new HttpsError('failed-precondition', 
      `No se puede cancelar: ${acceptedPlayers.length} jugador(es) ya aceptaron el reto`);
  }
  
  console.log('✅ Validaciones pasadas, procediendo a cancelar');
  
  // Transacción para devolver créditos y eliminar juego
  try {
    await db.runTransaction(async (transaction) => {
      // FASE 1: LEER balance del creador
      console.log('📖 Leyendo balance del creador:', creatorPhone);
      const balanceRef = db.collection('client_balances').doc(creatorPhone);
      const balanceDoc = await transaction.get(balanceRef);
      
      const currentBalance = balanceDoc.exists ? (balanceDoc.data().balance || 0) : 0;
      const currentFrozen = balanceDoc.exists ? (balanceDoc.data().frozenBalance || 0) : 0;
      
      console.log(`💰 Balance actual: ${currentBalance}, Frozen: ${currentFrozen}`);
      
      // FASE 2: ESCRIBIR cambios
      // Devolver los créditos congelados
      const newFrozen = currentFrozen - gameData.betAmount;
      
      console.log(`✅ Devolviendo ${gameData.betAmount} créditos. Nuevo frozen: ${newFrozen}`);
      
      transaction.set(balanceRef, {
        balance: currentBalance, // El balance total no cambia
        frozenBalance: Math.max(0, newFrozen), // Solo se descongela
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Registrar transacción
      const transactionRef = db.collection('transactions').doc();
      transaction.set(transactionRef, {
        phone: creatorPhone,
        type: 'trivia_cancel_refund',
        amount: 0,
        betAmount: gameData.betAmount,
        description: `Reto cancelado - Créditos descongelados`,
        gameId: gameId,
        balanceBefore: currentBalance,
        balanceAfter: currentBalance,
        frozenBefore: currentFrozen,
        frozenAfter: Math.max(0, newFrozen),
        createdAt: new Date().toISOString()
      });
      
      // Eliminar el documento del juego
      transaction.delete(gameRef);
      
      console.log('✅ Juego eliminado y créditos devueltos');
    });
    
    console.log('🎉 Reto cancelado exitosamente');
  } catch (txError) {
    console.error('❌ Error en transacción:', txError.message);
    throw new HttpsError('internal', 'Error al cancelar el reto: ' + txError.message);
  }
  
  // Notificación Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `🚫 *RETO CANCELADO* 🚫\n\n` +
    `👤 *Creador:* ${creatorPhone}\n` +
    `💰 *Apuesta devuelta:* ${gameData.betAmount} créditos\n` +
    `📋 *ID:* ${gameId}\n\n` +
    `✅ Créditos devueltos al saldo congelado`;
  
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
    console.error("Error enviando notificación a Telegram:", error);
  }
  
  return {
    success: true,
    message: `Reto cancelado. Se devolvieron ${gameData.betAmount} créditos a tu saldo disponible.`
  };
});





// ═══════════════════════════════════════════════════════════════
// 🆕 FUNCIÓN HÍBRIDA: Asignar preguntas (Groq + Banco fallback)
// ═══════════════════════════════════════════════════════════════
exports.assignTriviaQuestions = onCall(async (request) => {
  const { gameId } = request.data;
  
  if (!gameId) {
    throw new HttpsError('invalid-argument', 'gameId es requerido');
  }
  
  const gameRef = db.collection('trivia_games').doc(gameId);
  const gameDoc = await gameRef.get();
  
  if (!gameDoc.exists) {
    throw new HttpsError('not-found', 'Juego no encontrado');
  }
  
  const gameData = gameDoc.data();
  
  // Verificar si ya tiene preguntas
  if (gameData.questions && gameData.questions.length > 0) {
    return {
      success: true,
      source: 'already_exists',
      questions: gameData.questions
    };
  }
  
  // Intentar Groq primero
  const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
  const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
  
  const prompt = `Genera exactamente 10 preguntas de trivia sobre fútbol en español.
  
Categoría: mezcla de fútbol mundial y colombiano
Dificultad: variada (fáciles, medias y difíciles)

Formato requerido (JSON válido):
{
  "questions": [
    {
      "question": "Texto de la pregunta",
      "options": ["Opción A", "Opción B", "Opción C", "Opción D"],
      "correctAnswer": 0,
      "category": "mundial o colombiano",
      "difficulty": 1-3
    }
  ]
}

Reglas:
- correctAnswer es el índice (0-3) de la opción correcta
- Las preguntas deben ser variadas y entretenidas
- Incluye preguntas sobre: historia, jugadores famosos, mundiales, equipos, reglas, récords
- NO incluyas explicaciones, solo el JSON puro`;

  let questions = null;
  let source = 'bank';
  
  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GROQ_API_KEY}`
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [
          {
            role: 'system',
            content: 'Eres un experto en fútbol que genera preguntas de trivia. Respondes SOLO con JSON válido.'
          },
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: 0.8,
        max_tokens: 4000
      })
    });

    if (response.ok) {
      const data = await response.json();
      const textResponse = data.choices[0].message.content;
      
      const jsonMatch = textResponse.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsedResponse = JSON.parse(jsonMatch[0]);
        
        if (parsedResponse.questions && parsedResponse.questions.length === 10) {
          let valid = true;
          for (const q of parsedResponse.questions) {
            if (!q.question || !q.options || q.options.length !== 4 || 
                q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer > 3) {
              valid = false;
              break;
            }
          }
          
          if (valid) {
            questions = parsedResponse.questions;
            source = 'groq';
            console.log('✅ Preguntas generadas con Groq');
          }
        }
      }
    }
  } catch (error) {
    console.log('⚠️ Groq falló, usando banco de preguntas:', error.message);
  }
  
  // Si Groq falló, usar banco de preguntas
  if (!questions) {
    console.log('📚 Usando banco de preguntas aleatorias');
    
    // Obtener 10 preguntas aleatorias del banco
    const allQuestionsSnapshot = await db.collection('trivia_questions').get();
    const allQuestions = [];
    
    allQuestionsSnapshot.forEach(doc => {
      allQuestions.push(doc.data());
    });
    
    // Mezclar y tomar 10
    const shuffled = allQuestions.sort(() => 0.5 - Math.random());
    questions = shuffled.slice(0, 10).map(q => ({
      question: q.question,
      options: q.options,
      correctAnswer: q.correctAnswer,
      category: q.category,
      difficulty: q.difficulty
    }));
  }
  
  // Guardar en el documento del juego
  await gameRef.update({
    questions: questions,
    status: 'active',
    startedAt: admin.firestore.FieldValue.serverTimestamp(),
    questionSource: source
  });
  
  console.log(`✅ Preguntas asignadas al juego ${gameId} desde ${source}`);
  
  return {
    success: true,
    source: source,
    questions: questions
  };
});


/**
 * Función: Registrar cliente automáticamente
 * Si el teléfono no tiene UID, crea uno automáticamente
 */
exports.registerClient = onCall(async (request) => {
  const { phone } = request.data;
  
  if (!phone) {
    throw new HttpsError('invalid-argument', 'Teléfono es requerido');
  }
  
  const phoneNormalized = phone.replace(/\D/g, '');
  const phoneWithCountry = phoneNormalized.startsWith('57') ? phoneNormalized : '57' + phoneNormalized;
  
  // Buscar si ya tiene UID
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneWithCountry)
    .limit(1)
    .get();
  
  if (!uidQuery.empty) {
    // Ya existe, devolver el UID existente
    const existingUid = uidQuery.docs[0].data().uid;
    return {
      success: true,
      phone: phoneWithCountry,
      uid: existingUid,
      isNew: false,
      message: 'Cliente ya registrado'
    };
  }
  
  // No existe, generar UID único de 6 dígitos
  let clientUid;
  let uidGenerated = false;
  
  while (!uidGenerated) {
    const newUid = Math.floor(100000 + Math.random() * 900000).toString();
    
    const uidCheck = await db.collection('client_uids')
      .where('uid', '==', newUid)
      .limit(1)
      .get();
    
    if (uidCheck.empty) {
      clientUid = newUid;
      uidGenerated = true;
      
      await db.collection('client_uids').add({
        phone: phoneWithCountry,
        uid: newUid,
        createdAt: new Date().toISOString()
      });
      
            // Crear balance inicial con 500 créditos de regalo
      await db.collection('client_balances').doc(phoneWithCountry).set({
        phone: phoneWithCountry,
        balance: 500, // 🎁 Regalo de bienvenida
        frozenBalance: 0,
        totalDeposited: 500,
        totalWithdrawn: 0,
        updatedAt: new Date().toISOString()
      }, { merge: true });
      
      // Registrar transacción del regalo
      await db.collection('transactions').add({
        phone: phoneWithCountry,
        type: 'welcome_bonus',
        amount: 500,
        description: '🎁 Regalo de bienvenida - Primera vez',
        balanceBefore: 0,
        balanceAfter: 500,
        createdAt: new Date().toISOString()
      });
      
      console.log(`✅ Nuevo cliente registrado: ${phoneWithCountry} con UID: ${newUid} + 500 créditos de regalo`);
    }
  }
  
  return {
    success: true,
    phone: phoneWithCountry,
    uid: clientUid,
    isNew: true,
    message: 'Cliente registrado exitosamente'
  };
});