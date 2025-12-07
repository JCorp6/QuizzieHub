"use client"

import { useState, useEffect, useCallback } from "react"
import { User } from "firebase/auth"
import { 
    listenToRoomPlayers, 
    listenToRoomState,
    finishMultiplayerGame,
    submitMultiplayerAnswer,
    resetPlayersForNextQuestion // Pastikan fungsi ini ada
} from "@/lib/firebaseMultiplayer" 
import { doc, setDoc, Timestamp, updateDoc, increment, serverTimestamp } from "firebase/firestore"
import { db } from "@/lib/firebase"

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
    lastAnswered?: any
    answerTime?: number
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

export default function MultiplayerPlayScreen({ quiz, roomId, user, onFinish, onBack }: MultiplayerPlayScreenProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
    const [isHost, setIsHost] = useState(false)
    const [myAnswer, setMyAnswer] = useState<number | null>(null)
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)
    const [hasSubmitted, setHasSubmitted] = useState(false)
    const [timeLeft, setTimeLeft] = useState<number>(0)
    const [isAutoProceeding, setIsAutoProceeding] = useState(false)
    const [roomData, setRoomData] = useState<any>(null)
    const [questionChanged, setQuestionChanged] = useState(false) // Flag untuk pertanyaan berubah

    const currentQuestion = quiz.questions[currentQuestionIndex]
    const totalQuestions = quiz.questions.length
    const timeLimit = currentQuestion?.timeLimit || quiz.defaultTimeLimit || 30

    const isPlayer = !isHost

    // 1. Listen ke Status Room - PERBAIKAN: Reset state saat pertanyaan berubah
    useEffect(() => {
        const unsubscribe = listenToRoomState(roomId, (roomData) => {
            if (roomData) {
                const newQuestionIndex = roomData.currentQuestionIndex || 0
                
                // Cek jika pertanyaan berubah
                if (newQuestionIndex !== currentQuestionIndex) {
                    console.log(`🔄 Question changed: ${currentQuestionIndex} -> ${newQuestionIndex}`)
                    setQuestionChanged(true)
                    
                    // Reset player state untuk pertanyaan baru
                    setMyAnswer(null)
                    setHasSubmitted(false)
                    setTimeLeft(timeLimit)
                    setIsAutoProceeding(false)
                }
                
                setCurrentQuestionIndex(newQuestionIndex)
                setIsHost(user.uid === roomData.host?.uid)
                setRoomData(roomData)

                if (roomData.status === "finished") {
                    onFinish(roomData.players || []) 
                }
            }
        })
        return () => unsubscribe?.()
    }, [roomId, user.uid, onFinish, currentQuestionIndex, timeLimit])

    // 2. Reset efek saat pertanyaan berubah - PERBAIKAN KRITIS
    useEffect(() => {
        if (questionChanged && isPlayer) {
            console.log("🔄 Resetting states for new question")
            setMyAnswer(null)
            setHasSubmitted(false)
            setTimeLeft(timeLimit)
            setQuestionChanged(false)
            
            // Force re-check player status
            const player = players.find(p => p.uid === user.uid)
            if (player) {
                console.log("Current player status:", {
                    uid: player.uid,
                    hasAnsweredCurrent: player.hasAnsweredCurrent,
                    currentQuestion: player.currentQuestion
                })
            }
        }
    }, [questionChanged, isPlayer, players, user.uid, timeLimit])

    // 3. Listen ke Daftar Pemain
    useEffect(() => {
        console.log("🎮 Setting up player listener...")
        
        const unsubscribePlayers = listenToRoomPlayers(roomId, (updatedPlayers) => {
            console.log("📡 Players realtime update:", updatedPlayers.map(p => ({
                name: p.displayName,
                hasAnswered: p.hasAnsweredCurrent,
                currentQ: p.currentQuestion
            })))
            
            const validPlayers = updatedPlayers
                .filter(p => p && p.uid && p.uid !== roomData?.host?.uid)
                .map(p => ({
                    ...p,
                    hasAnsweredCurrent: p.hasAnsweredCurrent === true,
                    currentQuestion: p.currentQuestion || 0,
                    score: p.score || 0,
                    answerTime: p.answerTime || 0
                }))
            
            const sortedPlayers = validPlayers.sort((a, b) => b.score - a.score)
            setPlayers(sortedPlayers)
            
            // Update status current user
            if (isPlayer) {
                const currentPlayer = validPlayers.find(p => p.uid === user.uid)
                if (currentPlayer) {
                    const shouldBeSubmitted = currentPlayer.hasAnsweredCurrent === true
                    if (hasSubmitted !== shouldBeSubmitted) {
                        console.log(`🔄 Updating hasSubmitted: ${hasSubmitted} -> ${shouldBeSubmitted}`)
                        setHasSubmitted(shouldBeSubmitted)
                    }
                    
                    // Jika sudah jawab tapi state lokal null, update
                    if (shouldBeSubmitted && myAnswer === null) {
                        console.log("🔄 Player has answered but local state is null, syncing...")
                        // Bisa set ke placeholder atau tetap null untuk UI
                    }
                }
            }
        })
        
        return () => unsubscribePlayers?.()
    }, [roomId, user.uid, isHost, roomData, isPlayer, hasSubmitted, myAnswer])

    // 4. Timer untuk pertanyaan - PERBAIKAN: Reset timer untuk setiap pertanyaan
    useEffect(() => {
        if (isHost || !isPlayer || !currentQuestion) return
        
        console.log(`⏱️ Starting timer for question ${currentQuestionIndex + 1}: ${timeLimit}s`)
        
        // Reset timer
        setTimeLeft(timeLimit)
        
        const timer = setInterval(() => {
            setTimeLeft(prev => {
                if (prev <= 1) {
                    clearInterval(timer)
                    // Auto-submit hanya jika belum submit
                    if (!hasSubmitted && myAnswer === null) {
                        console.log("⏰ Time's up! Auto-submitting...")
                        handleAutoSubmit()
                    }
                    return 0
                }
                return prev - 1
            })
        }, 1000)

        return () => {
            console.log(`⏱️ Cleaning up timer for question ${currentQuestionIndex + 1}`)
            clearInterval(timer)
        }
    }, [currentQuestionIndex, timeLimit, isPlayer, hasSubmitted, myAnswer, isHost, currentQuestion])

    // 5. Auto-check untuk lanjut ke pertanyaan berikutnya
    useEffect(() => {
        if (!isHost || loading) return
        
        const checkAutoProceed = () => {
            if (players.length === 0) return
            
            const allHaveAnswered = players.every(p => p.hasAnsweredCurrent === true)
            
            if (allHaveAnswered && !isAutoProceeding) {
                setIsAutoProceeding(true)
                console.log("🚀 All players answered, auto proceeding...")
                
                setTimeout(() => {
                    handleNextQuestion()
                }, 2000)
            }
        }
        
        const interval = setInterval(checkAutoProceed, 1000)
        return () => clearInterval(interval)
    }, [players, isHost, isAutoProceeding, loading])

    // 6. Cek apakah semua pemain sudah menjawab
    const allAnswered = useCallback(() => {
        if (players.length === 0) return false
        
        const answeredCount = players.filter(p => p.hasAnsweredCurrent === true).length
        const result = answeredCount === players.length
        
        console.log("🔍 All Answered Check:", {
            totalPlayers: players.length,
            answeredCount,
            result,
            question: currentQuestionIndex + 1
        })
        
        return result
    }, [players, currentQuestionIndex])

    // Auto-submit ketika waktu habis
    const handleAutoSubmit = async () => {
        if (hasSubmitted || myAnswer !== null || !isPlayer) return
        
        console.log("⏰ Time's up! Auto-submitting...")
        setHasSubmitted(true)
        setMyAnswer(-1)
        
        try {
            const roomRef = doc(db, "multiplayer_rooms", roomId)
            
            await updateDoc(roomRef, {
                [`players.${user.uid}.hasAnsweredCurrent`]: true,
                [`players.${user.uid}.currentQuestion`]: currentQuestionIndex + 1,
                [`players.${user.uid}.answerTime`]: timeLimit,
                [`players.${user.uid}.lastAnswered`]: Timestamp.now(),
                [`players.${user.uid}.updatedAt`]: serverTimestamp()
            })
            
            await submitMultiplayerAnswer(roomId, user.uid, {
                questionIndex: currentQuestionIndex,
                answerIndex: -1,
                correct: false,
                score: 0,
                timestamp: Date.now(),
            })
            
            console.log("✅ Auto-submit berhasil")
            
        } catch (err: any) {
            console.error("Error in auto-submit:", err)
        }
    }

    const handleAnswer = async (answerIndex: number) => {
        if (!isPlayer || myAnswer !== null || hasSubmitted || !currentQuestion) {
            console.log("❌ Cannot answer:", {
                isPlayer, myAnswer, hasSubmitted, currentQuestion
            })
            return
        }

        console.log(`🎯 User ${user.uid} answering question ${currentQuestionIndex + 1}: option ${answerIndex}`)
        
        setMyAnswer(answerIndex)
        setHasSubmitted(true)
        
        const answerTime = Math.max(0, timeLimit - timeLeft)
        const isCorrect = answerIndex === currentQuestion.correctAnswer
        const scoreGained = isCorrect ? 10 : 0
        
        try {
            const roomRef = doc(db, "multiplayer_rooms", roomId)
            
            await updateDoc(roomRef, {
                [`players.${user.uid}.hasAnsweredCurrent`]: true,
                [`players.${user.uid}.score`]: increment(scoreGained),
                [`players.${user.uid}.currentQuestion`]: currentQuestionIndex + 1,
                [`players.${user.uid}.answerTime`]: answerTime,
                [`players.${user.uid}.lastAnswered`]: Timestamp.now(),
                [`players.${user.uid}.updatedAt`]: serverTimestamp()
            })
            
            await submitMultiplayerAnswer(roomId, user.uid, {
                questionIndex: currentQuestionIndex,
                answerIndex: answerIndex,
                correct: isCorrect,
                score: scoreGained,
                answerTime: answerTime,
                timestamp: Date.now(),
            })
            
            console.log(`✅ Jawaban disimpan: Q${currentQuestionIndex + 1}, time: ${answerTime}s, correct: ${isCorrect}`)
            
        } catch (err: any) {
            console.error("Error in handleAnswer:", err)
            setError("Gagal menyimpan jawaban: " + err.message)
            setMyAnswer(null)
            setHasSubmitted(false)
        }
    }

    const handleNextQuestion = async () => {
        console.log("⏭️ Next clicked:", { 
            isHost, 
            loading, 
            allAnswered: allAnswered(),
            playersCount: players.length,
            question: currentQuestionIndex + 1
        })
        
        if (!isHost || loading || !allAnswered()) {
            console.log("❌ Cannot proceed")
            return
        }
        
        setLoading(true)
        setIsAutoProceeding(false)
        setError("")

        const nextIndex = currentQuestionIndex + 1
        
        try {
            const roomRef = doc(db, "multiplayer_rooms", roomId)
            
            if (nextIndex < totalQuestions) {
                console.log(`📝 Moving from question ${currentQuestionIndex + 1} to ${nextIndex + 1}`)
                
                // Reset semua player untuk pertanyaan berikutnya
                const resetUpdates: any = {}
                players.forEach(player => {
                    resetUpdates[`players.${player.uid}.hasAnsweredCurrent`] = false
                    resetUpdates[`players.${player.uid}.answerTime`] = null
                })
                
                await updateDoc(roomRef, {
                    ...resetUpdates,
                    currentQuestionIndex: nextIndex,
                    lastUpdated: serverTimestamp()
                })
                
                console.log("✅ All players reset for next question")
                
                // Reset local state untuk host (hanya visual)
                if (isHost) {
                    setMyAnswer(null)
                    setHasSubmitted(false)
                }
                
            } else {
                console.log("🏁 Finishing game...")
                await finishMultiplayerGame(roomId)
            }
        } catch (err: any) {
            console.error("❌ Error in handleNextQuestion:", err)
            setError("Gagal melanjutkan: " + err.message)
        } finally {
            setLoading(false)
        }
    }

    const getOptionClass = (index: number) => {
        if (!currentQuestion) return "border-gray-300 bg-gray-100"
        
        if (myAnswer === null || !hasSubmitted) {
            return "border-gray-300 hover:border-blue-400 bg-white hover:bg-blue-50"
        }
        
        const isCorrectOption = index === currentQuestion.correctAnswer
        const isMyAnswer = index === myAnswer
        
        if (isMyAnswer && isCorrectOption) return "border-green-500 bg-green-500 text-white shadow-lg"
        if (isMyAnswer && !isCorrectOption) return "border-red-500 bg-red-500 text-white shadow-lg"
        if (isCorrectOption) return "border-green-300 bg-green-100 text-green-800"
        
        return "border-gray-300 bg-gray-100 opacity-60"
    }

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60)
        const secs = seconds % 60
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Header */}
                <div className="flex justify-between items-center mb-6">
                    <button
                        onClick={onBack}
                        className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                    >
                        ← Kembali
                    </button>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-gray-800">{quiz.title}</h1>
                        <p className="text-gray-600">Room: {roomId.slice(0, 8)}...</p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-xl font-bold text-blue-600">
                            Q{currentQuestionIndex + 1}/{totalQuestions}
                        </div>
                        {isHost && (
                            <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                👑 Host
                            </span>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                        <p className="text-red-700">{error}</p>
                    </div>
                )}

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                    {/* Left Column */}
                    <div className="lg:col-span-1 space-y-6">
                        {/* Timer untuk Player */}
                        {isPlayer && (
                            <div className="bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl shadow-lg p-5 text-white">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="font-bold">Waktu Tersisa</span>
                                    <span className="text-2xl font-bold">{formatTime(timeLeft)}</span>
                                </div>
                                <div className="w-full bg-white/30 rounded-full h-2">
                                    <div 
                                        className="bg-white h-2 rounded-full transition-all duration-1000"
                                        style={{ width: `${(timeLeft / timeLimit) * 100}%` }}
                                    />
                                </div>
                                <p className="text-sm mt-2 text-white/80">
                                    {hasSubmitted ? "✓ Sudah menjawab" : `⏳ Jawab dalam ${timeLeft}s`}
                                </p>
                            </div>
                        )}

                        {/* Leaderboard */}
                        <div className="bg-white rounded-xl shadow-lg p-5">
                            <h2 className="text-xl font-bold text-gray-800 mb-4">
                                Live Leaderboard 🏆 
                                <span className="text-sm font-normal text-gray-500 ml-2">
                                    (Q{currentQuestionIndex + 1})
                                </span>
                            </h2>
                            <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                {players.length === 0 ? (
                                    <div className="text-center py-8">
                                        <div className="text-4xl mb-2">👤</div>
                                        <p className="text-gray-500">Belum ada pemain...</p>
                                    </div>
                                ) : (
                                    players.map((player, index) => {
                                        const hasAnswered = player.hasAnsweredCurrent === true
                                        const isCurrentUser = player.uid === user.uid
                                        
                                        return (
                                            <div 
                                                key={player.uid} 
                                                className={`flex items-center justify-between p-3 rounded-lg border transition-all ${
                                                    index === 0 ? 'border-yellow-400 bg-yellow-50' :
                                                    isCurrentUser ? 'border-blue-400 bg-blue-50' :
                                                    'border-gray-200 bg-gray-50'
                                                } ${hasAnswered ? 'scale-[1.02] shadow-sm' : ''}`}
                                            >
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${
                                                        index === 0 ? 'bg-yellow-500 text-white' :
                                                        isCurrentUser ? 'bg-blue-500 text-white' :
                                                        'bg-gray-300 text-gray-700'
                                                    }`}>
                                                        {index + 1}
                                                    </div>
                                                    <div>
                                                        <div className="flex items-center gap-2">
                                                            <span className={`font-medium ${
                                                                isCurrentUser ? 'text-blue-700' : 'text-gray-700'
                                                            }`}>
                                                                {player.displayName}
                                                                {isCurrentUser && ' (Anda)'}
                                                            </span>
                                                            {hasAnswered && (
                                                                <span className="w-5 h-5 rounded-full bg-green-500 flex items-center justify-center animate-pulse">
                                                                    <span className="text-white text-xs">✓</span>
                                                                </span>
                                                            )}
                                                        </div>
                                                        <div className="text-xs text-gray-500">
                                                            {player.score} poin • {player.answerTime ? `${player.answerTime}s` : "belum"}
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <div className={`text-xs px-2 py-1 rounded-full ${
                                                        hasAnswered 
                                                            ? 'bg-green-100 text-green-800 animate-pulse' 
                                                            : 'bg-yellow-100 text-yellow-800'
                                                    }`}>
                                                        {hasAnswered ? '✓ Sudah' : '⏳ Menunggu'}
                                                    </div>
                                                </div>
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                        </div>

                        {/* Status Box */}
                        <div className="bg-white rounded-xl shadow-lg p-5">
                            <h3 className="font-bold text-gray-700 mb-3">Status Game</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Pemain:</span>
                                    <span className="font-semibold">{players.length} orang</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Sudah Jawab:</span>
                                    <span className={`font-semibold ${allAnswered() ? 'text-green-600 animate-pulse' : ''}`}>
                                        {players.filter(p => p.hasAnsweredCurrent).length}/{players.length}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-gray-600">Pertanyaan:</span>
                                    <span className="font-semibold">{currentQuestionIndex + 1}/{totalQuestions}</span>
                                </div>
                                {isHost && allAnswered() && (
                                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg animate-pulse">
                                        <div className="flex items-center gap-2">
                                            <span className="text-green-600">✅</span>
                                            <div>
                                                <p className="font-medium text-green-700">Semua sudah menjawab!</p>
                                                <p className="text-sm text-green-600">Akan otomatis lanjut...</p>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Question Area */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                            {/* Question Header */}
                            <div className="p-6 border-b border-gray-200">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium mb-2">
                                            Pertanyaan #{currentQuestionIndex + 1}
                                        </div>
                                        <h2 className="text-2xl font-bold text-gray-800">
                                            {currentQuestion?.text || "Memuat pertanyaan..."}
                                        </h2>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-lg font-bold text-gray-900">10 Poin</div>
                                        <div className="text-sm text-gray-600">per jawaban benar</div>
                                    </div>
                                </div>
                            </div>

                            {/* Question Area */}
                            <div className="p-6">
                                {isHost ? (
                                    /* HOST VIEW */
                                    <div className="text-center py-12">
                                        <div className="text-5xl mb-4">📊</div>
                                        <h3 className="text-xl font-bold text-gray-700 mb-2">Anda sedang memonitor</h3>
                                        <p className="text-gray-600 mb-6">
                                            Game akan otomatis lanjut ketika semua pemain sudah menjawab.
                                        </p>
                                        
                                        <div className="grid grid-cols-2 gap-4 max-w-md mx-auto">
                                            <div className={`p-4 rounded-lg border-2 ${allAnswered() ? 'border-green-500 bg-green-50' : 'border-blue-200 bg-blue-50'}`}>
                                                <div className="text-3xl font-bold text-blue-600">
                                                    {players.filter(p => p.hasAnsweredCurrent).length}
                                                </div>
                                                <div className="text-sm">Sudah Jawab</div>
                                            </div>
                                            <div className="p-4 rounded-lg border border-purple-200 bg-purple-50">
                                                <div className="text-3xl font-bold text-purple-600">
                                                    {players.filter(p => !p.hasAnsweredCurrent).length}
                                                </div>
                                                <div className="text-sm">Belum Jawab</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    /* PLAYER VIEW */
                                    <>
                                        {!hasSubmitted ? (
                                            // Belum jawab
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {currentQuestion?.options?.map((option, index) => {
                                                    const letter = String.fromCharCode(65 + index)
                                                    return (
                                                        <button
                                                            key={index}
                                                            onClick={() => handleAnswer(index)}
                                                            disabled={hasSubmitted || timeLeft <= 0}
                                                            className="p-5 rounded-xl border-2 border-gray-300 bg-white hover:border-blue-400 hover:bg-blue-50 hover:scale-[1.02] hover:shadow-md transition-all duration-200 text-left"
                                                        >
                                                            <div className="flex items-center">
                                                                <div className="w-10 h-10 rounded-lg bg-gray-100 text-gray-700 flex items-center justify-center font-bold mr-4">
                                                                    {letter}
                                                                </div>
                                                                <span className="text-lg font-medium">{option}</span>
                                                            </div>
                                                        </button>
                                                    )
                                                })}
                                            </div>
                                        ) : (
                                            // Sudah jawab
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                {currentQuestion?.options?.map((option, index) => {
                                                    const letter = String.fromCharCode(65 + index)
                                                    const isSelected = myAnswer === index
                                                    const isCorrect = index === currentQuestion.correctAnswer
                                                    
                                                    return (
                                                        <div
                                                            key={index}
                                                            className={`
                                                                p-5 rounded-xl border-2 text-left transition-all duration-200
                                                                ${isSelected 
                                                                    ? (isCorrect 
                                                                        ? 'border-green-500 bg-green-500 text-white shadow-lg' 
                                                                        : 'border-red-500 bg-red-500 text-white shadow-lg')
                                                                    : isCorrect 
                                                                        ? 'border-green-300 bg-green-100 text-green-800'
                                                                        : 'border-gray-300 bg-gray-100 opacity-60'
                                                                }
                                                            `}
                                                        >
                                                            <div className="flex items-center">
                                                                <div className={`
                                                                    w-10 h-10 rounded-lg flex items-center justify-center font-bold mr-4
                                                                    ${isSelected 
                                                                        ? (isCorrect ? 'bg-white text-green-500' : 'bg-white text-red-500')
                                                                        : isCorrect 
                                                                            ? 'bg-green-500 text-white'
                                                                            : 'bg-gray-200 text-gray-500'
                                                                    }
                                                                `}>
                                                                    {letter}
                                                                </div>
                                                                <span className="text-lg font-medium">{option}</span>
                                                            </div>
                                                        </div>
                                                    )
                                                })}
                                            </div>
                                        )}

                                        {/* Answer Status */}
                                        {hasSubmitted && (
                                            <div className="mt-6 animate-fade-in">
                                                <div className={`
                                                    p-4 rounded-lg text-center font-bold
                                                    ${myAnswer === currentQuestion?.correctAnswer
                                                        ? 'bg-green-50 border border-green-200 text-green-700'
                                                        : myAnswer === -1
                                                            ? 'bg-yellow-50 border border-yellow-200 text-yellow-700'
                                                            : 'bg-red-50 border border-red-200 text-red-700'
                                                    }
                                                `}>
                                                    {myAnswer === currentQuestion?.correctAnswer
                                                        ? `✅ Jawaban Benar! +10 poin`
                                                        : myAnswer === -1
                                                            ? `⏰ Waktu habis! Tidak menjawab`
                                                            : `❌ Jawaban Salah. Jawaban benar: ${String.fromCharCode(65 + (currentQuestion?.correctAnswer || 0))}`
                                                    }
                                                </div>
                                            </div>
                                        )}

                                        {/* Waiting Status */}
                                        {hasSubmitted && (
                                            <div className="mt-6 animate-fade-in">
                                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-center">
                                                    <div className="flex items-center justify-center gap-3">
                                                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center">
                                                            <span className="text-white">✓</span>
                                                        </div>
                                                        <div>
                                                            <p className="font-semibold text-blue-700">
                                                                {allAnswered() 
                                                                    ? '🎉 Semua sudah jawab!' 
                                                                    : '⏳ Menunggu pemain lain...'}
                                                            </p>
                                                            <p className="text-sm text-blue-600">
                                                                {allAnswered()
                                                                    ? 'Akan lanjut otomatis...'
                                                                    : `${players.filter(p => !p.hasAnsweredCurrent).length} pemain belum jawab`}
                                                            </p>
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        )}
                                    </>
                                )}

                                {/* Host Controls */}
                                {isHost && (
                                    <div className="mt-8">
                                        <div className="bg-gradient-to-r from-gray-50 to-gray-100 border border-gray-300 rounded-lg p-6">
                                            <h4 className="font-bold text-gray-800 mb-3">🎮 Kontrol Game</h4>
                                            <div className="space-y-4">
                                                <div className="flex items-center justify-between">
                                                    <div>
                                                        <p className="font-medium text-gray-700">Status</p>
                                                        <p className="text-sm text-gray-600">
                                                            {allAnswered() 
                                                                ? '✅ Semua sudah jawab' 
                                                                : `⏳ ${players.filter(p => p.hasAnsweredCurrent).length}/${players.length} sudah jawab`}
                                                        </p>
                                                    </div>
                                                    <button 
                                                        onClick={handleNextQuestion}
                                                        disabled={loading || !allAnswered()}
                                                        className={`
                                                            px-5 py-2 font-medium rounded-lg transition-all
                                                            ${allAnswered()
                                                                ? 'bg-gradient-to-r from-green-600 to-emerald-600 hover:from-green-700 hover:to-emerald-700 text-white'
                                                                : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                                            }
                                                        `}
                                                    >
                                                        {loading ? (
                                                            <span className="flex items-center gap-2">
                                                                <span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></span>
                                                                Memproses...
                                                            </span>
                                                        ) : currentQuestionIndex < totalQuestions - 1 ? (
                                                            "Lanjut Manual"
                                                        ) : (
                                                            "Selesaikan Game"
                                                        )}
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Debug Panel */}
                        <div className="mt-6 p-4 bg-gray-800 text-white rounded-lg text-sm">
                            <div className="font-bold mb-2">🔧 Debug Info</div>
                            <div className="grid grid-cols-3 gap-2">
                                <div>Q: {currentQuestionIndex + 1}/{totalQuestions}</div>
                                <div>Players: {players.length}</div>
                                <div>Answered: {players.filter(p => p.hasAnsweredCurrent).length}</div>
                                <div>Role: {isHost ? "HOST" : "PLAYER"}</div>
                                <div>Submitted: {hasSubmitted ? "YES" : "NO"}</div>
                                <div>Time: {formatTime(timeLeft)}</div>
                            </div>
                            <button 
                                onClick={() => {
                                    console.log("=== DEBUG ===")
                                    console.log("Current Question:", currentQuestionIndex + 1)
                                    console.log("Has Submitted:", hasSubmitted)
                                    console.log("My Answer:", myAnswer)
                                    console.log("All Answered:", allAnswered())
                                    console.log("Players:", players.map(p => ({
                                        name: p.displayName,
                                        answered: p.hasAnsweredCurrent,
                                        score: p.score
                                    })))
                                    console.log("Time Left:", timeLeft)
                                }}
                                className="mt-3 w-full py-2 bg-blue-600 hover:bg-blue-700 rounded"
                            >
                                Show Console Logs
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}