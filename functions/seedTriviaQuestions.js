/**
 * Script para poblar el banco de 200 preguntas de trivia en Firestore
 * Ejecutar UNA sola vez: node seedTriviaQuestions.js
 * 
 * NO requiere APIs externas - las preguntas están incluidas en el archivo
 */

const admin = require('firebase-admin');

// 🔥 Inicializar Firebase Admin
const serviceAccount = require('./serviceAccountKey.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});
const db = admin.firestore();

// ═══════════════════════════════════════════════════════════════
// 📊 BANCO DE 200 PREGUNTAS DE TRIVIA
// ═══════════════════════════════════════════════════════════════

const preguntas = [
  // ═══════════════════════════════════════════════════════════════
  // 🌍 FÚTBOL MUNDIAL - DIFICULTAD 1 (FÁCIL) - 20 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Qué país ganó el Mundial de Fútbol 2022 en Qatar?", options: ["Francia", "Argentina", "Brasil", "Croacia"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿En qué país se jugó el Mundial 2014?", options: ["Sudáfrica", "Rusia", "Brasil", "Alemania"], correctAnswer: 2, category: "mundial", difficulty: 1 },
  { question: "¿Quién es el máximo goleador histórico de los Mundiales?", options: ["Pelé", "Miroslav Klose", "Ronaldo Nazário", "Gerd Müller"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Qué selección ha ganado más Mundiales?", options: ["Alemania", "Italia", "Argentina", "Brasil"], correctAnswer: 3, category: "mundial", difficulty: 1 },
  { question: "¿En qué año se jugó el primer Mundial de Fútbol?", options: ["1928", "1930", "1934", "1926"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Qué país organizó el Mundial 2018?", options: ["Qatar", "Brasil", "Rusia", "Sudáfrica"], correctAnswer: 2, category: "mundial", difficulty: 1 },
  { question: "¿Quién ganó el Balón de Oro del Mundial 2022?", options: ["Kylian Mbappé", "Lionel Messi", "Luka Modric", "Julián Álvarez"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Cuántos jugadores tiene cada equipo en el campo?", options: ["10", "11", "12", "9"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿De qué color es la tarjeta que expulsa a un jugador?", options: ["Amarilla", "Azul", "Roja", "Verde"], correctAnswer: 2, category: "mundial", difficulty: 1 },
  { question: "¿Cuánto dura un partido de fútbol reglamentario?", options: ["80 minutos", "90 minutos", "100 minutos", "120 minutos"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Qué país ganó el Mundial 2010 en Sudáfrica?", options: ["Holanda", "España", "Alemania", "Brasil"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Quién es conocido como 'La Pulga'?", options: ["Cristiano Ronaldo", "Neymar", "Lionel Messi", "Andrés Iniesta"], correctAnswer: 2, category: "mundial", difficulty: 1 },
  { question: "¿En qué Mundial Italia ganó su último título?", options: ["2002", "2006", "2010", "1998"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Qué selección ganó la Eurocopa 2020 (jugada en 2021)?", options: ["Inglaterra", "España", "Italia", "Francia"], correctAnswer: 2, category: "mundial", difficulty: 1 },
  { question: "¿Cuántos Mundiales ha ganado Alemania?", options: ["3", "4", "5", "2"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Quién es el máximo goleador de la historia del fútbol?", options: ["Pelé", "Cristiano Ronaldo", "Lionel Messi", "Romário"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿En qué país se jugó el Mundial 2006?", options: ["Francia", "Alemania", "Italia", "Corea/Japón"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Qué jugador es conocido como 'CR7'?", options: ["Cristiano Ronaldo", "Ronaldinho", "Roberto Carlos", "Raúl"], correctAnswer: 0, category: "mundial", difficulty: 1 },
  { question: "¿Cuántos mundiales ha ganado Argentina (hasta 2022)?", options: ["2", "3", "4", "1"], correctAnswer: 1, category: "mundial", difficulty: 1 },
  { question: "¿Qué país ganó el primer Mundial de la historia?", options: ["Brasil", "Argentina", "Uruguay", "Italia"], correctAnswer: 2, category: "mundial", difficulty: 1 },

  // ═══════════════════════════════════════════════════════════════
  // 🌍 FÚTBOL MUNDIAL - DIFICULTAD 2 (MEDIO) - 30 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Quién marcó el 'Gol del Siglo' en el Mundial 1986?", options: ["Pelé", "Diego Maradona", "Michel Platini", "Gary Lineker"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿En qué año Brasil ganó su último Mundial?", options: ["1994", "2002", "2006", "1998"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué jugador marcó el gol con la 'Mano de Dios'?", options: ["Pelé", "Diego Maradona", "Jorge Valdano", "Claudio Caniggia"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Cuál es el resultado más abultado en un Mundial?", options: ["Alemania 7-1 Brasil", "Hungría 10-1 El Salvador", "Australia 31-0 Samoa", "Alemania 8-0 Arabia Saudita"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué país organizó el Mundial 1994?", options: ["Italia", "Estados Unidos", "México", "Francia"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Quién fue el portero titular de España en el Mundial 2010?", options: ["Víctor Valdés", "Iker Casillas", "Pepe Reina", "David de Gea"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué selección fue eliminada en fase de grupos en el Mundial 2014 siendo favorita?", options: ["Italia", "España", "Inglaterra", "Portugal"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿En qué año Alemania goleó 7-1 a Brasil?", options: ["2010", "2014", "2018", "2006"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué jugador marcó el gol de la final del Mundial 2010?", options: ["David Villa", "Andrés Iniesta", "Xavi Hernández", "Fernando Torres"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Cuál fue el marcador de la final del Mundial 2018?", options: ["Francia 4-2 Croacia", "Francia 2-1 Croacia", "Francia 3-1 Croacia", "Francia 2-0 Croacia"], correctAnswer: 0, category: "mundial", difficulty: 2 },
  { question: "¿Quién ganó el Botín de Oro del Mundial 2018?", options: ["Antoine Griezmann", "Kylian Mbappé", "Harry Kane", "Luka Modric"], correctAnswer: 2, category: "mundial", difficulty: 2 },
  { question: "¿En qué Mundial se introdujo el VAR por primera vez?", options: ["2014", "2018", "2022", "2010"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué país organizó el Mundial 1982?", options: ["Argentina", "España", "Italia", "México"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Quién fue el entrenador de España en el Mundial 2010?", options: ["Luis Aragonés", "Vicente del Bosque", "Luis Enrique", "Javier Clemente"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué selección ganó la Copa América 2021?", options: ["Brasil", "Argentina", "Uruguay", "Colombia"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿En qué año Italia ganó su cuarto Mundial?", options: ["1982", "2006", "1994", "1990"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué jugador marcó el gol de la final del Mundial 2022 en el minuto 108?", options: ["Kylian Mbappé", "Lionel Messi", "Ángel Di María", "Enzo Fernández"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Cuál fue el resultado de la final del Mundial 2022?", options: ["Argentina 3-3 Francia (4-2 pen)", "Argentina 2-1 Francia", "Argentina 4-2 Francia", "Argentina 3-2 Francia"], correctAnswer: 0, category: "mundial", difficulty: 2 },
  { question: "¿Qué portero ganó el Guante de Oro del Mundial 2022?", options: ["Hugo Lloris", "Emiliano Martínez", "Dominik Livakovic", "Yassine Bounou"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿En qué año se jugó el Mundial 'Maracanazo'?", options: ["1946", "1950", "1954", "1958"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué país ganó el Mundial 1998?", options: ["Brasil", "Francia", "Italia", "Holanda"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Quién marcó los 2 goles de Francia en la final de 1998?", options: ["Thierry Henry", "Zinedine Zidane", "David Trezeguet", "Emmanuel Petit"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué país fue sede del Mundial 2002?", options: ["Japón", "Corea del Sur", "China", "Corea del Sur y Japón"], correctAnswer: 3, category: "mundial", difficulty: 2 },
  { question: "¿Quién ganó el Mundial 2002?", options: ["Alemania", "Brasil", "Italia", "Inglaterra"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Cuántos goles marcó Ronaldo Nazário en el Mundial 2002?", options: ["6", "8", "10", "4"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Qué país organizó el Mundial 1970?", options: ["Brasil", "México", "Argentina", "Chile"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Quién ganó el Mundial 1970?", options: ["Brasil", "Italia", "Alemania", "Uruguay"], correctAnswer: 0, category: "mundial", difficulty: 2 },
  { question: "¿Qué jugador es considerado el 'Rey del Fútbol'?", options: ["Maradona", "Pelé", "Cruyff", "Beckenbauer"], correctAnswer: 1, category: "mundial", difficulty: 2 },
  { question: "¿Cuántos Mundiales ganó Pelé?", options: ["1", "2", "3", "4"], correctAnswer: 2, category: "mundial", difficulty: 2 },
  { question: "¿En qué año Alemania ganó su primer Mundial después de la reunificación?", options: ["1990", "1994", "2002", "2006"], correctAnswer: 0, category: "mundial", difficulty: 2 },

  // ═══════════════════════════════════════════════════════════════
  // 🌍 FÚTBOL MUNDIAL - DIFICULTAD 3 (DIFÍCIL) - 30 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Quién marcó el gol de la victoria de Alemania en la final del Mundial 2014?", options: ["Thomas Müller", "Mario Götze", "Miroslav Klose", "Bastian Schweinsteiger"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué país quedó cuarto en el Mundial 2018?", options: ["Bélgica", "Croacia", "Inglaterra", "Rusia"], correctAnswer: 2, category: "mundial", difficulty: 3 },
  { question: "¿En qué Mundial Just Fontaine marcó 13 goles?", options: ["1954", "1958", "1962", "1966"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué selección eliminó a Brasil en cuartos del Mundial 2022?", options: ["Argentina", "Croacia", "Francia", "Alemania"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Quién fue el primer africano en marcar un hat-trick en un Mundial?", options: ["Samuel Eto'o", "Roger Milla", "Asamoah Gyan", "Ninguno hasta 2022"], correctAnswer: 3, category: "mundial", difficulty: 3 },
  { question: "¿En qué año se introdujo la regla del gol de oro?", options: ["1994", "1998", "2002", "1996"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué país organizó el Mundial 1962?", options: ["Brasil", "Chile", "Argentina", "Perú"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Quién ganó el Mundial 1962?", options: ["Brasil", "Chile", "Checoslovaquia", "Argentina"], correctAnswer: 0, category: "mundial", difficulty: 3 },
  { question: "¿Qué jugador recibió la primera tarjeta roja directa en una final del Mundial?", options: ["Zinedine Zidane", "Jesper Blomqvist", "Pedro Monzón", "Marcel Desailly"], correctAnswer: 0, category: "mundial", difficulty: 3 },
  { question: "¿En qué año Zidane recibió la tarjeta roja en la final?", options: ["1998", "2002", "2006", "2010"], correctAnswer: 2, category: "mundial", difficulty: 3 },
  { question: "¿Qué selección fue campeona del Mundial 1966?", options: ["Alemania", "Inglaterra", "Portugal", "Argentina"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Quién marcó el gol polémico de Inglaterra en la final de 1966?", options: ["Bobby Charlton", "Geoff Hurst", "Bobby Moore", "Martin Peters"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿En qué año se jugó el Mundial 'de la mano de Dios'?", options: ["1982", "1986", "1990", "1994"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué país organizó el Mundial 1986?", options: ["Colombia", "México", "Argentina", "Brasil"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Quién ganó el Mundial 1986?", options: ["Alemania", "Argentina", "Francia", "Brasil"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué portero fue expulsado en la final del Mundial 2006?", options: ["Gianluigi Buffon", "Fabien Barthez", "Ricardo Pereira", "Jens Lehmann"], correctAnswer: 0, category: "mundial", difficulty: 3 },
  { question: "¿En qué año Corea del Sur llegó a semifinales de un Mundial?", options: ["1998", "2002", "2006", "2010"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué país fue el 'milagro de Berna' en 1954?", options: ["Hungría", "Alemania", "Austria", "Suiza"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Quién ganó el Mundial 1954?", options: ["Hungría", "Alemania", "Uruguay", "Austria"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué país organizó el Mundial 1930?", options: ["Brasil", "Argentina", "Uruguay", "Chile"], correctAnswer: 2, category: "mundial", difficulty: 3 },
  { question: "¿Quién marcó el gol de la victoria en la final de 1930?", options: ["Héctor Castro", "Guillermo Stábile", "Pedro Cea", "Santos Iriarte"], correctAnswer: 0, category: "mundial", difficulty: 3 },
  { question: "¿Qué país ganó el Mundial 1978?", options: ["Brasil", "Holanda", "Argentina", "Alemania"], correctAnswer: 2, category: "mundial", difficulty: 3 },
  { question: "¿En qué ciudad se jugó la final del Mundial 1978?", options: ["Córdoba", "Buenos Aires", "Rosario", "Mendoza"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué jugador marcó 2 goles en la final de 1978?", options: ["Maradona", "Kempes", "Bertoni", "Luque"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué selección ganó el Mundial 1990?", options: ["Argentina", "Alemania", "Italia", "Inglaterra"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Quién marcó el único gol de la final de 1990?", options: ["Lothar Matthäus", "Andreas Brehme", "Jürgen Klinsmann", "Rudi Völler"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿En qué año se jugó el Mundial de Italia 90?", options: ["1986", "1990", "1994", "1998"], correctAnswer: 1, category: "mundial", difficulty: 3 },
  { question: "¿Qué país quedó subcampeón del Mundial 2010?", options: ["Alemania", "Uruguay", "Holanda", "España"], correctAnswer: 2, category: "mundial", difficulty: 3 },
  { question: "¿Quién marcó el gol de la victoria de España en la final de 2010?", options: ["David Villa", "Xavi", "Iniesta", "Torres"], correctAnswer: 2, category: "mundial", difficulty: 3 },
  { question: "¿Qué país organizó el Mundial 1974?", options: ["Alemania", "Holanda", "Bélgica", "Suecia"], correctAnswer: 0, category: "mundial", difficulty: 3 },

  // ═══════════════════════════════════════════════════════════════
  // 🌍 FÚTBOL MUNDIAL - DIFICULTAD 4 (MUY DIFÍCIL) - 20 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Qué jugador marcó el primer gol en la historia de los Mundiales?", options: ["Guillermo Stábile", "Héctor Castro", "Lucien Laurent", "Pedro Cea"], correctAnswer: 2, category: "mundial", difficulty: 4 },
  { question: "¿En qué año se jugó el Mundial de Francia 1998?", options: ["1996", "1998", "2000", "1997"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Qué selección tiene el récord de más Mundiales jugados sin ganar?", options: ["México", "Bélgica", "Escocia", "Paraguay"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿Quién fue el entrenador de Brasil en el 7-1 contra Alemania?", options: ["Felipão", "Dunga", "Tite", "Zagallo"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿Qué jugador anotó el gol 2500 en la historia de los Mundiales?", options: ["Miroslav Klose", "Ronaldo", "Samuel Eto'o", "No se sabe con exactitud"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿En qué Mundial Oleg Salenko marcó 5 goles en un solo partido?", options: ["1990", "1994", "1998", "2002"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Qué selección era rival de Rusia cuando Salenko marcó 5 goles?", options: ["Suecia", "Camerún", "Brasil", "Nigeria"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Quién fue el portero titular de Brasil en el Mundial 1950?", options: ["Barbosa", "Gilmar", "Manga", "Castilho"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿Qué país organizó el Mundial 1934?", options: ["Francia", "Italia", "Austria", "Suiza"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Quién ganó el Mundial 1934?", options: ["Checoslovaquia", "Italia", "Alemania", "Austria"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Qué país organizó el Mundial 1938?", options: ["Italia", "Francia", "Brasil", "Alemania"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Quién ganó el Mundial 1938?", options: ["Brasil", "Hungría", "Italia", "Alemania"], correctAnswer: 2, category: "mundial", difficulty: 4 },
  { question: "¿Qué jugador marcó en las finales de 3 Mundiales diferentes?", options: ["Pelé", "Vavá", "Ronaldo", "Ninguno"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿En qué año se introdujo la regla de los 3 cambios?", options: ["1970", "1986", "1994", "1998"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Qué selección fue la primera no europea/sudamericana en llegar a cuartos?", options: ["Estados Unidos", "Corea del Sur", "Senegal", "Ghana"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿En qué Mundial Estados Unidos llegó a semifinales?", options: ["1930", "1950", "1994", "2002"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿Quién fue el goleador del Mundial 1930?", options: ["Guillermo Stábile", "Pedro Cea", "Héctor Castro", "Bert Patenaude"], correctAnswer: 0, category: "mundial", difficulty: 4 },
  { question: "¿Qué país fue sede del Mundial 1966?", options: ["Escocia", "Inglaterra", "Gales", "Irlanda"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Quién fue el capitán de Inglaterra en el Mundial 1966?", options: ["Bobby Charlton", "Bobby Moore", "Geoff Hurst", "Gordon Banks"], correctAnswer: 1, category: "mundial", difficulty: 4 },
  { question: "¿Qué selección ganó el Mundial 1958?", options: ["Suecia", "Brasil", "Alemania", "Francia"], correctAnswer: 1, category: "mundial", difficulty: 4 },

  // ═══════════════════════════════════════════════════════════════
  // 🇨🇴 FÚTBOL COLOMBIANO - DIFICULTAD 1 (FÁCIL) - 20 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Cuál es el equipo más popular de Colombia?", options: ["América de Cali", "Millonarios", "Atlético Nacional", "Santa Fe"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Qué equipo colombiano ganó la Copa Libertadores 2016?", options: ["Santa Fe", "Independiente Medellín", "Atlético Nacional", "Junior"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Quién es el máximo goleador de la Selección Colombia?", options: ["Carlos Valderrama", "Radamel Falcao", "James Rodríguez", "Fredy Rincón"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿En qué año Colombia clasificó por primera vez a un Mundial?", options: ["1962", "1990", "1994", "1998"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿Qué equipo colombiano ganó la Libertadores 1989?", options: ["América de Cali", "Millonarios", "Atlético Nacional", "Independiente Medellín"], correctAnswer: 0, category: "colombiano", difficulty: 1 },
  { question: "¿Quién es conocido como 'El Pibe' en Colombia?", options: ["Carlos Valderrama", "Andrés Escobar", "Antony de Ávila", "Adolfo Valencia"], correctAnswer: 0, category: "colombiano", difficulty: 1 },
  { question: "¿De qué ciudad es el equipo Millonarios?", options: ["Cali", "Medellín", "Bogotá", "Barranquilla"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿De qué ciudad es el equipo Atlético Nacional?", options: ["Bogotá", "Cali", "Medellín", "Bucaramanga"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Qué selección eliminó a Colombia en octavos del Mundial 2014?", options: ["Brasil", "Francia", "Alemania", "Holanda"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿Quién ganó el Botín de Oro del Mundial 2014?", options: ["Neymar", "Thomas Müller", "James Rodríguez", "Karim Benzema"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Cuántos goles marcó James en el Mundial 2014?", options: ["4", "5", "6", "7"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Qué equipo colombiano es conocido como 'El Equipo del Pueblo'?", options: ["Millonarios", "Santa Fe", "América de Cali", "Junior"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿De qué ciudad es el equipo América de Cali?", options: ["Bogotá", "Medellín", "Cali", "Pereira"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Qué equipo colombiano ganó la Copa Sudamericana 2017?", options: ["Atlético Nacional", "Junior", "Independiente Santa Fe", "Deportivo Cali"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿Quién fue el entrenador de Colombia en el Mundial 2014?", options: ["Hernán Darío Gómez", "Francisco Maturana", "José Pekerman", "Reinaldo Rueda"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿Qué equipo colombiano tiene más títulos de liga?", options: ["Millonarios", "Atlético Nacional", "América de Cali", "Santa Fe"], correctAnswer: 2, category: "colombiano", difficulty: 1 },
  { question: "¿En qué año Colombia ganó la Copa América?", options: ["2001", "2004", "2007", "2011"], correctAnswer: 0, category: "colombiano", difficulty: 1 },
  { question: "¿Dónde se jugó la final de la Copa América 2001 que ganó Colombia?", options: ["Bogotá", "Barranquilla", "Medellín", "Cali"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿Quién marcó el gol de la victoria de Colombia sobre Argentina en 1993?", options: ["Valderrama", "Rincón", "Asprilla", "De Ávila"], correctAnswer: 1, category: "colombiano", difficulty: 1 },
  { question: "¿Cuál fue el resultado del famoso Colombia 5-0 Argentina en 1993?", options: ["5-0", "4-0", "5-1", "3-0"], correctAnswer: 0, category: "colombiano", difficulty: 1 },

  // ═══════════════════════════════════════════════════════════════
  // 🇨🇴 FÚTBOL COLOMBIANO - DIFICULTAD 2 (MEDIO) - 30 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Qué equipo colombiano ganó la Libertadores 2016?", options: ["Santa Fe", "Atlético Nacional", "Junior", "Medellín"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Contra qué equipo ganó Atlético Nacional la final de la Libertadores 2016?", options: ["Boca Juniors", "Independiente del Valle", "River Plate", "América"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Quién fue el goleador de Atlético Nacional en la Libertadores 2016?", options: ["Dayro Moreno", "Miguel Borja", "Orlando Berrio", "Alejandro Bernal"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Qué tragedia marcó a Atlético Nacional en 2016?", options: ["Descenso", "Accidente de Chapecoense", "Pérdida de final", "Descalificación"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo colombiano ganó la Libertadores 1995?", options: ["América de Cali", "Atlético Nacional", "Once Caldas", "Junior"], correctAnswer: 2, category: "colombiano", difficulty: 2 },
  { question: "¿Contra qué equipo ganó Once Caldas la final de la Libertadores 2004?", options: ["Boca Juniors", "São Paulo", "River Plate", "Santos"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Quién fue el entrenador de Once Caldas en 2004?", options: ["Luis Fernando Montoya", "Francisco Maturana", "Reinaldo Rueda", "Hernán Darío Gómez"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Qué jugador colombiano ganó la Champions League con el Liverpool?", options: ["James Rodríguez", "Radamel Falcao", "Luis Díaz", "Juan Guillermo Cuadrado"], correctAnswer: 2, category: "colombiano", difficulty: 2 },
  { question: "¿En qué año Luis Díaz ganó la Champions League?", options: ["2019", "2021", "2022", "2023"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo colombiano descendió por primera vez en su historia en 2011?", options: ["América de Cali", "Millonarios", "Santa Fe", "Deportivo Cali"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿En qué año América de Cali descendió?", options: ["2010", "2011", "2012", "2009"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo colombiano ganó la Copa Merconorte 1998?", options: ["Millonarios", "Atlético Nacional", "Santa Fe", "América de Cali"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Quién fue el goleador del Mundial 2014?", options: ["Neymar", "Thomas Müller", "James Rodríguez", "Van Persie"], correctAnswer: 2, category: "colombiano", difficulty: 2 },
  { question: "¿Contra quién marcó James el gol de chilena en el Mundial 2014?", options: ["Grecia", "Costa de Marfil", "Japón", "Uruguay"], correctAnswer: 3, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo colombiano llegó a la final de la Libertadores 1996?", options: ["América de Cali", "Millonarios", "Atlético Nacional", "Junior"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Contra quién perdió América la final de la Libertadores 1996?", options: ["River Plate", "Boca Juniors", "Grêmio", "Vélez"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Qué jugador colombiano jugó en el Real Madrid entre 2014 y 2017?", options: ["Radamel Falcao", "James Rodríguez", "Juan Cuadrado", "Carlos Bacca"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿En qué equipo debutó profesionalmente Radamel Falcao?", options: ["River Plate", "Lancieri", "Boca Juniors", "Porto"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo colombiano ganó la Recopa Sudamericana 2017?", options: ["Atlético Nacional", "Santa Fe", "Junior", "Medellín"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Quién fue el técnico de Colombia en el Mundial 1990?", options: ["Francisco Maturana", "Hernán Darío Gómez", "Luis Augusto Chiqui García", "Pacho Maturana"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Hasta qué ronda llegó Colombia en el Mundial 1990?", options: ["Fase de grupos", "Octavos", "Cuartos", "Semifinal"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo eliminó a Colombia en octavos del Mundial 1990?", options: ["Camerún", "Alemania", "Italia", "Checoslovaquia"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Quién marcó el gol en propia puerta que eliminó a Colombia en 1990?", options: ["Carlos Valderrama", "Andrés Escobar", "Leonel Álvarez", "Luis Carlos Perea"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Qué jugador colombiano fue asesinado tras el Mundial 1994?", options: ["Carlos Valderrama", "Andrés Escobar", "Freddy Rincón", "Antony de Ávila"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿En qué año Colombia participó en el Mundial 1994?", options: ["1990", "1994", "1998", "2002"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Quién fue el entrenador de Colombia en el Mundial 1994?", options: ["Francisco Maturana", "Hernán Darío Gómez", "Luis Augusto Chiqui García", "Reinaldo Rueda"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Contra qué equipo Colombia hizo el famoso 5-0 en 1993?", options: ["Brasil", "Argentina", "Uruguay", "Paraguay"], correctAnswer: 1, category: "colombiano", difficulty: 2 },
  { question: "¿Dónde se jugó el Colombia 5-0 Argentina de 1993?", options: ["Bogotá", "Buenos Aires", "Barranquilla", "Medellín"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Qué equipo colombiano ganó la Copa Simón Bolívar 1975?", options: ["Millonarios", "Santa Fe", "Atlético Nacional", "América de Cali"], correctAnswer: 0, category: "colombiano", difficulty: 2 },
  { question: "¿Quién es el máximo ídolo de Millonarios?", options: ["Alfredo Di Stéfano", "Arnoldo Iguarán", "Willington Ortiz", "Antony de Ávila"], correctAnswer: 0, category: "colombiano", difficulty: 2 },

  // ═══════════════════════════════════════════════════════════════
  // 🇨🇴 FÚTBOL COLOMBIANO - DIFICULTAD 3 (DIFÍCIL) - 30 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿Cuántas Copas Libertadores ha ganado Atlético Nacional?", options: ["1", "2", "3", "4"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿En qué año Atlético Nacional ganó su primera Libertadores?", options: ["1989", "1995", "2016", "2004"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Contra qué equipo ganó Nacional la Libertadores 1989?", options: ["Olimpia", "Boca Juniors", "River Plate", "Emelec"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Quién fue el técnico de Nacional en la Libertadores 1989?", options: ["Hernán Darío Gómez", "Francisco Maturana", "Luis Augusto García", "Juan José Peláez"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Cuántas Copas Libertadores ha ganado América de Cali?", options: ["0", "1", "2", "3"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Cuántas finales de Libertadores perdió América de Cali?", options: ["2", "3", "4", "5"], correctAnswer: 2, category: "colombiano", difficulty: 3 },
  { question: "¿Qué jugador colombiano ganó la Libertadores con Boca Juniors en 2000?", options: ["Mauricio Serna", "Jorge Bermúdez", "Oscar Córdoba", "Todos los anteriores"], correctAnswer: 3, category: "colombiano", difficulty: 3 },
  { question: "¿Quién fue el portero de Boca en la final de la Libertadores 2000?", options: ["Oscar Córdoba", "Roberto Abbondanzieri", "Sebastián Saja", "Pablo Cavallero"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Qué equipo colombiano llegó a la final de la Libertadores 1980?", options: ["América de Cali", "Millonarios", "Deportivo Cali", "Atlético Nacional"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Contra quién perdió América la final de 1980?", options: ["Nacional", "Olimpia", "Peñarol", "Boca Juniors"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Quién marcó el gol del empate de Colombia vs Brasil en 1993 (Barranquilla 2-1)?", options: ["Valderrama", "Rincón", "Asprilla", "De Ávila"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Qué equipo colombiano ganó la Copa CONMEBOL 1999?", options: ["América de Cali", "Millonarios", "Once Caldas", "Atlético Nacional"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Qué jugador colombiano fue el primer fichaje millonario del fútbol europeo?", options: ["Carlos Valderrama", "Freddy Rincón", "Antony de Ávila", "Adolfo Valencia"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿En qué equipo europeo debutó Freddy Rincón?", options: ["Real Madrid", "Napoli", "Barcelona", "Juventus"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿En qué año Freddy Rincón fichó por el Real Madrid?", options: ["1993", "1995", "1997", "1999"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Qué equipo colombiano ganó la Copa Interamericana 1990?", options: ["Atlético Nacional", "América de Cali", "Millonarios", "Ninguno"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Contra qué equipo mexicano ganó Nacional la Interamericana 1990?", options: ["América", "Pumas", "Guadalajara", "Cruz Azul"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Cuántos goles marcó Radamel Falcao con la Selección Colombia?", options: ["25", "28", "30", "36"], correctAnswer: 2, category: "colombiano", difficulty: 3 },
  { question: "¿En qué equipo europeo Falcao ganó la Europa League 2012?", options: ["Porto", "Atlético de Madrid", "Monaco", "Chelsea"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Qué equipo colombiano ganó la Copa Sudamericana 2023?", options: ["Atlético Nacional", "Medellín", "América de Cali", "Ningún colombiano"], correctAnswer: 3, category: "colombiano", difficulty: 3 },
  { question: "¿Quién ganó la Copa Sudamericana 2023?", options: ["Ldu Quito", "São Paulo", "Fortaleza", "Racing"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Qué equipo colombiano ganó la Sudamericana 2010?", options: ["Independiente Medellín", "Junior", "Ninguno", "La Equidad"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Contra qué argentino ganó Medellín la Sudamericana 2010?", options: ["Independiente", "Newell's", "Estudiantes", "Godoy Cruz"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Qué jugador colombiano ganó el Balón de Oro Sudamericano en 1993?", options: ["Carlos Valderrama", "Freddy Rincón", "Adolfo Valencia", "Antony de Ávila"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿En qué año Colombia ganó la Copa América?", options: ["1999", "2001", "2004", "2007"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Contra quién ganó Colombia la final de la Copa América 2001?", options: ["Brasil", "Argentina", "México", "Honduras"], correctAnswer: 2, category: "colombiano", difficulty: 3 },
  { question: "¿Quién marcó el gol de la final de la Copa América 2001?", options: ["Iván Córdoba", "Freddy Rincón", "Víctor Aristizábal", "Giovanni Hernández"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Qué equipo colombiano ganó la Copa Simón Bolívar 1971?", options: ["Santa Fe", "Millonarios", "América", "Nacional"], correctAnswer: 0, category: "colombiano", difficulty: 3 },
  { question: "¿Quién fue el goleador histórico de la Selección Colombia antes de Falcao?", options: ["Carlos Valderrama", "Freddy Rincón", "Adolfo Valencia", "Antony de Ávila"], correctAnswer: 1, category: "colombiano", difficulty: 3 },
  { question: "¿Cuántos goles marcó Freddy Rincón con la Selección?", options: ["20", "24", "27", "30"], correctAnswer: 1, category: "colombiano", difficulty: 3 },

  // ═══════════════════════════════════════════════════════════════
  // 🇨🇴 FÚTBOL COLOMBIANO - DIFICULTAD 4 (MUY DIFÍCIL) - 20 preguntas
  // ═══════════════════════════════════════════════════════════════
  { question: "¿En qué año se fundó Atlético Nacional?", options: ["1945", "1947", "1950", "1942"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿En qué año se fundó Millonarios?", options: ["1942", "1946", "1950", "1938"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿En qué año se fundó América de Cali?", options: ["1927", "1938", "1942", "1948"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿En qué año se fundó Independiente Santa Fe?", options: ["1939", "1941", "1945", "1948"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿Quién fue el primer goleador del fútbol profesional colombiano en 1948?", options: ["Alfredo Castillo", "Adolfo Pedernera", "Alfredo Di Stéfano", "Fermín Lecea"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿En qué año inició el fútbol profesional en Colombia?", options: ["1945", "1948", "1950", "1951"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿Qué jugador colombiano anotó el primer gol en el fútbol profesional colombiano?", options: ["Carlos Gambetta", "Alfredo Castillo", "Fermín Lecea", "Adolfo Pedernera"], correctAnswer: 2, category: "colombiano", difficulty: 4 },
  { question: "¿Cuántos títulos de liga tiene Millonarios?", options: ["14", "15", "16", "17"], correctAnswer: 2, category: "colombiano", difficulty: 4 },
  { question: "¿Cuántos títulos de liga tiene Santa Fe?", options: ["8", "9", "10", "11"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿Cuántos títulos de liga tiene Junior?", options: ["9", "10", "11", "12"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿Qué equipo colombiano ganó 4 ligas consecutivas entre 2013 y 2015?", options: ["Nacional", "Santa Fe", "América", "Junior"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿Quién fue el técnico de Nacional en el tetracampeonato 2013-2015?", options: ["Juan Carlos Osorio", "Reinaldo Rueda", "Paulo Autuori", "Hernán Torres"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿En qué año Colombia ganó su primer partido en un Mundial?", options: ["1962", "1990", "1994", "1998"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿Contra quién ganó Colombia su primer partido en un Mundial (1990)?", options: ["Emiratos Árabes", "Yugoslavia", "Alemania", "Camerún"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿Quién marcó el primer gol de Colombia en un Mundial?", options: ["Carlos Valderrama", "Bernardo Redín", "Freddy Rincón", "Luis Carlos Perea"], correctAnswer: 1, category: "colombiano", difficulty: 4 },
  { question: "¿Qué equipo colombiano descendió en 2007?", options: ["Cúcuta", "Envigado", "Real Cartagena", "Ninguno"], correctAnswer: 2, category: "colombiano", difficulty: 4 },
  { question: "¿Qué jugador colombiano marcó el gol más rápido en un Mundial?", options: ["James Rodríguez", "Adolfo Valencia", "Freddy Rincón", "Dagoberto Curubetá"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿En cuántos segundos marcó James el gol más rápido de Colombia en Mundiales?", options: ["60 segundos", "90 segundos", "120 segundos", "150 segundos"], correctAnswer: 0, category: "colombiano", difficulty: 4 },
  { question: "¿Qué equipo colombiano llegó a semifinales de la Copa Merconorte 2001?", options: ["Millonarios", "Atlético Nacional", "América", "Todos"], correctAnswer: 3, category: "colombiano", difficulty: 4 },
  { question: "¿Quién ganó la Copa Merconorte 2001?", options: ["Millonarios", "Atlético Nacional", "Emelec", "América"], correctAnswer: 0, category: "colombiano", difficulty: 4 }
];

// ═══════════════════════════════════════════════════════════════
// 🚀 FUNCIÓN PRINCIPAL: IMPORTAR A FIRESTORE
// ═══════════════════════════════════════════════════════════════

async function main() {
  console.log('🎯 Iniciando importación del banco de preguntas...');
  console.log(`📊 Total de preguntas a importar: ${preguntas.length}`);
  console.log('');
  
  // Validar preguntas
  const preguntasValidas = [];
  for (let i = 0; i < preguntas.length; i++) {
    const p = preguntas[i];
    if (p.question && Array.isArray(p.options) && p.options.length === 4 && 
        typeof p.correctAnswer === 'number' && p.correctAnswer >= 0 && p.correctAnswer <= 3 &&
        p.category && p.difficulty >= 1 && p.difficulty <= 4) {
      preguntasValidas.push({
        ...p,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        validated: true
      });
    } else {
      console.log(`❌ Pregunta ${i + 1} inválida:`, p.question);
    }
  }
  
  console.log(`✅ ${preguntasValidas.length} preguntas válidas de ${preguntas.length}`);
  console.log('');
  
  // Importar en lotes de 400 (máximo de Firestore)
  const batchSize = 400;
  let totalGuardadas = 0;
  
  for (let i = 0; i < preguntasValidas.length; i += batchSize) {
    const batch = db.batch();
    const lote = preguntasValidas.slice(i, i + batchSize);
    
    for (const pregunta of lote) {
      const docRef = db.collection('trivia_questions').doc();
      batch.set(docRef, pregunta);
    }
    
    try {
      await batch.commit();
      totalGuardadas += lote.length;
      console.log(`💾 Lote ${Math.floor(i / batchSize) + 1}: ${lote.length} preguntas guardadas`);
    } catch (error) {
      console.error(`❌ Error guardando lote ${Math.floor(i / batchSize) + 1}:`, error.message);
    }
  }
  
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log(`✅ IMPORTACIÓN COMPLETADA`);
  console.log(`📊 Total guardadas: ${totalGuardadas}`);
  console.log('═══════════════════════════════════════');
  
  // Verificar total en Firestore
  const snapshot = await db.collection('trivia_questions').get();
  console.log(`📚 Total en Firestore: ${snapshot.size} preguntas`);
  
  // Estadísticas
  const porCategoria = { mundial: 0, colombiano: 0 };
  const porDificultad = { 1: 0, 2: 0, 3: 0, 4: 0 };
  
  snapshot.forEach(doc => {
    const data = doc.data();
    porCategoria[data.category]++;
    porDificultad[data.difficulty]++;
  });
  
  console.log('');
  console.log('📊 Estadísticas:');
  console.log(`   🌍 Mundial: ${porCategoria.mundial}`);
  console.log(`   🇨🇴 Colombiano: ${porCategoria.colombiano}`);
  console.log(`   ⭐ Dificultad 1: ${porDificultad[1]}`);
  console.log(`   ⭐⭐ Dificultad 2: ${porDificultad[2]}`);
  console.log(`   ⭐⭐⭐ Dificultad 3: ${porDificultad[3]}`);
  console.log(`   ⭐⭐⭐⭐ Dificultad 4: ${porDificultad[4]}`);
  
  process.exit(0);
}

// Ejecutar
main().catch(error => {
  console.error('❌ Error fatal:', error);
  process.exit(1);
});