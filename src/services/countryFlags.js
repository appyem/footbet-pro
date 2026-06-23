// Mapeo simplificado SIN TILDES y en MINUSCULAS para máxima compatibilidad
const countryToFlag = {
  'argentina': '🇦🇷', 'australia': '🇦🇺', 'austria': '🇦🇹', 'belgica': '🇧🇪', 'belgium': '🇧🇪',
  'brasil': '🇧🇷', 'brazil': '🇧🇷', 'camerun': '🇨🇲', 'cameroon': '🇨🇲', 'canada': '🇨🇦',
  'chile': '🇨🇱', 'colombia': '🇨🇴', 'corea del sur': '🇰🇷', 'south korea': '🇰🇷', 'costa rica': '🇨🇷',
  'croacia': '🇭🇷', 'croatia': '🇭🇷', 'dinamarca': '🇩🇰', 'denmark': '🇩🇰', 'ecuador': '🇪🇨',
  'egipto': '🇪🇬', 'egypt': '🇪🇬', 'espana': '🇪🇸', 'spain': '🇪🇸', 'estados unidos': '🇺🇸', 'usa': '🇺🇸', 'united states': '🇺🇸',
  'francia': '🇫🇷', 'france': '🇫🇷', 'alemania': '🇩🇪', 'germany': '🇩🇪', 'ghana': '🇬🇭',
  'inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'iran': '🇮🇷', 'italia': '🇮🇹', 'italy': '🇮🇹',
  'japon': '🇯🇵', 'japan': '🇯🇵', 'marruecos': '🇲🇦', 'morocco': '🇲🇦', 'mexico': '🇲🇽',
  'paises bajos': '🇳🇱', 'netherlands': '🇳🇱', 'polonia': '🇵🇱', 'poland': '🇵🇱', 'portugal': '🇵🇹',
  'qatar': '🇶🇦', 'arabia saudita': '🇸🇦', 'saudi arabia': '🇸🇦', 'senegal': '🇸🇳', 'serbia': '🇷🇸',
  'suiza': '🇨🇭', 'switzerland': '🇨🇭', 'tunez': '🇹🇳', 'tunisia': '🇹🇳', 'uruguay': '🇺🇾',
  'gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'champions league': '🏆', 'europa league': '🇪🇺', 'premier league': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'la liga': '🇪🇸', 'serie a': '🇮🇹', 'bundesliga': '🇩🇪', 'ligue 1': '🇫🇷', 'liga mx': '🇲🇽',
  'copa libertadores': '🌎', 'mundial': '🌍', 'world cup': '🌍', 'fifa': '🌍'
};

// Mapeo de equipos a países (sin tildes)
const teamToCountry = {
  'argentina': 'argentina', 'brasil': 'brasil', 'francia': 'francia', 'alemania': 'alemania',
  'espana': 'espana', 'inglaterra': 'inglaterra', 'italia': 'italia', 'portugal': 'portugal',
  'mexico': 'mexico', 'colombia': 'colombia', 'uruguay': 'uruguay', 'chile': 'chile',
  'estados unidos': 'estados unidos', 'canada': 'canada', 'japon': 'japon', 'corea del sur': 'corea del sur',
  'croacia': 'croacia', 'belgica': 'belgica', 'paises bajos': 'paises bajos', 'suiza': 'suiza',
  'dinamarca': 'dinamarca', 'serbia': 'serbia', 'polonia': 'polonia', 'gales': 'gales',
  'marruecos': 'marruecos', 'senegal': 'senegal', 'ghana': 'ghana', 'camerun': 'camerun',
  'tunez': 'tunez', 'egipto': 'egipto', 'arabia saudita': 'arabia saudita', 'iran': 'iran',
  'australia': 'australia', 'ecuador': 'ecuador', 'qatar': 'qatar', 'costa rica': 'costa rica'
};

/**
 * Normaliza el texto: quita tildes, pasa a minúsculas y limpia espacios
 */
const normalize = (text) => {
  if (!text) return '';
  return text.toString().toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .trim();
};

export const getCountryFlag = (country) => {
  const key = normalize(country);
  // Búsqueda exacta primero
  if (countryToFlag[key]) return countryToFlag[key];
  
  // Búsqueda parcial (si el país está dentro del string)
  for (const [k, v] of Object.entries(countryToFlag)) {
    if (key.includes(k)) return v;
  }
  return '🌐';
};

export const getTeamFlag = (teamName) => {
  const key = normalize(teamName);
  // Buscar si el equipo corresponde a un país
  for (const [team, countryKey] of Object.entries(teamToCountry)) {
    if (key.includes(team)) {
      return countryToFlag[countryKey] || '';
    }
  }
  return '';
};

export const getCountryOptions = () => {
  return Object.keys(countryToFlag).map(key => ({
    label: `${countryToFlag[key]} ${key}`,
    value: key
  }));
};
