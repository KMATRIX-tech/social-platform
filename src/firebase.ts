import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { initializeFirestore, doc, getDocFromServer } from 'firebase/firestore';
export const firebaseConfig = {
  apiKey: "AIzaSyALKX8B-W86GCjdKYu7hZ_kpoBFL_eCJqI",
  authDomain: "formal-photon-n48x0.firebaseapp.com",
  projectId: "formal-photon-n48x0",
  storageBucket: "formal-photon-n48x0.firebasestorage.app",
  messagingSenderId: "330199068484",
  appId: "1:330199068484:web:5376c71f8157d471e8f111"
};

const app = initializeApp(firebaseConfig);

// Initialize Firestore with experimentalForceLongPolling to avoid 10s WebChannel timeout behind Cloud Run proxies & iframes
export const db = initializeFirestore(
  app,
  {
    experimentalForceLongPolling: true,
  },
  'ai-studio-remixremixwaveli-0bcdbee7-e3d1-46ba-ab1a-3448613d34ac'
);

export const auth = getAuth(app);

export const ADMIN_EMAIL = 'keylanmbilinyi5@gmail.com';
export const ADMIN_EMAIL_ALT = 'keylanmbilinyi5@gnail.com';

export function isOwnerEmail(email?: string | null): boolean {
  if (!email) return false;
  const normalized = email.trim().toLowerCase();
  return normalized === ADMIN_EMAIL.toLowerCase() || normalized === ADMIN_EMAIL_ALT.toLowerCase();
}

export function isSuperAdminEmail(email?: string | null): boolean {
  return isOwnerEmail(email);
}

export function isAdminEmail(email?: string | null): boolean {
  return isOwnerEmail(email);
}

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.error('Firestore Error:', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Utility to strip any undefined fields before writing to Firestore
export function cleanFirestoreData<T extends Record<string, any>>(obj: T): Partial<T> {
  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (value !== undefined) {
      result[key] = value;
    }
  }
  return result as Partial<T>;
}

// Test connection on boot per Firebase guidelines
export async function testConnection(): Promise<boolean> {
  try {
    const timeoutPromise = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('connection timeout')), 4000)
    );
    await Promise.race([
      getDocFromServer(doc(db, 'test', 'connection')),
      timeoutPromise
    ]);
    return true;
  } catch (error) {
    if (error instanceof Error && (error.message.includes('offline') || error.message.includes('timeout'))) {
      console.warn('Firebase client connection initialized (offline-ready).');
    }
    return false;
  }
}
