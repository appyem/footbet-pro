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
  const [isTimeExpired, setIsTimeExpired] = useState(false); // 🆕 Estado para bloquear UI
  
  const isGeneratingRef = useRef(false);
  const hasGeneratedRef = useRef(false);

  // 🔒 SEGURIDAD: Validar que el jugador puede participar
  const validatePlayerAccess = useCallback(() => {
    if (!game || !phone || !uid) return false;
    
    const isCreator = game.creatorPhone === phone;
    const isAcceptedInvited = game.invitedPlayers?.some(
      p => p.phone === phone && p.status === 'accepted'
    );
    
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

  // Generar preguntas cuando todos aceptan (solo una vez)
  useEffect(() => {
    if (!game || !gameId) return;
    if (hasGeneratedRef.current) return;

    const allAccepted = game.invitedPlayers?.every(p => p.status === 'accepted');
    const hasQuestions = game.questions && game.questions.length > 0;
    
    console.log('🔍 useEffect generate: allAccepted=', allAccepted, 'hasQuestions=', hasQuestions, 'status=', game.status);
    
    if (hasQuestions) {
      hasGeneratedRef.current = true;
      setGameStarted(true);
      return;
    }
    
    if (allAccepted && !hasQuestions && !isGeneratingRef.current) {
      console.log('✅ Todos aceptaron, asignando preguntas...');
      isGeneratingRef.current = true;
      
      const assignQuestionsWithRetry = async (retryCount = 0) => {
        try {
          setLoading(true);
          const result = await assignTriviaQuestions(gameId);
          
          if (result.success) {
            console.log('✅ Preguntas asignadas exitosamente desde:', result.source);
            hasGeneratedRef.current = true;
            setGameStarted(true);
          }
        } catch (err) {
          console.error('Error asignando preguntas:', err);
          
          if (retryCount < 3) {
            console.log(`⏳ Reintentando en 3 segundos... (intento ${retryCount + 1}/3)`);
            setTimeout(() => {
              assignQuestionsWithRetry(retryCount + 1);
            }, 3000);
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

  // 🆕 Timer de 15 segundos por pregunta con registro de timeout
  useEffect(() => {
    if (!gameStarted || gameFinished || currentQuestion >= 10) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          // ⏰ TIEMPO AGOTADO: Registrar como timeout y avanzar
          setIsTimeExpired(true);
          handleTimeout();
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gameStarted, gameFinished, currentQuestion]);

  // 🆕 Función para manejar cuando se acaba el tiempo
  const handleTimeout = async () => {
    const myAnswers = getMyAnswers();
    
    // Si ya respondió esta pregunta, no hacer nada
    if (myAnswers[currentQuestion] !== undefined) {
      handleNextQuestion();
      return;
    }

    console.log(`⏰ Tiempo agotado en pregunta ${currentQuestion + 1}`);
    
    try {
      // Enviar respuesta especial -1 para indicar timeout
      await submitTriviaAnswer(gameId, phone, uid, currentQuestion, -1);
      console.log('✅ Timeout registrado en Firestore');
    } catch (err) {
      console.error('Error registrando timeout:', err);
    }
    
    // Avanzar a la siguiente pregunta después de 1.5 segundos
    setTimeout(() => {
      handleNextQuestion();
    }, 1500);
  };

  // Enviar respuesta
  const handleSubmitAnswer = async () => {
    if (selectedAnswer === null) {
      setError('Selecciona una respuesta');
      return;
    }

    // 🆕 Validar que no se haya acabado el tiempo
    if (isTimeExpired) {
      setError('⏰ El tiempo se acabó. Avanzando a la siguiente pregunta...');
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
      
      // El estado se actualizará automáticamente desde el onSnapshot
      setSelectedAnswer(null);
      handleNextQuestion();
    } catch (err) {
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // Pasar a siguiente pregunta
  const handleNextQuestion = () => {
    if (currentQuestion >= 9) {
      setTimeLeft(15);
      setIsTimeExpired(false);
      return;
    }
    setCurrentQuestion((prev) => prev + 1);
    setSelectedAnswer(null);
    setTimeLeft(15);
    setIsTimeExpired(false); // 🆕 Resetear estado de timeout
  };

  // Finalizar juego
  const handleFinishGame = async () => {
    setLoading(true);
    setError('');

    try {
      console.log('🏁 Llamando finishTriviaGame con:', { gameId, phone, uid });
      const result = await finishTriviaGame(gameId, phone, uid);
      console.log('✅ finishTriviaGame exitoso:', result);
      setGameFinished(true);
      setResults({
        winners: result.winners,
        scores: result.scores,
        prizePerWinner: result.prizePerWinner
      });
    } catch (err) {
      console.error('❌ Error en finishTriviaGame:', err);
      setError('❌ Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  // 🔒 Obtener respuestas actuales desde Firestore (no desde estado local)
  const myAnswers = getMyAnswers();
  const myAnswerCount = Object.keys(myAnswers).length;
  const totalQuestions = game?.questions?.length || 0;
  const allAnswered = myAnswerCount >= totalQuestions;

  // Verificar si todos los jugadores ya respondieron
  const totalPlayers = game?.invitedPlayers?.length + 1 || 1;
  const playersWhoFinished = (game?.answers ? Object.keys(game.answers).length : 0);
  const allPlayersFinished = playersWhoFinished >= totalPlayers;

  // 🔍 DEBUG
  console.log('🔍 DEBUG finishGame:');
  console.log('  - myAnswerCount:', myAnswerCount);
  console.log('  - allAnswered:', allAnswered);
  console.log('  - totalPlayers:', totalPlayers);
  console.log('  - playersWhoFinished:', playersWhoFinished);
  console.log('  - allPlayersFinished:', allPlayersFinished);
  console.log('  - totalQuestions:', totalQuestions);

  // Pantalla de carga
  if (!game || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10">
          <div className="text-center">
            <div className="w-16 h-16 border-4 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-white text-lg">Cargando juego...</p>
          </div>
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
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl relative z-10">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10">
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
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10">
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

  // 🔒 VALIDACIÓN: Verificar que hay preguntas
  if (!game.questions || game.questions.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-red-500/30 shadow-2xl relative z-10">
          <AlertCircle className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <p className="text-red-200 text-center mb-4">Error: No hay preguntas disponibles</p>
          <button onClick={onBack} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 rounded-xl">
            Volver
          </button>
        </div>
      </div>
    );
  }

  // 🔒 VALIDACIÓN: Si currentQuestion es inválido, mostrar pantalla de espera
  if (currentQuestion >= game.questions.length) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-purple-900 via-gray-900 to-purple-800 flex items-center justify-center p-4 relative overflow-hidden">
        <video autoPlay loop muted playsInline className="fixed inset-0 w-full h-full object-cover z-0">
          <source src="/video/estadio.mp4" type="video/mp4" />
        </video>
        <div className="fixed inset-0 bg-black/60 z-0"></div>
        <div className="bg-gray-800/30 backdrop-blur-sm rounded-2xl p-6 max-w-md w-full border border-purple-500/30 shadow-2xl relative z-10">
          <CheckCircle className="w-16 h-16 text-green-400 mx-auto mb-4" />
          <h2 className="text-white text-xl font-bold text-center mb-4">✅ Ya respondiste todas las preguntas</h2>
          <p className="text-gray-300 text-center mb-4">
            Esperando a que los demás jugadores terminen ({playersWhoFinished}/{totalPlayers})
          </p>
          {allPlayersFinished && (
            <button
              onClick={handleFinishGame}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2 mb-3"
            >
              {loading ? 'Finalizando...' : <><Trophy className="w-5 h-5" /> Finalizar Juego</>}
            </button>
          )}
          <button onClick={onBack} className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-3 rounded-xl">
            Volver al lobby
          </button>
        </div>
      </div>
    );
  }

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
              <span className={`text-2xl font-bold ${timeLeft <= 5 ? 'text-red-400' : 'text-white'}`}>
                {timeLeft}s
              </span>
            </div>
            <div className="text-purple-300 font-medium">
              Pregunta {currentQuestion + 1}/{game.questions.length}
            </div>
          </div>
          
          {/* 🆕 Barra de progreso del tiempo */}
          <div className="w-full bg-gray-700 rounded-full h-3 mb-2 overflow-hidden">
            <div 
              className={`h-3 rounded-full transition-all duration-1000 ${
                timeLeft <= 5 ? 'bg-red-500 animate-pulse' : 'bg-purple-500'
              }`}
              style={{ width: `${(timeLeft / 15) * 100}%` }}
            ></div>
          </div>
          
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className="bg-purple-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((currentQuestion + 1) / game.questions.length) * 100}%` }}
            ></div>
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
                <span className="text-white font-medium">
                  {String.fromCharCode(65 + idx)}. {option}
                </span>
              </button>
            ))}
          </div>
          
          {/* 🆕 Mensaje cuando se acaba el tiempo */}
          {isTimeExpired && !questionAnswered && (
            <div className="mt-4 bg-red-900/30 border border-red-500/30 rounded-lg p-3">
              <p className="text-red-300 text-sm font-bold">⏰ ¡Tiempo agotado! Avanzando a la siguiente pregunta...</p>
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

          {/* Botón finalizar (cuando todos hayan jugado) */}
          {allAnswered && allPlayersFinished && (
            <button
              onClick={handleFinishGame}
              disabled={loading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 rounded-xl disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? 'Finalizando...' : <><Trophy className="w-5 h-5" /> Finalizar Juego</>}
            </button>
          )}

          {allAnswered && !allPlayersFinished && (
            <div className="bg-blue-900/30 border border-blue-500/30 rounded-lg p-3 text-center">
              <p className="text-blue-300 text-sm">✅ Ya respondiste todas las preguntas</p>
              <p className="text-blue-200 text-xs mt-1">
                Esperando a que los demás jugadores terminen ({playersWhoFinished}/{totalPlayers})
              </p>
            </div>
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