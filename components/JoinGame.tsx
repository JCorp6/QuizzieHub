"use client"

import * as React from "react"
import { useRouter } from "next/navigation"
import type { User } from "firebase/auth"
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp"
import { Button } from "@/components/ui/button"
import { joinMultiplayerRoom, updatePlayerDisplayName } from "@/lib/firebaseMultiplayer"

interface JoinGameProps {
    user: User
}

export function JoinGame({ user }: JoinGameProps) {
  const router = useRouter()
  const [roomCode, setRoomCode] = React.useState("")
  const [name, setName] = React.useState(user.displayName || "")
  const [step, setStep] = React.useState<"code" | "name">("code")
  const [error, setError] = React.useState("")
  const [isLoading, setIsLoading] = React.useState(false)

  const handleCodeSubmit = async (code: string) => {
    setIsLoading(true)
    setError("")
    
    if (code.length !== 6) {
      setError("Room code must be 6 characters.")
      setIsLoading(false)
      return
    }

    try {
      // Attempt to join the room to validate the code
      await joinMultiplayerRoom(code, user)
      // If successful, move to the name step
      setStep("name")
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to find the room.")
    } finally {
      setIsLoading(false)
    }
  }

  const handleNameSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("Please enter your name.")
      return
    }
    
    setIsLoading(true);
    setError("");

    try {
        // Update the player's display name in the room
        await updatePlayerDisplayName(roomCode, user.uid, name.trim());
        
        // Redirect to the home page, which will handle putting the user in the lobby
        router.push(`/?joinRoom=${roomCode}`);

    } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to update name.");
        setIsLoading(false);
    }
  }
  
  const handleCodeComplete = (code: string) => {
    setRoomCode(code)
    handleCodeSubmit(code)
  }

  return (
    <div className="relative flex flex-col items-center justify-center min-h-screen w-full bg-gradient-to-br from-purple-600 via-blue-500 to-indigo-700 p-4">
      <div className="absolute top-8 text-white flex items-center gap-3">
        <span className="text-3xl font-bold">🎯</span>
        <span className="text-3xl font-extrabold tracking-tight">QuizzieHub</span>
      </div>

      <div className="w-full max-w-md text-center">
        {step === "code" && (
          <div className="animate-fade-in space-y-8">
            <h1 className="text-5xl font-bold text-white drop-shadow-md">Enter Join Code</h1>
            <form onSubmit={(e) => { e.preventDefault(); handleCodeSubmit(roomCode); }}>
              <InputOTP
                maxLength={6}
                value={roomCode}
                onChange={(value) => setRoomCode(value.toUpperCase())}
                onComplete={handleCodeComplete}
              >
                <InputOTPGroup className="justify-center">
                  <InputOTPSlot index={0} className="text-4xl h-20 w-16 bg-white/20 text-white border-white/30" />
                  <InputOTPSlot index={1} className="text-4xl h-20 w-16 bg-white/20 text-white border-white/30" />
                  <InputOTPSlot index={2} className="text-4xl h-20 w-16 bg-white/20 text-white border-white/30" />
                  <InputOTPSlot index={3} className="text-4xl h-20 w-16 bg-white/20 text-white border-white/30" />
                  <InputOTPSlot index={4} className="text-4xl h-20 w-16 bg-white/20 text-white border-white/30" />
                  <InputOTPSlot index={5} className="text-4xl h-20 w-16 bg-white/20 text-white border-white/30" />
                </InputOTPGroup>
              </InputOTP>
              {isLoading && <p className="text-white/80 mt-4">Validating room...</p>}
              {error && <p className="text-red-300 bg-red-900/50 rounded-md p-3 mt-4">{error}</p>}
            </form>
          </div>
        )}

        {step === "name" && (
          <div className="animate-slide-in-from-bottom space-y-6">
            <h1 className="text-4xl font-bold text-white drop-shadow-md">You're in! What's your name?</h1>
            <form onSubmit={handleNameSubmit} className="space-y-4">
              <input
                type="text"
                placeholder="Your name..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                maxLength={20}
                autoFocus
                className="w-full text-center text-3xl font-bold bg-white/20 text-white placeholder:text-white/50 border-2 border-white/30 rounded-xl px-6 py-4 focus:outline-none focus:ring-2 focus:ring-white"
              />
              <Button type="submit" size="lg" className="w-full text-xl h-16 bg-white text-purple-600 hover:bg-gray-100" disabled={isLoading}>
                {isLoading ? "Joining..." : "Let's Go!"}
              </Button>
               {error && <p className="text-red-300 bg-red-900/50 rounded-md p-3 mt-2">{error}</p>}
            </form>
          </div>
        )}
      </div>
    </div>
  )
}
