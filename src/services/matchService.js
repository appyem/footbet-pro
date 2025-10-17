import weeklyMatches from '../data/matches.json';

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

export const getAvailableMatches = () => {
  const today = getCurrentDate();
  const tomorrow = getTomorrowDate();
  
  const todayMatches = weeklyMatches[today] || [];
  const tomorrowMatches = weeklyMatches[tomorrow] || [];
  
  return { todayMatches, tomorrowMatches };
};

export const selectTrapMatches = (matches) => {
  if (matches.length === 0) return [];
  const sortedByPopularity = [...matches].sort((a, b) => a.popularity - b.popularity);
  const trapMatches = sortedByPopularity.slice(0, 3);
  return trapMatches.map(match => match.id);
};

export const prepareDailyMatches = () => {
  const { todayMatches, tomorrowMatches } = getAvailableMatches();
  
  let combinedMatches = [...todayMatches];
  
  if (combinedMatches.length < 7) {
    const needed = 7 - combinedMatches.length;
    combinedMatches = [...combinedMatches, ...tomorrowMatches.slice(0, needed)];
  }
  
  while (combinedMatches.length < 7) {
    combinedMatches = [...combinedMatches, ...combinedMatches];
  }
  
  const finalMatches = combinedMatches.slice(0, 7);
  const trapIds = selectTrapMatches(finalMatches);
  
  return finalMatches.map((match, index) => ({
    ...match,
    isTrap: trapIds.includes(match.id),
    odds: { home: 2.0, draw: 3.0, away: 3.0 },
    status: 'upcoming'
  }));
};

export const shouldCloseMatch = (matchTime) => {
  const now = new Date();
  const [hours, minutes] = matchTime.split(':').map(Number);
  const matchDate = new Date();
  matchDate.setHours(hours, minutes, 0, 0);
  
  const fiveMinutesBefore = new Date(matchDate.getTime() - 5 * 60000);
  
  return now >= fiveMinutesBefore;
};