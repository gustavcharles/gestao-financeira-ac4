import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";

// TODO: Replace with your actual Firebase project configuration
// You can find this in the Firebase Console -> Project Settings -> General
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: "G-XXXXXXXXXX" // Optional: Add your measurement ID if available
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Messaging — only available in browser contexts that support it
export let messaging: ReturnType<typeof getMessaging> | null = null;
isMessagingSupported().then((supported) => {
    if (supported) {
        messaging = getMessaging(app);
    }
});

let analytics: any = null;

// Initialize Analytics conditionally (it might not differ in dev/prod but good practice)
isSupported().then((supported) => {
    if (supported) {
        analytics = getAnalytics(app);
    }
});

export const logUserEvent = (eventName: string, eventParams?: { [key: string]: any }) => {
    if (analytics) {
        logEvent(analytics, eventName, eventParams);
    } else {
        console.log(`[Analytics Dev] Event: ${eventName}`, eventParams);
    }
};
