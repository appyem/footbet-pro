// src/services/matchService.js

// Obtiene la fecha actual en formato YYYY-MM-DD (hora de Colombia - UTC-5)
export const getCurrentDate = () => {
  return new Date().toLocaleString('en-CA', { 
    timeZone: 'America/Bogota' 
  }).split(',')[0];
};

// Obtiene la hora actual en formato HH:mm (hora de Colombia - UTC-5)
export const getCurrentTime = () => {
  return new Date().toLocaleTimeString('es-CO', {
    timeZone: 'America/Bogota',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  });
};

// Determina si un partido debe cerrarse paraJugadas (5 minutos antes de su inicio, en hora Colombia)
export const shouldCloseMatch = (matchDateStr, matchTime) => {
  try {
    // Parsear fecha y hora del partido (almacenados como hora de Colombia)
    const [year, month, day] = matchDateStr.split('-').map(Number);
    const [hours, minutes] = matchTime.split(':').map(Number);
    
    // Crear fecha en zona horaria de Colombia (UTC-5)
    // Formato ISO con offset -05:00 para Colombia
    const matchDateTime = new Date(
      `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}T` +
      `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00-05:00`
    );
    
    // Calcular 5 minutos antes del partido
    const cutoffTime = new Date(matchDateTime.getTime() - 5 * 60 * 1000);
    
    // Obtener hora actual en Colombia
    const nowColombia = new Date(
      new Date().toLocaleString('en-US', { timeZone: 'America/Bogota' })
    );
    
    // Comparar en la misma zona horaria (Colombia)
    return nowColombia >= cutoffTime;
  } catch (e) {
    console.error('Error en shouldCloseMatch:', e, { matchDateStr, matchTime });
    return true; // Por seguridad, cerrar si hay error
  }
};