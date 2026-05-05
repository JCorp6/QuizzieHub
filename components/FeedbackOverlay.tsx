"use client"

import { useEffect } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface FeedbackOverlayProps {
  isCorrect: boolean;
  isTimeUp?: boolean;
  onTimeout: () => void;
  duration?: number;
}

export default function FeedbackOverlay({ isCorrect, isTimeUp = false, onTimeout, duration = 2000 }: FeedbackOverlayProps) {
  useEffect(() => {
    const timer = setTimeout(onTimeout, duration);
    return () => clearTimeout(timer);
  }, [onTimeout, duration]);

  const bgColor = isCorrect ? 'bg-green-500/90' : 'bg-red-500/90';
  const timeUpBgColor = 'bg-gray-700/90';

  return (
    <div
      className={cn(
        "fixed inset-0 z-[100] flex flex-col items-center justify-center text-white animate-fade-in",
        isTimeUp ? timeUpBgColor : bgColor
      )}
    >
      <div className="text-center animate-zoom-in">
        {isTimeUp ? (
           <XCircle className="w-32 h-32 md:w-40 md:h-40" strokeWidth={1.5} />
        ) : isCorrect ? (
          <CheckCircle2 className="w-32 h-32 md:w-40 md:h-40" strokeWidth={1.5} />
        ) : (
          <XCircle className="w-32 h-32 md:w-40 md:h-40" strokeWidth={1.5} />
        )}
        <h1 className="text-5xl md:text-7xl font-extrabold mt-6 drop-shadow-lg">
          {isTimeUp ? "Time's Up" : isCorrect ? 'Correct!' : 'Incorrect'}
        </h1>
      </div>
    </div>
  );
}
