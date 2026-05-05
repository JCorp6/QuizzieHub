import { defaultQuizzes } from "./defaultQuizzes" // Import default quizzes
import { db } from "./firebase"
import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  query,
  addDoc,
  Timestamp,
  where,
  limit,
  updateDoc,
  increment,
  runTransaction,
  orderBy // Import orderBy
} from "firebase/firestore"
import type { Quiz, UserAnswer, QuizResult, QuizResultWithQuiz } from "../types"
import { uploadQuizImage } from "./firebaseStorage"

// ----------------------
// Save Quiz
// ----------------------
export const saveCustomQuiz = async (
  userId: string,
  quizData: Omit<Quiz, "id" | "createdAt" | "createdBy" | "imageUrl">,
  imageFile: File | null
) => {
  try {
    const newQuizRef = doc(collection(db, "quizzes"));
    let imageUrl: string | undefined = undefined;

    // Jika ada file gambar, unggah dulu
    if (imageFile) {
      imageUrl = await uploadQuizImage(userId, newQuizRef.id, imageFile);
    }

    const quizToSave: Quiz = {
      ...quizData,
      id: newQuizRef.id,
      createdBy: userId,
      createdAt: Timestamp.now(),
      timesPlayed: 0,
      averageScore: 0,
      ...(imageUrl && { imageUrl }), // Tambahkan imageUrl jika ada
    };

    await setDoc(newQuizRef, quizToSave);

    // Juga simpan referensi ke kuis di subkoleksi pengguna
    const userQuizRef = doc(db, `users/${userId}/quizzes`, newQuizRef.id);
    await setDoc(userQuizRef, {
      quizId: newQuizRef.id,
      title: quizToSave.title,
      createdAt: quizToSave.createdAt,
      ...(imageUrl && { imageUrl }), // Tambahkan imageUrl di sini juga
    });

    console.log(`Quiz successfully saved to Firestore: ${newQuizRef.id}`);
    return newQuizRef.id;
  } catch (error) {
    console.error("Error saving quiz:", error);
    throw error;
  }
};

// ----------------------
// Fetch User's Custom Quizzes
// ----------------------
export const getCustomQuizzes = async (userId: string): Promise<Quiz[]> => {
  try {
    const q = query(collection(db, "quizzes"), where("createdBy", "==", userId));
    const querySnapshot = await getDocs(q);
    
    const quizzes: Quiz[] = [];
    querySnapshot.forEach((doc) => {
      quizzes.push({ id: doc.id, ...doc.data() } as Quiz);
    });
    
    return quizzes;
  } catch (error) {
    console.error("Error fetching user's custom quizzes:", error);
    return [];
  }
};

// ----------------------
// Fetch All Public Quizzes
// ----------------------
export const getPublicQuizzes = async (
  count: number = 20
): Promise<Quiz[]> => {
  try {
    const q = query(
      collection(db, "quizzes"),
      where("isPublic", "==", true),
      limit(count)
    );
    const querySnapshot = await getDocs(q);

    const quizzes: Quiz[] = [];
    querySnapshot.forEach((doc) => {
      quizzes.push({ id: doc.id, ...doc.data() } as Quiz);
    });
    
    return quizzes;
  } catch (error) {
    console.error("Error fetching public quizzes:", error);
    return [];
  }
};

// ----------------------
// Fetch Quiz Details
// ----------------------
export const getQuizDetails = async (quizId: string): Promise<Quiz | null> => {
  try {
    const quizDocRef = doc(db, "quizzes", quizId);
    const docSnap = await getDoc(quizDocRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as Quiz;
    } else {
      console.log("No such quiz found!");
      return null;
    }
  } catch (error) {
    console.error("Error fetching quiz details:", error);
    return null;
  }
};


// ----------------------
// Save Quiz Result
// ----------------------
export const saveQuizResult = async (
  userId: string,
  quizId: string,
  score: number,
  answers: UserAnswer[] // Use UserAnswer type
) => {
  try {
    // Save the result in the user's subcollection
    const resultRef = await addDoc(collection(db, `users/${userId}/results`), {
      quizId,
      score,
      answers,
      createdAt: Timestamp.now(),
      userId,
    });
    console.log("Quiz result saved with ID: ", resultRef.id);

    // Update aggregate statistics on the main quiz using a transaction
    const quizDocRef = doc(db, "quizzes", quizId);

    await runTransaction(db, async (transaction) => {
      const quizDoc = await transaction.get(quizDocRef);
      if (!quizDoc.exists()) {
        throw "Quiz does not exist!";
      }

      const data = quizDoc.data() as Quiz;
      const newTimesPlayed = (data.timesPlayed || 0) + 1;
      const newAverageScore =
        ((data.averageScore || 0) * (data.timesPlayed || 0) + score) / newTimesPlayed;

      transaction.update(quizDocRef, {
        timesPlayed: newTimesPlayed,
        averageScore: newAverageScore,
      });
    });
  } catch (error) {
    console.error("Error saving quiz result:", error);
    throw error;
  }
};

// ----------------------
// Fetch User's Quiz History
// ----------------------
export const getUserQuizHistory = async (userId: string): Promise<QuizResultWithQuiz[]> => {
  try {
    const resultsRef = collection(db, `users/${userId}/results`);
    const q = query(resultsRef, orderBy("createdAt", "desc"), limit(25));
    const querySnapshot = await getDocs(q);

    const historyPromises = querySnapshot.docs.map(async (doc) => {
      const result = { id: doc.id, ...doc.data() } as QuizResult;
      try {
        const quiz = await getQuizDetails(result.quizId);
        if (quiz) {
          return { ...result, quiz };
        }
      } catch (error) {
        console.error(`Failed to fetch details for quiz ${result.quizId}:`, error);
      }
      return null;
    });

    const history = (await Promise.all(historyPromises)).filter((item): item is QuizResultWithQuiz => item !== null);
    
    return history;
  } catch (error) {
    console.error("Error fetching user quiz history:", error);
    return [];
  }
};

// ----------------------
// Seed Default Quizzes
// ----------------------
export const seedDefaultQuizzes = async () => {
  try {
    console.log("Attempting to seed default quizzes...");
    for (const quiz of defaultQuizzes) {
      const quizDocRef = doc(db, "quizzes", quiz.id);
      const docSnap = await getDoc(quizDocRef);

      if (!docSnap.exists()) {
        // Only add if it doesn't already exist
        await setDoc(quizDocRef, {
          ...quiz,
          createdAt: Timestamp.now(), // Ensure createdAt is a Timestamp
          timesPlayed: quiz.timesPlayed || 0,
          averageScore: quiz.averageScore || 0,
          isPublic: true, // Mark default quizzes as public
        });
        console.log(`Seeded default quiz: ${quiz.title}`);
      } else {
        console.log(`Default quiz "${quiz.title}" already exists, skipping.`);
      }
    }
    console.log("Default quiz seeding complete.");
  } catch (error) {
    console.error("Error seeding default quizzes:", error);
    throw error;
    }
};