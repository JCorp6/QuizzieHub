"use client"

import { useState, useEffect } from "react"
import QuestionCard from "./QuestionCard"
import { ArrowLeft, Star, Zap } from "lucide-react"
import FeedbackOverlay from "./FeedbackOverlay"

interface QuizPlayScreenProps {
  quiz: any
  onFinish: (result: any) => void
  onBack: () => void
}

const Mascot = () => (
  <div className="w-24 h-24 mx-auto mb-4 animate-float">
    <svg viewBox="0 0 100 100" xmlns="http://www.w3.org/2000/svg">
      <g>
        <path
          d="M 50,10 C 27.9,10 10,27.9 10,50 C 10,72.1 27.9,90 50,90 C 72.1,90 90,72.1 90,50 C 90,27.9 72.1,10 50,10 Z"
          fill="rgba(255, 255, 255, 0.1)"
        />
        <path
          d="M 50,15 C 30.7,15 15,30.7 15,50 C 15,69.3 30.7,85 50,85 C 69.3,85 85,69.3 85,50 C 85,30.7 69.3,15 50,15 Z"
          fill="#f3f4f6"
          stroke="#E0E0E0"
          strokeWidth="1"
        />
        <circle cx="38" cy="45" r="5" fill="#2c3e50" />
        <circle cx="62" cy="45" r="5" fill="#2c3e50" />
        <path
          d="M 40 60 Q 50 70 60 60"
          stroke="#2c3e50"
          strokeWidth="4"
          fill="none"
          strokeLinecap="round"
        />
      </g>
    </svg>
  </div>
)

export default function QuizPlayScreen({ quiz, onFinish, onBack }: QuizPlayScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(
    new Array(quiz.questions.length).fill(null),
  )
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [isTimeUp, setIsTimeUp] = useState(false)
  const [allAnswers, setAllAnswers] = useState<any[]>([])
  const [timeLeft, setTimeLeft] = useState(20) // 20 seconds per question

  const currentQuestion = quiz.questions[currentQuestionIndex]

  useEffect(() => {
    if (answered || showFeedback) return

    if (timeLeft === 0) {
      setIsTimeUp(true)
      handleAnswer(-1) // Auto-submit with an incorrect answer
      return
    }

    const timer = setInterval(() => {
      setTimeLeft(prevTime => prevTime - 1)
    }, 1000)

    return () => clearInterval(timer)
  }, [timeLeft, answered, showFeedback])

  const handleNextQuestion = () => {
    if (currentQuestionIndex < quiz.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1)
      setAnswered(false)
      setShowFeedback(false)
      setIsCorrect(null)
      setIsTimeUp(false)
      setTimeLeft(20) // Reset timer
    } else {
      onFinish({
        score,
        totalQuestions: quiz.questions.length,
        streak,
        answers: allAnswers,
        quizTitle: quiz.title,
        answeredQuestions: selectedAnswers,
      })
    }
  }

  const handleAnswer = (answerIndex: number) => {
    if (answered) return

    const selected = [...selectedAnswers]
    selected[currentQuestionIndex] = answerIndex
    setSelectedAnswers(selected)

    const correct = answerIndex === currentQuestion.correctAnswer
    setIsCorrect(correct)
    setAnswered(true)
    setShowFeedback(true)

    let scoreGained = 0
    if (correct) {
      scoreGained = 10 + Math.floor(timeLeft / 2) // Points based on time
      setScore(score + scoreGained)
      setStreak(streak + 1)
    } else {
      setStreak(0)
    }
    
    setAllAnswers([
        ...allAnswers,
        { questionId: currentQuestion.id, correct, scoreGained },
    ])
  }

  return (
    <div className="flex flex-col min-h-screen w-full text-gray-800 p-4 sm:p-6 lg:p-8 bg-white">
      {/* Top Bar */}
      <header className="flex items-center justify-between w-full max-w-4xl mx-auto mb-4">
        <button
          onClick={onBack}
          className="flex items-center gap-2 px-4 py-2 font-bold bg-gray-100 rounded-xl hover:bg-gray-200 transition"
        >
          <ArrowLeft size={20} />
          <span>Exit</span>
        </button>
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 font-bold text-lg">
            <Star className="text-yellow-400" />
            <span>{score}</span>
          </div>
          <div className="flex items-center gap-2 font-bold text-lg">
            <Zap className="text-orange-400" />
            <span>{streak}</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 flex flex-col items-center justify-center w-full">
        <div className="w-full max-w-2xl">
          {/* Progress */}
          <div className="mb-4">
            <Mascot />
            <div className="flex justify-between items-center mb-1">
                <span className="font-bold text-sm opacity-80">
                    Question {currentQuestionIndex + 1}/{quiz.questions.length}
                </span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4 overflow-hidden">
              <div
                className="bg-gradient-to-r from-green-400 to-cyan-400 h-full rounded-full transition-all duration-300"
                style={{ width: `${((currentQuestionIndex + 1) / quiz.questions.length) * 100}%` }}
              ></div>
            </div>
          </div>
         
          {/* Question Card */}
          <div className="animate-swoop-in">
             <QuestionCard
                key={currentQuestion.id}
                question={currentQuestion}
                onAnswer={handleAnswer}
                answered={answered}
                selectedAnswer={selectedAnswers[currentQuestionIndex]}
            />
          </div>

        </div>
      </main>
      
      {/* Timer Bubble */}
      <footer className="flex justify-center items-center w-full mt-4">
         <div className="relative w-24 h-24 flex items-center justify-center">
            <svg className="w-full h-full transform -rotate-90">
                <circle
                    className="text-gray-200"
                    strokeWidth="8"
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="48"
                    cy="48"
                />
                <circle
                    className="text-green-400 transition-all duration-1000"
                    strokeWidth="8"
                    strokeDasharray={2 * Math.PI * 40}
                    strokeDashoffset={(2 * Math.PI * 40) - ((timeLeft / 20) * (2 * Math.PI * 40))}
                    stroke="currentColor"
                    fill="transparent"
                    r="40"
                    cx="48"
                    cy="48"
                />
            </svg>
            <span className="absolute text-3xl font-bold">{timeLeft}</span>
        </div>
      </footer>

      {showFeedback && (
        <FeedbackOverlay
          isCorrect={isCorrect!}
          isTimeUp={isTimeUp}
          onTimeout={handleNextQuestion}
        />
      )}
    </div>
  )
}
