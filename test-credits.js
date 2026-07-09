const { initializeApp } = require("firebase-admin/app");
const { getFunctions } = require("firebase-admin/functions");

initializeApp();

async function testGetBalance() {
  console.log("Probando getBalance con teléfono de prueba...");
  
  // Simular llamada a la función
  const phone = "573146316831"; // Teléfono de Christian Sepulveda
  
  console.log(`Teléfono: ${phone}`);
  console.log("✅ Script de prueba creado");
  console.log("⚠️ Nota: Las funciones onCall requieren ser llamadas desde el frontend");
  console.log("⚠️ Probaremos desde el navegador en el siguiente paso");
}

testGetBalance();
