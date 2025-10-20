// src/services/matchService.js
const weeklyMatches = {
  "2025-10-18": [
    {
      "id": "columbus_newyork_1810",
      "homeTeam": "Columbus Crew",
      "awayTeam": "New York Red Bulls",
      "league": "MLS",
      "time": "17:00",
      "country": "Estados Unidos",
      "popularity": 60
    },
    {
      "id": "charlotte_philadelphia_1810",
      "homeTeam": "Charlotte FC",
      "awayTeam": "Philadelphia Union",
      "league": "MLS",
      "time": "17:00",
      "country": "Estados Unidos",
      "popularity": 55
    },
    {
      "id": "cincinnati_montreal_1810",
      "homeTeam": "FC Cincinnati",
      "awayTeam": "CF Montréal",
      "league": "MLS",
      "time": "17:00",
      "country": "Estados Unidos",
      "popularity": 50
    },
    {
      "id": "atlanta_dc_1810",
      "homeTeam": "Atlanta United",
      "awayTeam": "DC United",
      "league": "MLS",
      "time": "17:00",
      "country": "Estados Unidos",
      "popularity": 65
    },
    {
      "id": "vancouver_dallas_1810",
      "homeTeam": "Vancouver Whitecaps",
      "awayTeam": "FC Dallas",
      "league": "MLS",
      "time": "20:00",
      "country": "Estados Unidos",
      "popularity": 55
    },
    {
      "id": "galaxy_orlando_1810",
      "homeTeam": "Los Angeles Galaxy",
      "awayTeam": "Orlando City Soccer Club",
      "league": "MLS",
      "time": "20:00",
      "country": "Estados Unidos",
      "popularity": 70
    },
    {
      "id": "stlouis_realsaltlake_1810",
      "homeTeam": "St. Louis City SC",
      "awayTeam": "Real Salt Lake",
      "league": "MLS",
      "time": "20:00",
      "country": "Estados Unidos",
      "popularity": 45
    }
  ],
  "2025-10-19": [
    {
      "id": "como_juventus_1910",
      "homeTeam": "Como 1907",
      "awayTeam": "Juventus",
      "league": "Serie A Italiana",
      "time": "05:30",
      "country": "Italia",
      "popularity": 80
    },
    {
      "id": "elche_athletic_1910",
      "homeTeam": "Elche",
      "awayTeam": "Athletic Club",
      "league": "La Liga EA Sports",
      "time": "07:00",
      "country": "España",
      "popularity": 60
    },
    {
      "id": "genoa_parma_1910",
      "homeTeam": "Genoa",
      "awayTeam": "Parma",
      "league": "Serie A Italiana",
      "time": "08:00",
      "country": "Italia",
      "popularity": 60
    },
    {
      "id": "tottenham_astonvilla_1910",
      "homeTeam": "Tottenham",
      "awayTeam": "Aston Villa",
      "league": "Premier League",
      "time": "08:00",
      "country": "Inglaterra",
      "popularity": 85
    },
    {
      "id": "lens_parisfc_1910",
      "homeTeam": "Lens",
      "awayTeam": "Paris FC",
      "league": "Francia Ligue 1",
      "time": "08:00",
      "country": "Francia",
      "popularity": 55
    },
    {
      "id": "cagliari_bologna_1910",
      "homeTeam": "Cagliari",
      "awayTeam": "Bologna",
      "league": "Serie A Italiana",
      "time": "08:00",
      "country": "Italia",
      "popularity": 55
    },
    {
      "id": "river_cerro_1910",
      "homeTeam": "River Plate Montevideo",
      "awayTeam": "Cerro Largo",
      "league": "Campeonato Uruguayo",
      "time": "08:30",
      "country": "Uruguay",
      "popularity": 40
    },
    {
      "id": "freiburg_frankfurt_1910",
      "homeTeam": "Freiburg",
      "awayTeam": "Eintracht Frankfurt",
      "league": "Bundesliga",
      "time": "08:30",
      "country": "Alemania",
      "popularity": 65
    },
    {
      "id": "bayern_koln_fem_1910",
      "homeTeam": "Bayern Múnich Femenino",
      "awayTeam": "FC Köln Femenino",
      "league": "Bundesliga Femenina",
      "time": "09:00",
      "country": "Alemania",
      "popularity": 25
    },
    {
      "id": "celta_realsociedad_1910",
      "homeTeam": "Celta",
      "awayTeam": "Real Sociedad",
      "league": "La Liga EA Sports",
      "time": "09:15",
      "country": "España",
      "popularity": 70
    },
    {
      "id": "heracles_feyenoord_1910",
      "homeTeam": "Heracles",
      "awayTeam": "Feyenoord",
      "league": "Eredivisie",
      "time": "09:45",
      "country": "Países Bajos",
      "popularity": 50
    },
    {
      "id": "leverkusen_wolfsburg_fem_1910",
      "homeTeam": "Bayer Leverkusen Femenino",
      "awayTeam": "Wolfsburg Femenino",
      "league": "Bundesliga Femenina",
      "time": "10:15",
      "country": "Alemania",
      "popularity": 20
    },
    {
      "id": "lorient_brest_1910",
      "homeTeam": "Lorient",
      "awayTeam": "Stade de Brestois",
      "league": "Francia Ligue 1",
      "time": "10:15",
      "country": "Francia",
      "popularity": 45
    },
    {
      "id": "toulouse_metz_1910",
      "homeTeam": "Toulouse",
      "awayTeam": "Metz",
      "league": "Francia Ligue 1",
      "time": "10:15",
      "country": "Francia",
      "popularity": 40
    },
    {
      "id": "rennes_auxerre_1910",
      "homeTeam": "Rennes",
      "awayTeam": "Auxerre",
      "league": "Francia Ligue 1",
      "time": "10:15",
      "country": "Francia",
      "popularity": 50
    },
    {
      "id": "liverpool_manutd_1910",
      "homeTeam": "Liverpool",
      "awayTeam": "Manchester United",
      "league": "Premier League",
      "time": "10:30",
      "country": "Inglaterra",
      "popularity": 95
    },
    {
      "id": "sanpauli_hoffenheim_1910",
      "homeTeam": "FC San Pauli",
      "awayTeam": "Hoffenheim",
      "league": "Bundesliga",
      "time": "10:30",
      "country": "Alemania",
      "popularity": 60
    },
    {
      "id": "atalanta_lazio_1910",
      "homeTeam": "Atalanta",
      "awayTeam": "Lazio",
      "league": "Serie A Italiana",
      "time": "11:00",
      "country": "Italia",
      "popularity": 75
    },
    {
      "id": "levante_rayo_1910",
      "homeTeam": "Levante",
      "awayTeam": "Rayo Vallecano",
      "league": "La Liga EA Sports",
      "time": "11:30",
      "country": "España",
      "popularity": 65
    },
    {
      "id": "fenerbahce_karagumruk_1910",
      "homeTeam": "Fenerbahçe",
      "awayTeam": "Fatih Karagümrük",
      "league": "Superliga Turca",
      "time": "12:00",
      "country": "Turquía",
      "popularity": 55
    },
    {
      "id": "sarmiento_velez_1910",
      "homeTeam": "Sarmiento",
      "awayTeam": "Vélez Sarsfield",
      "league": "Primera División Argentina",
      "time": "13:00",
      "country": "Argentina",
      "popularity": 50
    },
    {
      "id": "estudiantes_gimnasia_1910",
      "homeTeam": "Estudiantes La Plata",
      "awayTeam": "Gimnasia La Plata",
      "league": "Primera División Argentina",
      "time": "13:00",
      "country": "Argentina",
      "popularity": 45
    },
    {
      "id": "progreso_defensor_1910",
      "homeTeam": "Progreso",
      "awayTeam": "Defensor Sporting",
      "league": "Campeonato Uruguayo",
      "time": "13:30",
      "country": "Uruguay",
      "popularity": 35
    },
    {
      "id": "nantes_lille_1910",
      "homeTeam": "Nantes",
      "awayTeam": "Lille",
      "league": "Francia Ligue 1",
      "time": "13:45",
      "country": "Francia",
      "popularity": 60
    },
    {
      "id": "acmilan_fiorentina_1910",
      "homeTeam": "AC Milan",
      "awayTeam": "Fiorentina",
      "league": "Serie A Italiana",
      "time": "13:45",
      "country": "Italia",
      "popularity": 85
    },
    {
      "id": "getafe_realmadrid_1910",
      "homeTeam": "Getafe",
      "awayTeam": "Real Madrid",
      "league": "La Liga EA Sports",
      "time": "14:00",
      "country": "España",
      "popularity": 90
    },
    {
      "id": "sanmartin_independiente_1910",
      "homeTeam": "San Martín SJ",
      "awayTeam": "Independiente",
      "league": "Primera División Argentina",
      "time": "16:00",
      "country": "Argentina",
      "popularity": 55
    },
    {
      "id": "llaneros_oncecaldas_1910",
      "homeTeam": "Llaneros",
      "awayTeam": "Once Caldas",
      "league": "Liga BetPlay DIMAYOR",
      "time": "16:10",
      "country": "Colombia",
      "popularity": 45
    },
    {
      "id": "penarol_wanderers_1910",
      "homeTeam": "Peñarol",
      "awayTeam": "Montevideo Wanderers",
      "league": "Campeonato Uruguayo",
      "time": "16:30",
      "country": "Uruguay",
      "popularity": 50
    },
    {
      "id": "ormarso_quindio_1910",
      "homeTeam": "Orsomarso",
      "awayTeam": "Quindio",
      "league": "Torneo BetPlay DIMAYOR",
      "time": "17:00",
      "country": "Colombia",
      "popularity": 30
    },
    {
      "id": "argentina_marruecos_1910",
      "homeTeam": "Argentina",
      "awayTeam": "Marruecos",
      "league": "FIFA Mundial Sub-20 Final",
      "time": "18:00",
      "country": "Internacional",
      "popularity": 85
    },
    {
      "id": "cartagena_cucuta_1910",
      "homeTeam": "Real Cartagena",
      "awayTeam": "Cúcuta",
      "league": "Torneo BetPlay DIMAYOR",
      "time": "18:20",
      "country": "Colombia",
      "popularity": 40
    }
  ],
  "2025-10-20": [
    {
      "id": "alshorta_ittihad_2010",
      "homeTeam": "AL-Shorta CS",
      "awayTeam": "Al-Ittihad Jeddah Club",
      "league": "AFC Champions League Elite",
      "time": "11:00",
      "country": "Asia",
      "popularity": 35
    },
    {
      "id": "alahli_gharafa_2010",
      "homeTeam": "Al Ahli",
      "awayTeam": "Al Gharafa",
      "league": "AFC Champions League Elite",
      "time": "13:15",
      "country": "Asia",
      "popularity": 30
    },
    {
      "id": "cremonese_udinese_2010",
      "homeTeam": "US Cremonese",
      "awayTeam": "Udinese",
      "league": "Serie A Italiana",
      "time": "13:45",
      "country": "Italia",
      "popularity": 50
    },
    {
      "id": "tigres_bogota_2010",
      "homeTeam": "Tigres FC",
      "awayTeam": "Bogotá",
      "league": "Torneo BetPlay DIMAYOR",
      "time": "14:00",
      "country": "Colombia",
      "popularity": 40
    },
    {
      "id": "racing_juventud_2010",
      "homeTeam": "Racing Club",
      "awayTeam": "CA Juventud",
      "league": "Campeonato Uruguayo",
      "time": "14:00",
      "country": "Uruguay",
      "popularity": 45
    },
    {
      "id": "alaves_valencia_2010",
      "homeTeam": "Alavés",
      "awayTeam": "Valencia CF",
      "league": "La Liga EA Sports",
      "time": "14:00",
      "country": "España",
      "popularity": 70
    },
    {
      "id": "westham_brentford_2010",
      "homeTeam": "West Ham",
      "awayTeam": "Brentford",
      "league": "Premier League",
      "time": "14:00",
      "country": "Inglaterra",
      "popularity": 75
    },
    {
      "id": "bocajuniors_barranquilla_2010",
      "homeTeam": "Boca Juniors Cali",
      "awayTeam": "Barranquilla",
      "league": "Torneo BetPlay DIMAYOR",
      "time": "16:00",
      "country": "Colombia",
      "popularity": 45
    },
    {
      "id": "riestra_instituto_2010",
      "homeTeam": "Deportivo Riestra",
      "awayTeam": "Instituto",
      "league": "Primera División Argentina",
      "time": "17:00",
      "country": "Argentina",
      "popularity": 40
    },
    {
      "id": "plazacolonia_liverpool_2010",
      "homeTeam": "Plaza Colonia",
      "awayTeam": "Liverpool FC",
      "league": "Campeonato Uruguayo",
      "time": "17:00",
      "country": "Uruguay",
      "popularity": 35
    },
    {
      "id": "laequidad_tolima_2010",
      "homeTeam": "La Equidad",
      "awayTeam": "Deportes Tolima",
      "league": "Liga BetPlay DIMAYOR",
      "time": "18:00",
      "country": "Colombia",
      "popularity": 65
    },
    {
      "id": "internacional_realsantander_2010",
      "homeTeam": "Internacional FC Palmira",
      "awayTeam": "Real Santander",
      "league": "Torneo BetPlay DIMAYOR",
      "time": "18:00",
      "country": "Colombia",
      "popularity": 35
    },
    {
      "id": "tucuman_sanlorenzo_2010",
      "homeTeam": "Atlético Tucumán",
      "awayTeam": "San Lorenzo",
      "league": "Primera División Argentina",
      "time": "19:15",
      "country": "Argentina",
      "popularity": 60
    },
    {
      "id": "medellin_santafe_2010",
      "homeTeam": "Medellín",
      "awayTeam": "Santa Fe",
      "league": "Liga BetPlay DIMAYOR",
      "time": "20:10",
      "country": "Colombia",
      "popularity": 70
    }
  ]
};

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

