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

// Determina si un partido debe ocultarse (5 minutos antes de su inicio, en hora Colombia)
// Determina si un partido debe ocultarse (5 minutos antes de su inicio, en hora Colombia)
export const shouldCloseMatch = (matchDateStr, matchTime) => {
  // Parsear fecha y hora como si fueran en UTC-5 (Colombia)
  const [year, month, day] = matchDateStr.split("-").map(Number);
  const [hours, minutes] = matchTime.split(":").map(Number);
  const matchTimestamp = Date.UTC(year, month - 1, day, hours - 5, minutes);
  const fiveMinutesBefore = matchTimestamp - 5 * 60 * 1000;
  const nowInColombia = new Date().getTime() + (new Date().getTimezoneOffset() + 300) * 60 * 1000;
  return nowInColombia >= fiveMinutesBefore;
};
