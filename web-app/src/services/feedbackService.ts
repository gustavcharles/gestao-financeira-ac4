import { db } from './firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

export interface AppFeedback {
    rating: number;
    comment: string;
    userId: string;
    userEmail: string;
    createdAt?: any;
    platform: string;
}

export const saveFeedback = async (feedback: Omit<AppFeedback, 'createdAt'>) => {
    try {
        const feedbackRef = collection(db, 'app_feedback');
        await addDoc(feedbackRef, {
            ...feedback,
            createdAt: serverTimestamp()
        });
        return { success: true };
    } catch (error) {
        console.error('Error saving feedback:', error);
        throw error;
    }
};
