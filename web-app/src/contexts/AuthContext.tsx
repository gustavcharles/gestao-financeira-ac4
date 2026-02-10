import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { doc, onSnapshot } from 'firebase/firestore';
import { auth, db, logUserEvent } from '../services/firebase';

export interface UserProfile {
    role: 'admin' | 'user';
    status: 'trial' | 'active' | 'expired' | 'blocked' | 'pending';
    email: string;

    // Trial and Subscription fields
    plan: 'trial' | 'annual' | null;
    trialEndsAt: any; // Timestamp
    subscriptionEndsAt: any | null; // Timestamp
    paymentId: string | null; // ID do Asaas
    lastSyncAt: any | null; // Timestamp
    notificationsSent?: {
        trial7d?: any; // Timestamp
        trial3d?: any; // Timestamp
        trial0d?: any; // Timestamp
    };
    createdAt?: any; // Timestamp
}

interface AuthContextType {
    currentUser: User | null;
    userProfile: UserProfile | null;
    loading: boolean;
}

const AuthContext = createContext<AuthContextType>({ currentUser: null, userProfile: null, loading: true });

export const useAuth = () => useContext(AuthContext);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [currentUser, setCurrentUser] = useState<User | null>(null);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (user) => {
            setCurrentUser(user);

            if (user) {
                logUserEvent('login', { method: 'email' });
                // Subscribe to profile changes (real-time approval update)
                const unsubProfile = onSnapshot(doc(db, 'users', user.uid), (doc) => {
                    if (doc.exists()) {
                        setUserProfile(doc.data() as UserProfile);
                    } else {
                        // Fallback if no profile exists yet (should exist from Login)
                        setUserProfile(null);
                    }
                    setLoading(false);
                });
                return () => unsubProfile();
            } else {
                setUserProfile(null);
                setLoading(false);
            }
        });

        return unsubscribe;
    }, []);

    const value = {
        currentUser,
        userProfile,
        loading
    };

    return (
        <AuthContext.Provider value={value}>
            {loading ? (
                <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900">
                    <div className="flex flex-col items-center gap-4">
                        <div className="w-12 h-12 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
                        <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando aplicação...</p>
                    </div>
                </div>
            ) : (
                children
            )}
        </AuthContext.Provider>
    );
};
