// Función para obtener la fecha actual en Colombia (UTC-5)
export const getCurrentDate = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaTime = new Date(utc + (-5 * 3600000)); // UTC-5
  return colombiaTime.toISOString().split('T')[0];
};

// Función para obtener la hora actual en Colombia (UTC-5)
export const getCurrentTime = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaTime = new Date(utc + (-5 * 3600000)); // UTC-5
  return colombiaTime.toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
};

// Función corregida: ahora recibe matchDate (YYYY-MM-DD) y matchTime (HH:mm)
export const shouldCloseMatch = (matchDateStr, matchTime) => {
  // Obtener la fecha actual en Colombia
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaNow = new Date(utc + (-5 * 3600000)); // UTC-5

  // Crear fecha del partido en Colombia (sin zona horaria)
  const [year, month, day] = matchDateStr.split('-').map(Number);
  const [hours, minutes] = matchTime.split(':').map(Number);
  
  const matchDateTime = new Date(year, month - 1, day, hours, minutes, 0, 0);
  
  // Convertir a UTC-5 (Colombia)
  const matchColombiaTime = new Date(matchDateTime.getTime() - (-5 * 3600000));

  // Calcular 5 minutos antes
  const fiveMinutesBefore = new Date(matchColombiaTime.getTime() - 5 * 60000);

  return colombiaNow >= fiveMinutesBefore;
};