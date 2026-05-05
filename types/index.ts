// types/index.ts

import { Timestamp } from "firebase/firestore";

export interface Question {
  id: string;
  text: string;
  options: string[];
  correctAnswer: number;
  timeLimit?: number;
}

export interface Quiz {

  id: string;

  title: string;

  description: string;

  difficulty: "Easy" | "Medium" | "Hard";

  category: string;

  questions: Question[];

  createdBy: string; // User ID

  createdAt: Timestamp;

  isPublic: boolean;

  timesPlayed?: number;

  averageScore?: number;

  defaultTimeLimit?: number;

  imageUrl?: string;
}

export interface UserAnswer {
  questionId: string;
  selectedOption: number;
  correctOption: number;
  isCorrect: boolean;
}

export interface QuizResult {
  id: string;
  userId: string;
  quizId: string;
  score: number;
  answers: UserAnswer[];
  createdAt: Timestamp;
}

export interface QuizResultWithQuiz extends QuizResult {
  quiz: Quiz;
}
