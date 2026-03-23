import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { getCountryFlag } from '../services/countryFlags';

const MatchBetCard = React.memo(({ match, selectedBet, onSelectionChange, isTrapMatch }) => {
  if (!match || !match.homeTeam || !match.awayTeam) {
    return null;
  }
  return (
    <div className={`bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 border ${isTrapMatch ? 'border-purple-600' : 'border-gray-700'} hover:border-gray-600 transition-colors`}>
      <div className="flex justify-between items-start mb-3">
        <div className="flex flex-col">
          <span className="text-green-400 text-sm font-medium flex items-center gap-1">
            <span className="text-lg">{getCountryFlag(match.country)}</span>
            <Calendar className="w-3 h-3" />
            {match.league}
          </span>
          <span className="text-gray-500 text-xs mt-1">{match.date}</span>
        </div>
        <span className="text-gray-400 text-sm flex items-center gap-1">
          <Clock className="w-3 h-3" />
          {match.time}
        </span>
      </div>
      <div className="flex justify-between items-center mb-4">
        <span className="text-white font-medium text-lg">{match.homeTeam}</span>
        <span className="text-gray-400 text-xl font-bold">vs</span>
        <span className="text-white font-medium text-lg">{match.awayTeam}</span>
      </div>
      <div className="grid grid-cols-3 gap-2 mb-3">
  {/* Local */}
  <button
    onClick={() => onSelectionChange(match.id, '1', match.odds.home)}
    className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
      selectedBet?.selection === '1'
        ? 'bg-green-500 text-white shadow-lg shadow-green-500/50 border-2 border-white/30'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
    }`}
  >
    <div className="text-xs font-bold">Local</div>
    <div className="text-lg mt-1 text-white drop-shadow-lg">{match.odds.home || '1.0'}</div>
  </button>
  
  {/* Empate */}
  <button
    onClick={() => onSelectionChange(match.id, 'X', match.odds.draw)}
    className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
      selectedBet?.selection === 'X'
        ? 'bg-yellow-500 text-white shadow-lg shadow-yellow-500/50 border-2 border-white/30'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
    }`}
  >
    <div className="text-xs font-bold">Empate</div>
    <div className="text-lg mt-1 text-white drop-shadow-lg">{match.odds.draw || '1.0'}</div>
  </button>
  
  {/* Visitante */}
  <button
    onClick={() => onSelectionChange(match.id, '2', match.odds.away)}
    className={`px-2 py-3 rounded-lg text-sm font-bold transition-all transform hover:scale-105 ${
      selectedBet?.selection === '2'
        ? 'bg-red-500 text-white shadow-lg shadow-red-500/50 border-2 border-white/30'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600 border-2 border-transparent'
    }`}
  >
    <div className="text-xs font-bold">Visitante</div>
    <div className="text-lg mt-1 text-white drop-shadow-lg">{match.odds.away || '1.0'}</div>
  </button>
</div>
      {selectedBet && (
        <div className="bg-gradient-to-r from-gray-700 to-gray-800 rounded-lg p-3 border border-gray-600">
          <div className="flex justify-between items-center mb-2">
            <span className="text-white text-sm font-medium">
              {selectedBet.selection === '1' ? 'Ganador Local' :
               selectedBet.selection === 'X' ? 'Empate' : 'Ganador Visitante'}
            </span>
            <span className="text-green-400 font-bold text-sm bg-green-900/30 px-2 py-1 rounded">
              {selectedBet.odds}
            </span>
          </div>
        </div>
      )}
    </div>
  );
});

export default MatchBetCard;
