import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ArrowLeft, CheckCircle, Clock, Trophy, AlertCircle } from 'lucide-react';
import { db } from '../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { assignTriviaQuestions, submitTriviaAnswer, finishTriviaGame } from '../services/cloudFunctions';

const TriviaGameScreen = ({ gameId, phone, uid, onBack }) => {

  // Guardar credenciales en localStorage al montar
  React.useEffect(() => {
    if (phone) localStorage.setItem('trivia_phone', phone);
    if (uid) localStorage.setItem('trivia_uid', uid);
  }, [phone, uid]);
  
  const [game, setGame] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [timeLeft, setTimeLeft] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [gameStarted, setGameStarted] = useState(false);
  const [gameFinished, setGameFinished] = useState(false);
  const [results, setResults] = useState(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  
  const isGeneratingRef = useRef(false);
  const hasGeneratedRef = useRef(false);

  // 🔒 SEGURIDAD: Validar que el jugador puede participar
  const validatePlayerAccess = useCallback(() => {
    if (!game || !phone || !uid) return false;
    const isCreator = game.creatorPhone === phone;
    const isAcceptedInvited = game.invitedPlayers?.some(p => p.phone === phone && p.status === 'accepted');
    return isCreator || isAcceptedInvited;
  }, [game, phone, uid]);

  // 🔍 Obtener respuestas del jugador actual desde Firestore
  const getMyAnswers = useCallback(() => {
    if (!game || !game.answers || !game.answers[phone]) return {};
    const firestoreAnswers = game.answers[phone];
    const localAnswers = {};
    Object.keys(firestoreAnswers).forEach(key => {
      localAnswers[key] = firestoreAnswers[key].selected;
    });
    return localAnswers;
  }, [game, phone]);

  // 🆕 FUNCIÓN CLAVE: Forzar navegación directa al Lobby de Trivia
  const handleGoToLobby = useCallback(() => {
    if (phone) localStorage.setItem('trivia_phone', phone);
    if (uid) localStorage.setItem('trivia_uid', uid);
    window.location.hash = 'trivia-lobby';
  }, [phone, uid]);

  // Cargar juego y escuchar cambios en tiempo real
  useEffect(() => {
    if (!gameId) return;
    const gameRef = doc(db, 'trivia_games', gameId);
    
    const unsubscribe = onSnapshot(gameRef, (docSnap) => {
      if (!docSnap.exists()) {
        setError('Juego no encontrado');
        return;
      }
      const gameData = { id: docSnap.id, ...docSnap.data() };
      setGame(gameData);

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

  // Generar preguntas cuando todos aceptan (solo una vez)
  useEffect(() => {
    if (!game || !gameId) return;
    if (hasGeneratedRef.current) return;

    const allAccepted = game.invitedPlayers?.every(p => p.status === 'accepted');
    const hasQuestions = game.questions && game.questions.length > 0;
    
    if (hasQuestions) {
      hasGeneratedRef.current = true;
      setGameStarted(true);
      return;
    }
    
    if (allAccepted && !hasQuestions && !isGeneratingRef.current) {
      isGeneratingRef.current = true;
      
      const assignQuestionsWithRetry = async (retryCount = 0) => {
        try {
          setLoading(true);
          const result = await assignTriviaQuestions(gameId);
          if (result.success) {
            hasGeneratedRef.current = true;
            setGameStarted(true);
          }
        } catch (err) {
          if (retryCount < 3) {
            setTimeout(() => assignQuestionsWithRetry(retryCount + 1), 3000);
          } else {
            setError('Error al asignar preguntas: ' + err.message);
            isGeneratingRef.current = false;
          }
        } finally {
          setLoading(false);
        }
      };
      assignQuestionsWithRetry();
    }
  }, [game, gameId]);

  // 🆕 1. handleNextQuestion debe estar ANTES de handleTimeout
  const handleNextQuestion = useCallback(() => {
    if (currentQuestion >= 9) {
      setTimeLeft(15);
      setIsTimeExpired(false);
      return;
    }
    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(15);
    setIsTimeExpired(false);
  }, [currentQuestion]);

  // 🆕 2. handleTimeout debe estar ANTES del useEffect del timer y envuelto en useCallback
  const handleTimeout = useCallback(async () => {
    const myAnswers = getMyAnswers();
    
    if (myAnswers[currentQuestion] !== undefined) {
      handleNextQuestion();
      return;
    }

    try {
      await submitTriviaAnswer(gameId, phone, uid, currentQuestion, -1);
    } catch (err) {
      console.error('Error registrando timeout:', err);
    }
    
    setTimeout(() => handleNextQuestion(), 1500);
  }, [currentQuestion, gameId, phone, uid, getMyAnswers, handleNextQuestion]);

  // 🆕 3. useEffect del timer con handleTimeout en las dependencias
  useEffect(() => {
    if (!gameStarted || gameFinished || currentQuestion >= 10) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          setIsTimeExpired(true);
          handleTimeout();
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [gameStarted, gameFinished, currentQuestion, handleTimeout]);

  // Enviar respuesta
  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) {
      setError('Selecciona una respuesta');
      return;
    }

    if (isTimeExpired) {
      setError('⏰ El tiempo se acabó. Avanzando...');
      return;
    }

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

  // Finalizar juego
  const handleFinishGame = async () => {
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

  const myAnswers = getMyAnswers();
  const myAnswerCount = Object.keys(myAnswers).length;
  const totalQuestions = game?.questions?.length || 0;
  const allAnswered = myAnswerCount >= totalQuestions;

  // 🆕 AUTO-REDIRECT: Si el jugador terminó y no es el creador, llevarlo al LOBBY en 3 seg
  useEffect(() => {
    if (allAnswered && !gameFinished) {
      const isCreator = game?.creatorPhone === phone;
      if (!isCreator) {
        const timer = setTimeout(() => {
          console.log('✅ Jugador invitado terminó, redirigiendo al LOBBY...');
          handleGoToLobby();
        }, 3000);
        return () => clearTimeout(timer);
      }
    }
  }, [allAnswered, gameFinished, game, phone, handleGoToLobby]);

  // Pantalla de carga
  if (!game || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10 text-center">
          <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-white text-lg">Cargando juego...</p>
        </div>
      </div>
    );
  }

  // Pantalla de error
  if (error && !gameStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl relative z-10 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-200 mb-4">{error}</p>
          <button onClick={handleGoToLobby} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">Volver al Lobby</button>
        </div>
      </div>
    );
  }

  // Esperando a que todos acepten
  if (!gameStarted && !gameFinished) {
    const pendingCount = game.invitedPlayers?.filter(p => p.status === 'pending').length || 0;
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10 text-center">
          <Clock className="w-16 h-16 text-purple-400 mx-auto mb-4 animate-pulse" />
          <h2 className="text-white text-xl font-bold mb-4">Esperando jugadores...</h2>
          <p className="text-gray-300 mb-4">Faltan {pendingCount} jugador(es) por aceptar</p>
          <button onClick={handleGoToLobby} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">Volver al Lobby</button>
        </div>
      </div>
    );
  }

  // Pantalla de resultados
  if (gameFinished && results) {
    const isWinner = results.winners.includes(phone);
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10 text-center">
          <Trophy className={`w-16 h-16 mx-auto mb-4 ${isWinner ? 'text-yellow-400' : 'text-gray-400'}`} />
          <h2 className="text-white text-2xl font-bold mb-4">{isWinner ? '🏆 ¡GANASTE!' : 'Juego Terminado'}</h2>
          <div className="space-y-3 mb-6">
            {Object.entries(results.scores).map(([playerPhone, score]) => (
              <div key={playerPhone} className="bg-gray-700 rounded-lg p-3 flex justify-between items-center">
                <span className="text-white font-medium">{playerPhone === phone ? '👤 Tú' : playerPhone}</span>
                <span className="text-purple-400 font-bold">{score}/10</span>
              </div>
            ))}
          </div>
          {isWinner && (
            <div className="bg-green-900/30 border border-green-500/30 rounded-lg p-4 mb-4">
              <p className="text-green-300 text-sm">Premio ganado</p>
              <p className="text-white text-3xl font-bold">{results.prizePerWinner} créditos</p>
            </div>
          )}
          <button onClick={handleGoToLobby} className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl">Volver al Lobby</button>
        </div>
      </div>
    );
  }

  // VALIDACIÓN: Verificar que hay preguntas
  if (!game.questions || game.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl relative z-10 text-center">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-200 mb-4">Error: No hay preguntas disponibles</p>
          <button onClick={handleGoToLobby} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">Volver al Lobby</button>
        </div>
      </div>
    );
  }

  // PANTALLA DE ESPERA MEJORADA: Cuando el jugador ya respondió todo
  if (allAnswered && !gameFinished) {
    const isCreator = game.creatorPhone === phone;

    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-green-500/30 shadow-2xl relative z-10 text-center">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4 animate-bounce" />
          <h2 className="text-white text-xl font-bold mb-2">✅ ¡Has terminado!</h2>
          
          {isCreator ? (
            <>
              <p className="text-gray-300 mb-6">Todos los jugadores han respondido.</p>
              <button
                onClick={handleFinishGame}
                disabled={loading}
                className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
              >
                {loading ? 'Finalizando...' : <><Trophy className="w-5 h-5" /> Finalizar Juego y Ver Resultados</>}
              </button>
            </>
          ) : (
            <>
              <p className="text-gray-300 mb-2">Esperando a que tu oponente termine...</p>
              <p className="text-purple-300 text-sm mb-6">Serás redirigido al lobby automáticamente en unos segundos.</p>
              <button
                onClick={handleGoToLobby}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Ir al Lobby ahora
              </button>
            </>
          )}
        </div>
      </div>
    );
  }

  // Pantalla principal del juego
  const question = game.questions[currentQuestion];
  const questionAnswered = myAnswers[currentQuestion] !== undefined;
  const isDisabled = loading || questionAnswered || isTimeExpired;

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 p-4 relative overflow-hidden">
      <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
        <source src="/video/estadio.mp4" type="video/mp4" />
      </video>
      <div className="fixed inset-0 bg-black/60 z-0"></div>
      
      <div className="max-w-2xl mx-auto relative z-10">
        {/* Header con timer y progreso */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-4 mb-4 border border-purple-500/30">
          <div className="flex justify-between items-center mb-3">
            <div className="flex items-center gap-2">
              <Clock className={`w-6 h-6 ${timeLeft <= 5 ? 'text-red-400 animate-pulse' : 'text-purple-400'}`} />
              <span className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>{timeLeft}s</span>
            </div>
            <div className="text-purple-300 font-medium">Pregunta {currentQuestion + 1}/{game.questions.length}</div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
            <div className={`h-3 rounded-full transition-all duration-1000 ${timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'}`} style={{ width: `${(timeLeft / 15) * 100}%` }}></div>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div className="bg-purple-500 h-2 rounded-full transition-all duration-300" style={{ width: `${((currentQuestion + 1) / game.questions.length) * 100}%` }}></div>
          </div>
        </div>

        {/* Pregunta */}
        <div className="bg-gray-800/70 backdrop-blur-sm rounded-xl p-6 mb-4 border border-purple-500/30">
          <h2 className="text-white text-xl font-bold mb-6">{question.question}</h2>
          <div className="space-y-3">
            {question.options.map((option, idx) => (
              <button
                key={idx}
                onClick={() => !isDisabled && setSelectedAnswer(idx)}
                disabled={isDisabled}
                className={`w-full p-4 rounded-xl text-left transition-all ${
                  selectedAnswer === idx || myAnswers[currentQuestion] === idx
                    ? 'bg-purple-600 border-2 border-purple-400'
                    : 'bg-gray-700 border-2 border-transparent hover:bg-gray-600'
                } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                <span className="text-white font-medium">{String.fromCharCode(65 + idx)}. {option}</span>
              </button>
            ))}
          </div>
          
          {isTimeExpired && !questionAnswered && (
            <div className="mt-4 bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm font-bold">⏰ ¡Tiempo agotado! Avanzando...</p>
            </div>
          )}
          {questionAnswered && (
            <div className="mt-4 bg-green-900/30 border border-green-500/30 rounded-lg p-3">
              <p className="text-green-300 text-sm">✅ Ya respondiste esta pregunta</p>
            </div>
          )}
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
            disabled={isDisabled || selectedAnswer === null}
            className="w-full bg-purple-600 hover:bg-purple-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {loading ? 'Enviando...' : <><CheckCircle className="w-5 h-5" /> Enviar Respuesta</>}
          </button>

          <button
            onClick={handleGoToLobby}
            className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl flex items-center justify-center gap-2"
          >
            <ArrowLeft className="w-4 h-4" /> Volver al Lobby
          </button>
        </div>
      </div>
    </div>
  );
};

export default TriviaGameScreen;