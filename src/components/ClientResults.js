import React, { useState, useEffect } from 'react';
import { Search, Ticket, Phone, Calendar, Award, TrendingUp, X, CheckCircle, XCircle, Clock, DollarSign, Target, Flame } from 'lucide-react';
import { db } from '../services/firebase';
import { collection, query, where, getDocs, getDoc, doc, onSnapshot } from 'firebase/firestore';

const formatCOP = (amount) => {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount);
};

const getSelectionText = (selection) => {
  switch (selection) {
    case '1': return 'Local';
    case 'X': return 'Empate';
    case '2': return 'Visitante';
    default: return selection;
  }
};

const ClientResults = () => {
  const [searchMode, setSearchMode] = useState('phone'); // 'phone' o 'ticket'
  const [searchValue, setSearchValue] = useState('');
  const [loading, setLoading] = useState(false);
  const [tickets, setTickets] = useState([]);
  const [matchResults, setMatchResults] = useState({});
  const [error, setError] = useState('');
  const [selectedTicket, setSelectedTicket] = useState(null);
  const [showTicketModal, setShowTicketModal] = useState(false);

  // Cargar todos los resultados de partidos
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'match_results'), (snapshot) => {
      const results = {};
      snapshot.docs.forEach(doc => {
        const data = doc.data();
        results[data.matchId] = data.result;
      });
      setMatchResults(results);
    });
    return () => unsubscribe();
  }, []);

  const handleSearch = async () => {
    if (!searchValue.trim()) {
      setError('Por favor ingresa un valor para buscar');
      return;
    }

    setLoading(true);
    setError('');
    setTickets([]);

        try {
      let q;
      
      if (searchMode === 'ticket') {
        // ✅ SEGURO: Buscar por ID específico (no descarga todos)
        const searchLower = searchValue.toLowerCase().trim();
        
        // Intentar buscar por ID del documento
        try {
          const ticketDoc = await getDoc(doc(db, 'tickets', searchValue));
          if (ticketDoc.exists()) {
            setTickets([{ id: ticketDoc.id, ...ticketDoc.data() }]);
            return;
          }
        } catch (err) {
          // Si falla, continuar con búsqueda por verificationCode
        }
        
        // Buscar por verificationCode (consulta específica, no masiva)
        q = query(collection(db, 'tickets'), where('verificationCode', '==', searchLower));
        const snapshot = await getDocs(q);
        const results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setTickets(results);
      } else {
        // ✅ SEGURO: Búsqueda por teléfono con consultas específicas
        let phoneDigits = searchValue.trim().replace(/\D/g, '');
        
        if (phoneDigits.startsWith('57') && phoneDigits.length === 12) {
          phoneDigits = phoneDigits.substring(2);
        }
        
        const phoneFormats = [
          `+57 ${phoneDigits}`,
          `+57${phoneDigits}`,
          `57${phoneDigits}`,
          phoneDigits,
          phoneDigits.substring(0, 3) + ' ' + phoneDigits.substring(3)
        ];
        
        let results = [];
        
        // Probar cada formato (consultas específicas, no masivas)
        for (const format of phoneFormats) {
          q = query(collection(db, 'tickets'), where('customerPhone', '==', format));
          const snapshot = await getDocs(q);
          results = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
          
          if (results.length > 0) break;
        }
        
        // ❌ ELIMINADO: Fallback que descargaba todos los tickets
        // Si no encuentra, simplemente muestra "No se encontraron tickets"
        
        // Filtrar últimos 15 días
        const fifteenDaysAgo = new Date();
        fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);
        
        results = results.filter(t => {
          const ticketDate = new Date(t.createdAt?.toDate ? t.createdAt.toDate() : t.date);
          return ticketDate >= fifteenDaysAgo;
        });
        
        setTickets(results);
      }

      if (tickets.length === 0) {
        setError('No se encontraron tickets con ese criterio');
      }
    } catch (err) {
      console.error('Error buscando tickets:', err);
      setError('Error al buscar. Verifica el dato ingresado.');
    } finally {
      setLoading(false);
    }
    };
  // Calcular aciertos de un ticket
  const calculateTicketResults = (ticket) => {
    if (!ticket.bets) return { correct: 0, total: 0, bets: [] };
    
    const betsResults = ticket.bets.map(bet => {
      const actualResult = matchResults[bet.matchId];
      const isCorrect = actualResult && actualResult === bet.selection;
      const hasResult = !!actualResult;
      
      return {
        ...bet,
        actualResult,
        isCorrect,
        hasResult
      };
    });

    const correct = betsResults.filter(b => b.isCorrect).length;
    const total = betsResults.length;
    const withResults = betsResults.filter(b => b.hasResult).length;

    return { correct, total, bets: betsResults, withResults };
  };

  // Determinar premio ganado
  const getPrize = (correct) => {
    if (correct === 7) return { text: '$1.000.000', emoji: '🏆', color: 'text-yellow-400' };
    if (correct === 6) return { text: '10 Juegos Gratis', emoji: '🎫', color: 'text-purple-400' };
    if (correct === 5) return { text: 'Recupera tu jugada', emoji: '✅', color: 'text-green-400' };
    return null;
  };

  // Calcular estadísticas del histórico
  const calculateStats = () => {
    if (tickets.length === 0) return null;

    let totalStaked = 0;
    let totalPrizes = 0;
    let totalCorrect = 0;
    let totalBets = 0;
    const dailyData = {};

    tickets.forEach(ticket => {
      totalStaked += ticket.totalStake || 5000;
      
      const { correct, withResults } = calculateTicketResults(ticket);
      totalCorrect += correct;
      totalBets += withResults;
      
      const prize = getPrize(correct);
      if (prize) {
        if (correct === 7) totalPrizes += 1000000;
        else if (correct === 6) totalPrizes += 50000;
        else if (correct === 5) totalPrizes += 5000;
      }

      // Datos por día
      const date = ticket.date || new Date().toISOString().split('T')[0];
      if (!dailyData[date]) {
        dailyData[date] = { tickets: 0, correct: 0, total: 0, staked: 0 };
      }
      dailyData[date].tickets += 1;
      dailyData[date].correct += correct;
      dailyData[date].total += withResults;
      dailyData[date].staked += ticket.totalStake || 5000;
    });

    const accuracy = totalBets > 0 ? Math.round((totalCorrect / totalBets) * 100) : 0;

    // Calcular racha actual (días consecutivos jugando)
        let currentStreak = 0;
    let checkDate = new Date();
    
    for (let i = 0; i < 30; i++) {
      const dateStr = checkDate.toISOString().split('T')[0];
      if (dailyData[dateStr]) {
        currentStreak++;
      } else if (i > 0) {
        break;
      }
      checkDate.setDate(checkDate.getDate() - 1);
    }

    // Día caliente (día con más aciertos)
    let hotDay = null;
    let maxCorrect = 0;
    Object.entries(dailyData).forEach(([date, data]) => {
      if (data.correct > maxCorrect) {
        maxCorrect = data.correct;
        hotDay = { date, ...data };
      }
    });

    return {
      totalTickets: tickets.length,
      totalStaked,
      totalPrizes,
      accuracy,
      currentStreak,
      hotDay,
      dailyData: Object.entries(dailyData).sort((a, b) => a[0].localeCompare(b[0]))
    };
  };

  const openTicketDetails = (ticket) => {
    setSelectedTicket(ticket);
    setShowTicketModal(true);
  };

  const TicketModal = ({ ticket, onClose }) => {
    const { correct, total, bets, withResults } = calculateTicketResults(ticket);
    const prize = getPrize(correct);
    const allHaveResults = bets.every(b => b.hasResult);

    return (
      <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
        <div className="bg-gray-900/95 rounded-2xl max-w-md w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-white/10">
          <div className="sticky top-0 bg-gray-900/95 backdrop-blur-sm p-4 border-b border-white/10 flex justify-between items-center">
            <h3 className="text-xl font-bold text-white">Ticket {ticket.id}</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-white">
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Info del ticket */}
            <div className="bg-white/5 rounded-xl p-4 border border-white/10">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <p className="text-gray-400 text-xs">Cliente</p>
                  <p className="text-white font-medium">{ticket.customerName}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Fecha</p>
                  <p className="text-white font-medium">{ticket.date} {ticket.time}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Apostado</p>
                  <p className="text-green-400 font-bold">{formatCOP(ticket.totalStake)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-xs">Código</p>
                  <p className="text-white font-mono text-xs">{ticket.verificationCode}</p>
                </div>
              </div>
            </div>

            {/* Resultado general */}
            {allHaveResults && (
              <div className={`rounded-xl p-4 border ${prize ? 'bg-gradient-to-r from-green-900/50 to-yellow-900/50 border-yellow-500/50' : 'bg-white/5 border-white/10'}`}>
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-400 text-xs">Resultado</p>
                    <p className="text-white text-2xl font-bold">{correct}/{total} aciertos</p>
                  </div>
                  {prize && (
                    <div className="text-right">
                      <p className="text-gray-400 text-xs">Premio</p>
                      <p className={`${prize.color} text-lg font-bold`}>{prize.emoji} {prize.text}</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {!allHaveResults && (
              <div className="bg-blue-900/30 rounded-xl p-4 border border-blue-500/30">
                <div className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-blue-400" />
                  <p className="text-blue-200 text-sm">
                    Esperando resultados de partidos ({withResults}/{total} completados)
                  </p>
                </div>
              </div>
            )}

            {/* Lista de apuestas */}
            <div className="space-y-2">
              <h4 className="text-white font-bold text-sm">Tus apuestas:</h4>
              {bets.map((bet, idx) => (
                <div 
                  key={idx}
                  className={`rounded-lg p-3 border ${
                    !bet.hasResult ? 'bg-gray-800/50 border-gray-700' :
                    bet.isCorrect ? 'bg-green-900/30 border-green-500/50' : 'bg-red-900/30 border-red-500/50'
                  }`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">
                        {bet.homeTeam} vs {bet.awayTeam}
                      </p>
                      <p className="text-gray-400 text-xs">{bet.league} • {bet.time}</p>
                    </div>
                    {bet.hasResult && (
                      bet.isCorrect ? 
                        <CheckCircle className="w-5 h-5 text-green-400" /> :
                        <XCircle className="w-5 h-5 text-red-400" />
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center text-xs">
                    <div>
                      <span className="text-gray-400">Tu jugada: </span>
                      <span className="text-white font-medium">{getSelectionText(bet.selection)}</span>
                    </div>
                    {bet.hasResult && (
                      <div>
                        <span className="text-gray-400">Resultado: </span>
                        <span className={`font-bold ${bet.isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                          {getSelectionText(bet.actualResult)}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const stats = calculateStats();

  return (
    <div className="min-h-screen bg-gray-900 pb-8 relative overflow-hidden">
      <div 
        className="absolute inset-0 opacity-15 pointer-events-none"
        style={{ 
          backgroundImage: `url(https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Trofe%CC%81os%20dorados%20en%20un%20estadio%20vibrante.png)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      ></div>

      {/* Header */}
      <div className="py-6 relative z-10">
        <div className="max-w-4xl mx-auto flex flex-col items-center">
          <div className="w-24 h-24 rounded-full bg-gradient-to-br from-green-500 to-green-700 flex items-center justify-center p-4 shadow-2xl border-4 border-green-400/30">
            <img 
              src="https://raw.githubusercontent.com/appyem/imagenesappy/refs/heads/main/Logo%20dina%CC%81mico%20de%20La%20Jugada%207.png" 
              alt="Logo" 
              className="w-20 h-20 object-contain drop-shadow-lg"
            />
          </div>
          <h1 className="text-2xl font-bold text-white mt-4 drop-shadow-lg">Mis Resultados</h1>
          <p className="text-green-100 text-sm mt-1">Consulta tus jugadas y estadísticas</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 py-6 relative z-10">
        {/* Búsqueda */}
        <div className="bg-white/10 backdrop-blur-md rounded-2xl p-6 mb-6 border border-white/10 shadow-xl">
          <h2 className="text-white text-lg font-bold mb-4 flex items-center gap-2">
            <Search className="w-5 h-5" /> Buscar mis jugadas
          </h2>

          {/* Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setSearchMode('phone')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                searchMode === 'phone' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Phone className="w-4 h-4" /> Por teléfono
            </button>
            <button
              onClick={() => setSearchMode('ticket')}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all flex items-center justify-center gap-2 ${
                searchMode === 'ticket' 
                  ? 'bg-green-600 text-white' 
                  : 'bg-white/5 text-gray-300 hover:bg-white/10'
              }`}
            >
              <Ticket className="w-4 h-4" /> Por ticket
            </button>
          </div>

          {/* Input */}
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              type={searchMode === 'phone' ? 'tel' : 'text'}
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={searchMode === 'phone' ? 'Ej: 3001234567' : 'Ej: TKT001 o código'}
              className="flex-1 bg-white/10 text-white rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-green-400 border border-white/20 placeholder-gray-400"
            />
            <button
              onClick={handleSearch}
              disabled={loading}
              className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg font-medium flex items-center gap-2 disabled:opacity-50"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Search className="w-4 h-4" /> Buscar
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="mt-3 bg-red-900/50 border border-red-500/50 rounded-lg p-3">
              <p className="text-red-200 text-sm">{error}</p>
            </div>
          )}
        </div>

        {/* Estadísticas */}
        {stats && searchMode === 'phone' && (
          <div className="space-y-4 mb-6">
            <h2 className="text-white text-lg font-bold flex items-center gap-2">
              <TrendingUp className="w-5 h-5" /> Mis estadísticas
            </h2>

            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-blue-600/80 to-blue-800/80 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-blue-100 text-xs">Tickets jugados</p>
                    <p className="text-white text-2xl font-bold">{stats.totalTickets}</p>
                  </div>
                  <Ticket className="text-blue-200 w-6 h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-600/80 to-green-800/80 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-xs">Total apostado</p>
                    <p className="text-white text-xl font-bold">{formatCOP(stats.totalStaked)}</p>
                  </div>
                  <DollarSign className="text-green-200 w-6 h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-purple-600/80 to-purple-800/80 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-xs">% Aciertos</p>
                    <p className="text-white text-2xl font-bold">{stats.accuracy}%</p>
                  </div>
                  <Target className="text-purple-200 w-6 h-6" />
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-600/80 to-yellow-800/80 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-yellow-100 text-xs">Ganado en premios</p>
                    <p className="text-white text-xl font-bold">{formatCOP(stats.totalPrizes)}</p>
                  </div>
                  <Award className="text-yellow-200 w-6 h-6" />
                </div>
              </div>
            </div>

            {/* Racha y día caliente */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <div className="flex items-center gap-2 mb-2">
                  <Flame className="w-5 h-5 text-orange-400" />
                  <p className="text-white text-sm font-bold">Racha actual</p>
                </div>
                <p className="text-white text-2xl font-bold">{stats.currentStreak} {stats.currentStreak === 1 ? 'día' : 'días'}</p>
                <p className="text-gray-400 text-xs">jugando seguidos</p>
              </div>

              {stats.hotDay && (
                <div className="bg-gradient-to-br from-red-600/50 to-orange-600/50 backdrop-blur-md rounded-xl p-4 border border-orange-500/30">
                  <div className="flex items-center gap-2 mb-2">
                    <Flame className="w-5 h-5 text-red-400" />
                    <p className="text-white text-sm font-bold">Día caliente</p>
                  </div>
                  <p className="text-white text-lg font-bold">{stats.hotDay.correct} aciertos</p>
                  <p className="text-gray-300 text-xs">{stats.hotDay.date}</p>
                </div>
              )}
            </div>

            {/* Gráfico de rendimiento */}
            {stats.dailyData.length > 0 && (
              <div className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10">
                <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                  <Calendar className="w-4 h-4" /> Rendimiento por día
                </h3>
                <div className="space-y-2">
                  {stats.dailyData.slice(-7).map(([date, data]) => {
                    const accuracy = data.total > 0 ? Math.round((data.correct / data.total) * 100) : 0;
                    return (
                      <div key={date} className="flex items-center gap-2">
                        <span className="text-gray-400 text-xs w-16">{date.slice(5)}</span>
                        <div className="flex-1 bg-gray-800 rounded-full h-4 overflow-hidden">
                          <div 
                            className={`h-full rounded-full ${
                              accuracy >= 70 ? 'bg-green-500' :
                              accuracy >= 40 ? 'bg-yellow-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${accuracy}%` }}
                          ></div>
                        </div>
                        <span className="text-white text-xs w-10 text-right">{accuracy}%</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Lista de tickets */}
        {tickets.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-white text-lg font-bold">
              {searchMode === 'phone' ? 'Mi histórico' : 'Resultado de búsqueda'} ({tickets.length})
            </h2>
            
            {tickets.map(ticket => {
              const { correct, total, withResults } = calculateTicketResults(ticket);
              const prize = getPrize(correct);
              const allHaveResults = withResults === total;
              
              return (
                <div 
                  key={ticket.id}
                  onClick={() => openTicketDetails(ticket)}
                  className="bg-white/5 backdrop-blur-md rounded-xl p-4 border border-white/10 cursor-pointer hover:border-green-400/50 transition-all"
                >
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="text-white font-bold">{ticket.id}</p>
                      <p className="text-gray-400 text-xs">{ticket.date} • {ticket.time}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-green-400 font-bold">{formatCOP(ticket.totalStake)}</p>
                      {prize && (
                        <p className={`${prize.color} text-xs font-bold`}>{prize.emoji} {prize.text}</p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    {allHaveResults ? (
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-bold">{correct}/{total}</span>
                        <span className="text-gray-400 text-xs">aciertos</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <Clock className="w-4 h-4 text-blue-400" />
                        <span className="text-blue-300 text-xs">Esperando resultados</span>
                      </div>
                    )}
                    <span className="text-green-400 text-xs">Ver detalles →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {tickets.length === 0 && !loading && !error && searchValue && (
          <div className="bg-white/5 backdrop-blur-md rounded-xl p-8 text-center border border-white/10">
            <Search className="w-12 h-12 text-gray-500 mx-auto mb-3" />
            <p className="text-gray-400">No se encontraron tickets</p>
          </div>
        )}
      </div>

      {showTicketModal && selectedTicket && (
        <TicketModal 
          ticket={selectedTicket} 
          onClose={() => {
            setShowTicketModal(false);
            setSelectedTicket(null);
          }} 
        />
      )}
    </div>
  );
};

export default ClientResults;