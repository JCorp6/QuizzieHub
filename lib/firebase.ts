// src/lib/firebase.ts

import { initializeApp, getApp } from "firebase/app"
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, type User } from "firebase/auth"
import { getFirestore } from "firebase/firestore"
import { getStorage } from "firebase/storage"

// Your Firebase config - ADD YOUR CONFIG HERE
const firebaseConfig = {
	apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyBXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX",
	authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "your-app.firebaseapp.com",
	projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "your-project-id",
	// databaseURL removed/ignored as we are not using Realtime DB
	storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "your-app.appspot.com",
	messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "123456789",
	appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:123456789:web:xxxxxxxxxxxxxxxx",
}

let app = null
try {
	app = getApp()
} catch (error) {
	app = initializeApp(firebaseConfig)
}

export const auth = getAuth(app)
export const db = getFirestore(app)
export const storage = getStorage(app)

const googleProvider = new GoogleAuthProvider()

export const signInWithGoogle = async (): Promise<User | null> => {
	try {
		const result = await signInWithPopup(auth, googleProvider)
		return result.user
	} catch (error) {
		console.error("Error signing in with Google:", error)
		throw error
	}
}

export const signOutUser = async (): Promise<void> => {
	try {
		await signOut(auth)
	} catch (error) {
		console.error("Error signing out:", error)
		throw error
	}
}

export const getCurrentUser = (): Promise<User | null> => {
	return new Promise((resolve) => {
		const unsubscribe = onAuthStateChanged(auth, (user) => {
			unsubscribe()
			resolve(user)
		})
	})
}