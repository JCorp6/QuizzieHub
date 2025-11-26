"use client"

import { useState } from "react"

interface LoginPageProps {
  onSignIn: () => Promise<void>
}

export default function LoginPage({ onSignIn }: LoginPageProps) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true)
      setError("")
      await onSignIn()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to sign in")
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="w-full max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Left Side - Content */}
          <div className="text-center md:text-left animate-slide-in">
            <div className="mb-8">
              <h1 className="text-5xl md:text-6xl font-bold bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 bg-clip-text text-transparent mb-4">
                QuizzieHub
              </h1>
              <p className="text-xl text-gray-600 font-semibold">Learn, Play & Compete!</p>
            </div>

            <div className="space-y-4 mb-8">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Play Default Quizzes</h3>
                  <p className="text-gray-600 text-sm">Challenge yourself with pre-made quizzes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-blue-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Create Your Own</h3>
                  <p className="text-gray-600 text-sm">Build and share custom quizzes</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center flex-shrink-0 mt-1">
                  ✓
                </div>
                <div>
                  <h3 className="font-bold text-gray-800">Compete Multiplayer</h3>
                  <p className="text-gray-600 text-sm">Battle friends in real-time</p>
                </div>
              </div>
            </div>

            <button
              onClick={handleGoogleSignIn}
              disabled={loading}
              className="w-full md:w-auto px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white font-bold rounded-lg hover:shadow-lg transform hover:scale-105 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <text x="0" y="20" fontSize="20" fill="currentColor">
                  G
                </text>
              </svg>
              {loading ? "Signing in..." : "Sign in with Google"}
            </button>

            {error && <p className="text-red-600 mt-4 text-sm">{error}</p>}
          </div>

          {/* Right Side - Visual */}
          <div className="hidden md:block">
            <div className="bg-gradient-to-br from-purple-400 via-pink-400 to-red-400 rounded-3xl p-8 shadow-2xl transform hover:scale-105 transition-transform duration-300 animate-pulse-scale">
              <div className="bg-white rounded-2xl p-6 mb-4">
                <div className="space-y-3 mb-4">
                  <div className="h-3 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded"></div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-green-100 h-16 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">A</span>
                  </div>
                  <div className="bg-blue-100 h-16 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">B</span>
                  </div>
                  <div className="bg-yellow-100 h-16 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">C</span>
                  </div>
                  <div className="bg-purple-100 h-16 rounded-lg flex items-center justify-center">
                    <span className="text-2xl">D</span>
                  </div>
                </div>
              </div>
              <p className="text-white text-center font-bold text-lg">Exciting Quizzes Await!</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
