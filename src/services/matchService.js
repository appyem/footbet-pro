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
export const shouldCloseMatch = (matchDateStr, matchTime) => {
  // Combinar fecha y hora en un string ISO en la zona horaria de Colombia
  const matchDateTimeStr = `${matchDateStr}T${matchTime}:00`;
  const matchInColombia = new Date(matchDateTimeStr);
  // Ajustar a hora de Colombia explícitamente
  const tzOffset = matchInColombia.getTimezoneOffset(); // en minutos
  const colombiaOffset = -300; // UTC-5 = -300 minutos
  const diffMinutes = colombiaOffset - tzOffset;
  matchInColombia.setMinutes(matchInColombia.getMinutes() + diffMinutes);

  // Cerrar 5 minutos antes
  const fiveMinutesBefore = new Date(matchInColombia.getTime() - 5 * 60 * 1000);

  // Hora actual en la misma referencia (hora Colombia)
  const nowInColombia = new Date();
  nowInColombia.setMinutes(nowInColombia.getMinutes() + (colombiaOffset - nowInColombia.getTimezoneOffset()));

  return nowInColombia >= fiveMinutesBefore;
};