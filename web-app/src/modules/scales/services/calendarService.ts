import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../../../services/firebase';
import { v4 as uuidv4 } from 'uuid';
import type { ScaleCategory } from '../types';

interface CalendarPreferences {
    categories: ScaleCategory[];
    token: string;
    createdAt: Date;
    lastAccessedAt: Date | null;
}

/**
 * Calendar Service for generating iCal subscription URLs
 */
export const CalendarService = {
    /**
     * Get or create a calendar token for the user
     * @param userId User ID
     * @returns Calendar token
     */
    async getOrCreateToken(userId: string): Promise<string> {
        try {
            const tokenRef = doc(db, 'users', userId, 'private', 'calendar');
            const tokenDoc = await getDoc(tokenRef);

            if (tokenDoc.exists() && tokenDoc.data().token) {
                return tokenDoc.data().token;
            }

            // Create new token
            const newToken = uuidv4();
            await setDoc(tokenRef, {
                token: newToken,
                categories: ['AC-4', 'Diário', 'Suplementar', 'Troca', 'Outros'], // Default: all categories
                createdAt: new Date(),
                lastAccessedAt: null,
            });

            return newToken;
        } catch (error) {
            console.error('Error getting/creating calendar token:', error);
            throw error;
        }
    },

    /**
     * Get calendar preferences for the user
     * @param userId User ID
     * @returns Calendar preferences or null
     */
    async getCalendarPreferences(userId: string): Promise<CalendarPreferences | null> {
        try {
            const tokenRef = doc(db, 'users', userId, 'private', 'calendar');
            const tokenDoc = await getDoc(tokenRef);

            if (!tokenDoc.exists()) {
                return null;
            }

            return tokenDoc.data() as CalendarPreferences;
        } catch (error) {
            console.error('Error getting calendar preferences:', error);
            throw error;
        }
    },

    /**
     * Save calendar preferences (categories) for the user
     * @param userId User ID
     * @param categories Selected categories
     */
    async saveCalendarPreferences(userId: string, categories: ScaleCategory[]): Promise<void> {
        try {
            const tokenRef = doc(db, 'users', userId, 'private', 'calendar');
            await setDoc(tokenRef, {
                categories,
            }, { merge: true });
        } catch (error) {
            console.error('Error saving calendar preferences:', error);
            throw error;
        }
    },

    /**
     * Get the iCal subscription URL for the user
     * @param userId User ID
     * @param categories Optional categories to filter (defaults to preferences or all)
     * @returns iCal subscription URL
     */
    async getCalendarUrl(userId: string, categories?: ScaleCategory[]): Promise<string> {
        const token = await this.getOrCreateToken(userId);

        // Get Firebase project ID from environment or config
        const projectId = import.meta.env.VITE_FIREBASE_PROJECT_ID || 'controle-contas-ac4';
        const region = 'us-central1';

        // Build URL with categories as query params
        const baseUrl = `https://${region}-${projectId}.cloudfunctions.net/calendar/${userId}/${token}`;

        if (categories && categories.length > 0) {
            const categoriesParam = categories.join(',');
            return `${baseUrl}?categories=${encodeURIComponent(categoriesParam)}`;
        }

        return baseUrl;
    },

    /**
     * Get Google Calendar subscription link
     * Opens "Add by URL" dialog in Google Calendar
     * @param calendarUrl iCal URL
     * @returns Google Calendar subscription link
     */
    getGoogleCalendarLink(calendarUrl: string): string {
        const encodedUrl = encodeURIComponent(calendarUrl);
        return `https://calendar.google.com/calendar/r?cid=${encodedUrl}`;
    },

    /**
     * Regenerate token (in case of security concerns)
     * @param userId User ID
     * @returns New token
     */
    async regenerateToken(userId: string): Promise<string> {
        const newToken = uuidv4();
        const tokenRef = doc(db, 'users', userId, 'private', 'calendar');

        await setDoc(tokenRef, {
            token: newToken,
            createdAt: new Date(),
            lastAccessedAt: null,
        }, { merge: true });

        return newToken;
    },
};
