import { useState, useEffect } from "react"
import { User } from "firebase/auth"
import Image from "next/image"
import { getCustomQuizzes } from "@/lib/firebaseQuizzes"
import { defaultQuizzes } from "@/lib/defaultQuizzes"
import type { Quiz } from "@/types"
import QuizHistory from "./QuizHistory"

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

    const [activeTab, setActiveTab] = useState<'explore' | 'my-quizzes' | 'multiplayer' | 'riwayat'>('explore')

    const [error, setError] = useState<string>("")



    useEffect(() => {

        const fetchUserQuizzes = async () => {

            try {

                setLoading(true)

                setError("")

                const quizzes = await getCustomQuizzes(user.uid);

                setUserQuizzes(quizzes as Quiz[]);

            } catch (error) {

                console.error("❌ Error fetching user quizzes:", error)

                setError("Gagal memuat kuis Anda.")

            } finally {

                setLoading(false)

            }

        };

        fetchUserQuizzes()

    }, [user])



    const handleUseForMultiplayer = (quiz: Quiz) => {

        localStorage.setItem('selectedQuizForMultiplayer', JSON.stringify(quiz))

        onPlayMultiplayer()

    }

    

    // Group default quizzes by category

    const groupedDefaultQuizzes = defaultQuizzes.reduce((acc, quiz) => {

        const category = quiz.category || 'General';

        if (!acc[category]) {

            acc[category] = [];

        }

        acc[category].push(quiz as Quiz);

        return acc;

    }, {} as Record<string, Quiz[]>);

    

    return (

        <div className="animate-fade-in bg-white/70 backdrop-blur-sm rounded-2xl p-6 shadow-xl">

            {/* Hero Section */}

            <div className="text-center mb-10">
                <h1 className="text-4xl font-bold text-gray-900 mb-3">🎯 Selamat Datang di QuizzieHub!</h1>
                <p className="text-gray-600 text-lg max-w-3xl mx-auto">
                    Jelajahi kuis, buat kuis sendiri, atau mainkan bersama teman secara real-time!
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



            {/* Tabs */}

            <div className="mb-8">

                <div className="border-b border-gray-200">

                    <nav className="flex space-x-4">

                        <button

                            onClick={() => setActiveTab('explore')}

                            className={`py-3 px-6 font-medium text-sm border-b-2 transition ${

                                activeTab === 'explore'

                                    ? 'border-blue-600 text-blue-600'

                                    : 'border-transparent text-gray-500 hover:text-gray-700'

                            }`}

                        >

                            🚀 Jelajahi Kuis

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

                         <button

                            onClick={() => setActiveTab('riwayat')}

                            className={`py-3 px-6 font-medium text-sm border-b-2 transition ${

                                activeTab === 'riwayat'

                                    ? 'border-blue-600 text-blue-600'

                                    : 'border-transparent text-gray-500 hover:text-gray-700'

                            }`}

                        >

                            📜 Riwayat

                        </button>

                        <button

                            onClick={() => setActiveTab('multiplayer')}

                            className={`py-3 px-6 font-medium text-sm border-b-2 transition ${

                                activeTab === 'multiplayer'

                                    ? 'border-blue-600 text-blue-.600'

                                    : 'border-transparent text-gray-500 hover:text-gray-700'

                            }`}

                        >

                            🎮 Multiplayer

                        </button>

                    </nav>

                </div>

            </div>



            {/* Content based on active tab */}

            {activeTab === 'explore' && (

                <div>

                    {Object.entries(groupedDefaultQuizzes).map(([category, quizzes]) => (

                        <div key={category} className="mb-12">

                            <h2 className="text-3xl font-bold text-gray-800 mb-6">{category}</h2>

                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                                {quizzes.map((quiz) => (

                                    <div key={quiz.id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden flex flex-col">

                                        <div className="relative w-full h-40">

                                            <Image

                                                src={quiz.imageUrl || "/placeholder.svg"}

                                                alt={quiz.title}

                                                layout="fill"

                                                objectFit="cover"

                                                className="bg-gray-200"

                                            />

                                        </div>

                                        <div className="p-5 flex flex-col flex-grow">

                                            <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{quiz.title}</h3>

                                            <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{quiz.description}</p>

                                            <div className="flex gap-2 mt-auto">

                                                <button

                                                    onClick={() => onPlayQuiz(quiz)}

                                                    className="flex-1 py-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-lg hover:from-green-600 hover:to-emerald-700 transition text-sm font-medium"

                                                >

                                                   ▶️ Mulai

                                                </button>

                                                <button

                                                    onClick={() => handleUseForMultiplayer(quiz)}

                                                    className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition text-sm font-medium"

                                                >

                                                    👥 Gunakan di Multiplayer

                                                </button>

                                            </div>

                                        </div>

                                    </div>

                                ))}

                            </div>

                        </div>

                    ))}

                </div>

            )}



            {activeTab === 'my-quizzes' && (

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

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">

                            {userQuizzes.map((quiz) => (

                                <div key={quiz.id} className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden flex flex-col">

                                    <div className="relative w-full h-40">

                                        <Image

                                            src={quiz.imageUrl || "/placeholder.svg"}

                                            alt={quiz.title}

                                            layout="fill"

                                            objectFit="cover"

                                            className="bg-gray-200"

                                        />

                                    </div>

                                    <div className="p-5 flex flex-col flex-grow">

                                        <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{quiz.title}</h3>

                                        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{quiz.description}</p>

                                        <div className="flex gap-2 mt.auto">

                                             <button

                                                onClick={() => handleUseForMultiplayer(quiz)}

                                                className="flex-1 py-2 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 transition text-sm font-medium"

                                            >

                                                Gunakan di Multiplayer

                                            </button>

                                        </div>

                                    </div>

                                </div>

                            ))}

                        </div>

                    )}

                </div>

            )}

            

            {activeTab === 'riwayat' && (

                <QuizHistory user={user} />

            )}



            {activeTab === 'multiplayer' && (

                 <div className="bg-white rounded-2xl shadow-lg p-8 border border-gray-200">

                    <div className="flex items-center gap-3 mb-6">

                        <div className="text-4xl">👥</div>

                        <div>

                            <h2 className="text-2xl font-bold text-gray-900">Mainkan Kuis Bersama Teman</h2>

                            <p className="text-gray-600">Real-time multiplayer dengan leaderboard live!</p>

                        </div>

                    </div>

                     <button

                        onClick={onPlayMultiplayer}

                        className="w-full py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 transition-all transform hover:scale-[1.02] shadow-lg mb-4"

                    >

                        <div className="font-bold text-xl">Buat atau Gabung Room</div>

                    </button>

                </div>

            )}

        </div>

    )

}
