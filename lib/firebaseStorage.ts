// lib/firebaseStorage.ts
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "./firebase";

/**
 * Uploads an image file to Firebase Storage and returns the download URL.
 * @param userId - The ID of the user uploading the image.
 * @param quizId - The ID of the quiz this image is associated with.
 * @param imageFile - The image file to upload.
 * @returns The public URL of the uploaded image.
 */
export const uploadQuizImage = async (
  userId: string,
  quizId: string,
  imageFile: File
): Promise<string> => {
  if (!imageFile) {
    throw new Error("No image file provided for upload.");
  }

  // Create a storage reference
  const imageRef = ref(storage, `quiz-images/${userId}/${quizId}/${imageFile.name}`);

  try {
    // Upload the file
    const snapshot = await uploadBytes(imageRef, imageFile);
    console.log("Uploaded a blob or file!", snapshot);

    // Get the download URL
    const downloadURL = await getDownloadURL(snapshot.ref);
    console.log("File available at", downloadURL);

    return downloadURL;
  } catch (error) {
    console.error("Error uploading quiz image:", error);
    throw new Error("Failed to upload image. Please try again.");
  }
};
