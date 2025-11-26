"use client"

import { useState } from "react"
import type { User } from "firebase/auth"
import { saveCustomQuiz } from "@/lib/firebaseQuizzes"

interface QuizCreationScreenProps {
  onBack: () => void
  onQuizCreated: () => void
  user: User
}

interface Question {
  text: string
  options: string[]
  correctAnswer: number
}

export default function QuizCreationScreen({ onBack, onQuizCreated, user }: QuizCreationScreenProps) {
  const [title, setTitle] = useState("")
  const [description, setDescription] = useState("")
  const [difficulty, setDifficulty] = useState("Medium")
  const [category, setCategory] = useState("General")
  const [questions, setQuestions] = useState<Question[]>([{ text: "", options: ["", "", "", ""], correctAnswer: 0 }])
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState("")

  const currentQuestion = questions[currentQuestionIndex]

  const updateQuestion = (field: string, value: any) => {
    const updated = [...questions]
    updated[currentQuestionIndex] = {
      ...updated[currentQuestionIndex],
      [field]: value,
    }
    setQuestions(updated)
  }

  const updateOption = (optionIndex: number, value: string) => {
    const updated = [...questions]
    updated[currentQuestionIndex].options[optionIndex] = value
    setQuestions(updated)
  }

  const addQuestion = () => {
    setQuestions([...questions, { text: "", options: ["", "", "", ""], correctAnswer: 0 }])
    setCurrentQuestionIndex(questions.length)
  }

  const deleteQuestion = (index: number) => {
    if (questions.length === 1) {
      setError("You must have at least one question")
      return
    }
    const updated = questions.filter((_, i) => i !== index)
    setQuestions(updated)
    if (currentQuestionIndex >= updated.length) {
      setCurrentQuestionIndex(updated.length - 1)
    }
  }

  const handleSaveQuiz = async () => {
    try {
      setError("")

      if (!title.trim()) {
        setError("Quiz title is required")
        return
      }

      if (questions.some((q) => !q.text.trim() || q.options.some((o) => !o.trim()))) {
        setError("All questions and options must be filled")
        return
      }

      setSaving(true)

      const quiz = {
        id: Date.now().toString(),
        title,
        description,
        difficulty,
        category,
        questions: questions.map((q, idx) => ({
          ...q,
          id: `q-${idx}`,
        })),
        createdBy: user.uid,
        createdAt: new Date(),
      }

      await saveCustomQuiz(user.uid, quiz)
      onQuizCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quiz")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6 animate-slide-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold text-gray-800">Create Quiz</h1>
        <button onClick={onBack} className="text-gray-600 hover:text-gray-800 font-semibold">
          ← Back
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border-2 border-red-600 text-red-800 p-4 rounded-lg font-semibold">{error}</div>
      )}

      {/* Quiz Details Form */}
      <div className="bg-white rounded-xl shadow-lg p-6 space-y-4">
        <div>
          <label className="block font-bold text-gray-700 mb-2">Quiz Title *</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Enter quiz title"
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
          />
        </div>

        <div>
          <label className="block font-bold text-gray-700 mb-2">Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Enter quiz description"
            rows={3}
            className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block font-bold text-gray-700 mb-2">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
            >
              <option>Easy</option>
              <option>Medium</option>
              <option>Hard</option>
            </select>
          </div>

          <div>
            <label className="block font-bold text-gray-700 mb-2">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
            >
              <option>General</option>
              <option>Science</option>
              <option>History</option>
              <option>Geography</option>
              <option>Sports</option>
            </select>
          </div>
        </div>
      </div>

      {/* Questions Section */}
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-4 text-white font-bold flex items-center justify-between">
          <span>Questions ({questions.length})</span>
          <button
            onClick={addQuestion}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors"
          >
            + Add Question
          </button>
        </div>

        <div className="p-6 space-y-6">
          {/* Question Navigation */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            {questions.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCurrentQuestionIndex(idx)}
                className={`flex-shrink-0 w-10 h-10 rounded-full font-bold transition-all ${
                  idx === currentQuestionIndex
                    ? "bg-purple-600 text-white shadow-lg scale-110"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                {idx + 1}
              </button>
            ))}
          </div>

          {/* Question Editor */}
          <div className="space-y-4 border-t-2 pt-4">
            <div>
              <label className="block font-bold text-gray-700 mb-2">Question {currentQuestionIndex + 1} *</label>
              <textarea
                value={currentQuestion.text}
                onChange={(e) => updateQuestion("text", e.target.value)}
                placeholder="Enter question text"
                rows={3}
                className="w-full px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
              />
            </div>

            {/* Options */}
            <div className="space-y-3">
              {currentQuestion.options.map((option, optIdx) => (
                <div key={optIdx} className="flex gap-2 items-center">
                  <input
                    type="radio"
                    name="correctAnswer"
                    checked={currentQuestion.correctAnswer === optIdx}
                    onChange={() => updateQuestion("correctAnswer", optIdx)}
                    className="w-5 h-5 cursor-pointer"
                  />
                  <label className="text-sm font-semibold text-gray-700 min-w-16">
                    Option {String.fromCharCode(65 + optIdx)}:
                  </label>
                  <input
                    type="text"
                    value={option}
                    onChange={(e) => updateOption(optIdx, e.target.value)}
                    placeholder={`Enter option ${optIdx + 1}`}
                    className="flex-1 px-4 py-2 border-2 border-gray-300 rounded-lg focus:border-purple-600 focus:outline-none"
                  />
                </div>
              ))}
            </div>

            {/* Delete Question Button */}
            {questions.length > 1 && (
              <button
                onClick={() => deleteQuestion(currentQuestionIndex)}
                className="px-4 py-2 bg-red-500 text-white rounded-lg font-semibold hover:bg-red-600 transition-colors"
              >
                Delete This Question
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveQuiz}
        disabled={saving}
        className="w-full py-4 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-lg font-bold text-lg hover:shadow-lg transform hover:scale-105 transition-all disabled:opacity-50"
      >
        {saving ? "Saving..." : "Save & Create Quiz"}
      </button>
    </div>
  )
}
