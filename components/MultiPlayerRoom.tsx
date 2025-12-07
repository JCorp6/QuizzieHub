// FILE: components/MultiplayerRoom.tsx

"use client"

import { useState, useEffect } from "react"
import { User } from "firebase/auth"
import { 
    listenToRoomPlayers, 
    startMultiplayerGame, 
    leaveMultiplayerRoom,
    listenToGameStart,
    setRoomSettings
} from "@/lib/firebaseMultiplayer"

interface Player {
    uid: string
    displayName: string
    score: number
    isReady?: boolean
}

interface RoomData {
    id: string
    quiz: { 
        title: string, 
        questions: any[], 
        difficulty: string,
        defaultTimeLimit?: number 
    }
    host: { uid: string, displayName: string }
    status: "waiting" | "playing" | "finished"
    settings?: {
        hostCanPlay?: boolean
        timePerQuestion?: number
        autoProceed?: boolean
    }
}

interface MultiplayerRoomProps {
    room: RoomData
    user: User
    onGameStarted: (room: RoomData) => void
    onRoomClosed: () => void
}

const MAX_PLAYERS = 5

export default function MultiplayerRoom({ room, user, onGameStarted, onRoomClosed }: MultiplayerRoomProps) {
    const [players, setPlayers] = useState<Player[]>([])
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState("")
    const [gameSettings, setGameSettings] = useState({
        timePerQuestion: room.quiz.defaultTimeLimit || 30,
        autoProceed: true,
        hostCanPlay: false // DEFAULT: Host tidak bisa main
    })

    const isHost = user.uid === room.host.uid

    // 1. Listen ke perubahan daftar pemain (EXCLUDE host dari daftar player)
    useEffect(() => {
        const unsubscribePlayers = listenToRoomPlayers(room.id, (updatedPlayers) => {
            // Filter out host dari daftar player
            const playersWithoutHost = updatedPlayers
                .filter((p: Player) => p.uid !== room.host.uid)
                .map((p: Player) => ({
                    ...p,
                    isReady: p.isReady || false
                }))
            setPlayers(playersWithoutHost)
        })
        
        // 2. Listen ke perubahan status game
        const unsubscribeGame = listenToGameStart(room.id, (updatedRoom) => {
            if (updatedRoom && updatedRoom.status === "playing") {
                onGameStarted(updatedRoom)
            } else if (updatedRoom && updatedRoom.status === "finished") {
                onRoomClosed()
            }
        })

        return () => {
            unsubscribePlayers?.()
            unsubscribeGame?.()
        }
    }, [room.id, room.host.uid, onGameStarted, onRoomClosed])

    // Update game settings
    useEffect(() => {
        if (isHost && room.settings) {
            setGameSettings(prev => ({
                ...prev,
                ...room.settings
            }))
        }
    }, [isHost, room.settings])

    const handleUpdateSettings = async (newSettings: Partial<typeof gameSettings>) => {
        if (!isHost) return
        
        const updatedSettings = { ...gameSettings, ...newSettings }
        setGameSettings(updatedSettings)
        
        try {
            await setRoomSettings(room.id, updatedSettings)
        } catch (err) {
            console.error("Failed to update settings:", err)
            setError("Gagal mengupdate pengaturan")
        }
    }

    const handleStartGame = async () => {
        if (!isHost) return
        if (players.length < 1) {
            setError("Minimal 1 pemain diperlukan untuk memulai game.")
            return
        }
        
        setLoading(true)
        setError("")
        
        try {
            // 1. Update settings terlebih dahulu
            await setRoomSettings(room.id, {
                ...gameSettings,
                hostCanPlay: false // Pastikan host tidak bisa main
            })
            
            // 2. Start game dengan mengatur player data yang benar
            await startMultiplayerGame(room.id)
            
            // onGameStarted akan dipanggil oleh listener di atas
        } catch (err: any) {
            console.error("Failed to start game:", err)
            setError("Gagal memulai game: " + (err.message || "Unknown error"))
            setLoading(false)
        }
    }

    const handleLeaveRoom = async () => {
        if (loading) return
        setLoading(true)
        try {
            await leaveMultiplayerRoom(room.id, user.uid)
            onRoomClosed()
        } catch (err) {
            console.error(err)
            setError("Gagal meninggalkan room.")
            setLoading(false)
        }
    }

    const currentPlayersCount = players.length
    const isFull = currentPlayersCount >= MAX_PLAYERS

    return (
        <div className="max-w-2xl mx-auto space-y-6 animate-fade-in">
            <div className="text-center">
                <h1 className="text-3xl font-bold text-gray-800 mb-2">Room: {room.id}</h1>
                <p className="text-gray-600">Host: <span className="font-semibold text-purple-600">{room.host.displayName}</span></p>
            </div>

            <div className="bg-white rounded-xl shadow-xl p-6 space-y-6">
                {error && (
                    <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg">
                        {error}
                    </div>
                )}

                {/* Game Info Card */}
                <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg p-4 border border-blue-200">
                    <h2 className="text-xl font-bold text-gray-800 mb-2">{room.quiz.title}</h2>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                        <div className="text-center">
                            <div className="text-lg font-bold text-blue-600">{room.quiz.questions.length}</div>
                            <div className="text-gray-600">Soal</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-purple-600">{room.quiz.difficulty}</div>
                            <div className="text-gray-600">Tingkat</div>
                        </div>
                        <div className="text-center">
                            <div className="text-lg font-bold text-green-600">{gameSettings.timePerQuestion}s</div>
                            <div className="text-gray-600">Waktu/Soal</div>
                        </div>
                    </div>
                </div>

                {/* Game Settings (Hanya untuk Host) */}
                {isHost && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                        <h3 className="font-bold text-gray-700 mb-3">⚙️ Pengaturan Game</h3>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Waktu per Soal</p>
                                    <p className="text-sm text-gray-500">Detik untuk menjawab setiap soal</p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => handleUpdateSettings({ 
                                            timePerQuestion: Math.max(10, gameSettings.timePerQuestion - 5) 
                                        })}
                                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                    >
                                        -
                                    </button>
                                    <span className="font-bold w-12 text-center">{gameSettings.timePerQuestion}s</span>
                                    <button
                                        onClick={() => handleUpdateSettings({ 
                                            timePerQuestion: Math.min(120, gameSettings.timePerQuestion + 5) 
                                        })}
                                        className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center hover:bg-gray-300"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>
                            <div className="flex items-center justify-between">
                                <div>
                                    <p className="font-medium text-gray-700">Auto Lanjut</p>
                                    <p className="text-sm text-gray-500">Otomatis lanjut saat semua jawab</p>
                                </div>
                                <button
                                    onClick={() => handleUpdateSettings({ autoProceed: !gameSettings.autoProceed })}
                                    className={`relative inline-flex h-6 w-11 items-center rounded-full ${gameSettings.autoProceed ? 'bg-green-500' : 'bg-gray-300'}`}
                                >
                                    <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition ${gameSettings.autoProceed ? 'translate-x-6' : 'translate-x-1'}`} />
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Players List */}
                <div>
                    <div className="flex items-center justify-between mb-3">
                        <h3 className="text-lg font-bold text-gray-800">
                            Pemain ({currentPlayersCount}/{MAX_PLAYERS})
                        </h3>
                        {isFull && (
                            <span className="px-3 py-1 bg-red-100 text-red-700 text-sm rounded-full font-medium">
                                🔴 Room Penuh
                            </span>
                        )}
                    </div>
                    
                    <div className="space-y-2">
                        {/* Host Card */}
                        <div className="bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200 rounded-lg p-3">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-full bg-yellow-500 flex items-center justify-center">
                                    <span className="text-white font-bold">👑</span>
                                </div>
                                <div className="flex-1">
                                    <div className="font-medium text-gray-800">{room.host.displayName}</div>
                                    <div className="text-sm text-gray-600">Host • Hanya Monitoring</div>
                                </div>
                                <span className="px-3 py-1 bg-yellow-100 text-yellow-800 text-sm rounded-full">
                                    HOST
                                </span>
                            </div>
                        </div>

                        {/* Players */}
                        {players.length === 0 ? (
                            <div className="text-center py-6">
                                <div className="text-4xl mb-2">👤</div>
                                <p className="text-gray-500">Belum ada pemain lain...</p>
                                <p className="text-sm text-gray-400 mt-1">Bagikan kode room untuk mengundang teman!</p>
                            </div>
                        ) : (
                            players.map((player) => (
                                <div 
                                    key={player.uid} 
                                    className={`flex items-center gap-3 p-3 rounded-lg border ${
                                        player.uid === user.uid 
                                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 border-blue-300' 
                                            : 'bg-gray-50 border-gray-200'
                                    }`}
                                >
                                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                                        player.uid === user.uid ? 'bg-blue-500' : 'bg-gray-300'
                                    }`}>
                                        <span className="text-white font-bold">
                                            {player.displayName?.charAt(0) || "P"}
                                        </span>
                                    </div>
                                    <div className="flex-1">
                                        <div className="font-medium text-gray-800">
                                            {player.displayName}
                                            {player.uid === user.uid && (
                                                <span className="ml-2 text-blue-600 text-sm">(Anda)</span>
                                            )}
                                        </div>
                                        <div className="text-xs text-gray-500">
                                            {player.isReady ? "✅ Siap" : "⏳ Menunggu..."}
                                        </div>
                                    </div>
                                    {player.uid === user.uid && (
                                        <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                            YOU
                                        </span>
                                    )}
                                </div>
                            ))
                        )}
                    </div>
                </div>

                {/* Action Buttons */}
                <div className="pt-4">
                    {isHost ? (
                        <div className="space-y-3">
                            <button
                                onClick={handleStartGame}
                                disabled={currentPlayersCount < 1 || loading || isFull}
                                className={`w-full py-3 rounded-lg font-bold text-lg transition-all ${
                                    currentPlayersCount >= 1 && !isFull
                                        ? 'bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                {loading ? (
                                    <span className="flex items-center justify-center gap-2">
                                        <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                        Memulai...
                                    </span>
                                ) : (
                                    `🎮 Mulai Game (${currentPlayersCount} Pemain)`
                                )}
                            </button>
                            
                            {currentPlayersCount < 1 && (
                                <p className="text-center text-sm text-red-600">
                                    Minimal 1 pemain diperlukan untuk memulai
                                </p>
                            )}
                        </div>
                    ) : (
                        <button
                            onClick={handleLeaveRoom}
                            disabled={loading}
                            className="w-full py-3 bg-gradient-to-r from-red-500 to-pink-600 text-white rounded-lg font-bold text-lg hover:from-red-600 hover:to-pink-700 transition disabled:opacity-50"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <span className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></span>
                                    Meninggalkan...
                                </span>
                            ) : (
                                "🚪 Keluar Room"
                            )}
                        </button>
                    )}
                </div>

                {/* Room Code & Info */}
                <div className="pt-4 border-t border-gray-200">
                    <div className="text-center">
                        <p className="text-sm text-gray-500 mb-2">Bagikan kode ini untuk mengundang teman:</p>
                        <div className="bg-gray-900 text-white font-mono text-xl py-3 px-4 rounded-lg inline-block">
                            {room.id}
                        </div>
                        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                            <div className="bg-blue-50 p-2 rounded">
                                <div className="font-bold text-blue-600">🎯 Mode Baru</div>
                                <div className="text-xs text-blue-700">Host hanya monitoring</div>
                            </div>
                            <div className="bg-purple-50 p-2 rounded">
                                <div className="font-bold text-purple-600">⏱️ Timer</div>
                                <div className="text-xs text-purple-700">{gameSettings.timePerQuestion}s/soal</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}