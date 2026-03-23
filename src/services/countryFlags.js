// 🌍 Banderas de Países y Torneos Internacionales

// Función para obtener la bandera según el país/torneo
export const getCountryFlag = (country) => {
  const flags = {
    // 🏆 Torneos Internacionales
    'Champions League': '🏆',
    'UEFA Champions League': '🏆',
    'Copa Libertadores': '🌎',
    'Libertadores': '🌎',
    'Copa Sudamericana': '🌎',
    'Sudamericana': '🌎',
    'Europa League': '🇪🇺',
    'UEFA Europa League': '🇪🇺',
    'Mundial': '🌍',
    'FIFA World Cup': '🌍',
    'Eliminatorias': '🎫',
    'Copa América': '🏆',
    'Eurocopa': '🇪🇺',
    
    // 🌍 Países - Sudamérica
    'Colombia': '🇨🇴',
    'Argentina': '🇦🇷',
    'Brasil': '🇧🇷',
    'Chile': '🇨🇱',
    'Uruguay': '🇺🇾',
    'Paraguay': '🇵🇾',
    'Perú': '🇵🇪',
    'Ecuador': '🇪🇨',
    'Bolivia': '🇧🇴',
    'Venezuela': '🇻🇪',
    
    // 🌍 Países - Europa
    'España': '🇪🇸',
    'Inglaterra': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'England': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
    'Italia': '🇮🇹',
    'Italy': '🇮🇹',
    'Alemania': '🇩🇪',
    'Germany': '🇩🇪',
    'Francia': '🇫🇷',
    'France': '🇫🇷',
    'Portugal': '🇵🇹',
    'Países Bajos': '🇳🇱',
    'Netherlands': '🇳🇱',
    
    // 🌍 Países - Norteamérica
    'México': '🇲🇽',
    'Mexico': '🇲🇽',
    'Estados Unidos': '🇺🇸',
    'USA': '🇺🇸',
    'United States': '🇺🇸',
    'Canadá': '🇨🇦',
    'Canada': '🇨🇦',
    
    // 🌐 Genérico (fallback)
    'Internacional': '🌐',
    'International': '🌐',
    'Mundo': '🌍'
  };
  
  return flags[country] || '🌐';
};

// 📋 Lista de opciones para el selector en el formulario
export const getCountryOptions = () => {
  return [
    { value: 'Colombia', label: '🇨🇴 Colombia' },
    { value: 'Argentina', label: '🇦🇷 Argentina' },
    { value: 'Brasil', label: '🇧🇷 Brasil' },
    { value: 'Chile', label: '🇨🇱 Chile' },
    { value: 'Uruguay', label: '🇺🇾 Uruguay' },
    { value: 'España', label: '🇪🇸 España' },
    { value: 'Inglaterra', label: '🏴󠁧󠁢󠁥󠁮󠁧󠁿 Inglaterra' },
    { value: 'Italia', label: '🇮🇹 Italia' },
    { value: 'Alemania', label: '🇩🇪 Alemania' },
    { value: 'Francia', label: '🇫🇷 Francia' },
    { value: 'Portugal', label: '🇵🇹 Portugal' },
    { value: 'México', label: '🇲🇽 México' },
    { value: 'Estados Unidos', label: '🇺🇸 Estados Unidos' },
    { value: 'Champions League', label: '🏆 Champions League' },
    { value: 'Copa Libertadores', label: '🌎 Copa Libertadores' },
    { value: 'Copa Sudamericana', label: '🌎 Copa Sudamericana' },
    { value: 'Europa League', label: '🇪🇺 Europa League' },
    { value: 'Internacional', label: '🌐 Internacional' }
  ];
};