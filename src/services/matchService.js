// src/services/matchService.js

// Obtiene la fecha actual en formato YYYY-MM-DD (hora de Colombia)
export const getCurrentDate = () => {
  return new Date().toLocaleString('en-CA', { timeZone: 'America/Bogota' }).split(',')[0];
};

// Obtiene la hora actual en formato HH:mm (hora de Colombia)
export const getCurrentTime = () => {
  return new Date().toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Determina si un partido debe ocultarse (5 minutos antes de su inicio)
export const shouldCloseMatch = (matchDateStr, matchTime) => {
  // Crear fecha del partido en la zona horaria de Colombia
  const [year, month, day] = matchDateStr.split('-').map(Number);
  const [hours, minutes] = matchTime.split(':').map(Number);
  
  // Construir la fecha del partido como si estuviera en la hora local de Colombia
  const matchDate = new Date(year, month - 1, day, hours, minutes, 0);
  
  // Obtener la misma fecha pero en la zona horaria de Colombia (evita desfases)
  const matchInColombia = new Date(
    matchDate.toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );

  // Calcular 5 minutos antes del partido
  const fiveMinutesBefore = new Date(matchInColombia.getTime() - 5 * 60000);

  // Obtener la hora actual en Colombia
  const nowInColombia = new Date(
    new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
  );

  // Comparar: si ya pasaron los 5 minutos antes, el partido debe cerrarse
  return nowInColombia >= fiveMinutesBefore;
};