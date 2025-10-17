// src/services/matchService.js
import weeklyMatches from '../data/matches.json';

// Función para obtener la fecha en formato YYYY-MM-DD
// Función para obtener la fecha actual en Colombia (UTC-5)
export const getCurrentDate = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaTime = new Date(utc + (-5 * 3600000)); // UTC-5
  return colombiaTime.toISOString().split('T')[0];
};

// Función para obtener la fecha de mañana en Colombia (UTC-5)
export const getTomorrowDate = () => {
  const now = new Date();
  const utc = now.getTime() + (now.getTimezoneOffset() * 60000);
  const colombiaTime = new Date(utc + (-5 * 3600000)); // UTC-5
  const tomorrow = new Date(colombiaTime);
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

// Función para obtener partidos disponibles para hoy y mañana
export const getAvailableMatches = () => {
  const today = getCurrentDate();
  const tomorrow = getTomorrowDate();
  
  const todayMatches = weeklyMatches[today] || [];
  const tomorrowMatches = weeklyMatches[tomorrow] || [];
  
  return { todayMatches, tomorrowMatches };
};

// Algoritmo para seleccionar partidos "trap" (menos populares)
export const selectTrapMatches = (matches) => {
  if (matches.length === 0) return [];
  
  // Ordenar por popularidad (menos popular primero)
  const sortedByPopularity = [...matches].sort((a, b) => a.popularity - b.popularity);
  
  // Seleccionar los 3 menos populares
  const trapMatches = sortedByPopularity.slice(0, 3);
  return trapMatches.map(match => match.id);
};

// Función para preparar los 7 partidos del día
export const prepareDailyMatches = () => {
  const { todayMatches, tomorrowMatches } = getAvailableMatches();
  
  // Combinar partidos de hoy y mañana
  let combinedMatches = [...todayMatches];
  
  // Si no hay suficientes partidos hoy, agregar de mañana
  if (combinedMatches.length < 7) {
    const needed = 7 - combinedMatches.length;
    combinedMatches = [...combinedMatches, ...tomorrowMatches.slice(0, needed)];
  }
  
  // Si aún no hay suficientes, repetir los existentes (caso extremo)
  while (combinedMatches.length < 7) {
    combinedMatches = [...combinedMatches, ...combinedMatches];
  }
  
  // Tomar solo los primeros 7
  const finalMatches = combinedMatches.slice(0, 7);
  
  // Seleccionar trap matches
  const trapIds = selectTrapMatches(finalMatches);
  
  // Agregar propiedad isTrap a cada partido
  return finalMatches.map((match, index) => ({
    ...match,
    isTrap: trapIds.includes(match.id),
    odds: { home: 2.0, draw: 3.0, away: 3.0 }, // Cuotas fijas
    status: 'upcoming'
  }));
};

// Función para verificar si un partido debe cerrarse (5 min antes)
export const shouldCloseMatch = (matchTime) => {
  const now = new Date();
  const [hours, minutes] = matchTime.split(':').map(Number);
  const matchDate = new Date();
  matchDate.setHours(hours, minutes, 0, 0);
  
  const fiveMinutesBefore = new Date(matchDate.getTime() - 5 * 60000);
  
  return now >= fiveMinutesBefore;
};