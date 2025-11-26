"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import { defaultQuizzes } from "@/lib/defaultQuizzes"
import {
  createMultiplayerRoom,
  joinMultiplayerRoom,
  getActiveRooms,
  listenToRoomChanges,
} from "@/lib/firebaseMultiplayer"

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
  const [rooms, setRooms] = useState<Room[]>([])
  const [selectedQuiz, setSelectedQuiz] = useState(defaultQuizzes[0])
  const [creating, setCreating] = useState(false)
  const [joining, setJoining] = useState<string | null>(null)
  const [roomCode, setRoomCode] = useState("")
  const [error, setError] = useState("")
  const [activeTab, setActiveTab] = useState<"available" | "join-code">("available")

  useEffect(() => {
    loadRooms()
    const unsubscribe = listenToRoomChanges((updatedRooms) => {
      setRooms(updatedRooms.filter((r) => r.status === "waiting"))
    })
    return () => unsubscribe?.()
  }, [])

  const loadRooms = async () => {
    try {
      const activeRooms = await getActiveRooms()
      setRooms(activeRooms.filter((r) => r.status === "waiting" && r.host.uid !== user.uid))
    } catch (error) {
      console.error("Error loading rooms:", error)
    }
  }

  const handleCreateRoom = async () => {
    try {
      setError("")
      setCreating(true)

      const room = await createMultiplayerRoom(user, selectedQuiz)
      onStartGame(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create room")
      setCreating(false)
    }
  }

  const handleJoinRoom = async (roomId: string) => {
    try {
      setError("")
      setJoining(roomId)

      const room = await joinMultiplayerRoom(roomId, user)
      onStartGame(room)
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to join room")
      setJoining(null)
    }
  }

  const handleJoinByCode = async () => {
    if (!roomCode.trim()) {
      setError("Please enter a room code")
      return
    }
    await handleJoinRoom(roomCode)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Multiplayer Mode</h1>
        <button onClick={onBack} className="text-gray-600 hover:text-gray-800 font-semibold">
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
              <select
                value={selectedQuiz.id}
                onChange={(e) => {
                  const quiz = defaultQuizzes.find((q) => q.id === e.target.value)
                  if (quiz) setSelectedQuiz(quiz)
                }}
                className="w-full px-3 py-2 rounded-lg text-gray-800 font-medium"
              >
                {defaultQuizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    {quiz.title}
                  </option>
                ))}
              </select>
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
          {/* Tabs */}
          <div className="flex gap-2">
            <button
              onClick={() => setActiveTab("available")}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "available"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Available Rooms ({rooms.length})
            </button>
            <button
              onClick={() => setActiveTab("join-code")}
              className={`flex-1 px-4 py-2 rounded-lg font-semibold transition-all ${
                activeTab === "join-code"
                  ? "bg-blue-600 text-white shadow-lg"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
            >
              Join by Code
            </button>
          </div>

          {/* Available Rooms Tab */}
          {activeTab === "available" && (
            <div className="space-y-4">
              {rooms.length > 0 ? (
                rooms.map((room) => (
                  <div
                    key={room.id}
                    className="bg-white rounded-xl shadow-lg p-4 border-2 border-gray-200 hover:border-blue-400 transition-all"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1">
                        <h3 className="font-bold text-lg text-gray-800">{room.quiz.title}</h3>
                        <div className="flex gap-2 text-sm text-gray-600 mt-2">
                          <span>Host: {room.host.displayName || "Anonymous"}</span>
                          <span>•</span>
                          <span>{room.players.length + 1} Players</span>
                        </div>
                        <div className="flex gap-2 mt-2">
                          <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-xs font-semibold">
                            {room.quiz.questions.length} Q
                          </span>
                          <span
                            className={`px-2 py-1 rounded text-xs font-semibold ${
                              room.quiz.difficulty === "Easy"
                                ? "bg-green-100 text-green-800"
                                : room.quiz.difficulty === "Medium"
                                  ? "bg-yellow-100 text-yellow-800"
                                  : "bg-red-100 text-red-800"
                            }`}
                          >
                            {room.quiz.difficulty}
                          </span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room.id)}
                        disabled={joining === room.id}
                        className="px-6 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-semibold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50 flex-shrink-0"
                      >
                        {joining === room.id ? "Joining..." : "Join"}
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-12 bg-gray-50 rounded-xl">
                  <div className="text-4xl mb-4">🎮</div>
                  <p className="text-gray-600 font-medium">No available rooms</p>
                  <p className="text-gray-500 text-sm">Create one to get started!</p>
                </div>
              )}
            </div>
          )}

          {/* Join by Code Tab */}
          {activeTab === "join-code" && (
            <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
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
                disabled={!roomCode || joining !== null}
                className="w-full py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg font-bold hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
              >
                Join Room
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
