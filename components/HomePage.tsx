"use client"

import { useState, useEffect } from "react"
import { useSearchParams } from "next/navigation"
import type { User } from "firebase/auth"
import { toast } from "sonner"
import QuizSelectionScreen from "./QuizSelectionScreen"
import QuizPlayScreen from "./QuizPlayScreen"
import QuizCreationScreen from "./QuizCreationScreen"
import ResultsScreen from "./ResultsScreen"
import MultiplayerLobby from "./MultiplayerLobby"
import MultiplayerPlayScreen from "./MultiplayerPlayScreen"
import MultiplayerResultsScreen from "./MultiplayerResultsScreen"
import { defaultQuizzes } from "@/lib/defaultQuizzes"
import { joinMultiplayerRoom } from "@/lib/firebaseMultiplayer"
import MultiplayerRoom from "./MultiPlayerRoom"
import { saveQuizResult } from "@/lib/firebaseQuizzes"
import type { Quiz } from "@/types"
import LoadingSpinner from "./LoadingSpinner"

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

interface AnswerRecord {
  questionId: string;
  correct: boolean;
  streak?: number;
}

interface QuizResult {
  score: number;
  totalQuestions: number;
  streak: number;
  answers: AnswerRecord[];
  quizTitle: string;
  answeredQuestions: (number | null)[];
}

