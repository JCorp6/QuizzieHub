"use client"

import { useState, useEffect } from "react"
import type { User } from "firebase/auth"
import QuestionCard from "./QuestionCard"
import MultiplayerScoreboard from "./MultiplayerScoreboard"
import { listenToRoomPlayers, submitMultiplayerAnswer } from "@/lib/firebaseMultiplayer"

interface MultiplayerPlayScreenProps {
  quiz: any
  roomId: string
  onFinish: (result: any) => void
  onBack: () => void
  user: User
}

export default function MultiplayerPlayScreen({ quiz, roomId, onFinish, onBack, user }: MultiplayerPlayScreenProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [score, setScore] = useState(0)
  const [streak, setStreak] = useState(0)
  const [selectedAnswers, setSelectedAnswers] = useState<(number | null)[]>(new Array(quiz.questions.length).fill(null))
  const [answered, setAnswered] = useState(false)
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null)
  const [showFeedback, setShowFeedback] = useState(false)
  const [allAnswers, setAllAnswers] = useState<any[]>([])
  const [roomPlayers, setRoomPlayers] = useState<any[]>([])

  const currentQuestion = quiz.questions[currentQuestionIndex]
  const progress = ((currentQuestionIndex + 1) / quiz.questions.length) * 100

  useEffect(() => {
    const unsubscribe = listenToRoomPlayers(roomId, (players) => {
      setRoomPlayers(players)
    })
    return () => unsubscribe?.()
  }, [roomId])

  const handleAnswer = async (answerIndex: number) => {
    if (answered) return

    const selected = [...selectedAnswers]
    selected[currentQuestionIndex] = answerIndex
    setSelectedAnswers(selected)

    const correct = answerIndex === currentQuestion.correctAnswer
    setIsCorrect(correct)
    setAnswered(true)
    setShowFeedback(true)

    let newScore = score
    let newStreak = streak

    if (correct) {
      newScore = score + 10
      newStreak = streak + 1
      setScore(newScore)
      setStreak(newStreak)
      setAllAnswers([...allAnswers, { questionId: currentQuestion.id, correct: true, streak: newStreak }])
    } else {
      newStreak = 0
      setStreak(0)
      setAllAnswers([...allAnswers, { questionId: currentQuestion.id, correct: false }])
    }

    // Submit answer to Firebase
    try {
      await submitMultiplayerAnswer(roomId, user.uid, {
        questionIndex: currentQuestionIndex,
        answerIndex,
        correct,
        score: newScore,
        timestamp: Date.now(),
      })
    } catch (error) {
      console.error("Error submitting answer:", error)
    }

    setTimeout(() => {
      if (currentQuestionIndex < quiz.questions.length - 1) {
        setCurrentQuestionIndex(currentQuestionIndex + 1)
        setAnswered(false)
        setShowFeedback(false)
        setIsCorrect(null)
      } else {
        onFinish({
          score: newScore,
          totalQuestions: quiz.questions.length,
          streak: newStreak,
          answers: allAnswers,
          quizTitle: quiz.title,
          answeredQuestions: selected,
          playerId: user.uid,
          playerName: user.displayName || user.email,
        })
      }
    }, 1500)
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* Main Quiz Area */}
      <div className="lg:col-span-2 space-y-6 animate-slide-in">
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
        <div className="grid grid-cols-4 gap-3">
          <div className="bg-gradient-to-br from-green-400 to-green-600 rounded-lg p-4 text-white">
            <div className="text-xs font-semibold opacity-80">SCORE</div>
            <div className="text-3xl font-bold">{score}</div>
          </div>
          <div className="bg-gradient-to-br from-purple-400 to-purple-600 rounded-lg p-4 text-white">
            <div className="text-xs font-semibold opacity-80">STREAK</div>
            <div className="text-3xl font-bold">🔥{streak}</div>
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

      {/* Scoreboard */}
      <div className="lg:col-span-1">
        <MultiplayerScoreboard players={roomPlayers} currentUserId={user.uid} />
      </div>
    </div>
  )
}
