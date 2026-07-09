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
  const copAmount = amount * 10; // 1 crédito = 10 COP
  
  // 🔒 SEGURIDAD: Verificar si el cliente ya tiene UID, si no, crear uno
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneNormalized)
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
      phone: phoneNormalized,
      uid: clientUid,
      createdAt: new Date().toISOString()
    });
    
    console.log(`✅ UID creado para ${phoneNormalized}: ${clientUid}`);
  } else {
    clientUid = uidQuery.docs[0].data().uid;
  }
  
  // Crear solicitud de recarga
  const purchaseRequest = {
    phone: phoneNormalized,
    type: 'deposit',
    amount: amount,
    copAmount: copAmount,
    paymentMethod: paymentMethod || 'nequi',
    status: 'pending',
    requestedAt: new Date().toISOString()
  };
  
  const requestRef = await db.collection('withdrawal_requests').add(purchaseRequest);
  
  // Enviar notificación a Telegram
  const telegramToken = "8870849365:AAE40yszlSGVi6LRDiARJtTn87vrnHMU_Mk";
  const telegramChatId = "6567201196";
  
  const telegramMessage = `💰 *SOLICITUD DE RECARGA* 💰\n\n👤 *Teléfono:* ${phoneNormalized}\n💵 *Monto:* ${amount} créditos\n💰 *COP:* $${copAmount.toLocaleString()}\n💳 *Método:* ${paymentMethod || 'nequi'}\n📋 *ID:* ${requestRef.id}\n\n✅ Pendiente de aprobación`;
  
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
    uid: clientUid,
    message: 'Solicitud enviada al administrador' 
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
  
  return { success: true, newBalance: newBalance, message: `${amount} créditos agregados exitosamente` };
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
  const uidNormalized = uid.toString().trim();
  
  // 🔒 SEGURIDAD: Verificar que el UID coincida con el teléfono
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneNormalized)
    .where('uid', '==', uidNormalized)
    .limit(1)
    .get();
  
  if (uidQuery.empty) {
    throw new HttpsError('permission-denied', 'Código UID incorrecto o no registrado');
  }
  
  // Verificar que el cliente tenga saldo suficiente
  const balanceRef = db.collection('client_balances').doc(phoneNormalized);
  const balanceDoc = await balanceRef.get();
  
  if (!balanceDoc.exists || balanceDoc.data().balance < amount) {
    throw new HttpsError('failed-precondition', 'Saldo insuficiente');
  }
  
  const commission = Math.floor(amount * 0.10); // 10% de comisión
  const netAmount = amount - commission;
  const copAmount = netAmount * 10; // 1 crédito = 10 COP
  
  // Crear solicitud de retiro
  const withdrawalRequest = {
    phone: phoneNormalized,
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
  
  const telegramMessage = `💸 *SOLICITUD DE RETIRO* 💸\n\n👤 *Teléfono:* ${phoneNormalized}\n💵 *Monto:* ${amount} créditos\n📊 *Comisión (10%):* ${commission} créditos\n💰 *Neto:* ${netAmount} créditos\n💵 *COP:* $${copAmount.toLocaleString()}\n💳 *Método:* ${paymentMethod}\n🏦 *Cuenta:* ${accountNumber}\n📋 *ID:* ${requestRef.id}\n\n✅ Pendiente de aprobación`;
  
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
    
    return { success: true, message: 'Retiro aprobado y procesado' };
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
  const uidNormalized = uid.toString().trim();
  
  // Verificar que el UID coincida con el teléfono
  const uidQuery = await db.collection('client_uids')
    .where('phone', '==', phoneNormalized)
    .where('uid', '==', uidNormalized)
    .limit(1)
    .get();
  
  if (uidQuery.empty) {
    throw new HttpsError('permission-denied', 'Código UID incorrecto o no registrado');
  }
  
  const balanceRef = db.collection('client_balances').doc(phoneNormalized);
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