export default function HomePage({ user, onSignOut }: HomePageProps) {
  const [currentScreen, setCurrentScreen] = useState<Screen>("selection")
  const [selectedQuiz, setSelectedQuiz] = useState<Quiz>(defaultQuizzes[0])
  const [quizResult, setQuizResult] = useState<QuizResult | null>(null)
  const [roomId, setRoomId] = useState("")
  const [roomData, setRoomData] = useState<any>({ id: "", quiz: {}, players: [] })
  const [showUserMenu, setShowUserMenu] = useState(false)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [isJoiningByUrl, setIsJoiningByUrl] = useState(false)
  const searchParams = useSearchParams()

  useEffect(() => {
    const roomToJoin = searchParams.get("joinRoom")
    if (roomToJoin) {
      setIsJoiningByUrl(true)
      handleJoinByUrl(roomToJoin)
    }
  }, [searchParams])

  const handleJoinByUrl = async (roomCode: string) => {
    window.history.replaceState({}, "", window.location.pathname)
    try {
      const room = await joinMultiplayerRoom(roomCode, user)
      if (room) {
        handleStartMultiplayer(room)
      } else {
        toast.error(`Room with code "${roomCode}" not found or is no longer active.`)
        setCurrentScreen("multiplayer-lobby")
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to join the room.")
      setCurrentScreen("multiplayer-lobby")
    } finally {
      setIsJoiningByUrl(false)
    }
  }

  const handlePlayQuiz = (quiz: Quiz) => {
    setSelectedQuiz(quiz)
    setCurrentScreen("playing")
  }

  const handleCreateQuiz = () => {
    setCurrentScreen("creating")
  }

  const handleBackToSelection = () => {
    setQuizResult(null)
    setRoomData({ id: "", quiz: {}, players: [] })
    setCurrentScreen("selection")
  }

  const handleQuizFinish = async (result: QuizResult) => {
    setQuizResult(result)
    setCurrentScreen("results")
    try {
      if (selectedQuiz.createdBy !== "QuizzieHub") {
        await saveQuizResult(user.uid, selectedQuiz.id, result.score, result.answers)
      }
    } catch (error) {
      console.error("Failed to save quiz result:", error)
    }
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
    setRoomData({ id: "", quiz: {}, players: [] })
    setCurrentScreen("multiplayer-lobby")
  }

  const handleMultiplayerFinish = (result: any) => {
    setQuizResult(result)
    setCurrentScreen("multiplayer-results")
  }

  const getUserInitial = () => {
    if (user.displayName) {
      return user.displayName.charAt(0).toUpperCase()
    }
    if (user.email) {
      return user.email.charAt(0).toUpperCase()
    }
    return "U"
  }

  const showNavbar = currentScreen !== "playing" && currentScreen !== "multiplayer-playing"

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {isJoiningByUrl && <LoadingSpinner />}
      {/* Modern Navbar - Quizizz Style */}
      {showNavbar && (
        <header className="bg-white border-b border-gray-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              {/* Logo */}
              <button 
                onClick={handleBackToSelection}
                className="flex items-center gap-2 hover:opacity-80 transition-opacity"
              >
                <div className="w-10 h-10 bg-gradient-to-br from-purple-600 to-blue-600 rounded-xl flex items-center justify-center">
                  <span className="text-white text-xl font-bold">Q</span>
                </div>
                <span className="text-xl font-bold text-gray-900 hidden sm:block">QuizzieHub</span>
              </button>

              {/* Navigation Items */}
              <nav className="hidden md:flex items-center gap-1">
                <button
                  onClick={handleBackToSelection}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    currentScreen === "selection"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Explore
                </button>
                <button
                  onClick={handleCreateQuiz}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    currentScreen === "creating"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={handlePlayMultiplayer}
                  className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
                    currentScreen === "multiplayer-lobby" || currentScreen === "multiplayer-room"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Multiplayer
                </button>
              </nav>

              {/* User Menu */}
              <div className="flex items-center gap-3">
                {/* Mobile Menu Button */}
                <button 
                  className="md:hidden p-2 text-gray-600 hover:bg-gray-100 rounded-lg"
                  onClick={() => setShowMobileMenu(!showMobileMenu)}
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                </button>

                {/* User Avatar */}
                <div className="relative">
                  <button
                    onClick={() => setShowUserMenu(!showUserMenu)}
                    className="flex items-center gap-2 p-1 pr-3 rounded-full hover:bg-gray-100 transition-colors"
                  >
                    <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {getUserInitial()}
                    </div>
                    <svg className={`w-4 h-4 text-gray-600 transition-transform ${showUserMenu ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </button>

                  {/* Dropdown Menu */}
                  {showUserMenu && (
                    <>
                      <div 
                        className="fixed inset-0 z-10" 
                        onClick={() => setShowUserMenu(false)}
                      />
                      <div className="absolute right-0 mt-2 w-64 bg-white rounded-xl shadow-lg border border-gray-200 py-2 z-20">
                        <div className="px-4 py-3 border-b border-gray-100">
                          <p className="text-sm font-semibold text-gray-900 truncate">
                            {user.displayName || "User"}
                          </p>
                          <p className="text-xs text-gray-500 truncate">{user.email}</p>
                        </div>
                        
                        <div className="py-2">
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-3"
                          >
                            <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            Profile
                          </button>
                        </div>

                        <div className="border-t border-gray-100 py-2">
                          <button
                            onClick={() => {
                              setShowUserMenu(false)
                              onSignOut()
                            }}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-3"
                          >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                            </svg>
                            Sign Out
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
          {/* Mobile Menu */}
          {showMobileMenu && (
            <div className="md:hidden">
              <div className="px-2 pt-2 pb-3 space-y-1 sm:px-3">
                <button
                  onClick={() => {
                    handleBackToSelection()
                    setShowMobileMenu(false)
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    currentScreen === "selection"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Explore
                </button>
                <button
                  onClick={() => {
                    handleCreateQuiz()
                    setShowMobileMenu(false)
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    currentScreen === "creating"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Create
                </button>
                <button
                  onClick={() => {
                    handlePlayMultiplayer()
                    setShowMobileMenu(false)
                  }}
                  className={`block w-full text-left px-3 py-2 rounded-md text-base font-medium ${
                    currentScreen === "multiplayer-lobby" || currentScreen === "multiplayer-room"
                      ? "bg-purple-50 text-purple-700"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  Multiplayer
                </button>
              </div>
            </div>
          )}
        </header>
      )}

      {/* Main Content */}
      <main className="px-4 sm:px-6 lg:px-8 pt-6 pb-12">
        {currentScreen === "selection" && (
          <QuizSelectionScreen
            onPlayQuiz={handlePlayQuiz}
            onCreateQuiz={handleCreateQuiz}
            onPlayMultiplayer={handlePlayMultiplayer}
            user={user}
          />
        )}
        {currentScreen === "playing" && (
          <QuizPlayScreen
            quiz={selectedQuiz}
            onFinish={handleQuizFinish}
            onBack={handleBackToSelection}
          />
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
          <MultiplayerLobby
            onBack={handleBackToSelection}
            onStartGame={handleStartMultiplayer}
            user={user}
          />
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
        {currentScreen === "multiplayer-results" &&
          selectedQuiz &&
          roomData && (
            <MultiplayerResultsScreen
              quiz={selectedQuiz}
              roomId={roomData.id}
              user={user}
              onBackToLobby={() => {
                setCurrentScreen("multiplayer-lobby")
              }}
              onNewGame={() => {
                setCurrentScreen("multiplayer-lobby")
              }}
              isHost={roomData.host?.uid === user.uid}
            />
          )}
      </main>
    </div>
  )
}