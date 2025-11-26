"use client"

interface Question {
  id: string
  text: string
  options: string[]
  correctAnswer: number
  category?: string
}

interface QuestionCardProps {
  question: Question
  onAnswer: (index: number) => void
  answered: boolean
  selectedAnswer: number | null
  isCorrect: boolean | null
  showFeedback: boolean
}

export default function QuestionCard({
  question,
  onAnswer,
  answered,
  selectedAnswer,
  isCorrect,
  showFeedback,
}: QuestionCardProps) {
  const colors = [
    "from-blue-400 to-blue-600",
    "from-purple-400 to-purple-600",
    "from-pink-400 to-pink-600",
    "from-yellow-400 to-yellow-600",
  ]

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Question */}
      <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-8 text-white shadow-xl">
        <h3 className="text-2xl md:text-3xl font-bold text-center leading-relaxed">{question.text}</h3>
      </div>

      {/* Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrectOption = index === question.correctAnswer

          let bgClass = `bg-gradient-to-br ${colors[index % colors.length]}`
          let borderClass = "border-2 border-transparent"
          let textClass = "text-white"
          let hoverClass = "hover:shadow-lg hover:scale-105"
          const cursorClass = answered ? "cursor-not-allowed" : "cursor-pointer"

          if (answered) {
            hoverClass = ""
            if (isSelected && isCorrect) {
              bgClass = "bg-gradient-to-br from-green-400 to-green-600"
              borderClass = "border-4 border-green-700"
            } else if (isSelected && !isCorrect) {
              bgClass = "bg-gradient-to-br from-red-400 to-red-600"
              borderClass = "border-4 border-red-700"
            } else if (isCorrectOption) {
              bgClass = "bg-gradient-to-br from-green-400 to-green-600"
            } else {
              bgClass = "bg-gradient-to-br from-gray-300 to-gray-400"
              textClass = "text-gray-700"
            }
          }

          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              disabled={answered}
              className={`p-6 rounded-xl font-bold text-lg transition-all duration-300 ${bgClass} ${textClass} ${borderClass} ${hoverClass} ${cursorClass} transform ${
                showFeedback && (isSelected || (answered && isCorrectOption)) ? "animate-pulse-scale" : ""
              }`}
            >
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center font-bold">
                  {String.fromCharCode(65 + index)}
                </div>
                <span className="text-left">{option}</span>
              </div>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {showFeedback && (
        <div
          className={`rounded-xl p-4 text-center font-bold text-white text-lg animate-slide-in ${
            isCorrect ? "bg-gradient-to-r from-green-400 to-green-600" : "bg-gradient-to-r from-red-400 to-red-600"
          }`}
        >
          {isCorrect ? (
            <div>
              <div className="text-3xl mb-2">🎉</div>
              <div>Correct! Well done!</div>
            </div>
          ) : (
            <div>
              <div className="text-3xl mb-2">❌</div>
              <div>Incorrect! Keep trying!</div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
