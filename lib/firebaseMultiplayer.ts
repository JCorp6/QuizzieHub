import { ref, set, get, onValue, update } from "firebase/database"
import type { User } from "firebase/auth"
import { database } from "./firebase"

// Generate room code
const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

export const createMultiplayerRoom = async (user: User, quiz: any) => {
  try {
    const roomId = generateRoomCode()
    const roomRef = ref(database, `multiplayer_rooms/${roomId}`)

    const room = {
      id: roomId,
      quiz,
      host: {
        uid: user.uid,
        displayName: user.displayName || "Anonymous",
        email: user.email,
      },
      players: [
        {
          uid: user.uid,
          displayName: user.displayName || "Anonymous",
          email: user.email,
          score: 0,
          answeredQuestions: 0,
          currentQuestion: 0,
        },
      ],
      status: "waiting",
      createdAt: new Date().toISOString(),
    }

    await set(roomRef, room)
    return room
  } catch (error) {
    console.error("Error creating multiplayer room:", error)
    throw error
  }
}

export const joinMultiplayerRoom = async (roomId: string, user: User) => {
  try {
    const roomRef = ref(database, `multiplayer_rooms/${roomId}`)
    const snapshot = await get(roomRef)

    if (!snapshot.exists()) {
      throw new Error("Room not found")
    }

    const room = snapshot.val()

    const newPlayer = {
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      email: user.email,
      score: 0,
      answeredQuestions: 0,
      currentQuestion: 0,
    }

    const updatedPlayers = [...room.players, newPlayer]
    await update(roomRef, { players: updatedPlayers })

    return { ...room, players: updatedPlayers }
  } catch (error) {
    console.error("Error joining multiplayer room:", error)
    throw error
  }
}

export const getActiveRooms = async () => {
  try {
    const roomsRef = ref(database, "multiplayer_rooms")
    const snapshot = await get(roomsRef)

    if (snapshot.exists()) {
      const data = snapshot.val()
      return Object.keys(data)
        .map((key) => ({
          ...data[key],
          id: key,
        }))
        .filter((room) => room.status === "waiting")
    }
    return []
  } catch (error) {
    console.error("Error getting active rooms:", error)
    return []
  }
}

export const listenToRoomChanges = (callback: (rooms: any[]) => void) => {
  try {
    const roomsRef = ref(database, "multiplayer_rooms")

    const unsubscribe = onValue(roomsRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        const rooms = Object.keys(data).map((key) => ({
          ...data[key],
          id: key,
        }))
        callback(rooms)
      } else {
        callback([])
      }
    })

    return unsubscribe
  } catch (error) {
    console.error("Error listening to room changes:", error)
  }
}

export const listenToRoomPlayers = (roomId: string, callback: (players: any[]) => void) => {
  try {
    const playersRef = ref(database, `multiplayer_rooms/${roomId}/players`)

    const unsubscribe = onValue(playersRef, (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.val()
        callback(Array.isArray(data) ? data : [data])
      } else {
        callback([])
      }
    })

    return unsubscribe
  } catch (error) {
    console.error("Error listening to room players:", error)
  }
}

export const submitMultiplayerAnswer = async (
  roomId: string,
  userId: string,
  answer: {
    questionIndex: number
    answerIndex: number
    correct: boolean
    score: number
    timestamp: number
  },
) => {
  try {
    const answersRef = ref(database, `multiplayer_rooms/${roomId}/answers/${userId}`)
    await set(answersRef, answer)
  } catch (error) {
    console.error("Error submitting multiplayer answer:", error)
    throw error
  }
}

export const updatePlayerScore = async (roomId: string, userId: string, score: number) => {
  try {
    const playerRef = ref(database, `multiplayer_rooms/${roomId}/players`)
    const snapshot = await get(playerRef)

    if (snapshot.exists()) {
      const players = snapshot.val()
      const playerIndex = players.findIndex((p: any) => p.uid === userId)

      if (playerIndex !== -1) {
        players[playerIndex].score = score
        await update(ref(database, `multiplayer_rooms/${roomId}`), { players })
      }
    }
  } catch (error) {
    console.error("Error updating player score:", error)
    throw error
  }
}
