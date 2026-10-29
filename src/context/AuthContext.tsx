import React, { createContext, useContext, useEffect, useState } from 'react';
import {
  User as FirebaseUser,
  onAuthStateChanged,
  signInWithPopup,
  GoogleAuthProvider,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as fbSignOut,
  updateProfile as fbUpdateProfile
} from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot, serverTimestamp } from 'firebase/firestore';
import { auth, db, ADMIN_EMAIL, isOwnerEmail, isAdminEmail, isSuperAdminEmail, handleFirestoreError, OperationType, cleanFirestoreData } from '../firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: FirebaseUser | null;
  userProfile: UserProfile | null;
  isSuperAdmin: boolean;
  isSubAdmin: boolean;
  isAdmin: boolean;
  isProEffective: boolean;
  isExemptFromPayments: boolean;
  isVerified: boolean;
  canTalkToAdmin: boolean;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  registerWithEmail: (email: string, pass: string, displayName: string, username?: string) => Promise<void>;
  quickSignIn: (email: string, pass: string, displayName?: string, username?: string) => Promise<void>;
  authenticateSeamlessly: (email: string, pass: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateUserProfile: (data: {
    displayName?: string;
    username?: string;
    bio?: string;
    photoURL?: string;
    proBorderEffect?: 'aura-gold' | 'neon-pulse' | 'cosmic-glow' | 'emerald-ring' | 'none';
    proAccentColor?: 'purple' | 'gold' | 'emerald' | 'neon' | 'crimson';
    proBadge?: 'verified' | 'vip' | 'creator' | 'founder';
  }) => Promise<void>;
  toggleSavePost: (postId: string) => Promise<boolean>;
  dismissWarning: () => Promise<void>;
  toggleSubAdmin: (targetUserId: string, makeSubAdmin: boolean) => Promise<void>;
  toggleVerifyUser: (targetUserId: string, verify: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [currentUser, setCurrentUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Sync profile document in Firestore
  const syncUserProfileDoc = async (user: FirebaseUser, customName?: string, customUsername?: string) => {
    const userDocRef = doc(db, 'users', user.uid);
    try {
      const snap = await getDoc(userDocRef);
      const isOwner = isOwnerEmail(user.email);
      const emailPrefix = user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : 'waver';

      if (!snap.exists()) {
        const initialProfile: UserProfile = {
          id: user.uid,
          email: user.email || '',
          username: isOwner ? '@keylan' : (customUsername || `@${emailPrefix}`),
          displayName: isOwner ? 'Keylan Mbilinyi (Platform Owner)' : (customName || user.displayName || user.email?.split('@')[0] || 'Waver'),
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
          bio: isOwner ? 'Founder & Platform Owner of WaveLink 🌊' : 'Connecting on WaveLink 🌊',
          status: 'active',
          isBanned: false,
          savedPostIds: [],
          role: isOwner ? 'super_admin' : 'user',
          isSubAdmin: false,
          hasBlueStar: isOwner,
          isVerifiedByAdmin: isOwner,
          isPro: isOwner,
          proBadge: isOwner ? 'founder' : undefined,
          proBorderEffect: isOwner ? 'aura-gold' : undefined,
          proAccentColor: isOwner ? 'gold' : undefined,
          createdAt: new Date().toISOString(),
        };
        await setDoc(userDocRef, cleanFirestoreData({
          ...initialProfile,
          serverTimestamp: serverTimestamp()
        }));
        setUserProfile(initialProfile);
      } else {
        const data = snap.data() as UserProfile;
        if (isOwner && (!data.isPro || data.role !== 'super_admin' || !data.hasBlueStar)) {
          const ownerProfile: UserProfile = {
            ...data,
            role: 'super_admin',
            hasBlueStar: true,
            isVerifiedByAdmin: true,
            isPro: true,
            proBadge: 'founder',
            proBorderEffect: 'aura-gold',
            proAccentColor: 'gold',
            displayName: data.displayName || 'Keylan Mbilinyi (Platform Owner)',
            username: data.username || '@keylan',
            savedPostIds: data.savedPostIds || []
          };
          await setDoc(userDocRef, cleanFirestoreData(ownerProfile), { merge: true });
          setUserProfile(ownerProfile);
        } else {
          setUserProfile(data);
        }
      }
    } catch (err) {
      console.error('Error synchronizing user profile:', err);
    }
  };

  useEffect(() => {
    let unsubscribeDoc: (() => void) | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        const isOwner = isOwnerEmail(user.email);
        const emailPrefix = user.email ? user.email.split('@')[0].toLowerCase().replace(/[^a-z0-9_]/g, '') : 'waver';

        setUserProfile((prev) => prev || ({
          id: user.uid,
          email: user.email || '',
          username: isOwner ? '@keylan' : `@${emailPrefix}`,
          displayName: isOwner ? 'Keylan Mbilinyi (Platform Owner)' : (user.displayName || user.email?.split('@')[0] || 'Waver'),
          photoURL: user.photoURL || `https://api.dicebear.com/7.x/shapes/svg?seed=${user.uid}`,
          bio: isOwner ? 'Founder & Platform Owner of WaveLink 🌊' : 'Connecting on WaveLink 🌊',
          status: 'active',
          isBanned: false,
          savedPostIds: [],
          role: isOwner ? 'super_admin' : 'user',
          isSubAdmin: false,
          hasBlueStar: isOwner,
          isVerifiedByAdmin: isOwner,
          isPro: isOwner,
          proBadge: isOwner ? 'founder' : undefined,
          proBorderEffect: isOwner ? 'aura-gold' : undefined,
          proAccentColor: isOwner ? 'gold' : undefined,
          createdAt: new Date().toISOString()
        }));
        setIsLoading(false);

        // Synchronize full profile in the background
        syncUserProfileDoc(user).catch((err) => {
          console.warn('Profile sync notice:', err);
        });

        // Listen for live status changes
        const userDocRef = doc(db, 'users', user.uid);
        unsubscribeDoc = onSnapshot(
          userDocRef,
          (docSnap) => {
            if (docSnap.exists()) {
              setUserProfile(docSnap.data() as UserProfile);
            }
          },
          (error) => {
            console.warn('Profile snapshot notice:', error);
          }
        );
      } else {
        if (unsubscribeDoc) unsubscribeDoc();
        setUserProfile(null);
        setIsLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDoc) unsubscribeDoc();
    };
  }, []);

  const signInWithGoogle = async () => {
    try {
      const googleProvider = new GoogleAuthProvider();
      googleProvider.setCustomParameters({ prompt: 'select_account' });
      const res = await signInWithPopup(auth, googleProvider);
      await syncUserProfileDoc(res.user);
    } catch (err: unknown) {
      console.error('Google Sign-In Error:', err);
      throw err;
    }
  };

  const signInWithEmail = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserProfileDoc(res.user);
    } catch (err: unknown) {
      console.error('Email Sign-In Error:', err);
      throw err;
    }
  };

  const registerWithEmail = async (email: string, pass: string, displayName: string, username?: string) => {
    try {
      const res = await createUserWithEmailAndPassword(auth, email, pass);
      if (displayName) {
        await fbUpdateProfile(res.user, { displayName });
      }
      await syncUserProfileDoc(res.user, displayName, username);
    } catch (err: unknown) {
      console.error('Registration Error:', err);
      throw err;
    }
  };

  // Unified seamless authentication: attempt sign-in first; if user not found, automatically register
  const authenticateSeamlessly = async (email: string, pass: string) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserProfileDoc(res.user);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || String(err);
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        msg.includes('user-not-found') ||
        msg.includes('invalid-credential')
      ) {
        try {
          const createRes = await createUserWithEmailAndPassword(auth, email, pass);
          const emailPrefix = email.split('@')[0];
          await fbUpdateProfile(createRes.user, { displayName: emailPrefix });
          await syncUserProfileDoc(createRes.user, emailPrefix, `@${emailPrefix}`);
          return;
        } catch (createErr) {
          console.error('Seamless registration error:', createErr);
          throw createErr;
        }
      }
      throw err;
    }
  };

  const quickSignIn = async (
    email: string,
    pass: string,
    displayName?: string,
    username?: string
  ) => {
    try {
      const res = await signInWithEmailAndPassword(auth, email, pass);
      await syncUserProfileDoc(res.user, displayName, username);
    } catch (err: any) {
      const code = err?.code || '';
      const msg = err?.message || String(err);
      if (
        code === 'auth/user-not-found' ||
        code === 'auth/invalid-credential' ||
        msg.includes('user-not-found') ||
        msg.includes('invalid-credential')
      ) {
        try {
          const createRes = await createUserWithEmailAndPassword(auth, email, pass);
          if (displayName) {
            await fbUpdateProfile(createRes.user, { displayName });
          }
          await syncUserProfileDoc(createRes.user, displayName, username);
          return;
        } catch (createErr) {
          console.error('Quick account creation error:', createErr);
          throw createErr;
        }
      }
      throw err;
    }
  };

  const signOut = async () => {
    try {
      await fbSignOut(auth);
      setUserProfile(null);
    } catch (err) {
      console.error('Sign Out Error:', err);
    }
  };

  const updateUserProfile = async (data: {
    displayName?: string;
    username?: string;
    bio?: string;
    photoURL?: string;
    proBorderEffect?: 'aura-gold' | 'neon-pulse' | 'cosmic-glow' | 'emerald-ring' | 'none';
    proAccentColor?: 'purple' | 'gold' | 'emerald' | 'neon' | 'crimson';
    proBadge?: 'verified' | 'vip' | 'creator' | 'founder';
  }) => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);

      // Clean username formatting
      let formattedUsername = data.username?.trim();
      if (formattedUsername && !formattedUsername.startsWith('@')) {
        formattedUsername = `@${formattedUsername}`;
      }

      const updatePayload: Record<string, any> = {
        updatedAt: new Date().toISOString()
      };
      if (data.displayName !== undefined) updatePayload.displayName = data.displayName;
      if (formattedUsername !== undefined) updatePayload.username = formattedUsername;
      if (data.bio !== undefined) updatePayload.bio = data.bio;
      if (data.photoURL !== undefined) updatePayload.photoURL = data.photoURL;
      if (data.proBorderEffect !== undefined) updatePayload.proBorderEffect = data.proBorderEffect;
      if (data.proAccentColor !== undefined) updatePayload.proAccentColor = data.proAccentColor;
      if (data.proBadge !== undefined) updatePayload.proBadge = data.proBadge;

      const sanitized = cleanFirestoreData(updatePayload);
      await setDoc(userRef, sanitized, { merge: true });

      if (data.displayName || data.photoURL) {
        await fbUpdateProfile(currentUser, {
          displayName: data.displayName || currentUser.displayName,
          photoURL: data.photoURL || currentUser.photoURL,
        });
      }

      setUserProfile((prev) => (prev ? { ...prev, ...sanitized } : null));
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${currentUser.uid}`);
    }
  };


  const toggleSavePost = async (postId: string): Promise<boolean> => {
    if (!currentUser || !userProfile) return false;
    const currentSaves = userProfile.savedPostIds || [];
    const isSaved = currentSaves.includes(postId);
    const updatedSaves = isSaved
      ? currentSaves.filter((id) => id !== postId)
      : [...currentSaves, postId];

    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(userRef, { savedPostIds: updatedSaves, updatedAt: new Date().toISOString() }, { merge: true });
      setUserProfile((prev) => (prev ? { ...prev, savedPostIds: updatedSaves } : null));

      // Update post savesCount
      const postRef = doc(db, 'posts', postId);
      const postSnap = await getDoc(postRef);
      if (postSnap.exists()) {
        const postData = postSnap.data();
        const currentCount = postData.savesCount || 0;
        await setDoc(postRef, { savesCount: Math.max(0, isSaved ? currentCount - 1 : currentCount + 1) }, { merge: true });
      }

      return !isSaved;
    } catch (err) {
      console.error('Error toggling save post:', err);
      return isSaved;
    }
  };

  const dismissWarning = async () => {
    if (!currentUser) return;
    try {
      const userRef = doc(db, 'users', currentUser.uid);
      await setDoc(
        userRef,
        {
          status: 'active',
          warningMessage: '',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      console.error('Failed to dismiss warning:', err);
    }
  };

  const isSuperAdmin = isSuperAdminEmail(currentUser?.email);
  const isSubAdmin = !isSuperAdmin && Boolean(userProfile?.isSubAdmin || userProfile?.role === 'sub_admin');
  const isAdmin = isSuperAdmin || isSubAdmin;

  // Verification status: verified by admin, has blue star, or verified badge
  const isVerified = Boolean(userProfile?.hasBlueStar || userProfile?.isVerifiedByAdmin || userProfile?.proBadge === 'verified');

  // Rule: All premium features do not apply to admins and those verified by admin or who unlocked pro (they get everything free)
  const isProEffective = isSuperAdmin || isSubAdmin || isVerified || Boolean(userProfile?.isPro);
  const isExemptFromPayments = isProEffective;

  // Only admins or verified people with the blue star can talk to the admin
  const canTalkToAdmin = isSuperAdmin || isSubAdmin || isVerified || Boolean(userProfile?.isPro);

  // Admin capability to appoint/demote sub-admins
  const toggleSubAdmin = async (targetUserId: string, makeSubAdmin: boolean) => {
    if (!isSuperAdmin) {
      console.warn('Permission denied: Only Platform Owner (keylanmbilinyi5@gmail.com) can manage administrators.');
      return;
    }
    try {
      const targetUserRef = doc(db, 'users', targetUserId);
      await setDoc(
        targetUserRef,
        {
          isSubAdmin: makeSubAdmin,
          role: makeSubAdmin ? 'sub_admin' : 'user',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
    }
  };

  // Admin capability to verify member & grant complimentary Pro status
  const toggleVerifyUser = async (targetUserId: string, verify: boolean) => {
    if (!isAdmin) {
      console.warn('Permission denied: Only administrators can verify members.');
      return;
    }
    try {
      const targetUserRef = doc(db, 'users', targetUserId);
      await setDoc(
        targetUserRef,
        {
          hasBlueStar: verify,
          isVerifiedByAdmin: verify,
          isPro: verify,
          proBadge: verify ? 'verified' : 'none',
          proBorderEffect: verify ? 'aura-gold' : 'none',
          updatedAt: new Date().toISOString()
        },
        { merge: true }
      );
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `users/${targetUserId}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        isSuperAdmin,
        isSubAdmin,
        isAdmin,
        isProEffective,
        isExemptFromPayments,
        isVerified,
        canTalkToAdmin,
        isLoading,
        signInWithGoogle,
        signInWithEmail,
        registerWithEmail,
        quickSignIn,
        authenticateSeamlessly,
        signOut,
        updateUserProfile,
        toggleSavePost,
        dismissWarning,
        toggleSubAdmin,
        toggleVerifyUser
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
