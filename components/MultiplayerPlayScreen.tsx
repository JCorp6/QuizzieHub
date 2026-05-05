"use client"

import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"
import { 
    listenToRoomState,
    finishMultiplayerGame,
    submitMultiplayerAnswer,
} from "@/lib/firebaseMultiplayer" 
import { doc, Timestamp, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"
import GameHeader from "./GameHeader"
import { cn } from "@/lib/utils"
import FeedbackOverlay from "./FeedbackOverlay"
import LeaderboardScreen from "./LeaderboardScreen"

// ... (interfaces remain the same)
interface Question {
    text: string
    options: string[]
    correctAnswer: number
    timeLimit?: number
}

interface Player {
    uid: string
    displayName: string
    score: number
    answeredQuestions?: number
    currentQuestion?: number
    hasAnsweredCurrent?: boolean
    lastAnswered?: any;
    answerTime?: number;
    streak?: number; // Added for UI
}

interface Quiz {
    title: string
    questions: Question[]
    defaultTimeLimit?: number
}

interface MultiplayerPlayScreenProps {
    quiz: Quiz
    roomId: string
    user: User
    onFinish: (result: any) => void
    onBack: () => void
}

const answerColors = [
  "bg-red-500 hover:bg-red-600",
  "bg-blue-500 hover:bg-blue-600",
  "bg-yellow-500 hover:bg-yellow-600",
  "bg-green-500 hover:bg-green-600",
]

const answerIcons = ["🔺", "♦️", "🟡", "🟩"];


export default function MultiplayerPlayScreen({ quiz, roomId, user, onFinish, onBack }: MultiplayerPlayScreenProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isHost, setIsHost] = useState(false)
    const [myAnswer, setMyAnswer] = useState<number | null>(null)
    const [isMyAnswerCorrect, setIsMyAnswerCorrect] = useState<boolean | null>(null);
    const [showFeedback, setShowFeedback] = useState(false);
    const [showLeaderboard, setShowLeaderboard] = useState(false);
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [timeLeft, setTimeLeft] = useState<number>(0)
    
    const [roomData, setRoomData] = useState<any>(null)

    const currentPlayer = players.find(p => p.uid === user.uid);
    
    const currentQuestion = quiz.questions[currentQuestionIndex]
    const totalQuestions = quiz.questions.length
    const timeLimit = currentQuestion?.timeLimit || quiz.defaultTimeLimit || 30

    const isPlayer = !isHost

    // Main listener for room state changes
    useEffect(() => {
        const unsubscribe = listenToRoomState(roomId, (roomData) => {
            if (!roomData) return;
            
            const newQuestionIndex = roomData.currentQuestionIndex || 0;
            
            if (newQuestionIndex !== currentQuestionIndex) {
                setMyAnswer(null);
                setHasSubmitted(false);
                setShowFeedback(false);
                setIsMyAnswerCorrect(null);
                setShowLeaderboard(false); // Hide leaderboard for new question
                setTimeLeft(timeLimit);
            }
            
            setCurrentQuestionIndex(newQuestionIndex);
            setIsHost(user.uid === roomData.host?.uid);
            
            const playersArray = Object.values(roomData.players || {}).map((p: any) => ({
                ...p,
                streak: p.streak || 0
            })) as Player[];
            setPlayers(playersArray);

            if (roomData.status === "finished") {
                onFinish(roomData.players || []);
            }
            
            setRoomData(roomData);
        });
        return () => unsubscribe?.();
    }, [roomId, user.uid, onFinish, currentQuestionIndex, timeLimit]);


    // Timer logic
    useEffect(() => {
        if (!isPlayer || hasSubmitted) return;

        setTimeLeft(timeLimit)
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    if (myAnswer === null) {
                        handleAnswer(-1); // -1 for time up
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => clearInterval(timer)
    }, [currentQuestionIndex, timeLimit, isPlayer, hasSubmitted, myAnswer])
    
    const handleAnswer = async (answerIndex: number) => {
        if (!isPlayer || hasSubmitted || !currentQuestion) return;

        setMyAnswer(answerIndex);
        setHasSubmitted(true);
        
        const isCorrect = answerIndex === currentQuestion.correctAnswer;
        setIsMyAnswerCorrect(isCorrect);
        setShowFeedback(true);

        const answerTime = Math.max(0, timeLimit - timeLeft);
        const scoreGained = isCorrect ? 10 : 0;
        
        try {
            // This is the missing part: update the player's score on the main room document
            const roomRef = doc(db, "multiplayer_rooms", roomId);
            await updateDoc(roomRef, {
                [`players.${user.uid}.hasAnsweredCurrent`]: true,
                [`players.${user.uid}.score`]: increment(scoreGained),
                [`players.${user.uid}.lastAnswered`]: serverTimestamp(),
                [`players.${user.uid}.answerTime`]: answerTime,
            });

            // This only logs the answer, it does not update the total score
            await submitMultiplayerAnswer(roomId, user.uid, {
                questionIndex: currentQuestionIndex,
                answerIndex: answerIndex,
                correct: isCorrect,
                score: scoreGained,
                answerTime: answerTime,
                timestamp: Date.now(),
            });
        } catch (err: any) {
            setError("Failed to submit answer: " + err.message);
            // Revert optimistic updates on error
            setMyAnswer(null);
            setHasSubmitted(false);
            setShowFeedback(false);
            setIsMyAnswerCorrect(null);
        }
    };

    const allPlayersAnswered = players.length > 0 && players.every(p => p.hasAnsweredCurrent);
    
    // Host logic to decide what to do after everyone has answered
    useEffect(() => {
        if (isHost && allPlayersAnswered && roomData?.status === 'playing' && !showLeaderboard) {
            const isLastQuestion = currentQuestionIndex === totalQuestions - 1;
            const isLeaderboardInterval = (currentQuestionIndex + 1) % 5 === 0;

            const timeout = setTimeout(() => {
                if (isLeaderboardInterval || isLastQuestion) {
                    setShowLeaderboard(true);
                } else {
                    handleNextQuestionByHost();
                }
            }, 2000); // Wait 2s after last answer before showing leaderboard or next question

            return () => clearTimeout(timeout);
        }
    }, [isHost, allPlayersAnswered, roomData?.status, currentQuestionIndex, totalQuestions, showLeaderboard]);

    // Host function to advance the game
    const handleNextQuestionByHost = async () => {
        setShowLeaderboard(false);
        const nextIndex = currentQuestionIndex + 1;
        if (nextIndex < totalQuestions) {
            const roomRef = doc(db, "multiplayer_rooms", roomId);
            const resetUpdates: any = {};
            players.forEach(player => {
                resetUpdates[`players.${player.uid}.hasAnsweredCurrent`] = false;
                resetUpdates[`players.${player.uid}.answerTime`] = null;
            });

            await updateDoc(roomRef, {
                ...resetUpdates,
                currentQuestionIndex: nextIndex,
                lastUpdated: serverTimestamp()
            });
        } else {
            await finishMultiplayerGame(roomId);
        }
    };


    return (
        <div className="min-h-screen bg-gray-100 flex flex-col pt-20">
             {showFeedback && isMyAnswerCorrect !== null && (
                <FeedbackOverlay
                    isCorrect={isMyAnswerCorrect}
                    isTimeUp={myAnswer === -1}
                    onTimeout={() => setShowFeedback(false)}
                />
            )}

            {showLeaderboard && (
                <LeaderboardScreen 
                    players={players}
                    currentUser={user}
                    onContinue={handleNextQuestionByHost}
                />
            )}

            {currentPlayer && 
                <GameHeader 
                    user={user}
                    score={currentPlayer.score}
                    streak={currentPlayer.streak || 0}
                    currentQuestionIndex={currentQuestionIndex}
                    totalQuestions={totalQuestions}
                />
            }

            <main className="flex-grow flex items-center justify-center p-4">
                <div className="w-full max-w-4xl">
                    
                    {/* Timer */}
                    <div className="relative w-24 h-24 mx-auto mb-6">
                        <svg className="w-full h-full" viewBox="0 0 100 100">
                            <circle
                                className="text-gray-200"
                                strokeWidth="10"
                                stroke="currentColor"
                                fill="transparent"
                                r="45"
                                cx="50"
                                cy="50"
                            />
                            <circle
                                className={cn("transition-colors duration-500", timeLeft <= 10 ? "text-red-500" : "text-purple-600")}
                                strokeWidth="10"
                                strokeDasharray={2 * Math.PI * 45}
                                strokeDashoffset={ (2 * Math.PI * 45) * (1 - (timeLeft / timeLimit)) }
                                strokeLinecap="round"
                                stroke="currentColor"
                                fill="transparent"
                                r="45"
                                cx="50"
                                cy="50"
                                style={{ transform: 'rotate(-90deg)', transformOrigin: '50% 50%', transition: 'stroke-dashoffset 1s linear' }}
                            />
                        </svg>
                        <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-3xl font-bold text-gray-800">{timeLeft}</span>
                        </div>
                    </div>


                    {/* Question Container */}
                    <div className="bg-white rounded-2xl shadow-xl p-8 md:p-12 mb-6">
                        <h2 className="text-center text-2xl md:text-3xl font-bold text-gray-800">
                            {currentQuestion?.text || "Loading question..."}
                        </h2>
                    </div>

                    {isPlayer ? (
                        <>
                            {/* Answer Options */}
                            {!hasSubmitted &&
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    {currentQuestion?.options?.map((option, index) => (
                                        <button
                                            key={index}
                                            onClick={() => handleAnswer(index)}
                                            disabled={hasSubmitted}
                                            className={cn(
                                                "p-4 rounded-xl text-white font-bold text-lg text-left flex items-center gap-4 transform transition-all duration-200",
                                                answerColors[index]
                                            )}
                                        >
                                            <div className="text-2xl">{answerIcons[index]}</div>
                                            <span>{option}</span>
                                        </button>
                                    ))}
                                </div>
                            }

                            {hasSubmitted && !showFeedback && !showLeaderboard && (
                                <div className="mt-6 text-center animate-fade-in">
                                  <p className="mt-2 text-gray-600 text-lg font-semibold">Waiting for other players...</p>
                                </div>
                            )}
                        </>
                    ) : (
                        // HOST VIEW
                        <div className="text-center p-6 bg-gray-50 rounded-2xl border">
                             <h3 className="text-xl font-bold text-gray-700 mb-2">You are hosting</h3>
                             <p className="text-gray-600 mb-6">
                                 {allPlayersAnswered ? "All players have answered." : "Players are answering..."}
                             </p>
                             <div className="grid grid-cols-2 gap-4 max-w-sm mx-auto">
                                <div className="p-4 rounded-lg border-2 border-blue-200 bg-blue-50">
                                    <div className="text-3xl font-bold text-blue-600">
                                        {players.filter(p => p.hasAnsweredCurrent).length}
                                    </div>
                                    <div className="text-sm">Answered</div>
                                 </div>
                                <div className="p-4 rounded-lg border border-gray-200 bg-white">
                                    <div className="text-3xl font-bold text-gray-600">
                                        {players.length}
                                    </div>
                                    <div className="text-sm">Total Players</div>
                                 </div>
                             </div>
                        </div>
                    )}
                </div>
            </main>
        </div>
    );
}