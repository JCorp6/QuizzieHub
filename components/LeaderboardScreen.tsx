"use client"

import { User } from "firebase/auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { cn } from "@/lib/utils";

interface Player {
    uid: string;
    displayName: string;
    score: number;
    streak?: number;
}

interface LeaderboardScreenProps {
    players: Player[];
    currentUser: User;
    onContinue: () => void;
}

const getRankClass = (rank: number) => {
    if (rank === 0) return "bg-gradient-to-r from-amber-400 to-yellow-500 border-yellow-600";
    if (rank === 1) return "bg-gradient-to-r from-slate-300 to-gray-400 border-gray-500";
    if (rank === 2) return "bg-gradient-to-r from-amber-600 to-orange-700 border-orange-800";
    return "bg-white border-gray-200";
};

const getRankEmoji = (rank: number) => {
    if (rank === 0) return "🥇";
    if (rank === 1) return "🥈";
    if (rank === 2) return "🥉";
    return `${rank + 1}`;
};


export default function LeaderboardScreen({ players, currentUser, onContinue }: LeaderboardScreenProps) {
    // Sort players by score
    const sortedPlayers = [...players].sort((a, b) => b.score - a.score);

    return (
        <div className="fixed inset-0 z-[100] bg-gray-900/90 backdrop-blur-md flex flex-col items-center justify-center p-4 animate-fade-in">
            <div className="w-full max-w-2xl text-center">
                <h1 className="text-5xl md:text-6xl font-extrabold text-white drop-shadow-lg mb-8">
                    🏆 LEADERBOARD 🏆
                </h1>

                <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {sortedPlayers.map((player, index) => (
                        <div
                            key={player.uid}
                            className={cn(
                                "flex items-center p-3 rounded-xl border-2 shadow-lg transition-transform duration-300 animate-slide-in-from-left",
                                getRankClass(index),
                                { "border-blue-500 scale-105": player.uid === currentUser.uid }
                            )}
                            style={{ animationDelay: `${index * 100}ms` }}
                        >
                            <div className="flex items-center gap-4 flex-grow">
                                <div className="font-bold text-2xl w-10 text-center">{getRankEmoji(index)}</div>
                                <Avatar>
                                    <AvatarFallback>{player.displayName.charAt(0)}</AvatarFallback>
                                </Avatar>
                                <p className={cn("font-bold text-lg", (index > 2) ? 'text-gray-800' : 'text-white')}>
                                    {player.displayName}
                                    {player.uid === currentUser.uid && " (You)"}
                                </p>
                            </div>
                            <div className={cn("font-extrabold text-2xl", (index > 2) ? 'text-purple-700' : 'text-white')}>
                                {player.score.toLocaleString()}
                            </div>
                        </div>
                    ))}
                </div>

                <button
                    onClick={onContinue}
                    className="mt-8 px-8 py-4 bg-purple-600 text-white font-bold text-xl rounded-full hover:bg-purple-700 transform hover:scale-105 transition-transform"
                >
                    Continue
                </button>
            </div>
        </div>
    );
}
