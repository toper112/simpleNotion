import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { auth, db } from "./firebase";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  sendEmailVerification,
  onAuthStateChanged,
  setPersistence,
  browserLocalPersistence,
  updateProfile,
} from "firebase/auth";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import {
  createUserProfile,
  logAuditEvent,
  updateUserRole as updateUserRoleInFirestore,
  updateUserStatus as updateUserStatusInFirestore,
} from "./utils/firestore";

const AuthContext = createContext(null);

export function useAuth() {
  return useContext(AuthContext);
}

const ADMIN_EMAIL = "christopersab@gmail.com";
const ADMIN_PASSWORD = "chris-dev1126";
const ADMIN_NAME = "Admin User";

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    setPersistence(auth, browserLocalPersistence).catch((err) => {
      console.error("Failed to set Firebase auth persistence:", err);
    });
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (!authUser) {
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      const userRef = doc(db, "users", authUser.uid);
      const userSnapshot = await getDoc(userRef);
      let userDoc = null;

      if (!userSnapshot.exists()) {
        const role = authUser.email?.toLowerCase() === ADMIN_EMAIL ? "admin" : "user";
        userDoc = {
          uid: authUser.uid,
          name: authUser.displayName || "",
          email: authUser.email || "",
          role,
          status: "active",
          createdAt: serverTimestamp(),
        };
        await setDoc(userRef, userDoc);
      } else {
        userDoc = userSnapshot.data();
        if (authUser.email?.toLowerCase() === ADMIN_EMAIL && userDoc.role !== "admin") {
          userDoc.role = "admin";
          await setDoc(userRef, { role: "admin" }, { merge: true });
        }
      }

      if (userDoc.status === "disabled") {
        await firebaseSignOut(auth);
        setUser(null);
        setProfile(null);
        setLoading(false);
        return;
      }

      setUser(authUser);
      setProfile(userDoc);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const login = async ({ email, password }) => {
    setError(null);

    let credential;
    try {
      credential = await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      if (err.code === "auth/user-not-found" && email.toLowerCase() === ADMIN_EMAIL) {
        credential = await createUserWithEmailAndPassword(auth, email, password);
        const appUser = credential.user;
        await updateProfile(appUser, { displayName: ADMIN_NAME });
        await createUserProfile({ uid: appUser.uid, name: ADMIN_NAME, email, role: "admin" });
        await sendEmailVerification(appUser);
        await logAuditEvent({ userId: appUser.uid, action: "Register", resource: `users/${appUser.uid}` });
      } else {
        throw err;
      }
    }

    const appUser = credential.user;
    const userRef = doc(db, "users", appUser.uid);
    const userSnapshot = await getDoc(userRef);

    if (!userSnapshot.exists()) {
      throw new Error("Your account profile could not be found. Contact an administrator.");
    }

    const userDoc = userSnapshot.data();
    if (userDoc.status === "disabled") {
      await firebaseSignOut(auth);
      throw new Error("This account has been disabled.");
    }

    if (appUser.email?.toLowerCase() === ADMIN_EMAIL && userDoc.role !== "admin") {
      await updateUserRoleInFirestore(appUser.uid, "admin", appUser.uid);
    }

    await logAuditEvent({
      userId: appUser.uid,
      action: "Login",
      resource: `auth`,
    });

    return appUser;
  };

  const register = async ({ name, email, password }) => {
    setError(null);
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    const appUser = credential.user;

    if (appUser) {
      await updateProfile(appUser, { displayName: name });
      await createUserProfile({ uid: appUser.uid, name, email });
      await sendEmailVerification(appUser);
      await logAuditEvent({
        userId: appUser.uid,
        action: "Register",
        resource: `users/${appUser.uid}`,
      });
    }

    return appUser;
  };

  const logout = async () => {
    try {
      if (auth.currentUser) {
        await logAuditEvent({
          userId: auth.currentUser.uid,
          action: "Logout",
          resource: `auth`,
        });
      }
    } finally {
      await firebaseSignOut(auth);
    }
  };

  const forgotPassword = async (email) => {
    setError(null);
    await sendPasswordResetEmail(auth, email);
  };

  const resendVerificationEmail = async () => {
    if (!auth.currentUser) {
      throw new Error("No authenticated user available.");
    }

    await sendEmailVerification(auth.currentUser);
  };

  const updateUserRole = async (uid, role) => {
    if (!user || profile?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await updateUserRoleInFirestore(uid, role, user.uid);
  };

  const disableUser = async (uid, status) => {
    if (!user || profile?.role !== "admin") {
      throw new Error("Unauthorized");
    }

    await updateUserStatusInFirestore(uid, status, user.uid);
  };

  const value = useMemo(
    () => ({
      user,
      profile,
      loading,
      error,
      login,
      register,
      logout,
      forgotPassword,
      resendVerificationEmail,
      updateUserRole,
      disableUser,
      isAdmin: profile?.role === "admin",
      isVerified: user?.emailVerified,
    }),
    [user, profile, loading, error]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
