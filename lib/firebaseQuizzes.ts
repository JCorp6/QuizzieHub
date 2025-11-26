"use client"

import { ref, push, get } from "firebase/database"
import { database } from "./firebase"

export const saveCustomQuiz = async (userId: string, quiz: any) => {
  try {
    const quizzesRef = ref(database, `users/${userId}/quizzes`)
    await push(quizzesRef, quiz)
  } catch (error) {
    console.error("Error saving quiz:", error)
    throw error
  }
}

export const getCustomQuizzes = async (userId: string) => {
  try {
    const quizzesRef = ref(database, `users/${userId}/quizzes`)
    const snapshot = await get(quizzesRef)

    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.keys(data).map((key) => ({
        ...data[key],
        id: key,
      }))
    }
    return []
  } catch (error) {
    console.error("Error fetching quizzes:", error)
    return []
  }
}

export const saveQuizResult = async (userId: string, result: any) => {
  try {
    const resultsRef = ref(database, `users/${userId}/results`)
    await push(resultsRef, {
      ...result,
      createdAt: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Error saving result:", error)
    throw error
  }
}
