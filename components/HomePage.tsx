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

type Screen =
  | "selection"
  | "playing"
  | "creating"
  | "results"
  | "multiplayer-lobby"
  | "multiplayer-playing"
  | "multiplayer-results"

interface HomePageProps {
  user: User
  onSignOut: () => Promise<void>
}

export default function HomePage({ user, onSignOut }: HomePageProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("selection")
  const [selectedQuiz, setSelectedQuiz] = useState(defaultQuizzes[0])
  const [quizResult, setQuizResult] = useState(null)
  const [roomId, setRoomId] = useState("")
  const [roomData, setRoomData] = useState<any>(null)

  const handlePlayQuiz = (quiz: any) => {
    setSelectedQuiz(quiz)
    setCurrentScreen("playing")
  }

  const handleCreateQuiz = () => {
    setCurrentScreen("creating")
  }

  const handleBackToSelection = () => {
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
    setSelectedQuiz(room.quiz)
    setCurrentScreen("multiplayer-playing")
  }

  const handleMultiplayerFinish = (result: any) => {
    setQuizResult(result)
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
        {currentScreen === "multiplayer-playing" && roomData && (
          <MultiplayerPlayScreen
            quiz={selectedQuiz}
            roomId={roomData.id}
            onFinish={handleMultiplayerFinish}
            onBack={handleBackToSelection}
            user={user}
          />
        )}
        {currentScreen === "multiplayer-results" && quizResult && roomData && (
          <MultiplayerResultsScreen
            result={quizResult}
            quiz={selectedQuiz}
            roomId={roomData.id}
            onBackToHome={handleBackToSelection}
            user={user}
          />
        )}
      </main>
    </div>
  )
}
