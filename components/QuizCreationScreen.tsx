"use client"

import { useState, useRef, useEffect } from "react"
import type { User } from "firebase/auth"
import { saveCustomQuiz } from "@/lib/firebaseQuizzes"
import Image from "next/image"

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
  const [imageFile, setImageFile] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [step, setStep] = useState(1) // 1 = Quiz Info, 2 = Questions
  const fileInputRef = useRef<HTMLInputElement>(null)

  const currentQuestion = questions[currentQuestionIndex]

  // Clean up the object URL to avoid memory leaks
  useEffect(() => {
    return () => {
      if (imagePreview) {
        URL.revokeObjectURL(imagePreview)
      }
    }
  }, [imagePreview])

  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type.startsWith("image/")) {
      setImageFile(file)
      const previewUrl = URL.createObjectURL(file)
      setImagePreview(previewUrl)
    } else {
      setImageFile(null)
      setImagePreview(null)
      setError("Please select a valid image file.")
    }
  }

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

  const handleNextStep = () => {
    if (step === 1) {
      if (!title.trim()) {
        setError("Quiz title is required")
        return
      }
      setError("")
      setStep(2)
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

      const quizData = {
        title,
        description,
        difficulty,
        category,
        questions: questions.map((q, idx) => ({
          ...q,
          id: `q-${idx}`,
        })),
        isPublic: false,
      }

      await saveCustomQuiz(user.uid, quizData, imageFile)
      onQuizCreated()
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to save quiz")
    } finally {
      setSaving(false)
    }
  }

  return (

      <div className="bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl">

        <div className="max-w-5xl mx-auto">

          {/* Compact Header */}

          <div className="flex items-center justify-between mb-6">

            <button 

              onClick={onBack} 

              className="flex items-center gap-2 px-4 py-2 text-gray-600 hover:text-gray-900 transition-colors"

            >

              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />

              </svg>

              Back

            </button>

            

            {/* Progress Indicator */}

            <div className="flex items-center gap-3">

              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${step === 1 ? 'bg-purple-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>

                <span className="font-semibold">1</span>

                <span className="hidden sm:inline text-sm">Details</span>

              </div>

              <div className="w-8 h-0.5 bg-gray-300"></div>

              <div className={`flex items-center gap-2 px-4 py-2 rounded-full transition-colors ${step === 2 ? 'bg-purple-600 text-white' : 'bg-white text-gray-400 shadow-sm'}`}>

                <span className="font-semibold">2</span>

                <span className="hidden sm:inline text-sm">Questions</span>

              </div>

            </div>

            

            <div className="w-20"></div>

          </div>

  

          {/* Error Message */}

          {error && (

            <div className="bg-red-50 border border-red-200 text-red-800 p-4 rounded-xl mb-6 flex items-center gap-3 shadow-sm">

              <svg className="w-5 h-5 text-red-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />

              </svg>

              <span className="text-sm font-medium">{error}</span>

            </div>

          )}

  

          {/* Step 1: Quiz Details */}

          {step === 1 && (

            <div className="bg-white rounded-2xl shadow-sm p-8 space-y-8">

              <div>

                <h1 className="text-3xl font-bold text-gray-900 mb-2">Create a new quiz</h1>

                <p className="text-gray-500">Give your quiz a name and set up the basic details</p>

              </div>

  

              <div className="space-y-6">

                {/* Title */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">

                    Quiz title <span className="text-red-500">*</span>

                  </label>

                  <input

                    type="text"

                    value={title}

                    onChange={(e) => setTitle(e.target.value)}

                    placeholder="Enter quiz title"

                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none text-lg"

                  />

                </div>

  

                {/* Description */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">Description</label>

                  <textarea

                    value={description}

                    onChange={(e) => setDescription(e.target.value)}

                    placeholder="What's this quiz about?"

                    rows={3}

                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"

                  />

                </div>

  

                {/* Cover Image */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">Cover image</label>

                  <div 

                    onClick={() => fileInputRef.current?.click()}

                    className="relative border-2 border-dashed border-gray-300 rounded-lg p-8 text-center cursor-pointer hover:border-purple-400 transition-colors bg-gray-50"

                  >

                    {imagePreview ? (

                      <div className="relative">

                        <Image src={imagePreview} alt="Preview" width={300} height={150} className="mx-auto rounded-lg object-cover max-h-40" />

                        <button

                          onClick={(e) => {

                            e.stopPropagation()

                            setImageFile(null)

                            setImagePreview(null)

                            if (fileInputRef.current) fileInputRef.current.value = ''

                          }}

                          className="absolute top-2 right-2 p-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition-colors"

                        >

                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />

                          </svg>

                        </button>

                      </div>

                    ) : (

                      <div>

                        <svg className="mx-auto h-12 w-12 text-gray-400 mb-3" stroke="currentColor" fill="none" viewBox="0 0 48 48">

                          <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

                        </svg>

                        <p className="text-gray-600 mb-1">Click to upload or drag and drop</p>

                        <p className="text-xs text-gray-400">PNG, JPG, GIF up to 10MB</p>

                      </div>

                    )}

                    <input ref={fileInputRef} onChange={handleImageChange} type="file" className="hidden" accept="image/*" />

                  </div>

                </div>

  

                {/* Difficulty & Category */}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">

                  <div>

                    <label className="block text-sm font-semibold text-gray-700 mb-2">Difficulty</label>

                    <select

                      value={difficulty}

                      onChange={(e) => setDifficulty(e.target.value)}

                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none bg-white"

                    >

                      <option>Easy</option>

                      <option>Medium</option>

                      <option>Hard</option>

                    </select>

                  </div>

  

                  <div>

                    <label className="block text-sm font-semibold text-gray-700 mb-2">Category</label>

                    <select

                      value={category}

                      onChange={(e) => setCategory(e.target.value)}

                      className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none bg-white"

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

  

              {/* Continue Button */}

              <div className="flex justify-end pt-6 border-t">

                <button

                  onClick={handleNextStep}

                  className="px-8 py-3 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition-colors flex items-center gap-2"

                >

                  Continue

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />

                  </svg>

                </button>

              </div>

            </div>

          )}

  

          {/* Step 2: Questions */}

          {step === 2 && (

            <div className="space-y-4">

              {/* Question List Sidebar */}

              <div className="bg-white rounded-xl shadow-sm p-4">

                <div className="flex items-center justify-between mb-4">

                  <h2 className="font-semibold text-gray-900">Questions ({questions.length})</h2>

                  <button

                    onClick={addQuestion}

                    className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors text-sm font-medium"

                  >

                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />

                    </svg>

                    Add question

                  </button>

                </div>

                

                <div className="flex gap-2 overflow-x-auto pb-2">

                  {questions.map((q, idx) => (

                    <button

                      key={idx}

                      onClick={() => setCurrentQuestionIndex(idx)}

                      className={`shrink-0 px-4 py-2 rounded-lg font-medium text-sm transition-all ${

                        idx === currentQuestionIndex

                          ? "bg-purple-600 text-white"

                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"

                      }`}

                    >

                      {idx + 1}

                    </button>

                  ))}

                </div>

              </div>

  

              {/* Question Editor */}

              <div className="bg-white rounded-xl shadow-sm p-8 space-y-6">

                <div className="flex items-center justify-between">

                  <h3 className="text-lg font-semibold text-gray-900">Question {currentQuestionIndex + 1}</h3>

                  {questions.length > 1 && (

                    <button

                      onClick={() => deleteQuestion(currentQuestionIndex)}

                      className="px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors text-sm font-medium flex items-center gap-2"

                    >

                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />

                      </svg>

                      Delete

                    </button>

                  )}

                </div>

  

                {/* Question Text */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-2">

                    Question <span className="text-red-500">*</span>

                  </label>

                  <textarea

                    value={currentQuestion.text}

                    onChange={(e) => updateQuestion("text", e.target.value)}

                    placeholder="Enter your question"

                    rows={3}

                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-purple-500 focus:ring-2 focus:ring-purple-200 transition-all outline-none resize-none"

                  />

                </div>

  

                {/* Answer Options */}

                <div>

                  <label className="block text-sm font-semibold text-gray-700 mb-3">Answer options</label>

                  <div className="space-y-3">

                    {currentQuestion.options.map((option, optIdx) => (

                      <div 

                        key={optIdx}

                        className={`flex items-center gap-3 p-4 rounded-lg border-2 transition-all ${

                          currentQuestion.correctAnswer === optIdx 

                            ? 'border-green-500 bg-green-50' 

                            : 'border-gray-200 bg-white hover:border-gray-300'

                        }`}

                      >

                        <button

                          onClick={() => updateQuestion("correctAnswer", optIdx)}

                          className={`flex-shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-colors ${

                            currentQuestion.correctAnswer === optIdx ? 'border-green-500 bg-green-500' : 'border-gray-400 hover:border-green-500'

                          }`}

                        >

                          {currentQuestion.correctAnswer === optIdx && (

                            <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />

                            </svg>

                          )}

                        </button>

                        <span className={`flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-lg font-semibold transition-colors ${

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

                          placeholder={`Option ${String.fromCharCode(65 + optIdx)}`}

                          className="flex-1 px-3 py-2 bg-transparent border-none focus:outline-none"

                        />

                      </div>

                    ))}

                  </div>

                  <p className="mt-3 text-xs text-gray-500">Click the circle to mark the correct answer</p>

                </div>

              </div>

  

              {/* Save Button */}

              <div className="flex justify-between items-center bg-white rounded-xl shadow-sm p-4">

                <button

                  onClick={() => setStep(1)}

                  className="px-6 py-3 text-gray-600 hover:text-gray-900 font-medium transition-colors flex items-center gap-2"

                >

                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />

                  </svg>

                  Back to details

                </button>

                

                <button

                  onClick={handleSaveQuiz}

                  disabled={saving}

                  className="px-8 py-3 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"

                >

                  {saving ? (

                    <>

                      <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">

                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>

                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>

                      </svg>

                      Saving...

                    </>

                  ) : (

                    <>

                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">

                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />

                      </svg>

                      Save quiz

                    </>

                  )}

                </button>

              </div>

            </div>

          )}

        </div>

      </div>

    )

  }

  