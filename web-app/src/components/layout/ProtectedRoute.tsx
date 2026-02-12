import React from 'react';
import { Navigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../../services/firebase';
import { useAuth } from '../../contexts/AuthContext';

export const ProtectedRoute: React.FC<{ children: React.ReactNode, requireAdmin?: boolean }> = ({ children, requireAdmin = false }) => {
    const { currentUser, userProfile, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen bg-slate-50 dark:bg-slate-900 transition-colors">
                <div className="w-12 h-12 border-4 border-primary-200 dark:border-primary-800 rounded-full animate-spin border-t-primary-600 dark:border-t-primary-400"></div>
            </div>
        );
    }

    if (!currentUser) {
        return <Navigate to="/login" />;
    }

    // 🚫 Check if user deleted (no profile in Firestore)
    if (!userProfile) {
        signOut(auth);
        return <Navigate to="/login" />;
    }

    // 🚫 ANTI-ABUSE: Bloquear usuários com trial expirado
    if (userProfile?.status === 'expired') {
        return <Navigate to="/expired" />;
    }

    // Pending Check
    if (userProfile?.status === 'pending' || userProfile?.status === 'blocked') {
        return <Navigate to="/pending" />;
    }

    // Admin Role Check
    if (requireAdmin && userProfile?.role !== 'admin') {
        return <Navigate to="/" />; // Redirect non-admins back to dashboard
    }

    return <>{children}</>;
};
