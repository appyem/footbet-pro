import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, CheckCircle, Clock, Trophy, AlertCircle } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, updateDoc, onSnapshot } from 'firebase/firestore';
import { generateTriviaQuestions, submitTriviaAnswer, finishTriviaGame } from '../services/cloudFunctions';

const TriviaGameScreen = ({ gameId, phone, uid, onBack }) => {
  const [game, setGame] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [results, setResults] = useState(null);

  // 🔒 SEGURIDAD: Validar que el jugador puede participar
  const validatePlayerAccess = useCallback(() => {
    if (!game || !phone || !uid) return false;
    
    const isCreator = game.creatorPhone === phone;
    const isAcceptedInvited = game.invitedPlayers?.some(
      p => p.phone === phone && p.status === 'accepted'
    );
    
    return isCreator || isAcceptedInvited;
  }, [game, phone, uid]);

  // Cargar juego y escuchar cambios en tiempo real
  useEffect(() => {
    if (!gameId) return;

    const gameRef = doc(db, 'trivia_games', gameId);
    
    const unsubscribe = onSnapshot(gameRef, async (docSnap) => {
      if (!docSnap.exists()) {
        setError('Juego no encontrado');
        return;
      }

      const gameData = { id: docSnap.id, ...docSnap.data() };
      setGame(gameData);

      // Si el juego está activo y tiene preguntas, iniciar juego
      if (gameData.status === 'active' && gameData.questions?.length > 0) {
        setGameStarted(true);
      }

      // Si el juego terminó, mostrar resultados
      if (gameData.status === 'finished') {
        setGameFinished(true);
        setResults({
          winners: gameData.winners,
          scores: gameData.scores,
          prizePerWinner: gameData.prizePerWinner
        });
      }
    });

    return () => unsubscribe();
  }, [gameId]);

  // Generar preguntas cuando todos aceptan
  useEffect(() => {
    if (!game) return;

    const allAccepted = game.invitedPlayers?.every(p => p.status === 'accepted');
    
    if (allAccepted && game.status === 'waiting' && !game.questions) {
      const generateQuestions = async () => {
        try {
          setLoading(true);
          const result = await generateTriviaQuestions('general', 'medio');
          
          if (result.success) {
            const gameRef = doc(db, 'trivia_games', gameId);
            await updateDoc(gameRef, {
              questions: result.questions,
              status: 'active',
              startedAt: new Date().toISOString()
            });
          }
        } catch (err) {
          console.error('Error generando preguntas:', err);
          setError('Error al generar preguntas');
        } finally {
          setLoading(false);
        }
      };

      generateQuestions();
    }
  }, [game, gameId]);

  // Timer de 15 segundos por pregunta
  useEffect(() => {
    if (!gameStarted || gameFinished || currentQuestion >= 10) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // Tiempo agotado, pasar a siguiente pregunta
          handleNextQuestion();
          return 15;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameFinished, currentQuestion]);

  // Pasar a siguiente pregunta
  const handleNextQuestion = () => {
    if (currentQuestion >= 9) {
      setTimeLeft(15);
      return;
    }
    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(15);
  };

  // Enviar respuesta
  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) {
      setError('Selecciona una respuesta');
      return;
    }

    // 🔒 SEGURIDAD: Validar acceso
    if (!validatePlayerAccess()) {
      setError('No tienes permiso para jugar');
      return;
    }

    setLoading(true);
    setError('');

    try {
      await submitTriviaAnswer(gameId, phone, uid, currentQuestion, selectedAnswer);
      setSelectedAnswer(null);
      handleNextQuestion();
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Finalizar juego (solo creador)
  const handleFinishGame = async () => {
    // 🔒 SEGURIDAD: Solo el creador puede finalizar
    if (game.creatorPhone !== phone) {
      setError('Solo el creador puede finalizar el juego');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await finishTriviaGame(gameId, phone, uid);
      setGameFinished(true);
      setResults({
        winners: result.winners,
        scores: result.scores,
        prizePerWinner: result.prizePerWinner
      });
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pantalla de carga
  if (!game || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando juego...</p>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (error && !gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-red-500/30">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-200 text-center mb-4">{error}</p>
          <button onClick={onBack} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">
            Volver
          </button>
        </div>
      </div>
    );
  }

  // Esperando a que todos acepten
  if (!gameStarted && !gameFinished) {
    const pendingCount = game.invitedPlayers?.filter(p => p.status === 'pending').length || 0;
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
          <Clock className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-white text-xl font-bold text-center mb-4">Esperando jugadores...</h2>
          <p className="text-gray-300 text-center mb-4">
            Faltan {pendingCount} jugador(es) por aceptar
          </p>
          <div className="bg-purple-900/30 border border-purple-500/30 rounded-lg p-4 mb-4">
            <p className="text-purple-300 text-sm">💡 Las preguntas se generarán automáticamente cuando todos acepten</p>
          </div>
          <button onClick={onBack} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">
            Volver al lobby
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de resultados
  if (gameFinished && results) {
    const isWinner = results.winners.includes(phone);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4">
        <div className="bg-gray-800 rounded-2xl p-6 max-w-md w-full border border-purple-500/30">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${isWinner ? 'text-yellow-400' : 'text-gray-400'}`} />
          <h2 className="text-white text-2xl font-bold text-center mb-4">
            {isWinner ? '🏆 ¡GANASTE!' : 'Juego Terminado'}
          </h2>
          
          <div className="space-y-3 mb-6">
            {Object.entries(results.scores).map(([playerPhone, score]) => (
              <div key={playerPhone} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                <span className="text-white font-medium">
                  {playerPhone === phone ? '👤 Tú' : playerPhone}
                </span>
                <span className="text-purple-400 font-bold">{score}/10</span>
              </div>
            ))}
          </div>

          {isWinner && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-4 text-center">
              <p className="text-green-300 text-sm">Premio ganado</p>
              <p className="text-white text-3xl font-bold">{results.prizePerWinner} créditos</p>
            </div>
          )}

          <button onClick={onBack} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl">
            Volver al lobby
          </button>
        </div>
      </div>
    );
  }

  // Pantalla de juego (preguntas)
  const question = game.questions[currentQuestion];

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 p-4">
      <div className="max-w-2xl mx-auto">
        {/* Header con timer y progreso */}
        <div className="bg-gray-800 rounded-xl p-4 mb-4 border border-purple-500/30">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Clock className={`w-6 h-6 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
              <span className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="text-purple-300 font-medium">
              Pregunta {currentQuestion + 1}/10
            </div>
          </div>
          
          {/* Barra de progreso */}
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / 10) * 100}%` }}
            ></div>
          </div>
        </div>

        {/* Pregunta */}
        <div className="bg-gray-800 rounded-xl p-6 mb-4 border border-purple-500/30">
          <h2 className="text-white text-xl font-bold mb-6">{question.question}</h2>
          
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => setSelectedAnswer(idx)}
                disabled={loading}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedAnswer === idx
                    ? 'bg-purple-600 border-2 border-purple-400'
                    : 'bg-gray-700 border-2 border-transparent hover:bg-gray-600'
                }`}
              >
                <span className="text-white font-medium">
                  {String.fromCharCode(65 + idx)}. {option}
                </span>
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-500/50 rounded-lg p-3 mb-4">
            <p className="text-red-200 text-sm">{error}</p>
          </div>
        )}

        {/* Botones de acción */}
        <div className="space-y-3">
          <button
            onClick={handleSubmitAnswer}
            disabled={loading || selectedAnswer === null}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Enviando...' : <><CheckCircle className="w-5 h-5" /> Enviar Respuesta</>}
          </button>

          {/* Botón finalizar (solo creador y después de responder todas) */}
          {game.creatorPhone === phone && currentQuestion === 9 && selectedAnswer !== null && (
            <button
              onClick={handleFinishGame}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Finalizando...' : <><Trophy className="w-5 h-5" /> Finalizar Juego</>}
            </button>
          )}

          <button
            onClick={onBack}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Salir del juego
          </button>
        </div>
      </div>
    </div>
  );
};

export default TriviaGameScreen;