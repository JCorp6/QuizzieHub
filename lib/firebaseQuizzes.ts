// src/lib/firebaseQuizzes.ts

import { db } from "./firebase"
import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  query, 
  addDoc, 
  Timestamp,
  where, // Diperlukan untuk query kuis publik
  limit // Diperlukan untuk batasan query
} from "firebase/firestore"

// Definisikan tipe dasar yang diperlukan untuk kuis agar lebih aman (type safety)
interface Question {
    text: string;
    options: string[];
    correctAnswer: number;
    id: string;
}

interface QuizData {
    id: string;
    title: string;
    description: string;
    difficulty: string;
    category: string;
    questions: Question[]; 
    createdBy: string;
    createdAt: Date;
}

// ----------------------
// Menyimpan Kuis
// ----------------------
export const saveCustomQuiz = async (userId: string, quiz: QuizData) => {
  try {
    // Path: users/{userId}/quizzes/{quiz.id}
    const quizDocRef = doc(db, `users/${userId}/quizzes/${quiz.id}`)
    
    // Konversi Date ke Firestore Timestamp
    const quizToSave = {
        ...quiz,
        createdAt: Timestamp.fromDate(quiz.createdAt),
    }

    await setDoc(quizDocRef, quizToSave)
    console.log(`Kuis berhasil disimpan di Firestore: ${quiz.id}`)
  } catch (error) {
    console.error("Error saving quiz:", error)
    throw error
  }
}

// ----------------------
// Mengambil Kuis
// ----------------------
// Fungsi ini hanya mengambil kuis yang dibuat oleh userId saat ini.
export const getCustomQuizzes = async (userId: string) => {
// ... (Kode fungsi ini tetap sama)
  try {
    // Path: users/{userId}/quizzes
    const quizzesCollectionRef = collection(db, `users/${userId}/quizzes`)
    
    const querySnapshot = await getDocs(quizzesCollectionRef)

    const quizzes: QuizData[] = []
    querySnapshot.forEach((doc) => {
        quizzes.push(doc.data() as QuizData)
    })
    return quizzes
    
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return []
  }
}


// ----------------------
// TAMBAHAN: MENDAPATKAN KUIS PUBLIK (untuk halaman utama/eksplorasi)
// ----------------------


// ----------------------
// TAMBAHAN: MENGAKSES KUIS DENGAN KODE (untuk kuis private)
// ----------------------

// ... (Fungsi saveQuizResult tetap sama)

// ----------------------
// Menyimpan Hasil Kuis
// ----------------------
export const saveQuizResult = async (userId: string, result: any) => {
  try {
    // Path: users/{userId}/results
    const resultsCollectionRef = collection(db, `users/${userId}/results`)
    
    // addDoc secara otomatis membuat ID dokumen baru
    await addDoc(resultsCollectionRef, {
      ...result,
      createdAt: Timestamp.fromDate(new Date()), // ⬅️ Perubahan: Menggunakan Timestamp
    })
  } catch (error) {
    console.error("Error saving result:", error)
    throw error
  }
}