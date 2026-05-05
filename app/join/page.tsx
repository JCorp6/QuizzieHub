"use client"

import { useAuthState } from "@/hooks/useAuthState"
import { JoinGame } from "@/components/JoinGame"
import { useRouter } from "next/navigation"
import LoadingSpinner from "@/components/LoadingSpinner"

export default function JoinPage() {
  const { user, loading } = useAuthState()
  const router = useRouter()

  if (loading) {
    return <LoadingSpinner />;
  }

  if (!user) {
    router.replace("/login?redirect=/join")
    return <LoadingSpinner />; // Show spinner while redirecting
  }

  return <JoinGame user={user} />;
}
