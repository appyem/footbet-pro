// Mapeo completo de países del Mundial 2026 (Sin tildes, minúsculas)
const countryToFlag = {
  // Anfitriones (CONCACAF)
  'canada': '🇨🇦', 'estados unidos': '🇺🇸', 'usa': '🇺🇸', 'united states': '🇺🇸', 'mexico': '🇲🇽',
  
  // Sudamérica (CONMEBOL)
  'argentina': '🇦🇷', 'brasil': '🇧🇷', 'brazil': '🇧🇷', 'colombia': '🇨🇴', 'uruguay': '🇺🇾', 
  'ecuador': '🇪🇨', 'paraguay': '🇵🇾',
  
  // Europa (UEFA)
  'alemania': '🇩🇪', 'germany': '🇩🇪', 'austria': '🇦🇹', 'belgica': '🇧🇪', 'belgium': '🇧🇪',
  'bosnia y herzegovina': '🇧🇦', 'croacia': '🇭🇷', 'croatia': '🇭🇷', 'escocia': '🏴󠁧󠁢󠁳󠁣󠁴󠁿', 'scotland': '🏴󠁧󠁢󠁳󠁣󠁴󠁿',
  'espana': '🇪🇸', 'spain': '🇪🇸', 'francia': '🇫🇷', 'france': '🇫🇷', 'inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'england': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'noruega': '🇳🇴', 'norway': '🇳🇴', 'paises bajos': '🇳🇱', 'netherlands': '🇳🇱', 'portugal': '🇵🇹',
  'republica checa': '🇨🇿', 'czech republic': '🇨🇿', 'suecia': '🇸🇪', 'sweden': '🇸🇪', 'suiza': '🇨🇭', 
  'switzerland': '🇨🇭', 'turquia': '🇹🇷', 'turkey': '🇹🇷',
  
  // África (CAF)
  'argelia': '🇩🇿', 'algeria': '🇩🇿', 'cabo verde': '🇨🇻', 'cape verde': '🇨🇻', 'costa de marfil': '🇨🇮',
  'ivory coast': '🇨🇮', 'egipto': '🇪🇬', 'egypt': '🇪🇬', 'ghana': '🇬🇭', 'marruecos': '🇲🇦', 'morocco': '🇲🇦',
  'republica democratica del congo': '🇨🇩', 'dr congo': '🇨🇩', 'senegal': '🇸🇳', 'sudafrica': '🇿🇦', 
  'south africa': '🇿🇦', 'tunez': '🇹🇳', 'tunisia': '🇹🇳',
  
  // Asia (AFC)
  'arabia saudita': '🇸🇦', 'saudi arabia': '🇸🇦', 'australia': '🇦🇺', 'corea del sur': '🇰🇷', 'south korea': '🇰🇷',
  'irak': '🇮🇶', 'iraq': '🇮🇶', 'iran': '🇮🇷', 'japon': '🇯🇵', 'japan': '🇯🇵', 'jordania': '🇯🇴', 'jordan': '🇯🇴',
  'qatar': '🇶🇦', 'uzbekistan': '🇺🇿',
  
  // CONCACAF (Adicionales)
  'curazao': '🇨🇼', 'curacao': '🇨🇼', 'haiti': '🇭🇹', 'panama': '🇵🇦',
  
  // Oceanía (OFC)
  'nueva zelanda': '🇳🇿', 'new zealand': '🇳🇿',
  
  // Ligas y Torneos Comunes
  'champions league': '🏆', 'europa league': '🇪🇺', 'premier league': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'la liga': '🇪🇸', 'serie a': '🇮🇹', 'bundesliga': '🇩🇪', 'ligue 1': '🇫🇷', 'liga mx': '🇲🇽',
  'copa libertadores': '🌎', 'mundial': '🌍', 'world cup': '🌍', 'fifa': '🌍', 'amistoso': '🤝'
};

// Mapeo de equipos a sus países (para mostrar bandera junto al nombre del equipo)
const teamToCountry = {
  'argentina': 'argentina', 'brasil': 'brasil', 'francia': 'francia', 'alemania': 'alemania',
  'espana': 'espana', 'inglaterra': 'inglaterra', 'italia': 'italia', 'portugal': 'portugal',
  'mexico': 'mexico', 'colombia': 'colombia', 'uruguay': 'uruguay', 'chile': 'chile',
  'estados unidos': 'estados unidos', 'canada': 'canada', 'japon': 'japon', 'corea del sur': 'corea del sur',
  'croacia': 'croacia', 'belgica': 'belgica', 'paises bajos': 'paises bajos', 'suiza': 'suiza',
  'dinamarca': 'dinamarca', 'serbia': 'serbia', 'polonia': 'polonia', 'gales': 'gales',
  'marruecos': 'marruecos', 'senegal': 'senegal', 'ghana': 'ghana', 'camerun': 'camerun',
  'tunez': 'tunez', 'egipto': 'egipto', 'arabia saudita': 'arabia saudita', 'iran': 'iran',
  'australia': 'australia', 'ecuador': 'ecuador', 'qatar': 'qatar', 'costa rica': 'costa rica',
  'noruega': 'noruega', 'suecia': 'suecia', 'turquia': 'turquia', 'escocia': 'escocia',
  'austria': 'austria', 'republica checa': 'republica checa', 'bosnia': 'bosnia y herzegovina',
  'argelia': 'argelia', 'cabo verde': 'cabo verde', 'costa de marfil': 'costa de marfil',
  'sudafrica': 'sudafrica', 'irak': 'irak', 'jordania': 'jordania', 'uzbekistan': 'uzbekistan',
  'curazao': 'curazao', 'haiti': 'haiti', 'panama': 'panama', 'nueva zelanda': 'nueva zelanda',
  'paraguay': 'paraguay'
};

/**
 * Normaliza el texto: quita tildes, pasa a minúsculas y limpia espacios
 */
const normalize = (text) => {
  if (!text || typeof text !== 'string') return '';
  return text.toLowerCase()
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "") // Quita tildes
    .trim();
};

export const getCountryFlag = (country) => {
  const key = normalize(country);
  if (!key) return '⚽'; // Default si no hay país
  
  // Búsqueda exacta primero
  if (countryToFlag[key]) return countryToFlag[key];
  
  // Búsqueda parcial (si el país está dentro del string)
  for (const [k, v] of Object.entries(countryToFlag)) {
    if (key.includes(k)) return v;
  }
  return '🌐'; // Default si no encuentra nada
};

export const getTeamFlag = (teamName) => {
  const key = normalize(teamName);
  if (!key) return '';
  
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
