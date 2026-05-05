"use client"

import { User } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";

interface GameHeaderProps {
    user: User;
    score: number;
    streak: number;
    currentQuestionIndex: number;
    totalQuestions: number;
}

export default function GameHeader({ user, score, streak, currentQuestionIndex, totalQuestions }: GameHeaderProps) {
    const progressPercentage = totalQuestions > 0 ? ((currentQuestionIndex + 1) / totalQuestions) * 100 : 0;

    return (
        <header className="fixed top-0 left-0 right-0 bg-white/80 backdrop-blur-sm shadow-md z-50">
            <div className="max-w-4xl mx-auto px-4 py-2">
                <div className="flex items-center justify-between gap-4">
                    {/* Left side: Avatar and Name */}
                    <div className="flex items-center gap-3">
                        <Avatar>
                            <AvatarImage src={user.photoURL || undefined} alt={user.displayName || "User"} />
                            <AvatarFallback>{user.displayName?.charAt(0) || "U"}</AvatarFallback>
                        </Avatar>
                        <div className="hidden sm:block">
                            <div className="font-bold text-gray-800">{user.displayName}</div>
                        </div>
                    </div>

                    {/* Middle: Progress Bar */}
                    <div className="flex-grow max-w-sm flex items-center gap-3">
                         <div className="text-sm font-bold text-gray-600 min-w-[50px] text-right">
                            {currentQuestionIndex + 1} / {totalQuestions}
                        </div>
                        <Progress value={progressPercentage} className="h-3" />
                    </div>

                    {/* Right side: Score and Streak */}
                    <div className="flex items-center gap-4 text-right">
                        <div className="flex items-center gap-2">
                            <span className="font-bold text-lg text-purple-600">{score.toLocaleString()}</span>
                            <span className="text-sm text-gray-500">pts</span>
                        </div>
                        <div className="flex items-center gap-1 text-orange-500">
                             <span className="text-2xl">🔥</span>
                            <span className="font-bold text-lg">{streak}</span>
                        </div>
                    </div>
                </div>
            </div>
        </header>
    );
}
