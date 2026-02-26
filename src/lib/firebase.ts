import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  signInWithCustomToken,
  type Auth,
  type User,
} from "firebase/auth";
import { ENV } from "./env";

const firebaseConfig = {
  apiKey: ENV.FIREBASE_API_KEY,
  authDomain: ENV.FIREBASE_AUTH_DOMAIN,
  projectId: ENV.FIREBASE_PROJECT_ID,
};

function getApp(): FirebaseApp {
  const apps = getApps();
  if (apps.length) return apps[0] as FirebaseApp;
  return initializeApp(firebaseConfig);
}

export function getFirebaseAuth(): Auth {
  return getAuth(getApp());
}

export async function signInWithToken(customToken: string): Promise<User> {
  const auth = getFirebaseAuth();
  const { user } = await signInWithCustomToken(auth, customToken);
  return user;
}

export async function getIdToken(): Promise<string | null> {
  const auth = getFirebaseAuth();
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}
