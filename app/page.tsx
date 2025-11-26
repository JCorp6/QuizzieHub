"use client"
import { signInWithGoogle, signOutUser } from "@/lib/firebase"
import LoginPage from "@/components/LoginPage"
import HomePage from "@/components/HomePage"
import { useAuthState } from "@/hooks/useAuthState"

export default function Home() {
  const { user, loading } = useAuthState()

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="flex flex-col items-center gap-4">
          <div className="w-16 h-16 border-4 border-purple-300 border-t-purple-600 rounded-full animate-spin"></div>
          <p className="text-gray-600 font-medium">Loading QuizzieHub...</p>
        </div>
      </div>
    )
  }

  return user ? <HomePage user={user} onSignOut={signOutUser} /> : <LoginPage onSignIn={signInWithGoogle} />
}
