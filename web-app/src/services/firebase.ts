import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getAnalytics, logEvent, isSupported } from "firebase/analytics";
import { getMessaging, isSupported as isMessagingSupported } from "firebase/messaging";

const firebaseConfig = {
    apiKey: "AIzaSyCxUSEG5Z2qPkhLsjbcVcVDqRwM4vV-uso",
    authDomain: "controle-contas-ac4.firebaseapp.com",
    projectId: "controle-contas-ac4",
    storageBucket: "controle-contas-ac4.firebasestorage.app",
    messagingSenderId: "75975533820",
    appId: "1:75975533820:web:85873e32ff94fa622f2379",
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
