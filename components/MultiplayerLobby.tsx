"use client"

import { useState } from "react"
import type { User } from "firebase/auth"
import { defaultQuizzes } from "@/lib/defaultQuizzes"
import {
  createMultiplayerRoom,
  joinMultiplayerRoom,
} from "@/lib/firebaseMultiplayer"
import QuizSelectionModal from "./QuizSelectionModal" // Import the modal

interface Room {
  id: string
  quiz: any
  host: User
  players: User[]
  status: "waiting" | "playing" | "finished"
  createdAt: Date
}

interface MultiplayerLobbyProps {
  onBack: () => void
  onStartGame: (room: any) => void
  user: User
}

export default function MultiplayerLobby({ onBack, onStartGame, user }: MultiplayerLobbyProps) {
  const [selectedQuiz, setSelectedQuiz] = useState(defaultQuizzes[0])
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState(false)
  const [roomCode, setRoomCode] = useState("")
  const [error, setError] = useState("")
  const [isQuizModalOpen, setQuizModalOpen] = useState(false) // State for modal
  const [createdRoom, setCreatedRoom] = useState<Room | null>(null)



  const handleCreateRoom = async () => {
    try {
      setError("")
      setCreating(true)

      const room = await createMultiplayerRoom(user, selectedQuiz)
      setCreatedRoom(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room")
    } finally {
      setCreating(false)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    try {
      setError("")
      setJoining(true)

      const room = await joinMultiplayerRoom(roomId, user)
      onStartGame(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room")
    } finally {
      setJoining(false)
    }
  }

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }
    await handleJoinRoom(roomCode)
  }

  const handleSelectQuiz = (quiz: any) => {
    setSelectedQuiz(quiz)
    setQuizModalOpen(false) // Close modal on selection
  }

  if (createdRoom) {
    const shareLink = `${window.location.origin}/play/${createdRoom.id}`
    return (
      <div className="animate-slide-in bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Room Created!</h1>
          <button onClick={() => setCreatedRoom(null)} className="text-gray-600 hover:text-gray-800 font-semibold">
            ← Back
          </button>
        </div>
        <div className="mt-6 bg-white rounded-xl shadow-lg p-8 text-center">
          <h2 className="text-2xl font-bold text-gray-800">Share this with your friends!</h2>
          <p className="text-gray-600 mt-2">Others can use this code or link to join.</p>
          <div className="my-6">
            <p className="text-lg font-semibold text-gray-500">ROOM CODE</p>
            <div className="text-6xl font-bold text-purple-600 tracking-widest my-2 p-4 bg-purple-50 rounded-lg">
              {createdRoom.id}
            </div>
          </div>
          <div className="space-y-4">
            <div className="relative">
              <input
                type="text"
                readOnly
                value={shareLink}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 font-mono text-sm"
              />
              <button
                onClick={() => navigator.clipboard.writeText(shareLink)}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs font-semibold hover:bg-gray-300"
              >
                Copy
              </button>
            </div>
            <button
              onClick={() => onStartGame(createdRoom)}
              className="w-full py-3 bg-gradient-to-r from-purple-500 to-purple-700 text-white rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all"
            >
              Let's Go! →
            </button>
          </div>
        </div>
      </div>
    )
  }

  const handleBack = () => {
    setCreatedRoom(null)
    onBack()
  }

  return (
    <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl">
      {isQuizModalOpen && (
        <QuizSelectionModal
          user={user}
          onSelect={handleSelectQuiz}
          onClose={() => setQuizModalOpen(false)}
          selectedQuiz={selectedQuiz}
        />
      )}
      <div className="space-y-6 animate-slide-in">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-800">Multiplayer Mode</h1>
          <button onClick={handleBack} className="text-gray-600 hover:text-gray-800 font-semibold">
            ← Back
          </button>
        </div>

        {error && (
          <div className="bg-red-100 border-2 border-red-600 text-red-800 p-4 rounded-lg font-semibold">{error}</div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Create Room Section */}
          <div className="lg:col-span-1">
            <div className="bg-gradient-to-br from-purple-500 to-purple-700 rounded-xl shadow-lg p-6 text-white space-y-4">
              <h2 className="text-2xl font-bold">Create a Room</h2>
              <p className="text-purple-100 text-sm">Host a new quiz game and invite friends</p>

              <div>
                <label className="block font-semibold mb-2">Select Quiz:</label>
                <button
                  onClick={() => setQuizModalOpen(true)}
                  className="w-full px-3 py-2 rounded-lg text-gray-800 font-medium bg-white text-left"
                >
                  <span className="truncate">{selectedQuiz.title}</span>
                </button>
              </div>

              <div className="bg-white/20 rounded-lg p-3">
                <p className="text-sm opacity-90">{selectedQuiz.questions.length} Questions</p>
                <p className="text-sm opacity-90">{selectedQuiz.difficulty} Level</p>
              </div>

              <button
                onClick={handleCreateRoom}
                disabled={creating}
                className="w-full py-3 bg-white text-purple-600 rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
              >
                {creating ? "Creating Room..." : "Create & Host Room"}
              </button>
            </div>
          </div>

          {/* Join Section */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
              <h2 className="text-2xl font-bold">Join a Room</h2>
              <p className="text-gray-600">Enter the room code to join a specific game</p>
              <input
                type="text"
                placeholder="Enter room code..."
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                maxLength={6}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-blue-600 focus:outline-none font-mono text-lg text-center"
              />
              <button
                onClick={handleJoinByCode}
                disabled={!roomCode || joining}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
              >
                {joining ? "Joining..." : "Join Room"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
