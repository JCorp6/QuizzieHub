import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  query, 
  where, 
  onSnapshot,
  Timestamp,
  increment,
  deleteField,
  deleteDoc,
  serverTimestamp, // Tambahkan ini
  runTransaction
} from "firebase/firestore"
import type { User } from "firebase/auth"
import { db } from "./firebase"

// Generate room code
const generateRoomCode = (): string => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

// ----------------------------------------------------
// CREATE ROOM - PERBAIKAN: Host tidak ditambahkan sebagai player
// ----------------------------------------------------
export const createMultiplayerRoom = async (user: User, quiz: any) => {
  try {
    const roomId = generateRoomCode()
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)

    const room = {
      id: roomId,
      quiz: {
        ...quiz,
        defaultTimeLimit: quiz.defaultTimeLimit || 30 // Default time 30 detik
      },
      host: {
        uid: user.uid,
        displayName: user.displayName || "Anonymous",
        email: user.email,
      },
      // HANYA players object untuk pemain, host TIDAK dimasukkan
      players: {}, // Kosong di awal
      status: "waiting",
      createdAt: Timestamp.fromDate(new Date()),
      settings: {
        hostCanPlay: false, // Default: host tidak bisa main
        timePerQuestion: quiz.defaultTimeLimit || 30,
        autoProceed: true
      }
    }

    await setDoc(roomDocRef, room)
    return room
  } catch (error) {
    console.error("Error creating multiplayer room:", error)
    throw error
  }
}

// ----------------------------------------------------
// JOIN ROOM - PERBAIKAN: Hanya player yang join, host tidak boleh join
// ----------------------------------------------------
export const joinMultiplayerRoom = async (roomId: string, user: User) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    const snapshot = await getDoc(roomDocRef)

    if (!snapshot.exists()) {
      throw new Error("Room not found")
    }

    const room = snapshot.data()!
    
    // Cek jika user adalah host (host tidak bisa join sebagai player)
    if (room.host.uid === user.uid) {
      throw new Error("Host tidak bisa join sebagai player")
    }

    // Cek jika sudah ada di room
    if (room.players && room.players[user.uid]) {
      return { ...room, players: { ...room.players } }
    }

    const newPlayer = {
      uid: user.uid,
      displayName: user.displayName || "Anonymous",
      score: 0,
      answeredQuestions: 0,
      currentQuestion: 0,
      hasAnsweredCurrent: false,
      isReady: true,
      joinedAt: Timestamp.now()
    }

    const playerUpdate = {
      [`players.${user.uid}`]: newPlayer
    }

    await updateDoc(roomDocRef, playerUpdate)

    return { 
      ...room, 
      players: { 
        ...room.players, 
        [user.uid]: newPlayer 
      } 
    }
  } catch (error) {
    console.error("Error joining multiplayer room:", error)
    throw error
  }
}

// ----------------------------------------------------
// GET ACTIVE ROOMS - PERBAIKAN: Exclude host dari player count
// ----------------------------------------------------
export const getActiveRooms = async () => {
  try {
    const roomsColRef = collection(db, "multiplayer_rooms")
    const q = query(roomsColRef, where("status", "==", "waiting"))
    const querySnapshot = await getDocs(q)

    const rooms: any[] = []
    querySnapshot.forEach((doc) => {
      const roomData = doc.data()
      
      // Filter out host dari players
      const playersArray = Object.values(roomData.players || {})
        .filter((player: any) => player.uid !== roomData.host.uid)
      
      rooms.push({ 
        ...roomData, 
        id: doc.id, 
        players: playersArray,
        playerCount: playersArray.length
      })
    })

    return rooms
  } catch (error) {
    console.error("Error getting active rooms:", error)
    return []
  }
}

// ----------------------------------------------------
// LISTEN TO ROOM PLAYERS - PERBAIKAN: Exclude host
// ----------------------------------------------------
export const listenToRoomPlayers = (roomId: string, callback: (players: any[]) => void) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)

    const unsubscribe = onSnapshot(roomDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const roomData = docSnapshot.data()
        console.log("📡 RAW ROOM DATA:", roomData)
        
        const playersMap = roomData.players || {}
        console.log("📡 RAW PLAYERS MAP:", playersMap)
        
        // Convert map to array dan filter
        const playersArray = Object.values(playersMap)
          .filter((player: any) => {
            const isValid = player && player.uid && player.uid !== roomData.host?.uid
            if (!isValid) {
              console.log("❌ Filtered out player:", player)
            }
            return isValid
          })
          .map((player: any) => ({
            ...player,
            // 🚨 Pastikan boolean conversion
            hasAnsweredCurrent: player.hasAnsweredCurrent === true,
            isReady: player.isReady !== false,
            score: player.score || 0,
            currentQuestion: player.currentQuestion || 0,
            answerTime: player.answerTime || 0
          }))
        
        console.log("📡 PROCESSED PLAYERS:", playersArray.map(p => ({
          uid: p.uid,
          name: p.displayName,
          hasAnswered: p.hasAnsweredCurrent,
          score: p.score
        })))
        
        callback(playersArray)
      } else {
        console.log("📡 Room not found")
        callback([])
      }
    })

    return unsubscribe
  } catch (error) {
    console.error("Error listening to room players:", error)
    return () => {}
  }
}

