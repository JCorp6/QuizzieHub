"use client"

import { useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { useAuthState } from "@/hooks/useAuthState"

export default function JoinRoomPage() {
  const router = useRouter()
  const params = useParams()
  const { user, loading: authLoading } = useAuthState()

  useEffect(() => {
    const roomCode = params.roomCode as string

    if (!authLoading) {
      if (user) {
        // If logged in, redirect to home with joinRoom query param
        router.replace(`/?joinRoom=${roomCode}`)
      } else {
        // If not logged in, redirect to login, but keep the room code for after
        // You might need a way to pass this redirect info to your login page
        router.replace(`/login?redirect=/play/${roomCode}`)
      }
    }
  }, [params.roomCode, router, user, authLoading])

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-100">
      <div className="text-2xl font-semibold text-gray-700">
        Joining room...
      </div>
      <div className="mt-4">
        {/* You can add a spinner or any loading animation here */}
      </div>
    </div>
  )
}
