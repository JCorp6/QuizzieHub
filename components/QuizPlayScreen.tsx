"use client"

import { useState } from "react"
import QuestionCard from "./QuestionCard"

interface QuizPlayScreenProps {
  quiz: any
  onFinish: (result: any) => void
  onBack: () => void
}

export default function QuizPlayScreen({ quiz, onFinish, onBack }: QuizPlayScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [allAnswers, setAllAnswers] = useState<any[]>([])

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100

  const handleAnswer = (answerIndex: number) => {
    if (answered) return

    const selected = [...selectedAnswers]
    selected[currentQuestionIndex] = answerIndex
    setSelectedAnswers(selected)

    const correct = answerIndex === currentQuestion.correctAnswer
    setIsCorrect(correct)
    setAnswered(true)
    setShowFeedback(true)

    if (correct) {
      setScore(score + 10)
      setStreak(streak + 1)
      setAllAnswers([...allAnswers, { questionId: currentQuestion.id, correct: true, streak }])
    } else {
      setStreak(0)
      setAllAnswers([...allAnswers, { questionId: currentQuestion.id, correct: false }])
    }

    setTimeout(() => {
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setAnswered(false)
        setShowFeedback(false)
        setIsCorrect(null)
      } else {
        onFinish({
          score,
          totalQuestions: quiz.questions.length,
          streak,
          answers: allAnswers,
          quizTitle: quiz.title,
          answeredQuestions: selected,
        })
      }
    }, 1500)
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="bg-white rounded-lg shadow-md p-4">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">{quiz.title}</h2>
          <button onClick={onBack} className="text-gray-600 hover:text-gray-800 font-semibold">
            ← Back
          </button>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>
              Question {currentQuestionIndex + 1} of {quiz.questions.length}
            </span>
            <span className="font-semibold">Score: {score}</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-3">
            <div
              className="bg-gradient-to-r from-purple-600 to-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-4 text-white">
          <div className="text-xs font-semibold opacity-80">SCORE</div>
          <div className="text-3xl font-bold">{score}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white">
          <div className="text-xs font-semibold opacity-80">STREAK</div>
          <div className="text-3xl font-bold">🔥 {streak}</div>
        </div>
        <div className="bg-gradient-to-br from-blue-400 to-blue-600 rounded-lg p-4 text-white">
          <div className="text-xs font-semibold opacity-80">PROGRESS</div>
          <div className="text-3xl font-bold">
            {currentQuestionIndex + 1}/{quiz.questions.length}
          </div>
        </div>
        <div className="bg-gradient-to-br from-orange-400 to-orange-600 rounded-lg p-4 text-white">
          <div className="text-xs font-semibold opacity-80">ACCURACY</div>
          <div className="text-3xl font-bold">
            {currentQuestionIndex > 0
              ? Math.round(
                  (selectedAnswers.filter((a, i) => a === quiz.questions[i]?.correctAnswer).length /
                    currentQuestionIndex) *
                    100,
                )
              : 0}
            %
          </div>
        </div>
      </div>

      {/* Question Card */}
      <QuestionCard
        question={currentQuestion}
        onAnswer={handleAnswer}
        answered={answered}
        selectedAnswer={selectedAnswers[currentQuestionIndex]}
        isCorrect={isCorrect}
        showFeedback={showFeedback}
      />
    </div>
  )
}
