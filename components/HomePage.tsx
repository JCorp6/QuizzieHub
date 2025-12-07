"use client"

import { useState } from "react"
import type { User } from "firebase/auth"
import QuizSelectionScreen from "./QuizSelectionScreen"
import QuizPlayScreen from "./QuizPlayScreen"
import QuizCreationScreen from "./QuizCreationScreen"
import ResultsScreen from "./ResultsScreen"
import MultiplayerLobby from "./MultiplayerLobby"
import MultiplayerPlayScreen from "./MultiplayerPlayScreen"
import MultiplayerResultsScreen from "./MultiplayerResultsScreen"
import { defaultQuizzes } from "@/lib/defaultQuizzes"
import MultiplayerRoom from "./MultiPlayerRoom"

// Placeholder Player Interface (hanya untuk memastikan 'roomData.players' terdefinisikan)
interface Player {
    uid: string
    displayName: string
    score: number
    answeredQuestions: number | (number | null)[] 
    currentQuestion: number 
    streak?: number 
}

// Tipe data untuk hasil Multiplayer yang diharapkan
interface PlayerResult {
    uid: string
    displayName: string
    score: number
    answeredQuestions: (number | null)[]
    streak?: number
}

type Screen =
  | "selection"
  | "playing"
  | "creating"
  | "results"
  | "multiplayer-lobby"
  | "multiplayer-playing"
  | "multiplayer-results"
  | "multiplayer-room"

interface HomePageProps {
  user: User
  onSignOut: () => Promise<void>
}

