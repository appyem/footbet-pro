// Mapeo de países a sus banderas (emojis)
const countryToFlag = {
  'Argentina': '🇦🇷', 'Australia': '🇦🇺', 'Austria': '🇦🇹', 'Bélgica': '🇧🇪', 'Belgium': '🇧🇪',
  'Brasil': '🇧🇷', 'Brazil': '🇧🇷', 'Camerún': '🇨🇲', 'Cameroon': '🇨🇲', 'Canadá': '🇨🇦', 'Canada': '🇨🇦',
  'Chile': '🇨🇱', 'Colombia': '🇨🇴', 'Corea del Sur': '🇰🇷', 'South Korea': '🇰🇷', 'Costa Rica': '🇨🇷',
  'Croacia': '🇭🇷', 'Croatia': '🇭🇷', 'Dinamarca': '🇩🇰', 'Denmark': '🇩🇰', 'Ecuador': '🇪🇨',
  'Egipto': '🇪🇬', 'Egypt': '🇪🇬', 'España': '🇪🇸', 'Spain': '🇪🇸', 'Estados Unidos': '🇺🇸', 'USA': '🇺🇸', 'United States': '🇺🇸',
  'Francia': '🇫🇷', 'France': '🇫🇷', 'Alemania': '🇩🇪', 'Germany': '🇩🇪', 'Ghana': '🇬🇭',
  'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿', 'Irán': '🇮🇷', 'Iran': '🇮🇷', 'Italia': '🇮🇹', 'Italy': '🇮🇹',
  'Japón': '🇯🇵', 'Japan': '🇯🇵', 'Marruecos': '🇲🇦', 'Morocco': '🇲🇦', 'México': '🇲🇽', 'Mexico': '🇲🇽',
  'Países Bajos': '🇳🇱', 'Netherlands': '🇳🇱', 'Polonia': '🇵🇱', 'Poland': '🇵🇱', 'Portugal': '🇵🇹',
  'Qatar': '🇶🇦', 'Arabia Saudita': '🇸🇦', 'Saudi Arabia': '🇸🇦', 'Senegal': '🇸🇳', 'Serbia': '🇷🇸',
  'Suiza': '🇨🇭', 'Switzerland': '🇨🇭', 'Túnez': '🇹🇳', 'Tunisia': '🇹🇳', 'Uruguay': '🇺🇾',
  'Gales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿', 'Wales': '🏴󠁧󠁢󠁷󠁬󠁳󠁿',
  'Champions League': '🏆', 'Europa League': '🇪🇺', 'Premier League': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
  'La Liga': '🇪🇸', 'Serie A': '🇮🇹', 'Bundesliga': '🇩🇪', 'Ligue 1': '🇫🇷', 'Liga MX': '🇲🇽',
  'Copa Libertadores': '🌎', 'Mundial': '🌍', 'World Cup': '🌍'
};

// Mapeo simple de equipos a países (para el mundial)
const teamToCountry = {
  'Argentina': 'Argentina', 'Brasil': 'Brasil', 'Francia': 'Francia', 'Alemania': 'Alemania',
  'España': 'España', 'Inglaterra': 'Inglaterra', 'Italia': 'Italia', 'Portugal': 'Portugal',
  'México': 'México', 'Colombia': 'Colombia', 'Uruguay': 'Uruguay', 'Chile': 'Chile',
  'Estados Unidos': 'Estados Unidos', 'Canadá': 'Canadá', 'Japón': 'Japón', 'Corea del Sur': 'Corea del Sur',
  'Croacia': 'Croacia', 'Bélgica': 'Bélgica', 'Países Bajos': 'Países Bajos', 'Suiza': 'Suiza',
  'Dinamarca': 'Dinamarca', 'Serbia': 'Serbia', 'Polonia': 'Polonia', 'Gales': 'Gales',
  'Marruecos': 'Marruecos', 'Senegal': 'Senegal', 'Ghana': 'Ghana', 'Camerún': 'Camerún',
  'Túnez': 'Túnez', 'Egipto': 'Egipto', 'Arabia Saudita': 'Arabia Saudita', 'Irán': 'Irán',
  'Australia': 'Australia', 'Ecuador': 'Ecuador', 'Qatar': 'Qatar', 'Costa Rica': 'Costa Rica'
};

export const getCountryFlag = (country) => {
  if (!country) return '🌐';
  return countryToFlag[country] || '🌐';
};

export const getTeamFlag = (teamName) => {
  if (!teamName) return '';
  // Buscar coincidencia exacta o parcial
  for (const [team, country] of Object.entries(teamToCountry)) {
    if (teamName.includes(team)) {
      return countryToFlag[country] || '';
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
