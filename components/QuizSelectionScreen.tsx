"use client"

import { useState, useEffect } from "react"
import { User } from "firebase/auth"
import { collection, query, where, getDocs, deleteDoc, doc, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"
import { getCustomQuizzes } from "@/lib/firebaseQuizzes" // Import fungsi yang benar

interface Quiz {
    id: string
    title: string
    description: string
    questions: any[]
    category: string
    difficulty: string
    timeLimit?: number
    createdBy: string
    createdAt: any
    isPrivate?: boolean
    accessCode?: string | null
}

interface QuizSelectionScreenProps {
    onPlayQuiz: (quiz: Quiz) => void
    onCreateQuiz: () => void
    onPlayMultiplayer: () => void
    user: User
}

export default function QuizSelectionScreen({ 
    onPlayQuiz, 
    onCreateQuiz, 
    onPlayMultiplayer, 
    user 
}: QuizSelectionScreenProps) {
    const [userQuizzes, setUserQuizzes] = useState<Quiz[]>([])
    const [loading, setLoading] = useState(true)
    const [activeTab, setActiveTab] = useState<'my-quizzes' | 'multiplayer'>('multiplayer')
    const [error, setError] = useState<string>("")

    useEffect(() => {
        fetchUserQuizzes()
    }, [user])

    const fetchUserQuizzes = async () => {
        try {
            setLoading(true)
            setError("")
            
            console.log("🔄 Fetching quizzes for user:", user.uid)
            
            // PILIH SALAH SATU CARA DI BAWAH:
            
            // CARA 1: Gunakan fungsi dari firebaseQuizzes.ts (jika path: users/{userId}/quizzes)
            const quizzes = await getCustomQuizzes(user.uid)
            console.log("✅ Quizzes from getCustomQuizzes:", quizzes)
            
            // CARA 2: Query langsung dengan path yang benar
            // const quizzesRef = collection(db, "users", user.uid, "quizzes")
            // const q = query(quizzesRef)
            // const querySnapshot = await getDocs(q)
            // const quizzes: Quiz[] = []
            // querySnapshot.forEach((doc) => {
            //     quizzes.push({ id: doc.id, ...doc.data() } as Quiz)
            // })
            
            // CARA 3: Jika kuis disimpan di collection "quizzes" dengan field createdBy
            // const quizzesRef = collection(db, "quizzes")
            // const q = query(quizzesRef, where("createdBy", "==", user.uid))
            // const querySnapshot = await getDocs(q)
            // const quizzes: Quiz[] = []
            // querySnapshot.forEach((doc) => {
            //     quizzes.push({ id: doc.id, ...doc.data() } as Quiz)
            // })
            
            setUserQuizzes(quizzes)
            
        } catch (error) {
            console.error("❌ Error fetching user quizzes:", error)
            setError("Gagal memuat kuis. Coba refresh halaman.")
        } finally {
            setLoading(false)
        }
    }

    const handleDeleteQuiz = async (quizId: string) => {
        if (!confirm("Apakah Anda yakin ingin menghapus kuis ini?")) {
            return
        }
        
        try {
            // Hapus berdasarkan struktur Firestore yang benar
            // PILIH SALAH SATU:
            
            // Jika path: users/{userId}/quizzes/{quizId}
            await deleteDoc(doc(db, "users", user.uid, "quizzes", quizId))
            
            // Atau jika path: quizzes/{quizId}
            // await deleteDoc(doc(db, "quizzes", quizId))
            
            // Hapus dari state
            setUserQuizzes(userQuizzes.filter(q => q.id !== quizId))
            alert("Kuis berhasil dihapus!")
        } catch (error) {
            console.error("Error deleting quiz:", error)
            alert("Gagal menghapus kuis")
        }
    }

    const handleUseForMultiplayer = (quiz: Quiz) => {
        // Simpan quiz yang dipilih ke localStorage atau context
        localStorage.setItem('selectedQuizForMultiplayer', JSON.stringify(quiz))
        onPlayMultiplayer()
    }

    const handleEditQuiz = async (quiz: Quiz) => {
        try {
            // Arahkan ke halaman edit quiz
            // Anda perlu membuat fungsi onEditQuiz di props
            console.log("Edit quiz:", quiz.id)
            alert("Fitur edit akan segera tersedia")
        } catch (error) {
            console.error("Error editing quiz:", error)
        }
    }

    const handleDuplicateQuiz = async (quiz: Quiz) => {
        try {
            const newQuiz = {
                ...quiz,
                title: `${quiz.title} (Copy)`,
                id: `copy_${Date.now()}`,
                createdAt: new Date()
            }
            
            // Hapus ID lama dan createdAt lama
            const { id: oldId, createdAt: oldDate, ...quizData } = newQuiz
            
            // Simpan duplicate ke Firestore
            // PILIH SALAH SATU:
            
            // Jika path: users/{userId}/quizzes
            const quizzesRef = collection(db, "users", user.uid, "quizzes")
            await addDoc(quizzesRef, {
                ...quizData,
                createdAt: new Date()
            })
            
            // Atau jika path: quizzes
            // const quizzesRef = collection(db, "quizzes")
            // await addDoc(quizzesRef, {
            //     ...quizData,
            //     createdBy: user.uid,
            //     createdAt: new Date()
            // })
            
            alert("Kuis berhasil diduplikasi!")
            fetchUserQuizzes() // Refresh list
        } catch (error) {
            console.error("Error duplicating quiz:", error)
            alert("Gagal menduplikasi kuis")
        }
    }

    // Debug function untuk melihat struktur Firestore
    const checkFirestoreStructure = async () => {
        try {
            console.log("🔍 Checking Firestore structure...")
            
            // Cek jika collection "users" ada
            const usersRef = collection(db, "users")
            const usersSnapshot = await getDocs(usersRef)
            console.log("📋 Users collection:", usersSnapshot.docs.map(d => d.id))
            
            // Cek jika user punya subcollection "quizzes"
            if (user) {
                const userQuizzesRef = collection(db, "users", user.uid, "quizzes")
                const userQuizzesSnapshot = await getDocs(userQuizzesRef)
                console.log(`📊 User ${user.uid} quizzes:`, userQuizzesSnapshot.docs.map(d => ({
                    id: d.id,
                    data: d.data()
                })))
                
                // Cek collection "quizzes" di root
                const quizzesRef = collection(db, "quizzes")
                const quizzesSnapshot = await getDocs(quizzesRef)
                console.log("📚 Root quizzes collection:", quizzesSnapshot.docs.map(d => ({
                    id: d.id,
                    createdBy: d.data().createdBy
                })))
            }
        } catch (error) {
            console.error("Error checking Firestore:", error)
        }
    }

    return (
        <div className="animate-fade-in">
            {/* Debug Button */}
            <button 
                onClick={checkFirestoreStructure}
                className="fixed bottom-4 right-4 bg-gray-800 text-white px-3 py-2 rounded-lg text-sm z-50"
            >
                🔍 Check Firestore
            </button>

            {/* Hero Section */}
            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">🎯 QuizzieHub Multiplayer</h1>
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">
                    Buat kuis keren dan mainkan bersama teman-teman secara real-time!
                </p>
            </div>

            {/* Error Message */}
            {error && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <div className="flex items-center">
                        <span className="text-red-600 mr-2">⚠️</span>
                        <p className="text-red-700">{error}</p>
                    </div>
                </div>
            )}

            {/* Debug Info */}
            <div className="mb-6 p-3 bg-gray-100 rounded-lg">
                <div className="text-sm text-gray-700">
                    <strong>Debug Info:</strong> User: {user.uid.slice(0, 8)}... | Quizzes: {userQuizzes.length} | Loading: {loading ? "Yes" : "No"}
                </div>
            </div>

            {/* Tabs */}
            <div className="mb-8">
                <div className="border-b border-gray-200">
                    <nav className="flex space-x-4">
                        <button
                            onClick={() => setActiveTab('multiplayer')}
                            className={`py-3 px-6 font-medium text-sm border-b-2 transition ${
                                activeTab === 'multiplayer'
                                    ? 'border-blue-600 text-blue-600'
                                    : 'border-transparent text-gray-500 hover:text-gray-700'
                            }`}
                        >
                            🎮 Mulai Multiplayer
                        </button>
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
                    </nav>
                </div>
            </div>

            {/* Content based on active tab */}
            {activeTab === 'multiplayer' ? (
                /* MULTIPLAYER SECTION */
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Quick Actions */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl p-6 border border-blue-200">
                            <h3 className="font-bold text-blue-800 text-lg mb-4">🚀 Cepat Main!</h3>
                            <button
                                onClick={onPlayMultiplayer}
                                className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg mb-4"
                            >
                                <div className="text-2xl mb-1">🎮</div>
                                <div className="font-bold text-xl">Buat Room Baru</div>
                                <div className="text-sm opacity-90">Host game multiplayer</div>
                            </button>
                            
                            <div className="mt-6">
                                <h4 className="font-medium text-blue-700 mb-3">Atau pilih kuis Anda:</h4>
                                {userQuizzes.length > 0 ? (
                                    <div className="space-y-2 max-h-60 overflow-y-auto">
                                        {userQuizzes.map(quiz => (
                                            <button
                                                key={quiz.id}
                                                onClick={() => handleUseForMultiplayer(quiz)}
                                                className="w-full text-left p-3 bg-white border border-blue-200 rounded-lg hover:bg-blue-50 transition flex justify-between items-center"
                                            >
                                                <div>
                                                    <div className="font-medium text-blue-800">{quiz.title}</div>
                                                    <div className="text-xs text-gray-600">{quiz.questions?.length || 0} soal</div>
                                                </div>
                                                <span className="text-blue-600">▶️</span>
                                            </button>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-center py-4">
                                        <div className="text-3xl mb-2">📝</div>
                                        <p className="text-blue-600">Buat kuis dulu yuk!</p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="bg-gradient-to-br from-green-50 to-green-100 rounded-2xl p-6 border border-green-200">
                            <h3 className="font-bold text-green-800 text-lg mb-4">📊 Statistik Anda</h3>
                            <div className="space-y-3">
                                <div className="flex justify-between">
                                    <span className="text-green-700">Kuis Dibuat:</span>
                                    <span className="font-bold text-green-800">{userQuizzes.length}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="text-green-700">Total Soal:</span>
                                    <span className="font-bold text-green-800">
                                        {userQuizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 0), 0)}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Game Info */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="text-4xl">👥</div>
                                <div>
                                    <h2 className="text-2xl font-bold text-gray-900">Mainkan Kuis Bersama Teman</h2>
                                    <p className="text-gray-600">Real-time multiplayer dengan leaderboard live!</p>
                                </div>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                {/* Feature 1 */}
                                <div className="bg-gradient-to-br from-purple-50 to-pink-50 p-5 rounded-xl border border-purple-200">
                                    <div className="text-3xl mb-3">🏆</div>
                                    <h4 className="font-bold text-purple-800 mb-2">Live Leaderboard</h4>
                                    <p className="text-purple-700 text-sm">
                                        Lihat peringkat pemain secara real-time saat game berlangsung
                                    </p>
                                </div>

                                {/* Feature 2 */}
                                <div className="bg-gradient-to-br from-yellow-50 to-orange-50 p-5 rounded-xl border border-yellow-200">
                                    <div className="text-3xl mb-3">⏱️</div>
                                    <h4 className="font-bold text-yellow-800 mb-2">Waktu Real-time</h4>
                                    <p className="text-yellow-700 text-sm">
                                        Setiap soal memiliki timer yang sama untuk semua pemain
                                    </p>
                                </div>

                                {/* Feature 3 */}
                                <div className="bg-gradient-to-br from-green-50 to-emerald-50 p-5 rounded-xl border border-green-200">
                                    <div className="text-3xl mb-3">📊</div>
                                    <h4 className="font-bold text-green-800 mb-2">Analisis Detail</h4>
                                    <p className="text-green-700 text-sm">
                                        Dapatkan analisis lengkap setelah game selesai
                                    </p>
                                </div>

                                {/* Feature 4 */}
                                <div className="bg-gradient-to-br from-blue-50 to-cyan-50 p-5 rounded-xl border border-blue-200">
                                    <div className="text-3xl mb-3">🎯</div>
                                    <h4 className="font-bold text-blue-800 mb-2">Kustomisasi</h4>
                                    <p className="text-blue-700 text-sm">
                                        Gunakan kuis buatan sendiri atau default
                                    </p>
                                </div>
                            </div>

                            {/* How to Play */}
                            <div className="mt-8 pt-6 border-t border-gray-200">
                                <h3 className="font-bold text-gray-800 text-lg mb-4">🎮 Cara Bermain</h3>
                                <ol className="space-y-3">
                                    <li className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">1</span>
                                        <span className="text-gray-700">Buat room baru atau join room yang sudah ada</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">2</span>
                                        <span className="text-gray-700">Host mulai game ketika semua pemain sudah siap</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">3</span>
                                        <span className="text-gray-700">Jawab soal secepat mungkin untuk mendapat poin lebih tinggi</span>
                                    </li>
                                    <li className="flex items-start">
                                        <span className="bg-blue-100 text-blue-700 w-6 h-6 rounded-full flex items-center justify-center text-sm font-bold mr-3 flex-shrink-0">4</span>
                                        <span className="text-gray-700">Lihat hasil dan analisis setelah game selesai</span>
                                    </li>
                                </ol>
                            </div>
                        </div>
                    </div>
                </div>
            ) : (
                /* MY QUIZZES SECTION */
                <div>
                    <div className="flex justify-between items-center mb-6">
                        <div>
                            <h2 className="text-2xl font-bold text-gray-800">📝 Kuis Saya ({userQuizzes.length})</h2>
                            <p className="text-gray-600">Kelola kuis yang telah Anda buat</p>
                        </div>
                        <button
                            onClick={onCreateQuiz}
                            className="px-5 py-2.5 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition flex items-center gap-2"
                        >
                            <span>+</span>
                            <span>Buat Kuis Baru</span>
                        </button>
                    </div>

                    {loading ? (
                        <div className="text-center py-12">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                            <p className="text-gray-600">Memuat kuis...</p>
                        </div>
                    ) : userQuizzes.length === 0 ? (
                        <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
                            <div className="text-5xl mb-4">📝</div>
                            <h3 className="text-xl font-bold text-gray-700 mb-2">Belum Ada Kuis</h3>
                            <p className="text-gray-600 mb-6 max-w-md mx-auto">
                                Anda belum membuat kuis apapun. Buat kuis pertama Anda sekarang!
                            </p>
                            <button
                                onClick={onCreateQuiz}
                                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-lg hover:from-blue-700 hover:to-purple-700 transition"
                            >
                                Buat Kuis Pertama
                            </button>
                        </div>
                    ) : (
                        <>
                            {/* Quizzes Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                {userQuizzes.map((quiz) => (
                                    <div 
                                        key={quiz.id} 
                                        className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden"
                                    >
                                        <div className="p-5">
                                            {/* Quiz Header */}
                                            <div className="flex justify-between items-start mb-3">
                                                <div>
                                                    <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-medium mb-2">
                                                        {quiz.category || "Umum"}
                                                    </div>
                                                    <h3 className="font-bold text-gray-800 text-lg line-clamp-1">
                                                        {quiz.title || "Kuis Tanpa Judul"}
                                                    </h3>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-sm text-gray-500">
                                                        {quiz.questions?.length || 0} soal
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Quiz Description */}
                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                                                {quiz.description || "Tidak ada deskripsi"}
                                            </p>

                                            {/* Quiz Stats */}
                                            <div className="grid grid-cols-3 gap-2 mb-4">
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500">Kesulitan</div>
                                                    <div className={`text-sm font-medium ${
                                                        quiz.difficulty === 'easy' ? 'text-green-600' :
                                                        quiz.difficulty === 'medium' ? 'text-yellow-600' : 'text-red-600'
                                                    }`}>
                                                        {quiz.difficulty === 'easy' ? 'Mudah' :
                                                         quiz.difficulty === 'medium' ? 'Sedang' : 
                                                         quiz.difficulty || 'Belum ditentukan'}
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500">Waktu</div>
                                                    <div className="text-sm font-medium text-gray-700">
                                                        {quiz.timeLimit || 30}s
                                                    </div>
                                                </div>
                                                <div className="text-center">
                                                    <div className="text-xs text-gray-500">Status</div>
                                                    <div className="text-sm font-medium text-gray-700">
                                                        {quiz.isPrivate ? 'Private' : 'Public'}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Action Buttons */}
                                            <div className="flex gap-2">
                                                <button
                                                    onClick={() => handleUseForMultiplayer(quiz)}
                                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition text-sm font-medium"
                                                >
                                                    🎮 Gunakan
                                                </button>
                                                <button
                                                    onClick={() => handleEditQuiz(quiz)}
                                                    className="px-3 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition"
                                                    title="Edit kuis"
                                                >
                                                    ✏️
                                                </button>
                                                <button
                                                    onClick={() => handleDuplicateQuiz(quiz)}
                                                    className="px-3 py-2 bg-yellow-50 text-yellow-600 rounded-lg hover:bg-yellow-100 transition"
                                                    title="Duplikat kuis"
                                                >
                                                    📋
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteQuiz(quiz.id)}
                                                    className="px-3 py-2 bg-red-50 text-red-600 rounded-lg hover:bg-red-100 transition"
                                                    title="Hapus kuis"
                                                >
                                                    🗑️
                                                </button>
                                            </div>

                                            {/* Info */}
                                            <div className="mt-4 pt-3 border-t border-gray-100 text-xs text-gray-500">
                                                <div className="flex justify-between">
                                                    <span>Hanya untuk multiplayer</span>
                                                    <span>ID: {quiz.id.slice(0, 6)}...</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {/* Stats Summary */}
                            <div className="mt-8 bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6 border border-blue-200">
                                <h3 className="font-bold text-blue-800 text-lg mb-4">📊 Ringkasan Kuis Anda</h3>
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-600">{userQuizzes.length}</div>
                                        <div className="text-sm text-blue-700">Total Kuis</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {userQuizzes.reduce((sum, quiz) => sum + (quiz.questions?.length || 0), 0)}
                                        </div>
                                        <div className="text-sm text-blue-700">Total Soal</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {userQuizzes.filter(q => q.difficulty === 'easy').length}
                                        </div>
                                        <div className="text-sm text-blue-700">Kuis Mudah</div>
                                    </div>
                                    <div className="bg-white p-4 rounded-lg border border-blue-100">
                                        <div className="text-2xl font-bold text-blue-600">
                                            {userQuizzes.filter(q => q.difficulty === 'hard').length}
                                        </div>
                                        <div className="text-sm text-blue-700">Kuis Sulit</div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Footer Info */}
            <div className="mt-10 text-center text-gray-500 text-sm">
                <p>🎯 Kuis hanya dapat dimainkan dalam mode multiplayer bersama teman-teman</p>
            </div>
        </div>
    )
}