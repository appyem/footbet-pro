
// src/services/matchService.js

// Fecha actual en formato YYYY-MM-DD (Colombia)
export const getCurrentDate = () => {
  return new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota' }).split(',')[0];
};

// Hora actual en formato HH:mm (Colombia)
export const getCurrentTime = () => {
  return new Date().toLocaleTimeString('es-CO', { 
    timeZone: 'America/Bogota', 
    hour: '2-digit', 
    minute: '2-digit',
    hour12: false 
  });
};

// Función corregida: determina si un partido debe ocultarse (5 min antes)
export const shouldCloseMatch = (matchDateStr, matchTime) => {
  // Hora actual en Colombia
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaNow = new Date(utc + (-5 * 3600000));

  // Parsear fecha y hora del partido
  const [year, month, day] = matchDateStr.split('-').map(Number);
  const [hours, minutes] = matchTime.split(':').map(Number);

  // Crear fecha del partido en UTC que represente la hora local de Colombia
  const matchInColombia = new Date(Date.UTC(year, month - 1, day, hours, minutes, 0));
  const matchColombiaTime = new Date(matchInColombia.getTime() + (-5 * 3600000));

  // 5 minutos antes

  const fiveMinutesBefore = new Date(matchColombiaTime.getTime() - 5 * 60000);

  return colombiaNow >= fiveMinutesBefore;
};