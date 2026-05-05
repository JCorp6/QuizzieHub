// components/QuizHistory.tsx
"use client"

import { useState, useEffect } from 'react';
import type { User } from 'firebase/auth';
import { getUserQuizHistory } from '@/lib/firebaseQuizzes';
import type { QuizResultWithQuiz } from '@/types';
import HistoryCard from './HistoryCard';

interface QuizHistoryProps {
  user: User;
}

export default function QuizHistory({ user }: QuizHistoryProps) {
  const [history, setHistory] = useState<QuizResultWithQuiz[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        setLoading(true);
        setError(null);
        const userHistory = await getUserQuizHistory(user.uid);
        setHistory(userHistory);
      } catch (err) {
        console.error("Error fetching quiz history:", err);
        setError("Gagal memuat riwayat kuis.");
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [user.uid]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Memuat riwayat...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <p className="text-red-600">{error}</p>
      </div>
    );
  }

  if (history.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-gray-50 to-gray-100 rounded-2xl border-2 border-dashed border-gray-300">
        <div className="text-5xl mb-4">📜</div>
        <h3 className="text-xl font-bold text-gray-700 mb-2">Riwayat Kosong</h3>
        <p className="text-gray-600 mb-6 max-w-md mx-auto">
          Anda belum menyelesaikan kuis apapun. Mainkan beberapa kuis untuk melihat riwayat Anda di sini!
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {history.map((item) => (
        <HistoryCard key={item.id} item={item} />
      ))}
    </div>
  );
}
