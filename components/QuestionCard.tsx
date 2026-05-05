"use client"

import { CheckCircle, XCircle } from "lucide-react"

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
}

const Shape = ({ type, className }: { type: number; className?: string }) => {
  const shapes = [
    <svg viewBox="0 0 100 100" className={className}><polygon points="50,15 100,85 0,85" /></svg>,
    <svg viewBox="0 0 100 100" className={className}><polygon points="50,0 100,50 50,100 0,50" /></svg>,
    <svg viewBox="0 0 100 100" className={className}><circle cx="50" cy="50" r="45" /></svg>,
    <svg viewBox="0 0 100 100" className={className}><rect x="5" y="5" width="90" height="90" rx="10" /></svg>,
  ]
  return shapes[type % shapes.length] || null
}

export default function QuestionCard({ question, onAnswer, answered, selectedAnswer }: QuestionCardProps) {
  const optionColors = [
    { bg: "bg-red-500", shape: "fill-red-500" },
    { bg: "bg-blue-500", shape: "fill-blue-500" },
    { bg: "bg-yellow-500", shape: "fill-yellow-500" },
    { bg: "bg-green-500", shape: "fill-green-500" },
  ]

  return (
    <div className="space-y-6 w-full">
      {/* Question Text */}
      <div className="bg-gray-50 rounded-2xl p-6 sm:p-8 text-slate-800 shadow-lg border">
        <h3 className="text-xl md:text-2xl font-bold text-center leading-relaxed">{question.text}</h3>
      </div>

      {/* Answer Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {question.options.map((option, index) => {
          const isSelected = selectedAnswer === index
          const isCorrect = index === question.correctAnswer
          const { bg, shape } = optionColors[index % optionColors.length]

          let buttonClasses = "transition-all duration-300 transform "
          const cursorClass = answered ? "cursor-not-allowed" : "cursor-pointer"

          if (answered) {
            if (isSelected && isCorrect) {
              buttonClasses += "bg-green-500/90 ring-4 ring-white shadow-2xl scale-105"
            } else if (isSelected && !isCorrect) {
              buttonClasses += "bg-red-500/90 ring-4 ring-white shadow-2xl scale-105"
            } else if (isCorrect) {
                 buttonClasses += "bg-green-500/70 opacity-90"
            } else {
              buttonClasses += "opacity-50 scale-95"
            }
          } else {
            buttonClasses += `bg-white/20 hover:bg-white/30 hover:scale-105`
          }

          return (
            <button
              key={index}
              onClick={() => onAnswer(index)}
              disabled={answered}
              className={`p-4 rounded-xl font-bold text-lg text-left flex items-center gap-4 text-white shadow-lg backdrop-blur-sm ${buttonClasses} ${cursorClass}`}
            >
              <div className={`relative w-12 h-12 flex-shrink-0 rounded-lg flex items-center justify-center ${answered ? 'bg-white/20': bg}`}>
                <Shape type={index} className={`w-8 h-8 ${answered ? shape : 'fill-white'}`} />
              </div>
              <span className="flex-1">{option}</span>
              {answered && isSelected && isCorrect && <CheckCircle className="w-8 h-8 text-white" />}
              {answered && isSelected && !isCorrect && <XCircle className="w-8 h-8 text-white" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}
