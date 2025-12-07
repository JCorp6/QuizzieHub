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
      setTimeout(() => setError(""), 3000)
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
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-blue-50 to-pink-50 p-4 sm:p-6 lg:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl sm:text-4xl font-bold bg-gradient-to-r from-purple-600 to-blue-600 bg-clip-text text-transparent">
                Create Your Quiz
              </h1>
              <p className="text-gray-600 mt-2">Design an engaging quiz for your audience</p>
            </div>
            <button 
              onClick={onBack} 
              className="flex items-center gap-2 px-6 py-3 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl font-semibold transition-all hover:shadow-md"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
              </svg>
              Back
            </button>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border-l-4 border-red-500 text-red-800 p-4 rounded-xl shadow-lg animate-shake">
            <div className="flex items-center gap-3">
              <svg className="w-6 h-6 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="font-semibold">{error}</span>
            </div>
          </div>
        )}

        {/* Quiz Details Form */}
        <div className="bg-white rounded-2xl shadow-xl p-6 sm:p-8 space-y-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
            <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Quiz Information
          </h2>

          <div className="space-y-5">
            <div>
              <label className="block font-bold text-gray-700 mb-2 flex items-center gap-2">
                <span>Quiz Title</span>
                <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g., Ultimate Geography Challenge"
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none"
              />
            </div>

            <div>
              <label className="block font-bold text-gray-700 mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Tell players what this quiz is about..."
                rows={3}
                className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block font-bold text-gray-700 mb-2">Difficulty</label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none bg-white"
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
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none bg-white"
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
        </div>

        {/* Questions Section */}
        <div className="bg-white rounded-2xl shadow-xl overflow-hidden">
          <div className="bg-gradient-to-r from-purple-600 via-blue-600 to-purple-600 p-6 text-white">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold flex items-center gap-2">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Questions
                </h2>
                <p className="text-purple-100 text-sm mt-1">{questions.length} question{questions.length !== 1 ? 's' : ''} added</p>
              </div>
              <button
                onClick={addQuestion}
                className="px-6 py-3 bg-white/20 hover:bg-white/30 backdrop-blur-sm rounded-xl transition-all font-semibold shadow-lg hover:shadow-xl flex items-center gap-2"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
                Add Question
              </button>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* Question Navigation */}
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-purple-300 scrollbar-track-gray-100">
              {questions.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentQuestionIndex(idx)}
                  className={`shrink-0 w-12 h-12 rounded-xl font-bold transition-all ${
                    idx === currentQuestionIndex
                      ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white shadow-lg scale-110 ring-4 ring-purple-200"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 hover:shadow-md"
                  }`}
                >
                  {idx + 1}
                </button>
              ))}
            </div>

            {/* Question Editor */}
            <div className="space-y-6 border-t-2 border-gray-100 pt-6">
              <div>
                <label className="block font-bold text-gray-800 mb-3 flex items-center gap-2">
                  <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-lg text-sm">
                    Q{currentQuestionIndex + 1}
                  </span>
                  Question Text
                  <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={currentQuestion.text}
                  onChange={(e) => updateQuestion("text", e.target.value)}
                  placeholder="Enter your question here..."
                  rows={3}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-xl focus:border-purple-500 focus:ring-4 focus:ring-purple-100 transition-all outline-none resize-none"
                />
              </div>

              {/* Options */}
              <div>
                <label className="block font-bold text-gray-800 mb-3">Answer Options</label>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, optIdx) => (
                    <div key={optIdx} className="flex gap-3 items-center group">
                      <div className="flex items-center justify-center">
                        <input
                          type="radio"
                          name="correctAnswer"
                          checked={currentQuestion.correctAnswer === optIdx}
                          onChange={() => updateQuestion("correctAnswer", optIdx)}
                          className="w-6 h-6 cursor-pointer text-purple-600 focus:ring-2 focus:ring-purple-500"
                        />
                      </div>
                      <div className={`flex-1 flex items-center gap-3 p-4 rounded-xl border-2 transition-all ${
                        currentQuestion.correctAnswer === optIdx 
                          ? 'border-green-500 bg-green-50' 
                          : 'border-gray-300 bg-white group-hover:border-purple-300'
                      }`}>
                        <span className={`font-bold text-lg w-8 h-8 flex items-center justify-center rounded-lg ${
                          currentQuestion.correctAnswer === optIdx
                            ? 'bg-green-500 text-white'
                            : 'bg-gray-200 text-gray-700'
                        }`}>
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        <input
                          type="text"
                          value={option}
                          onChange={(e) => updateOption(optIdx, e.target.value)}
                          placeholder={`Enter option ${String.fromCharCode(65 + optIdx)}`}
                          className="flex-1 px-3 py-2 bg-transparent border-none focus:outline-none font-medium"
                        />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-sm text-gray-600 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Select the correct answer by clicking the radio button
                </p>
              </div>

              {/* Delete Question Button */}
              {questions.length > 1 && (
                <button
                  onClick={() => deleteQuestion(currentQuestionIndex)}
                  className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-xl font-semibold hover:from-red-600 hover:to-red-700 transition-all shadow-lg hover:shadow-xl flex items-center justify-center gap-2"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  Delete Question
                </button>
              )}
            </div>
          </div>
        </div>

        // MODIFIKASI teks tombol:
{/* Save Button */}
<button
  onClick={handleSaveQuiz}
  disabled={saving}
  className="w-full py-5 bg-gradient-to-r from-green-500 via-green-600 to-emerald-600 text-white rounded-2xl font-bold text-lg hover:shadow-2xl transform hover:scale-[1.02] transition-all disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-xl flex items-center justify-center gap-3"
>
  {saving ? (
    <>
      <svg className="animate-spin h-6 w-6" fill="none" viewBox="0 0 24 24">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
      </svg>
      Menyimpan Kuis...
    </>
  ) : (
    <>
      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
      Simpan Kuis
    </>
  )}
</button>
      </div>
    </div>
  )
}