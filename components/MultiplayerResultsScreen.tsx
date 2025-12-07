"use client"

import { useState, useEffect } from "react"
import { User } from "firebase/auth"
import { doc, getDoc, collection, getDocs, query, orderBy } from "firebase/firestore"
import { db } from "@/lib/firebase"

interface Player {
    uid: string
    displayName: string
    score: number
    answeredQuestions?: number
    answerTime?: number
    joinedAt?: any
    correctAnswers?: number
    averageTime?: number
    hasAnsweredCurrent?: boolean
    currentQuestion?: number
}

interface Question {
    text: string
    options: string[]
    correctAnswer: number
    timeLimit?: number
}

interface Answer {
    questionIndex: number
    answerIndex: number
    correct: boolean
    score: number
    answerTime: number
    userId: string
    displayName?: string
    submittedAt: any
    timestamp?: any
}

interface Quiz {
    title: string
    questions: Question[]
    defaultTimeLimit?: number
    description?: string
    category?: string
}

interface MultiplayerResultScreenProps {
    quiz: Quiz
    roomId: string
    user: User
    onBackToLobby: () => void
    onNewGame: () => void
    isHost: boolean
}

interface QuestionAnalysis {
    questionIndex: number
    questionText: string
    options: string[]
    correctAnswer: number
    totalAnswers: number
    optionStats: {
        [key: number]: {
            count: number
            percentage: number
            isCorrect: boolean
        }
    }
    correctPercentage: number
    averageTime: number
    fastestAnswer?: {
        playerName: string
        time: number
    }
    mostChosenOption: number
}

