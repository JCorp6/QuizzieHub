"use client"

import { useState, useEffect } from "react"
import { User } from "firebase/auth"
import { getCustomQuizzes } from "@/lib/firebaseQuizzes"
import { defaultQuizzes } from "@/lib/defaultQuizzes"

// Interface yang lebih sederhana untuk kuis
interface Quiz {
    id: string
    title: string
    description: string
    questions: any[]
    category: string
    difficulty: string
    timeLimit?: number
    createdBy?: string // Jadikan optional
    createdAt?: any // Jadikan optional
}

interface QuizSelectionModalProps {
    user: User
    onSelect: (quiz: Quiz) => void
    onClose: () => void
    selectedQuiz?: Quiz | null
}

export default function QuizSelectionModal({ 
    user, 
    onSelect, 
    onClose,
    selectedQuiz 
}: QuizSelectionModalProps) {
    const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'my-quizzes' | 'default'>('my-quizzes')

    useEffect(() => {
        fetchUserQuizzes()
    }, [user])

    const fetchUserQuizzes = async () => {
        try {
            setLoading(true)
            const quizzes = await getCustomQuizzes(user.uid)
            
            // Format data quiz dari Firestore
            const formattedQuizzes: Quiz[] = quizzes.map(quiz => ({
                id: quiz.id || '',
                title: quiz.title || 'Kuis Tanpa Judul',
                description: quiz.description || '',
                questions: quiz.questions || [],
                category: quiz.category || "Umum",
                difficulty: quiz.difficulty || "medium",
                timeLimit: quiz.timeLimit || 30,
                createdBy: quiz.createdBy || user.uid,
                createdAt: quiz.createdAt || new Date()
            }))
            
            setUserQuizzes(formattedQuizzes)
        } catch (error) {
            console.error("Error fetching quizzes:", error)
        } finally {
            setLoading(false)
        }
    }

    const formatDefaultQuizForSelection = (quiz: any): Quiz => {
        return {
            id: `default_${quiz.title.toLowerCase().replace(/\s+/g, '_')}`,
            title: quiz.title,
            description: quiz.description || "Kuis default",
            questions: quiz.questions || [],
            category: quiz.category || "Umum",
            difficulty: quiz.difficulty || "medium",
            timeLimit: quiz.defaultTimeLimit || 30,
            createdBy: "system",
            createdAt: new Date()
        }
    }

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden">
                {/* Modal Header */}
                <div className="p-6 border-b border-gray-200">
                    <div className="flex justify-between items-center">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-900">📝 Pilih Kuis</h2>
                            <p className="text-gray-600">Pilih kuis untuk dimainkan di room multiplayer</p>
                        </div>
                        <button
                            onClick={onClose}
                            className="text-gray-500 hover:text-gray-700 text-2xl"
                        >
                            ×
                        </button>
                    </div>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto max-h-[60vh]">
                    {/* Tabs */}
                    <div className="mb-6">
                        <div className="border-b border-gray-200">
                            <nav className="flex space-x-4">
                                <button
                                    onClick={() => setActiveTab('my-quizzes')}
                                    className={`py-3 px-6 font-medium text-sm border-b-2 transition ${
                                        activeTab === 'my-quizzes'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    📝 Kuis Saya ({userQuizzes.length})
                                </button>
                                <button
                                    onClick={() => setActiveTab('default')}
                                    className={`py-3 px-6 font-medium text-sm border-b-2 transition ${
                                        activeTab === 'default'
                                            ? 'border-blue-600 text-blue-600'
                                            : 'border-transparent text-gray-500 hover:text-gray-700'
                                    }`}
                                >
                                    🎯 Kuis Default ({defaultQuizzes.length})
                                </button>
                            </nav>
                        </div>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Memuat kuis...</p>
                        </div>
                    ) : activeTab === 'my-quizzes' ? (
                        /* My Quizzes */
                        userQuizzes.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-4xl mb-4">📝</div>
                                <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Kuis</h3>
                                <p className="text-gray-600 mb-6">
                                    Buat kuis pertama Anda di menu utama!
                                </p>
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {userQuizzes.map((quiz) => (
                                    <div 
                                        key={quiz.id}
                                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                            selectedQuiz?.id === quiz.id
                                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-gray-200 bg-white hover:border-blue-300'
                                        }`}
                                        onClick={() => onSelect(quiz)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className={`px-2 py-1 rounded-full text-xs font-medium ${
                                                        quiz.difficulty === 'easy' ? 'bg-green-100 text-green-800' :
                                                        quiz.difficulty === 'medium' ? 'bg-yellow-100 text-yellow-800' :
                                                        'bg-red-100 text-red-800'
                                                    }`}>
                                                        {quiz.difficulty === 'easy' ? 'Mudah' :
                                                         quiz.difficulty === 'medium' ? 'Sedang' : 'Sulit'}
                                                    </div>
                                                    <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                                        {quiz.questions?.length || 0} soal
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-gray-800">{quiz.title}</h3>
                                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                                    {quiz.description || "Tidak ada deskripsi"}
                                                </p>
                                            </div>
                                            {selectedQuiz?.id === quiz.id && (
                                                <div className="text-blue-600">✓</div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )
                    ) : (
                        /* Default Quizzes */
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {defaultQuizzes.map((quiz, index) => {
                                const formattedQuiz = formatDefaultQuizForSelection(quiz)
                                return (
                                    <div 
                                        key={index}
                                        className={`p-4 border rounded-lg cursor-pointer transition-all hover:shadow-md ${
                                            selectedQuiz?.title === quiz.title
                                                ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
                                                : 'border-gray-200 bg-white hover:border-blue-300'
                                        }`}
                                        onClick={() => onSelect(formattedQuiz)}
                                    >
                                        <div className="flex items-start justify-between">
                                            <div>
                                                <div className="flex items-center gap-2 mb-2">
                                                    <div className="px-2 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                                                        Default
                                                    </div>
                                                    <div className="px-2 py-1 bg-gray-100 text-gray-700 rounded-full text-xs">
                                                        {quiz.questions?.length || 0} soal
                                                    </div>
                                                </div>
                                                <h3 className="font-bold text-gray-800">{quiz.title}</h3>
                                                <p className="text-gray-600 text-sm mt-1 line-clamp-2">
                                                    {quiz.description || "Kuis default"}
                                                </p>
                                            </div>
                                            {selectedQuiz?.title === quiz.title && (
                                                <div className="text-blue-600">✓</div>
                                            )}
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Modal Footer */}
                <div className="p-6 border-t border-gray-200 bg-gray-50">
                    <div className="flex justify-between items-center">
                        <div>
                            {selectedQuiz && (
                                <div className="text-sm text-gray-600">
                                    <span className="font-medium">Terpilih:</span> {selectedQuiz.title}
                                </div>
                            )}
                        </div>
                        <div className="flex gap-3">
                            <button
                                onClick={onClose}
                                className="px-5 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
                            >
                                Batal
                            </button>
                            <button
                                onClick={() => {
                                    if (selectedQuiz) {
                                        onSelect(selectedQuiz)
                                        onClose()
                                    }
                                }}
                                disabled={!selectedQuiz}
                                className={`px-5 py-2 rounded-lg font-medium transition ${
                                    selectedQuiz
                                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white hover:from-blue-700 hover:to-purple-700'
                                        : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                }`}
                            >
                                Konfirmasi Pilihan
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}