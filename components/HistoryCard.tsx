// components/HistoryCard.tsx
import Image from 'next/image';
import type { QuizResultWithQuiz } from '@/types';

interface HistoryCardProps {
  item: QuizResultWithQuiz;
}

export default function HistoryCard({ item }: HistoryCardProps) {
  const percentage = Math.round((item.score / (item.quiz.questions.length * 10)) * 100);
  const date = (item.createdAt as any).toDate().toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div className="bg-white rounded-xl shadow-lg border border-gray-200 hover:shadow-xl transition-shadow overflow-hidden flex flex-col">
      <div className="relative w-full h-40">
        <Image
          src={item.quiz.imageUrl || '/placeholder.svg'}
          alt={item.quiz.title}
          layout="fill"
          objectFit="cover"
          className="bg-gray-200"
        />
        <div className="absolute top-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded-md">{date}</div>
      </div>
      <div className="p-5 flex flex-col flex-grow">
        <h3 className="font-bold text-gray-800 text-lg line-clamp-1">{item.quiz.title}</h3>
        <p className="text-gray-600 text-sm mb-4 line-clamp-2 flex-grow">{item.quiz.description}</p>
        <div className="flex items-center justify-between mt-auto">
            <div>
                <div className="text-xs text-gray-500">Skor Anda</div>
                <div className="text-2xl font-bold text-blue-600">{percentage}%</div>
            </div>
            <div className="text-right">
                 <div className="text-xs text-gray-500">Poin</div>
                <div className="text-2xl font-bold text-green-600">{item.score}</div>
            </div>
        </div>
      </div>
    </div>
  );
}
