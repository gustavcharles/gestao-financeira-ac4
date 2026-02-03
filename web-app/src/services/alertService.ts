import { collection, query, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export interface DueBill {
    id: string;
    description: string;
    amount: number;
    dueDate: string; // YYYY-MM-DD
    type: 'Receita' | 'Despesa';
}

/**
 * Checks for bills that are pending and due today or in the past (late).
 * @param userId The ID of the current user
 * @returns Array of due bills
 */
export const checkDueBills = async (userId: string): Promise<DueBill[]> => {
    try {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const todayStr = today.toISOString().split('T')[0];

        const q = query(
            collection(db, 'transactions'),
            where('userId', '==', userId),
            where('type', '==', 'Despesa'),
            where('status', '==', 'pending'),
            where('dueDate', '<=', todayStr) // Assuming dueDate is stored as YYYY-MM-DD string
        );

        const querySnapshot = await getDocs(q);
        const bills: DueBill[] = [];

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            bills.push({
                id: doc.id,
                description: data.description,
                amount: data.amount,
                dueDate: data.date || data.dueDate, // Handling potential field name variance
                type: data.type
            });
        });

        return bills;
    } catch (error) {
        console.error("Error checking due bills:", error);
        return [];
    }
};

/**
 * Requests permission for browser notifications.
 */
export const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
        console.log('This browser does not support desktop notification');
        return;
    }

    if (Notification.permission === 'granted') {
        return true;
    }

    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
    }

    return false;
};

/**
 * Sends a system notification.
 * @param title Notification title
 * @param body Notification body
 */
export const sendSystemNotification = (title: string, body: string) => {
    if (Notification.permission === 'granted') {
        // Vibrate property might be missing in some TS definitions
        const options: any = {
            body,
            icon: '/logo.png',
            vibrate: [200, 100, 200]
        };
        new Notification(title, options);
    }
};
