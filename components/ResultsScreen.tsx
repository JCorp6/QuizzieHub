"use client"

interface ResultsScreenProps {
  result: any
  quiz: any
  onPlayAgain: () => void
  onBackToHome: () => void
}

export default function ResultsScreen({ result, quiz, onPlayAgain, onBackToHome }: ResultsScreenProps) {
  const percentage = Math.round((result.score / (result.totalQuestions * 10)) * 100)

  let message = ""
  let emoji = ""
  let messageClass = ""

  if (percentage >= 80) {
    message = "Kamu Hebat, Lanjutkan! 🚀"
    emoji = "🏆"
    messageClass = "from-green-400 to-green-600"
  } else if (percentage >= 50) {
    message = "Kamu Bisa Lebih Baik Lagi 💪"
    emoji = "⭐"
    messageClass = "from-yellow-400 to-yellow-600"
  } else {
    message = "Tetap Semangat dan Ulangi Lagi! 🔄"
    emoji = "💫"
    messageClass = "from-blue-400 to-blue-600"
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 animate-slide-in">
      {/* Score Circle */}
      <div className="text-center">
        <div
          className={`bg-gradient-to-br ${messageClass} rounded-full w-48 h-48 mx-auto flex items-center justify-center shadow-2xl`}
        >
          <div className="text-center">
            <div className="text-6xl font-bold text-white mb-2">{percentage}%</div>
            <div className="text-2xl text-white/90 font-semibold">{result.score} Points</div>
          </div>
        </div>
      </div>

      {/* Message */}
      <div className="bg-white rounded-xl shadow-lg p-6 text-center">
        <div className="text-5xl mb-4">{emoji}</div>
        <h2 className="text-3xl font-bold text-gray-800 mb-2">{message}</h2>
        <p className="text-gray-600">
          You scored {percentage}% on {result.quizTitle}
        </p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-4 text-white text-center">
          <div className="text-2xl font-bold">{result.totalQuestions}</div>
          <div className="text-sm opacity-90">Total Questions</div>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white text-center">
          <div className="text-2xl font-bold">{result.score / 10}</div>
          <div className="text-sm opacity-90">Correct Answers</div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-4 text-white text-center">
          <div className="text-2xl font-bold">{result.totalQuestions - result.score / 10}</div>
          <div className="text-sm opacity-90">Incorrect Answers</div>
        </div>
        <div className="bg-gradient-to-br from-red-400 to-red-600 rounded-lg p-4 text-white text-center">
          <div className="text-2xl font-bold">🔥 {result.streak}</div>
          <div className="text-sm opacity-90">Max Streak</div>
        </div>
      </div>

      {/* Results Details */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white font-bold">Question Breakdown</div>
        <div className="p-4 space-y-2 max-h-64 overflow-y-auto">
          {result.answeredQuestions.map((answerIndex: number | null, idx: number) => {
            const question = quiz.questions[idx]
            const isCorrect = answerIndex === question.correctAnswer
            return (
              <div
                key={idx}
                className={`p-3 rounded-lg border-2 ${
                  isCorrect ? "border-green-500 bg-green-50" : "border-red-500 bg-red-50"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className={`text-2xl flex-shrink-0 ${isCorrect ? "text-green-600" : "text-red-600"}`}>
                    {isCorrect ? "✓" : "✗"}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-800 text-sm">{question.text}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Your answer: <span className="font-bold">{question.options[answerIndex ?? 0]}</span>
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-green-600 mt-1">
                        Correct: <span className="font-bold">{question.options[question.correctAnswer]}</span>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onPlayAgain}
          className="flex-1 py-4 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-lg font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Play Again ↻
        </button>
        <button
          onClick={onBackToHome}
          className="flex-1 py-4 bg-gray-300 text-gray-800 rounded-lg font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all"
        >
          Back to Home
        </button>
      </div>
    </div>
  )
}