// ----------------------------------------------------
// UPDATE PLAYER SCORE - PERBAIKAN: Atomic update dengan answerTime
// ----------------------------------------------------
export const updatePlayerScore = async (
  roomId: string, 
  userId: string, 
  scoreGained: number,
  answerTime?: number
) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)

    const updateData: any = {
      [`players.${userId}.score`]: increment(scoreGained),
      [`players.${userId}.answeredQuestions`]: increment(1),
      [`players.${userId}.hasAnsweredCurrent`]: true,
      [`players.${userId}.lastAnswered`]: Timestamp.now(),
      [`players.${userId}.updatedAt`]: serverTimestamp()
    }

    // Tambahkan answerTime jika ada
    if (answerTime !== undefined) {
      updateData[`players.${userId}.answerTime`] = answerTime
    }

    await updateDoc(roomDocRef, updateData)
  } catch (error) {
    console.error("Error updating player score:", error)
    throw error
  }
}

// ----------------------------------------------------
// UPDATE PLAYER CURRENT QUESTION - PERBAIKAN
// ----------------------------------------------------
export const updatePlayerCurrentQuestion = async (
  roomId: string,
  userId: string,
  currentQuestion: number,
  hasAnsweredCurrent: boolean = false
) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    
    await updateDoc(roomDocRef, {
      [`players.${userId}.currentQuestion`]: currentQuestion,
      [`players.${userId}.hasAnsweredCurrent`]: hasAnsweredCurrent,
      [`players.${userId}.updatedAt`]: serverTimestamp()
    })
  } catch (error) {
    console.error("Error updating player current question:", error)
    throw error
  }
}

// ----------------------------------------------------
// SUBMIT MULTIPLAYER ANSWER - PERBAIKAN: dengan answerTime
// ----------------------------------------------------
export const submitMultiplayerAnswer = async (
  roomId: string,
  userId: string,
  answer: {
    questionIndex: number
    answerIndex: number
    correct: boolean
    score: number
    timestamp: number
    answerTime?: number
  }
) => {
  try {
    // Gunakan kombinasi userId_questionIndex untuk unique ID
    const answerId = `${userId}_${answer.questionIndex}`
    const answerDocRef = doc(db, "multiplayer_rooms", roomId, "answers", answerId)
    
    await setDoc(answerDocRef, {
      ...answer,
      userId: userId,
      roomId: roomId,
      answerTime: answer.answerTime || 0,
      submittedAt: Timestamp.now(),
      timestamp: answer.timestamp ? Timestamp.fromMillis(answer.timestamp) : Timestamp.now()
    })
  } catch (error) {
    console.error("Error submitting multiplayer answer:", error)
    throw error
  }
}

// ----------------------------------------------------
// UPDATE PLAYER WITH TIME - FUNGSI BARU
// ----------------------------------------------------
export const updatePlayerWithTime = async (
  roomId: string,
  userId: string,
  data: {
    hasAnsweredCurrent?: boolean;
    answerTime?: number;
    score?: number;
    currentQuestion?: number;
  }
) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    
    const updateData: any = {
      [`players.${userId}.updatedAt`]: serverTimestamp()
    }
    
    if (data.hasAnsweredCurrent !== undefined) {
      updateData[`players.${userId}.hasAnsweredCurrent`] = data.hasAnsweredCurrent
    }
    
    if (data.answerTime !== undefined) {
      updateData[`players.${userId}.answerTime`] = data.answerTime
    }
    
    if (data.score !== undefined) {
      updateData[`players.${userId}.score`] = increment(data.score)
    }
    
    if (data.currentQuestion !== undefined) {
      updateData[`players.${userId}.currentQuestion`] = data.currentQuestion
    }
    
    await updateDoc(roomDocRef, updateData)
  } catch (error) {
    console.error("Error updating player with time:", error)
    throw error
  }
}