// Función corregida que PRIORIZA partidos de HOY
export const prepareDailyMatches = () => {
  const { todayMatches, tomorrowMatches } = getAvailableMatches();
  
  // PRIORIDAD 1: Si hay partidos de hoy, usar SOLO partidos de hoy
  if (todayMatches.length > 0) {
    const finalMatches = todayMatches.slice(0, 7);
    // Si hay menos de 7 partidos de hoy, repetirlos para completar
    while (finalMatches.length < 7) {
      finalMatches.push(...todayMatches);
    }
    finalMatches.length = 7; // Asegurar exactamente 7 partidos
    
    const trapIds = selectTrapMatches(finalMatches);
    return finalMatches.map((match, index) => ({
      ...match,
      isTrap: trapIds.includes(match.id),
      odds: { home: 2.0, draw: 3.0, away: 3.0 },
      status: 'upcoming'
    }));
  }
  
  // PRIORIDAD 2: Solo si NO hay partidos de hoy, usar partidos de mañana
  if (tomorrowMatches.length > 0) {
    const finalMatches = tomorrowMatches.slice(0, 7);
    while (finalMatches.length < 7) {
      finalMatches.push(...tomorrowMatches);
    }
    finalMatches.length = 7;
    
    const trapIds = selectTrapMatches(finalMatches);
    return finalMatches.map((match, index) => ({
      ...match,
      isTrap: trapIds.includes(match.id),
      odds: { home: 2.0, draw: 3.0, away: 3.0 },
      status: 'upcoming'
    }));
  }
  
  // CASO EXTREMO: Si no hay partidos ni de hoy ni de mañana
  const fallbackMatches = [
    {
      id: "fallback_1",
      homeTeam: "Equipo Local",
      awayTeam: "Equipo Visitante",
      league: "Liga de Ejemplo",
      time: "20:00",
      country: "Colombia",
      popularity: 50
    }
  ];
  
  const finalMatches = Array(7).fill().map((_, i) => ({
    ...fallbackMatches[0],
    id: `fallback_${i + 1}`
  }));
  
  return finalMatches;
};

export const shouldCloseMatch = (matchTime) => {
  const now = new Date();
  const [hours, minutes] = matchTime.split(':').map(Number);
  const matchDate = new Date();
  matchDate.setHours(hours, minutes, 0, 0);
  
  const fiveMinutesBefore = new Date(matchDate.getTime() - 5 * 60000);
  
  return now >= fiveMinutesBefore;
};