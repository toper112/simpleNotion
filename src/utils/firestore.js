import { db } from "../firebase";
import { doc, setDoc, deleteDoc } from "firebase/firestore";

const PAGES_COLLECTION = "notionPages";

export async function savePageToFirestore(page) {
  try {
    await setDoc(doc(db, PAGES_COLLECTION, page.id), page);
  } catch (err) {
    console.error("Failed to save page:", err);
  }
}

export async function deletePageFromFirestore(pageId) {
  try {
    await deleteDoc(doc(db, PAGES_COLLECTION, pageId));
  } catch (err) {
    console.error("Failed to delete page:", err);
  }
}
