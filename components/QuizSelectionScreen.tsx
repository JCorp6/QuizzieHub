"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { defaultQuizzes } from "@/lib/defaultQuizzes"
import { getCustomQuizzes } from "@/lib/firebaseQuizzes"

interface Quiz {
  id: string
  title: string
  description: string
  questions: any[]
  category: string
  difficulty: string
  createdBy?: string
}

interface QuizSelectionScreenProps {
  onPlayQuiz: (quiz: Quiz) => void
  onCreateQuiz: () => void
  onPlayMultiplayer: () => void
  user: User
}

export default function QuizSelectionScreen({
  onPlayQuiz,
  onCreateQuiz,
  onPlayMultiplayer,
  user,
}: QuizSelectionScreenProps) {
  const [quizzes, setQuizzes] = useState<Quiz[]>(defaultQuizzes)
  const [customQuizzes, setCustomQuizzes] = useState<Quiz[]>([])
  const [activeTab, setActiveTab] = useState<"default" | "custom">("default")
  const [searchTerm, setSearchTerm] = useState("")

  useEffect(() => {
    loadCustomQuizzes()
  }, [user])

  const loadCustomQuizzes = async () => {
    if (user) {
      try {
        const custom = await getCustomQuizzes(user.uid)
        setCustomQuizzes(custom)
      } catch (error) {
        console.error("Error loading custom quizzes:", error)
      }
    }
  }

  const displayQuizzes = activeTab === "default" ? quizzes : customQuizzes
  const filtered = displayQuizzes.filter(
    (quiz) =>
      quiz.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      quiz.description.toLowerCase().includes(searchTerm.toLowerCase()),
  )

  return (
    <div className="space-y-8 animate-slide-in">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 rounded-3xl p-8 text-white shadow-xl">
        <h1 className="text-4xl font-bold mb-2">Welcome Back to QuizzieHub!</h1>
        <p className="text-purple-100 text-lg mb-6">Select a quiz to get started or create your own</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold">🎮</div>
            <p className="text-purple-100 text-sm mt-2">100+ Quizzes</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold">🏆</div>
            <p className="text-purple-100 text-sm mt-2">Earn Points</p>
          </div>
          <div className="bg-white/10 rounded-lg p-4 backdrop-blur-sm">
            <div className="text-3xl font-bold">👥</div>
            <p className="text-purple-100 text-sm mt-2">Compete Online</p>
          </div>
        </div>
      </div>

      {/* Tabs and Search */}
      <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setActiveTab("default")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === "default"
                ? "bg-purple-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            Default Quizzes
          </button>
          <button
            onClick={() => setActiveTab("custom")}
            className={`px-6 py-2 rounded-lg font-semibold transition-all ${
              activeTab === "custom"
                ? "bg-blue-600 text-white shadow-lg"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            My Quizzes
          </button>
        </div>

        <div className="flex gap-2 w-full sm:w-auto">
          <button
            onClick={onPlayMultiplayer}
            className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-red-500 to-pink-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            🎮 Multiplayer
          </button>
          <button
            onClick={onCreateQuiz}
            className="flex-1 sm:flex-none px-6 py-2 bg-gradient-to-r from-orange-500 to-red-500 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all"
          >
            + Create Quiz
          </button>
        </div>
      </div>

      {/* Search */}
      <input
        type="text"
        placeholder="🔍 Search quizzes..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="w-full px-4 py-3 rounded-lg border-2 border-gray-300 focus:border-purple-600 focus:outline-none font-medium"
      />

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filtered.length > 0 ? (
          filtered.map((quiz) => (
            <div
              key={quiz.id}
              className="bg-white rounded-xl shadow-lg hover:shadow-2xl transform hover:scale-105 transition-all duration-300 overflow-hidden cursor-pointer"
              onClick={() => onPlayQuiz(quiz)}
            >
              <div
                className={`h-32 bg-gradient-to-br ${
                  quiz.category === "Science"
                    ? "from-blue-400 to-blue-600"
                    : quiz.category === "Geography"
                      ? "from-green-400 to-green-600"
                      : quiz.category === "History"
                        ? "from-orange-400 to-orange-600"
                        : quiz.category === "Sports"
                          ? "from-red-400 to-red-600"
                          : "from-purple-400 to-purple-600"
                } flex items-center justify-center text-5xl`}
              >
                {quiz.category === "Science"
                  ? "🔬"
                  : quiz.category === "Geography"
                    ? "🌍"
                    : quiz.category === "History"
                      ? "📚"
                      : quiz.category === "Sports"
                        ? "⚽"
                        : "🎓"}
              </div>
              <div className="p-4">
                <h3 className="font-bold text-lg text-gray-800 mb-1">{quiz.title}</h3>
                <p className="text-gray-600 text-sm mb-3">{quiz.description}</p>
                <div className="flex gap-2 text-xs mb-3">
                  <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">{quiz.questions.length} Questions</span>
                  <span
                    className={`px-2 py-1 rounded ${
                      quiz.difficulty === "Easy"
                        ? "bg-green-100 text-green-800"
                        : quiz.difficulty === "Medium"
                          ? "bg-yellow-100 text-yellow-800"
                          : "bg-red-100 text-red-800"
                    }`}
                  >
                    {quiz.difficulty}
                  </span>
                </div>
                <button
                  className="w-full py-2 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg"
                  onClick={(e) => {
                    e.stopPropagation()
                    onPlayQuiz(quiz)
                  }}
                >
                  Play Now →
                </button>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12">
            <div className="text-4xl mb-4">📭</div>
            <p className="text-gray-600 font-medium">No quizzes found</p>
            {activeTab === "custom" && (
              <button
                onClick={onCreateQuiz}
                className="mt-4 px-6 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700"
              >
                Create Your First Quiz
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