export default function MultiplayerResultScreen({
    quiz,
    roomId,
    user,
    onBackToLobby,
    onNewGame,
    isHost
}: MultiplayerResultScreenProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [answers, setAnswers] = useState<Answer[]>([])
    const [questionAnalysis, setQuestionAnalysis] = useState<QuestionAnalysis[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'podium' | 'leaderboard' | 'questions' | 'playerDetails'>('podium')
    const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
    const [playerAnswers, setPlayerAnswers] = useState<Answer[]>([])
    const [error, setError] = useState<string>("")

    // 1. Fetch data dari Firebase
    useEffect(() => {
        const fetchGameResults = async () => {
            try {
                console.log("🚀 Fetching game results for room:", roomId)
                setLoading(true)
                setError("")

                // Fetch room data
                const roomRef = doc(db, "multiplayer_rooms", roomId)
                const roomSnap = await getDoc(roomRef)

                if (!roomSnap.exists()) {
                    setError("Room tidak ditemukan")
                    setLoading(false)
                    return
                }

                const roomData = roomSnap.data()
                console.log("📦 Room data:", roomData)

                // Normalize players data
                const playersData = roomData.players || {}
                let playersArray: Player[] = []

                if (Array.isArray(playersData)) {
                    playersArray = playersData
                } else if (typeof playersData === 'object' && playersData !== null) {
                    // Convert object to array, filter out host
                    const allPlayers = Object.values(playersData) as Player[]
                    playersArray = allPlayers.filter(player => {
                        return player && 
                               player.uid && 
                               player.uid !== roomData.host?.uid &&
                               player.displayName
                    })
                    
                    console.log("👥 After filtering:", playersArray)
                }

                console.log("✅ Players array:", playersArray)
                setPlayers(playersArray)

                // Fetch answers
                try {
                    const answersRef = collection(db, "multiplayer_rooms", roomId, "answers")
                    const q = query(answersRef, orderBy("submittedAt", "asc"))
                    const answersSnap = await getDocs(q)
                    
                    const answersData: Answer[] = []
                    answersSnap.forEach((doc) => {
                        const data = doc.data()
                        const player = playersArray.find(p => p.uid === data.userId)
                        answersData.push({
                            questionIndex: data.questionIndex || 0,
                            answerIndex: data.answerIndex || -1,
                            correct: data.correct || false,
                            score: data.score || 0,
                            answerTime: data.answerTime || 0,
                            userId: data.userId,
                            displayName: player?.displayName || "Unknown",
                            submittedAt: data.submittedAt,
                            timestamp: data.timestamp
                        })
                    })
                    
                    console.log("✅ Answers data:", answersData)
                    setAnswers(answersData)
                    
                    // Analyze questions if we have players
                    if (playersArray.length > 0 && quiz?.questions) {
                        analyzeQuestions(answersData, playersArray)
                    }
                } catch (answersError) {
                    console.warn("⚠️ No answers found:", answersError)
                    setAnswers([])
                }

            } catch (err: any) {
                console.error("❌ Error fetching game results:", err)
                setError("Gagal memuat hasil game: " + err.message)
            } finally {
                setLoading(false)
            }
        }

        if (roomId && quiz) {
            fetchGameResults()
        }
    }, [roomId, quiz])

    // 2. Analisis soal
    const analyzeQuestions = (answersData: Answer[], playersArray: Player[]) => {
        try {
            console.log("📊 Analyzing questions...")
            const analysis: QuestionAnalysis[] = []
            
            quiz.questions.forEach((question, questionIndex) => {
                const questionAnswers = answersData.filter(a => a.questionIndex === questionIndex)
                const totalAnswers = questionAnswers.length
                
                console.log(`Q${questionIndex + 1}: ${totalAnswers} answers`)
                
                if (totalAnswers === 0) {
                    analysis.push({
                        questionIndex,
                        questionText: question.text,
                        options: question.options,
                        correctAnswer: question.correctAnswer,
                        totalAnswers: 0,
                        optionStats: {},
                        correctPercentage: 0,
                        averageTime: 0,
                        mostChosenOption: -1
                    })
                    return
                }

                // Hitung statistik per opsi
                const optionStats: { [key: number]: { count: number, percentage: number, isCorrect: boolean } } = {}
                question.options.forEach((_, optionIndex) => {
                    const count = questionAnswers.filter(a => a.answerIndex === optionIndex).length
                    optionStats[optionIndex] = {
                        count,
                        percentage: (count / totalAnswers) * 100,
                        isCorrect: optionIndex === question.correctAnswer
                    }
                })

                // Hitung persentase benar
                const correctAnswers = questionAnswers.filter(a => a.correct).length
                const correctPercentage = (correctAnswers / totalAnswers) * 100

                // Rata-rata waktu jawab
                const totalTime = questionAnswers.reduce((sum, a) => sum + (a.answerTime || 0), 0)
                const averageTime = totalAnswers > 0 ? totalTime / totalAnswers : 0

                // Jawaban tercepat
                let fastestAnswer: Answer | undefined
                if (questionAnswers.length > 0) {
                    fastestAnswer = questionAnswers.reduce((fastest, current) => {
                        const fastestTime = fastest.answerTime || Infinity
                        const currentTime = current.answerTime || Infinity
                        return currentTime < fastestTime ? current : fastest
                    })
                }

                // Opsi paling banyak dipilih
                let mostChosenOption = -1
                let maxCount = 0
                Object.entries(optionStats).forEach(([option, stats]) => {
                    if (stats.count > maxCount) {
                        maxCount = stats.count
                        mostChosenOption = parseInt(option)
                    }
                })

                analysis.push({
                    questionIndex,
                    questionText: question.text,
                    options: question.options,
                    correctAnswer: question.correctAnswer,
                    totalAnswers,
                    optionStats,
                    correctPercentage,
                    averageTime,
                    fastestAnswer: fastestAnswer ? {
                        playerName: fastestAnswer.displayName || "Unknown",
                        time: fastestAnswer.answerTime || 0
                    } : undefined,
                    mostChosenOption
                })
            })

            console.log("✅ Analysis complete:", analysis.length, "questions")
            setQuestionAnalysis(analysis)
        } catch (error) {
            console.error("Error analyzing questions:", error)
            setQuestionAnalysis([])
        }
    }

    // 3. Fetch jawaban untuk player tertentu
    const fetchPlayerAnswers = (player: Player) => {
        try {
            const playerAnswersData = answers.filter(a => a.userId === player.uid)
            setPlayerAnswers(playerAnswersData)
            setSelectedPlayer(player)
            setActiveTab('playerDetails')
        } catch (error) {
            console.error("Error fetching player answers:", error)
            setPlayerAnswers([])
        }
    }

    // Format waktu
    const formatTime = (seconds: number) => {
        if (seconds < 60) {
            return `${seconds.toFixed(1)}s`
        }
        const mins = Math.floor(seconds / 60)
        const secs = Math.floor(seconds % 60)
        return `${mins}:${secs.toString().padStart(2, '0')}`
    }

    // Format persentase
    const formatPercentage = (value: number) => {
        return `${value.toFixed(1)}%`
    }

    const sortedPlayers = [...players].sort((a, b) => b.score - a.score)
    const topThree = sortedPlayers.slice(0, 3)

    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-blue-600 mx-auto mb-4"></div>
                    <p className="text-gray-600 text-lg">Memuat hasil kuis...</p>
                </div>
            </div>
        )
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 flex items-center justify-center p-4">
                <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full">
                    <div className="text-center">
                        <div className="text-5xl mb-4">❌</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Terjadi Kesalahan</h2>
                        <p className="text-gray-600 mb-6">{error}</p>
                        <button
                            onClick={onBackToLobby}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition w-full"
                        >
                            Kembali ke Lobby
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen bg-gradient-to-b from-gray-50 to-blue-50 p-4">
            <div className="max-w-7xl mx-auto">
                {/* Debug Info */}
                <div className="mb-4 p-3 bg-gray-100 rounded-lg">
                    <div className="text-sm text-gray-700">
                        <strong>Debug Info:</strong> Room: {roomId} | Players: {players.length} | Answers: {answers.length} | Questions: {quiz?.questions?.length || 0}
                    </div>
                    <button 
                        onClick={() => {
                            console.log("=== DEBUG DATA ===")
                            console.log("Players:", players)
                            console.log("Answers:", answers)
                            console.log("Question Analysis:", questionAnalysis)
                        }}
                        className="mt-2 text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
                    >
                        Show Console Logs
                    </button>
                </div>

                {/* Header */}
                <div className="mb-8">
                    <div className="flex justify-between items-start mb-4">
                        <div>
                            <h1 className="text-3xl font-bold text-gray-900">{quiz?.title || "Hasil Kuis"}</h1>
                            <div className="flex items-center gap-4 mt-2">
                                <span className="text-gray-600">Room: <strong>{roomId}</strong></span>
                                <span className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm">
                                    {players.length} Pemain
                                </span>
                                {isHost && (
                                    <span className="px-3 py-1 bg-yellow-100 text-yellow-800 rounded-full text-sm">
                                        👑 Host
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onBackToLobby}
                                className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition"
                            >
                                {isHost ? 'Tutup Room' : 'Kembali ke Lobby'}
                            </button>
                            {isHost && (
                                <button
                                    onClick={onNewGame}
                                    className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
                                >
                                    Buat Game Baru
                                </button>
                            )}
                        </div>
                    </div>
                </div>

                {/* Empty State */}
                {players.length === 0 ? (
                    <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
                        <div className="text-5xl mb-4">📊</div>
                        <h2 className="text-2xl font-bold text-gray-700 mb-2">Belum Ada Hasil</h2>
                        <p className="text-gray-600 mb-6">
                            Tidak ada data pemain yang tersedia. Mungkin game belum dimulai atau semua pemain sudah keluar.
                        </p>
                        <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4 text-left rounded mb-6">
                            <p className="text-yellow-700 text-sm">
                                <strong>Tips:</strong> Pastikan game sudah selesai dengan status "finished" dan ada pemain yang bergabung.
                            </p>
                        </div>
                        <button
                            onClick={onBackToLobby}
                            className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
                        >
                            Kembali ke Lobby
                        </button>
                    </div>
                ) : (
                    <>
                        {/* Tabs */}
                        <div className="mb-6">
                            <div className="border-b border-gray-200">
                                <nav className="flex space-x-4">
                                    <button
                                        onClick={() => setActiveTab('podium')}
                                        className={`py-3 px-4 font-medium text-sm border-b-2 transition ${
                                            activeTab === 'podium'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        🏆 Podium
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('leaderboard')}
                                        className={`py-3 px-4 font-medium text-sm border-b-2 transition ${
                                            activeTab === 'leaderboard'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        📊 Leaderboard
                                    </button>
                                    <button
                                        onClick={() => setActiveTab('questions')}
                                        className={`py-3 px-4 font-medium text-sm border-b-2 transition ${
                                            activeTab === 'questions'
                                                ? 'border-blue-600 text-blue-600'
                                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                        }`}
                                    >
                                        ❓ Analisis Soal
                                    </button>
                                    {isHost && players.length > 0 && (
                                        <button
                                            onClick={() => setActiveTab('playerDetails')}
                                            className={`py-3 px-4 font-medium text-sm border-b-2 transition ${
                                                activeTab === 'playerDetails'
                                                    ? 'border-blue-600 text-blue-600'
                                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                                            }`}
                                        >
                                            👤 Detail Pemain
                                        </button>
                                    )}
                                </nav>
                            </div>
                        </div>

                        {/* Content Area */}
                        <div className="bg-white rounded-2xl shadow-xl p-6">
                            {/* Podium View */}
                            {activeTab === 'podium' && (
                                <div className="animate-fade-in">
                                    <div className="text-center mb-10">
                                        <h2 className="text-2xl font-bold text-gray-800 mb-2">🏆 Pemenang Kuis 🏆</h2>
                                        <p className="text-gray-600">Selamat kepada para pemenang!</p>
                                    </div>

                                    {/* Podium Display */}
                                    {players.length >= 3 ? (
                                        <div className="relative mb-12">
                                            <div className="flex justify-center items-end space-x-4 max-w-4xl mx-auto">
                                                {/* Second Place */}
                                                {topThree[1] && (
                                                    <div className="flex flex-col items-center w-1/4">
                                                        <div className="relative">
                                                            <div className="w-20 h-20 rounded-full border-4 border-gray-300 bg-gradient-to-b from-gray-200 to-gray-100 flex items-center justify-center mb-4">
                                                                <span className="text-2xl font-bold text-gray-600">🥈</span>
                                                            </div>
                                                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gray-500 text-white rounded-full flex items-center justify-center font-bold">
                                                                2
                                                            </div>
                                                        </div>
                                                        <div className="h-40 bg-gradient-to-t from-gray-300 to-gray-200 rounded-t-xl w-full flex flex-col justify-end p-4">
                                                            <h3 className="font-bold text-gray-800 text-lg truncate">{topThree[1].displayName}</h3>
                                                            <p className="text-3xl font-bold text-gray-700 mt-2">{topThree[1].score}</p>
                                                            <p className="text-gray-600 text-sm">poin</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* First Place */}
                                                {topThree[0] && (
                                                    <div className="flex flex-col items-center w-1/3 transform -translate-y-4">
                                                        <div className="relative">
                                                            <div className="w-24 h-24 rounded-full border-4 border-yellow-400 bg-gradient-to-b from-yellow-200 to-yellow-100 flex items-center justify-center mb-6 shadow-lg">
                                                                <span className="text-3xl font-bold text-yellow-600">🥇</span>
                                                            </div>
                                                            <div className="absolute -top-2 -right-2 w-10 h-10 bg-yellow-500 text-white rounded-full flex items-center justify-center font-bold">
                                                                1
                                                            </div>
                                                        </div>
                                                        <div className="h-52 bg-gradient-to-t from-yellow-400 to-yellow-300 rounded-t-xl w-full flex flex-col justify-end p-5 shadow-lg">
                                                            <div className="relative">
                                                                <h3 className="font-bold text-gray-900 text-xl truncate">{topThree[0].displayName}</h3>
                                                                {topThree[0].uid === user.uid && (
                                                                    <span className="absolute -top-6 right-0 text-xs bg-blue-500 text-white px-2 py-1 rounded">Anda</span>
                                                                )}
                                                            </div>
                                                            <p className="text-4xl font-bold text-gray-900 mt-3">{topThree[0].score}</p>
                                                            <p className="text-yellow-800 text-sm">JUARA 1</p>
                                                        </div>
                                                    </div>
                                                )}

                                                {/* Third Place */}
                                                {topThree[2] && (
                                                    <div className="flex flex-col items-center w-1/4">
                                                        <div className="relative">
                                                            <div className="w-20 h-20 rounded-full border-4 border-amber-600 bg-gradient-to-b from-amber-300 to-amber-200 flex items-center justify-center mb-4">
                                                                <span className="text-2xl font-bold text-amber-700">🥉</span>
                                                            </div>
                                                            <div className="absolute -top-2 -right-2 w-8 h-8 bg-amber-700 text-white rounded-full flex items-center justify-center font-bold">
                                                                3
                                                            </div>
                                                        </div>
                                                        <div className="h-32 bg-gradient-to-t from-amber-600 to-amber-500 rounded-t-xl w-full flex flex-col justify-end p-4">
                                                            <h3 className="font-bold text-white text-lg truncate">{topThree[2].displayName}</h3>
                                                            <p className="text-3xl font-bold text-white mt-2">{topThree[2].score}</p>
                                                            <p className="text-amber-100 text-sm">poin</p>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="mb-12 text-center py-8">
                                            <div className="text-4xl mb-4">👑</div>
                                            <h3 className="text-xl font-bold text-gray-700 mb-2">Juara Pertama</h3>
                                            {topThree[0] && (
                                                <div className="inline-block bg-gradient-to-r from-yellow-50 to-yellow-100 border-2 border-yellow-300 rounded-xl p-6">
                                                    <div className="text-5xl mb-2">🥇</div>
                                                    <h4 className="text-2xl font-bold text-gray-800">{topThree[0].displayName}</h4>
                                                    <p className="text-3xl font-bold text-yellow-600 mt-2">{topThree[0].score} poin</p>
                                                    {topThree[0].uid === user.uid && (
                                                        <span className="mt-2 inline-block px-3 py-1 bg-blue-500 text-white rounded-full text-sm">
                                                            Anda!
                                                        </span>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    )}

                                    {/* Stats Overview */}
                                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
                                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 p-4 rounded-xl border border-blue-200">
                                            <div className="text-3xl font-bold text-blue-600">{players.length}</div>
                                            <div className="text-sm text-blue-700">Total Pemain</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-green-50 to-green-100 p-4 rounded-xl border border-green-200">
                                            <div className="text-3xl font-bold text-green-600">{quiz?.questions?.length || 0}</div>
                                            <div className="text-sm text-green-700">Total Soal</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-purple-50 to-purple-100 p-4 rounded-xl border border-purple-200">
                                            <div className="text-3xl font-bold text-purple-600">{topThree[0]?.score || 0}</div>
                                            <div className="text-sm text-purple-700">Skor Tertinggi</div>
                                        </div>
                                        <div className="bg-gradient-to-br from-yellow-50 to-yellow-100 p-4 rounded-xl border border-yellow-200">
                                            <div className="text-3xl font-bold text-yellow-600">
                                                {players.length > 0 ? Math.round(sortedPlayers.reduce((sum, p) => sum + (p.score || 0), 0) / players.length) : 0}
                                            </div>
                                            <div className="text-sm text-yellow-700">Rata-rata Skor</div>
                                        </div>
                                    </div>
                                </div>
                            )}

                            {/* Leaderboard View */}
                            {activeTab === 'leaderboard' && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800">📊 Ranking Lengkap</h2>
                                        <div className="text-sm text-gray-600">
                                            Total: {players.length} pemain • {quiz?.questions?.length || 0} soal
                                        </div>
                                    </div>

                                    <div className="overflow-x-auto">
                                        <table className="w-full">
                                            <thead>
                                                <tr className="bg-gradient-to-r from-blue-50 to-blue-100">
                                                    <th className="py-3 px-4 text-left rounded-l-xl">Rank</th>
                                                    <th className="py-3 px-4 text-left">Nama Pemain</th>
                                                    <th className="py-3 px-4 text-left">Skor</th>
                                                    <th className="py-3 px-4 text-left">Jawaban Benar</th>
                                                    <th className="py-3 px-4 text-left rounded-r-xl">Persentase</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {sortedPlayers.map((player, index) => {
                                                    const playerAnswersCount = answers.filter(a => a.userId === player.uid).length
                                                    const correctAnswersCount = answers.filter(a => a.userId === player.uid && a.correct).length
                                                    const accuracy = playerAnswersCount > 0 ? (correctAnswersCount / playerAnswersCount) * 100 : 0
                                                    const isCurrentUser = player.uid === user.uid

                                                    return (
                                                        <tr 
                                                            key={player.uid}
                                                            className={`border-b hover:bg-gray-50 transition ${
                                                                isCurrentUser ? 'bg-blue-50' : ''
                                                            }`}
                                                        >
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center">
                                                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                                                                        index === 0 ? 'bg-yellow-500 text-white' :
                                                                        index === 1 ? 'bg-gray-400 text-white' :
                                                                        index === 2 ? 'bg-amber-600 text-white' :
                                                                        'bg-gray-200 text-gray-700'
                                                                    }`}>
                                                                        {index + 1}
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center">
                                                                    <div className="w-10 h-10 rounded-full bg-gradient-to-r from-blue-400 to-purple-400 flex items-center justify-center text-white font-bold mr-3">
                                                                        {player.displayName?.charAt(0) || "?"}
                                                                    </div>
                                                                    <div>
                                                                        <div className="font-medium text-gray-800">
                                                                            {player.displayName}
                                                                            {isCurrentUser && (
                                                                                <span className="ml-2 text-sm bg-blue-100 text-blue-700 px-2 py-1 rounded">Anda</span>
                                                                            )}
                                                                        </div>
                                                                        <div className="text-xs text-gray-500">
                                                                            {player.answeredQuestions || 0} jawaban
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="text-xl font-bold text-gray-900">{player.score || 0}</div>
                                                                <div className="text-sm text-gray-600">poin</div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="font-medium">
                                                                    <span className="text-green-600">{correctAnswersCount}</span>
                                                                    <span className="text-gray-600">/{playerAnswersCount}</span>
                                                                </div>
                                                            </td>
                                                            <td className="py-4 px-4">
                                                                <div className="flex items-center">
                                                                    <div className="w-full bg-gray-200 rounded-full h-2 mr-2">
                                                                        <div 
                                                                            className="bg-gradient-to-r from-green-400 to-green-500 h-2 rounded-full"
                                                                            style={{ width: `${accuracy}%` }}
                                                                        />
                                                                    </div>
                                                                    <span className="font-medium">{formatPercentage(accuracy)}</span>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}

                            {/* Question Analysis View */}
                            {activeTab === 'questions' && (
                                <div className="animate-fade-in">
                                    <h2 className="text-2xl font-bold text-gray-800 mb-6">📈 Analisis Detail Per Soal</h2>
                                    
                                    {questionAnalysis.length === 0 ? (
                                        <div className="text-center py-12">
                                            <div className="text-4xl mb-4">❓</div>
                                            <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Analisis Soal</h3>
                                            <p className="text-gray-600">
                                                Data jawaban pemain belum tersedia untuk dianalisis.
                                            </p>
                                        </div>
                                    ) : (
                                        <div className="space-y-8">
                                            {questionAnalysis.map((analysis, index) => (
                                                <div key={index} className="border border-gray-200 rounded-xl p-6 hover:shadow-lg transition">
                                                    <div className="flex justify-between items-start mb-4">
                                                        <div>
                                                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-gradient-to-r from-blue-100 to-blue-50 text-blue-700 rounded-full text-sm font-medium mb-2">
                                                                Soal #{analysis.questionIndex + 1}
                                                            </div>
                                                            <h3 className="text-lg font-semibold text-gray-800">
                                                                {analysis.questionText}
                                                            </h3>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                                analysis.correctPercentage >= 70 ? 'bg-green-100 text-green-800' :
                                                                analysis.correctPercentage >= 40 ? 'bg-yellow-100 text-yellow-800' :
                                                                'bg-red-100 text-red-800'
                                                            }`}>
                                                                {formatPercentage(analysis.correctPercentage)} Benar
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="mb-6">
                                                        <h4 className="font-medium text-gray-700 mb-3">Distribusi Jawaban:</h4>
                                                        <div className="space-y-2">
                                                            {analysis.options.map((option, optIndex) => {
                                                                const stats = analysis.optionStats[optIndex]
                                                                if (!stats) return null
                                                                
                                                                const isCorrect = optIndex === analysis.correctAnswer
                                                                const isMostChosen = optIndex === analysis.mostChosenOption
                                                                
                                                                return (
                                                                    <div key={optIndex} className="flex items-center">
                                                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold mr-3 border ${
                                                                            isCorrect 
                                                                                ? 'border-green-500 bg-green-50 text-green-700' 
                                                                                : 'border-gray-300 bg-gray-50 text-gray-700'
                                                                        }`}>
                                                                            {String.fromCharCode(65 + optIndex)}
                                                                        </div>
                                                                        <div className="flex-1">
                                                                            <div className="flex justify-between mb-1">
                                                                                <span className="text-gray-700">{option}</span>
                                                                                <span className="font-medium text-gray-900">
                                                                                    {formatPercentage(stats.percentage)} ({stats.count})
                                                                                </span>
                                                                            </div>
                                                                            <div className="w-full bg-gray-200 rounded-full h-2">
                                                                                <div 
                                                                                    className={`h-2 rounded-full ${
                                                                                        isCorrect 
                                                                                            ? 'bg-gradient-to-r from-green-400 to-green-500' 
                                                                                            : 'bg-gradient-to-r from-gray-400 to-gray-500'
                                                                                    }`}
                                                                                    style={{ width: `${stats.percentage}%` }}
                                                                                />
                                                                            </div>
                                                                            <div className="flex justify-between mt-1">
                                                                                {isCorrect && (
                                                                                    <span className="text-xs text-green-600">✓ Jawaban benar</span>
                                                                                )}
                                                                                {isMostChosen && (
                                                                                    <span className="text-xs text-blue-600">⭐ Paling banyak dipilih</span>
                                                                                )}
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )
                                                            })}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* Player Details View (Host Only) */}
                            {activeTab === 'playerDetails' && isHost && (
                                <div className="animate-fade-in">
                                    <div className="flex justify-between items-center mb-6">
                                        <h2 className="text-2xl font-bold text-gray-800">👥 Detail Jawaban Pemain</h2>
                                        <div className="text-sm text-gray-600">
                                            Pilih pemain untuk melihat detail jawaban
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                                        {/* Player List */}
                                        <div className="lg:col-span-1">
                                            <div className="bg-gradient-to-b from-gray-50 to-white rounded-xl border border-gray-200 p-4">
                                                <h3 className="font-bold text-gray-700 mb-4">Daftar Pemain</h3>
                                                <div className="space-y-2 max-h-[500px] overflow-y-auto">
                                                    {sortedPlayers.map((player, index) => {
                                                        const playerAnswersCount = answers.filter(a => a.userId === player.uid).length
                                                        const correctAnswersCount = answers.filter(a => a.userId === player.uid && a.correct).length
                                                        const isSelected = selectedPlayer?.uid === player.uid
                                                        
                                                        return (
                                                            <button
                                                                key={player.uid}
                                                                onClick={() => fetchPlayerAnswers(player)}
                                                                className={`w-full text-left p-3 rounded-lg transition ${
                                                                    isSelected
                                                                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg'
                                                                        : 'bg-white border border-gray-200 hover:bg-gray-50'
                                                                }`}
                                                            >
                                                                <div className="flex items-center justify-between">
                                                                    <div className="flex items-center">
                                                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold mr-3 ${
                                                                            isSelected 
                                                                                ? 'bg-white text-blue-600'
                                                                                : 'bg-blue-100 text-blue-700'
                                                                        }`}>
                                                                            {index + 1}
                                                                        </div>
                                                                        <div>
                                                                            <div className={`font-medium ${
                                                                                isSelected ? 'text-white' : 'text-gray-800'
                                                                            }`}>
                                                                                {player.displayName}
                                                                            </div>
                                                                            <div className={`text-sm ${
                                                                                isSelected ? 'text-blue-100' : 'text-gray-600'
                                                                            }`}>
                                                                                {correctAnswersCount}/{playerAnswersCount} benar
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                    <div className={`text-lg font-bold ${
                                                                        isSelected ? 'text-white' : 'text-gray-900'
                                                                    }`}>
                                                                        {player.score}
                                                                    </div>
                                                                </div>
                                                            </button>
                                                        )
                                                    })}
                                                </div>
                                            </div>
                                        </div>

                                        {/* Player Answers Detail */}
                                        <div className="lg:col-span-2">
                                            {selectedPlayer ? (
                                                <div className="bg-white rounded-xl border border-gray-200 p-6">
                                                    <div className="flex items-center justify-between mb-6">
                                                        <div>
                                                            <h3 className="text-xl font-bold text-gray-800">
                                                                Jawaban {selectedPlayer.displayName}
                                                            </h3>
                                                            <p className="text-gray-600">
                                                                Skor: {selectedPlayer.score} poin • Rank: {
                                                                    sortedPlayers.findIndex(p => p.uid === selectedPlayer.uid) + 1
                                                                }
                                                            </p>
                                                        </div>
                                                        <div className="text-right">
                                                            <div className="px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 text-white rounded-lg font-bold">
                                                                {Math.round(
                                                                    (answers.filter(a => a.userId === selectedPlayer.uid && a.correct).length / 
                                                                    answers.filter(a => a.userId === selectedPlayer.uid).length) * 100
                                                                )}% Benar
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2">
                                                        {quiz.questions.map((question, qIndex) => {
                                                            const answer = answers.find(a => 
                                                                a.userId === selectedPlayer.uid && a.questionIndex === qIndex
                                                            )
                                                            const isCorrect = answer?.correct || false
                                                            const userAnswer = answer?.answerIndex
                                                            const correctAnswer = question.correctAnswer
                                                            
                                                            return (
                                                                <div key={qIndex} className="border border-gray-200 rounded-lg p-4 hover:shadow transition">
                                                                    <div className="flex justify-between items-start mb-3">
                                                                        <div className="flex-1">
                                                                            <div className="inline-flex items-center gap-2 px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs font-medium mb-2">
                                                                                Soal #{qIndex + 1}
                                                                            </div>
                                                                            <h4 className="font-medium text-gray-800">{question.text}</h4>
                                                                        </div>
                                                                        <div className={`px-3 py-1 rounded-full text-sm font-bold ${
                                                                            isCorrect
                                                                                ? 'bg-green-100 text-green-800'
                                                                                : 'bg-red-100 text-red-800'
                                                                        }`}>
                                                                            {isCorrect ? '✓ Benar' : '✗ Salah'}
                                                                        </div>
                                                                    </div>

                                                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                                                                        {question.options.map((option, optIndex) => {
                                                                            const isUserAnswer = userAnswer === optIndex
                                                                            const isCorrectOption = optIndex === correctAnswer
                                                                            
                                                                            return (
                                                                                <div
                                                                                    key={optIndex}
                                                                                    className={`p-3 rounded-lg border ${
                                                                                        isCorrectOption
                                                                                            ? 'border-green-300 bg-green-50'
                                                                                            : isUserAnswer && !isCorrectOption
                                                                                            ? 'border-red-300 bg-red-50'
                                                                                            : 'border-gray-200 bg-gray-50'
                                                                                    }`}
                                                                                >
                                                                                    <div className="flex items-center">
                                                                                        <div className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-sm mr-2 ${
                                                                                            isCorrectOption
                                                                                                ? 'bg-green-500 text-white'
                                                                                                : isUserAnswer && !isCorrectOption
                                                                                                ? 'bg-red-500 text-white'
                                                                                                : 'bg-gray-300 text-gray-700'
                                                                                        }`}>
                                                                                            {String.fromCharCode(65 + optIndex)}
                                                                                        </div>
                                                                                        <span className={`font-medium ${
                                                                                            isCorrectOption ? 'text-green-800' : 
                                                                                            isUserAnswer && !isCorrectOption ? 'text-red-800' : 
                                                                                            'text-gray-700'
                                                                                        }`}>
                                                                                            {option}
                                                                                        </span>
                                                                                    </div>
                                                                                    {isUserAnswer && (
                                                                                        <div className={`text-xs mt-1 ${
                                                                                            isCorrect ? 'text-green-600' : 'text-red-600'
                                                                                        }`}>
                                                                                            {isCorrect ? 'Jawaban Anda ✓' : 'Jawaban Anda ✗'}
                                                                                        </div>
                                                                                    )}
                                                                                    {isCorrectOption && !isUserAnswer && isUserAnswer !== undefined && (
                                                                                        <div className="text-xs text-green-600 mt-1">Jawaban yang benar</div>
                                                                                    )}
                                                                                </div>
                                                                            )
                                                                        })}
                                                                    </div>
                                                                </div>
                                                            )
                                                        })}
                                                    </div>
                                                </div>
                                            ) : (
                                                <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border-2 border-dashed border-gray-300 p-12 text-center">
                                                    <div className="text-5xl mb-4">👤</div>
                                                    <h3 className="text-xl font-bold text-gray-700 mb-2">Pilih Pemain</h3>
                                                    <p className="text-gray-600 mb-6">
                                                        Klik pada nama pemain di sebelah kiri untuk melihat detail jawaban mereka.
                                                    </p>
                                                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-700 rounded-lg">
                                                        <span>ℹ️</span>
                                                        <span>Hanya host yang dapat melihat detail jawaban pemain</span>
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Your Personal Stats */}
                        {!isHost && players.length > 0 && (
                            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-2xl p-6">
                                <h3 className="font-bold text-blue-800 text-lg mb-4">📊 Statistik Anda</h3>
                                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                                        <div className="text-sm text-blue-600 mb-1">Ranking Anda</div>
                                        <div className="text-2xl font-bold text-blue-700">
                                            #{sortedPlayers.findIndex(p => p.uid === user.uid) + 1}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                                        <div className="text-sm text-blue-600 mb-1">Skor Anda</div>
                                        <div className="text-2xl font-bold text-blue-700">
                                            {players.find(p => p.uid === user.uid)?.score || 0}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                                        <div className="text-sm text-blue-600 mb-1">Jawaban Benar</div>
                                        <div className="text-2xl font-bold text-blue-700">
                                            {answers.filter(a => a.userId === user.uid && a.correct).length}
                                        </div>
                                    </div>
                                    <div className="bg-white p-4 rounded-xl border border-blue-100">
                                        <div className="text-sm text-blue-600 mb-1">Akurasi</div>
                                        <div className="text-2xl font-bold text-blue-700">
                                            {Math.round(
                                                (answers.filter(a => a.userId === user.uid && a.correct).length / 
                                                answers.filter(a => a.userId === user.uid).length) * 100
                                            ) || 0}%
                                        </div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </>
                )}

                {/* Footer Actions */}
                <div className="mt-8 flex justify-between items-center">
                    <div className="text-sm text-gray-500">
                        Game selesai • {new Date().toLocaleDateString('id-ID', {
                            weekday: 'long',
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                        })}
                    </div>
                    <div className="flex gap-3">
                        <button
                            onClick={() => window.print()}
                            className="px-4 py-2 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition flex items-center gap-2"
                        >
                            🖨️ Cetak Hasil
                        </button>
                        <button
                            onClick={onBackToLobby}
                            className="px-4 py-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center gap-2"
                        >
                            {isHost ? 'Tutup Room' : 'Kembali ke Lobby'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    )
}