// ----------------------------------------------------
// SET ROOM SETTINGS - FUNGSI BARU
// ----------------------------------------------------
export const setRoomSettings = async (
  roomId: string,
  settings: {
    hostCanPlay?: boolean
    timePerQuestion?: number
    autoProceed?: boolean
  }
) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    
    await updateDoc(roomDocRef, {
      settings: {
        hostCanPlay: false, // Force host tidak bisa main
        timePerQuestion: settings.timePerQuestion || 30,
        autoProceed: settings.autoProceed !== false,
        updatedAt: serverTimestamp()
      }
    })
  } catch (error) {
    console.error("Error setting room settings:", error)
    throw error
  }
}

// ----------------------------------------------------
// START MULTIPLAYER GAME - PERBAIKAN: Reset player states
// ----------------------------------------------------
export const startMultiplayerGame = async (roomId: string) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    const snapshot = await getDoc(roomDocRef)
    
    if (!snapshot.exists()) {
      throw new Error("Room not found")
    }
    
    const room = snapshot.data()
    const players = room.players || {}
    
    // Reset semua player states
    const resetUpdates: any = {}
    Object.keys(players).forEach(playerId => {
      resetUpdates[`players.${playerId}.hasAnsweredCurrent`] = false
      resetUpdates[`players.${playerId}.currentQuestion`] = 0
      resetUpdates[`players.${playerId}.answerTime`] = null
    })
    
    await updateDoc(roomDocRef, {
      ...resetUpdates,
      status: "playing",
      currentQuestionIndex: 0,
      startTime: Timestamp.now(),
      lastUpdated: serverTimestamp()
    })
  } catch (error) {
    console.error("Error starting multiplayer game:", error)
    throw error
  }
}

// ----------------------------------------------------
// RESET PLAYERS FOR NEXT QUESTION - FUNGSI BARU
// ----------------------------------------------------
export const resetPlayersForNextQuestion = async (roomId: string) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    const snapshot = await getDoc(roomDocRef)
    
    if (!snapshot.exists()) {
      throw new Error("Room not found")
    }
    
    const room = snapshot.data()
    const players = room.players || {}
    
    const resetUpdates: any = {}
    Object.keys(players).forEach(playerId => {
      resetUpdates[`players.${playerId}.hasAnsweredCurrent`] = false
      resetUpdates[`players.${playerId}.answerTime`] = null
    })
    
    await updateDoc(roomDocRef, {
      ...resetUpdates,
      lastUpdated: serverTimestamp()
    })
  } catch (error) {
    console.error("Error resetting players:", error)
    throw error
  }
}

// ----------------------------------------------------
// LEAVE ROOM - FIXED: Host is reassigned, not deleted.
// ----------------------------------------------------
export const leaveMultiplayerRoom = async (roomId: string, userId: string) => {
  const roomDocRef = doc(db, "multiplayer_rooms", roomId);
  try {
    await runTransaction(db, async (transaction) => {
      const roomSnapshot = await transaction.get(roomDocRef);

      if (!roomSnapshot.exists()) {
        console.warn(`Attempted to leave a room (${roomId}) that does not exist.`);
        return;
      }

      const room = roomSnapshot.data();
      const players = room.players || {};
      const isHostLeaving = room.host.uid === userId;

      if (isHostLeaving) {
        const remainingPlayerIds = Object.keys(players);

        if (remainingPlayerIds.length > 0) {
          // Promote the first available player to be the new host.
          const newHostId = remainingPlayerIds[0];
          const newHostData = players[newHostId];

          const newHost = {
            uid: newHostData.uid,
            displayName: newHostData.displayName,
          };

          // Remove the newly promoted host from the players list.
          const { [newHostId]: _, ...remainingPlayers } = players;

          transaction.update(roomDocRef, {
            host: newHost,
            players: remainingPlayers,
            lastUpdated: serverTimestamp(),
          });
          console.log(`Host ${userId} left room ${roomId}. New host is ${newHost.uid}.`);
        } else {
          // The host is the last person in the room, so delete it.
          transaction.delete(roomDocRef);
          console.log(`Host ${userId} was the last person in the room. Deleting room ${roomId}.`);
        }
      } else {
        // A regular player is leaving.
        if (players[userId]) {
          // Just remove the player from the map.
          transaction.update(roomDocRef, {
            [`players.${userId}`]: deleteField(),
            lastUpdated: serverTimestamp(),
          });
          console.log(`Player ${userId} left room ${roomId}.`);
        }
      }
    });
  } catch (error) {
    console.error(`Error processing leave room (${roomId}) for user ${userId}:`, error);
    throw error; // Re-throw the error to be handled by the caller.
  }
};