export default function HomePage({ user, onSignOut }: HomePageProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("selection")
  const [selectedQuiz, setSelectedQuiz] = useState(defaultQuizzes[0])
  const [quizResult, setQuizResult] = useState<any>(null) 
  const [roomId, setRoomId] = useState("")
  // roomData sekarang diinisialisasi dengan struktur minimum
  const [roomData, setRoomData] = useState<any>({id: "", quiz: {}, players: []}) 

  

  const handlePlayQuiz = (quiz: any) => {
    setSelectedQuiz(quiz)
    setCurrentScreen("playing")
  }

  const handleCreateQuiz = () => {
    setCurrentScreen("creating")
  }

  const handleBackToSelection = () => {
    setQuizResult(null)
    // Reset roomData juga saat kembali ke selection
    setRoomData({id: "", quiz: {}, players: []}) 
    setCurrentScreen("selection")
  }

  const handleQuizFinish = (result: any) => {
    setQuizResult(result)
    setCurrentScreen("results")
  }

  const handlePlayAgain = () => {
    setCurrentScreen("playing")
  }

  const handlePlayMultiplayer = () => {
    setCurrentScreen("multiplayer-lobby")
  }

  const handleStartMultiplayer = (room: any) => {
    setRoomData(room)
    setCurrentScreen("multiplayer-room")
  }

  const handleGameStarted = (room: any) => {
    setSelectedQuiz(room.quiz)
    setRoomData(room)
    setCurrentScreen("multiplayer-playing")
  }
  
  const handleRoomClosed = () => {
    setRoomData({id: "", quiz: {}, players: []})
    setCurrentScreen("multiplayer-lobby")
  }

  // Tentukan tipe data yang diharapkan untuk hasil (Array of PlayerResult)
  // Di HomePage.tsx - Perbaiki handleMultiplayerFinish
const handleMultiplayerFinish = (result: any) => { 
    console.log("🏁 Multiplayer finish called with result:", result)
    
    // Validasi dan format data
    let processedResult = []
    
    if (Array.isArray(result)) {
        // Jika sudah array, gunakan langsung
        processedResult = result
    } else if (result && typeof result === 'object') {
        // Jika object, convert ke array
        if (result.players && typeof result.players === 'object') {
            // Dari Firestore: { players: { uid1: {...}, uid2: {...} } }
            processedResult = Object.values(result.players)
        } else {
            // Langsung convert object values ke array
            processedResult = Object.values(result)
        }
    }
    
    // Filter dan format data
    const validPlayers = processedResult
        .filter((player: any) => player && player.uid)
        .map((player: any) => ({
            uid: player.uid,
            displayName: player.displayName || `Player_${player.uid.slice(0, 4)}`,
            score: player.score || 0,
            answeredQuestions: Array.isArray(player.answeredQuestions) 
                ? player.answeredQuestions 
                : (player.answeredQuestions || 0),
            currentQuestion: player.currentQuestion || 0,
            streak: player.streak || 0
        }))
    
    console.log("📊 Processed results:", validPlayers)
    
    if (validPlayers.length === 0) {
        console.error("❌ No valid player data found!")
        
        // Fallback: Coba ambil dari roomData
        if (roomData && roomData.players) {
            const fallbackPlayers = Object.values(roomData.players || {})
                .filter((p: any) => p && p.uid)
                .map((p: any) => ({
                    uid: p.uid,
                    displayName: p.displayName || "Player",
                    score: p.score || 0,
                    answeredQuestions: 0,
                    currentQuestion: 0,
                    streak: 0
                }))
            
            if (fallbackPlayers.length > 0) {
                setQuizResult(fallbackPlayers)
                setCurrentScreen("multiplayer-results")
                return
            }
        }
        
        // Jika tetap kosong, kembali ke selection
        handleBackToSelection()
        return
    }
    
    setQuizResult(validPlayers)
    setCurrentScreen("multiplayer-results")
}

  return (
    <div className="min-h-screen">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="text-3xl font-bold">🎯 QuizzieHub</div>
            <div className="hidden sm:block">
              <p className="text-purple-100 text-sm">Welcome, {user.displayName || user.email}</p>
            </div>
          </div>
          <button
            onClick={onSignOut}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 text-white rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {currentScreen === "selection" && (
          <QuizSelectionScreen
            onPlayQuiz={handlePlayQuiz}
            onCreateQuiz={handleCreateQuiz}
            onPlayMultiplayer={handlePlayMultiplayer}
            user={user}
          />
        )}
        {currentScreen === "playing" && (
          <QuizPlayScreen quiz={selectedQuiz} onFinish={handleQuizFinish} onBack={handleBackToSelection} />
        )}
        {currentScreen === "creating" && (
          <QuizCreationScreen
            onBack={handleBackToSelection}
            onQuizCreated={() => {
              handleBackToSelection()
            }}
            user={user}
          />
        )}
        {currentScreen === "results" && quizResult && (
          <ResultsScreen
            result={quizResult}
            quiz={selectedQuiz}
            onPlayAgain={handlePlayAgain}
            onBackToHome={handleBackToSelection}
          />
        )}
        {currentScreen === "multiplayer-lobby" && (
          <MultiplayerLobby onBack={handleBackToSelection} onStartGame={handleStartMultiplayer} user={user} />
        )}
        {currentScreen === "multiplayer-room" && roomData && (
          <MultiplayerRoom
            room={roomData}
            user={user}
            onGameStarted={handleGameStarted}
            onRoomClosed={handleRoomClosed}
          />
        )}
        {currentScreen === "multiplayer-playing" && roomData && (
          <MultiplayerPlayScreen
            quiz={selectedQuiz}
            roomId={roomData.id}
            onFinish={handleMultiplayerFinish}
            onBack={handleBackToSelection}
            user={user}
          />
        )}
        {currentScreen === "multiplayer-results" && selectedQuiz && roomData && (
  <MultiplayerResultsScreen
    quiz={selectedQuiz} // ✅ Prop yang benar
    roomId={roomData.id}
    user={user}
    onBackToLobby={() => {
      // Untuk kembali ke lobby multiplayer atau selection
      setCurrentScreen("multiplayer-lobby")
    }}
    onNewGame={() => {
      // Untuk membuat game baru
      setCurrentScreen("multiplayer-lobby")
    }}
    isHost={roomData.host?.uid === user.uid} // Periksa apakah user adalah host
  />
)}
      </main>
    </div>
  )
}