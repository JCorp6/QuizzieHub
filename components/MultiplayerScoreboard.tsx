"use client"

interface Player {
  uid: string
  displayName: string
  email: string
  score: number
  answeredQuestions: number
  currentQuestion: number
}

interface MultiplayerScoreboardProps {
  players: Player[]
  currentUserId: string
}

export default function MultiplayerScoreboard({ players, currentUserId }: MultiplayerScoreboardProps) {
  const sortedPlayers = [...players].sort((a, b) => b.score - a.score)

  return (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden sticky top-4 animate-slide-in">
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white font-bold">LIVE SCOREBOARD</div>

      <div className="p-4 space-y-2 max-h-96 overflow-y-auto">
        {sortedPlayers.length > 0 ? (
          sortedPlayers.map((player, index) => (
            <div
              key={player.uid}
              className={`p-3 rounded-lg border-2 transition-all ${
                player.uid === currentUserId ? "bg-purple-50 border-purple-400 shadow-md" : "bg-gray-50 border-gray-200"
              }`}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`text-lg font-bold w-8 h-8 rounded-full flex items-center justify-center ${
                    index === 0
                      ? "bg-yellow-400 text-white"
                      : index === 1
                        ? "bg-gray-400 text-white"
                        : index === 2
                          ? "bg-orange-400 text-white"
                          : "bg-gray-300 text-white"
                  }`}
                >
                  {index + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 truncate">
                    {player.displayName || "Anonymous"}
                    {player.uid === currentUserId && " (You)"}
                  </p>
                  <p className="text-xs text-gray-600">Q{player.currentQuestion + 1}</p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-lg text-purple-600">{player.score}</p>
                  <p className="text-xs text-gray-600">pts</p>
                </div>
              </div>
            </div>
          ))
        ) : (
          <div className="text-center py-6 text-gray-500">
            <div className="text-2xl mb-2">👥</div>
            <p className="text-sm">Waiting for players...</p>
          </div>
        )}
      </div>
    </div>
  )
}
