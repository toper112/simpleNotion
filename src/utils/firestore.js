import { db } from "../firebase";
import {
  doc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  collection,
  addDoc,
} from "firebase/firestore";

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

export async function createUserProfile(user) {
  try {
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      name: user.name,
      email: user.email,
      role: user.role || "user",
      status: "active",
      createdAt: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to create user profile:", err);
  }
}

export async function updateUserRole(uid, role, actingUserId) {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        role,
      },
      { merge: true }
    );
    await logAuditEvent({
      userId: actingUserId,
      action: "Role change",
      resource: `users/${uid}`,
    });
  } catch (err) {
    console.error("Failed to update user role:", err);
    throw err;
  }
}

export async function updateUserStatus(uid, status, actingUserId) {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        status,
      },
      { merge: true }
    );
    await logAuditEvent({
      userId: actingUserId,
      action: "Status change",
      resource: `users/${uid}`,
    });
  } catch (err) {
    console.error("Failed to update user status:", err);
    throw err;
  }
}

export async function logAuditEvent({ userId, action, resource }) {
  try {
    await addDoc(collection(db, "logs"), {
      userId,
      action,
      resource,
      timestamp: serverTimestamp(),
    });
  } catch (err) {
    console.error("Failed to log audit event:", err);
  }
}