// ----------------------------------------------------
// LISTEN TO GAME START
// ----------------------------------------------------
export const listenToGameStart = (roomId: string, callback: (room: any) => void) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    
    const unsubscribe = onSnapshot(roomDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const roomData = docSnapshot.data()
        // Filter host dari players sebelum dikirim
        const players = roomData.players || {}
        const filteredPlayers = Object.values(players)
          .filter((player: any) => player.uid !== roomData.host.uid)
        
        callback({
          ...roomData,
          players: filteredPlayers
        })
      } else {
        callback(null)
      }
    })
    
    return unsubscribe
  } catch (error) {
    console.error("Error listening to game start:", error)
    return () => {}
  }
}

// ----------------------------------------------------
// LISTEN TO ROOM STATE
// ----------------------------------------------------
export const listenToRoomState = (roomId: string, callback: (roomData: any) => void) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)

    const unsubscribe = onSnapshot(roomDocRef, (docSnapshot) => {
      if (docSnapshot.exists()) {
        const roomData = docSnapshot.data()
        callback(roomData)
      } else {
        callback(null)
      }
    })
    
    return unsubscribe
  } catch (error) {
    console.error("Error listening to room state:", error)
    return () => {}
  }
}

// ----------------------------------------------------
// FINISH MULTIPLAYER GAME - PERBAIKAN: Simpan data hasil dengan benar
// ----------------------------------------------------
// ----------------------------------------------------
// FINISH MULTIPLAYER GAME - PERBAIKAN: Simpan data host juga
// ----------------------------------------------------
export const finishMultiplayerGame = async (roomId: string) => {
    try {
        const roomDocRef = doc(db, "multiplayer_rooms", roomId)
        const snapshot = await getDoc(roomDocRef)
        
        if (!snapshot.exists()) {
            throw new Error("Room not found")
        }
        
        const roomData = snapshot.data()
        const players = roomData.players || {}
        
        // 🎯 PERBAIKAN: HOST TIDAK DITAMBAHKAN SEBAGAI PLAYER
        // Simpan hanya pemain asli (tanpa host)
        const finalResults = { 
            ...players 
            // TIDAK ADA host di sini!
        }
        
        console.log("🏁 Saving game results:", Object.keys(finalResults).length, "pemain")
        
        // Update status room menjadi 'finished'
        await updateDoc(roomDocRef, {
            status: "finished",
            finishedAt: Timestamp.now(),
            lastUpdated: serverTimestamp(),
            results: finalResults,  // Hanya pemain
            // players tetap seperti semula (tanpa host)
        })

        console.log(`✅ Game room ${roomId} finished successfully`)
        
    } catch (error) {
        console.error("Error finishing multiplayer game:", error)
        throw new Error("Gagal menyelesaikan permainan.")
    }
}

// ----------------------------------------------------
// CLEANUP ROOM
// ----------------------------------------------------
export const cleanupMultiplayerRoom = async (roomId: string) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId)
    await deleteDoc(roomDocRef)
    console.log(`Multiplayer room ${roomId} cleaned up/deleted.`)
  } catch (error) {
    console.error("Error cleaning up room:", error)
  }
}

// ----------------------------------------------------
// LISTEN TO ROOM CHANGES
// ----------------------------------------------------
export const listenToRoomChanges = (callback: (rooms: any[]) => void) => {
  try {
    const roomsColRef = collection(db, "multiplayer_rooms")
    const q = query(roomsColRef, where("status", "==", "waiting"))

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const rooms: any[] = []
      snapshot.forEach((doc) => {
        const roomData = doc.data()
        // Filter host dari players
        const playersArray = Object.values(roomData.players || {})
          .filter((player: any) => player.uid !== roomData.host.uid)
        
        rooms.push({ 
          ...roomData, 
          id: doc.id, 
          players: playersArray,
          playerCount: playersArray.length
        })
      })
      callback(rooms)
    })

    return unsubscribe
  } catch (error) {
    console.error("Error listening to room changes:", error)
    return () => {}
  }
}

// ----------------------------------------------------
// UPDATE PLAYER DISPLAY NAME - NEW FUNCTION
// ----------------------------------------------------
export const updatePlayerDisplayName = async (roomId: string, userId: string, newDisplayName: string) => {
  try {
    const roomDocRef = doc(db, "multiplayer_rooms", roomId);
    const playerDisplayNamePath = `players.${userId}.displayName`;

    await updateDoc(roomDocRef, {
      [playerDisplayNamePath]: newDisplayName
    });
  } catch (error) {
    console.error("Error updating player display name:", error);
    throw error;
  }
};