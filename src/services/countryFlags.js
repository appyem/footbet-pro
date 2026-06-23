// Mapeo de países a sus banderas (emojis)
const countryToFlag = {
  'argentina': '🇦🇷', 'australia': '🇦🇺', 'austria': '🇦🇹', 'bélgica': '🇧🇪', 'belgium': '🇧🇪',
  'brasil': '🇧🇷', 'brazil': '🇧🇷', 'camerún': '🇨🇲', 'cameroon': '🇨🇲', 'canadá': '🇨🇦', 'canada': '🇨🇦',
  'chile': '🇨🇱', 'colombia': '🇨🇴', 'corea del sur': '🇰🇷', 'south korea': '🇰🇷', 'costa rica': '🇨🇷',
  'croacia': '🇭🇷', 'croatia': '🇭🇷', 'dinamarca': '🇩🇰', 'denmark': '🇩🇰', 'ecuador': '🇪🇨',
  'egipto': '🇪🇬', 'egypt': '🇪🇬', 'españa': '🇪🇸', 'spain': '🇪🇸', 'estados unidos': '🇺🇸', 'usa': '🇺🇸', 'united states': '🇺🇸',
  'francia': '🇫🇷', 'france': '🇫🇷', 'alemania': '🇩🇪', 'germany': '🇩🇪', 'ghana': '🇬🇭',
  'inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'irán': '🇮🇷', 'iran': '🇮🇷', 'italia': '🇮🇹', 'italy': '🇮🇹',
  'japón': '🇯🇵', 'japan': '🇯🇵', 'marruecos': '🇲🇦', 'morocco': '🇲🇦', 'méxico': '🇲🇽', 'mexico': '🇲🇽',
  'países bajos': '🇳🇱', 'netherlands': '🇳🇱', 'polonia': '🇵🇱', 'poland': '🇵🇱', 'portugal': '🇵🇹',
  'qatar': '🇶🇦', 'arabia saudita': '🇸🇦', 'saudi arabia': '🇸🇦', 'senegal': '🇸🇳', 'serbia': '🇷🇸',
  'suiza': '🇨🇭', 'switzerland': '🇨🇭', 'túnez': '🇹🇳', 'tunisia': '🇹🇳', 'uruguay': '🇺🇾',
  'gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'champions league': '🏆', 'europa league': '🇪🇺', 'premier league': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'la liga': '🇪🇸', 'serie a': '🇮🇹', 'bundesliga': '🇩🇪', 'ligue 1': '🇫🇷', 'liga mx': '🇲🇽',
  'copa libertadores': '🌎', 'mundial': '🌍', 'world cup': '🌍', 'fifa': '🌍'
};

// Mapeo simple de equipos a países (para el mundial)
const teamToCountry = {
  'argentina': 'argentina', 'brasil': 'brasil', 'francia': 'francia', 'alemania': 'alemania',
  'españa': 'españa', 'inglaterra': 'inglaterra', 'italia': 'italia', 'portugal': 'portugal',
  'méxico': 'méxico', 'colombia': 'colombia', 'uruguay': 'uruguay', 'chile': 'chile',
  'estados unidos': 'estados unidos', 'canadá': 'canadá', 'japón': 'japón', 'corea del sur': 'corea del sur',
  'croacia': 'croacia', 'bélgica': 'bélgica', 'países bajos': 'países bajos', 'suiza': 'suiza',
  'dinamarca': 'dinamarca', 'serbia': 'serbia', 'polonia': 'polonia', 'gales': 'gales',
  'marruecos': 'marruecos', 'senegal': 'senegal', 'ghana': 'ghana', 'camerún': 'camerún',
  'túnez': 'túnez', 'egipto': 'egipto', 'arabia saudita': 'arabia saudita', 'irán': 'irán',
  'australia': 'australia', 'ecuador': 'ecuador', 'qatar': 'qatar', 'costa rica': 'costa rica'
};

/**
 * Busca una bandera ignorando mayúsculas y buscando coincidencias parciales
 */
const findFlag = (text, map) => {
  if (!text) return null;
  const lowerText = text.toLowerCase().trim();
  
  // 1. Búsqueda exacta
  if (map[lowerText]) return map[lowerText];

  // 2. Búsqueda parcial (si el texto contiene el país)
  for (const [key, value] of Object.entries(map)) {
    if (lowerText.includes(key)) {
      return value;
    }
  }
  return null;
};

export const getCountryFlag = (country) => {
  return findFlag(country, countryToFlag) || '🌐';
};

export const getTeamFlag = (teamName) => {
  const countryKey = findFlag(teamName, teamToCountry);
  if (countryKey) {
    return findFlag(countryKey, countryToFlag) || '';
  }
  return '';
};

export const getCountryOptions = () => {
  return Object.keys(countryToFlag).map(key => ({
    label: `${countryToFlag[key]} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
    value: key
  }));
};
