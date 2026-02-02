import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface UserSettings {
    categories: {
        Receita: string[];
        Despesa: string[];
    };
    theme?: 'blue' | 'green' | 'purple';
    darkMode?: boolean;
    showWelcome?: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
    categories: {
        Receita: ["Salário", "AC-4", "Renda Extra", "Outros"],
        Despesa: ["Aluguel", "Energia", "Consórcio", "IPASGO", "Saneago", "Internet", "Cartão", "Outros"]
    },
    theme: 'blue',
    darkMode: false,
    showWelcome: true
};

const SETTINGS_COLLECTION = "user_settings";

export const subscribeSettings = (userId: string, callback: (settings: UserSettings) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);

    // Create default if not exists is handled in logic, but standard snapshot works
    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            // Merge with defaults to ensure new fields (like showWelcome) are present
            // even if missing in the database document for existing users.
            const data = docSnap.data() as Partial<UserSettings>;
            callback({
                ...DEFAULT_SETTINGS,
                ...data,
                // Ensure deep merge for categories if needed, but for now top-level merge is fine 
                // as long as we don't have partial category updates in DB usually.
            });
        } else {
            // If doesn't exist, we can return default, but also maybe init it?
            // For UI responsiveness, return default immediate
            callback(DEFAULT_SETTINGS);
        }
    });
};

export const updateSettings = async (userId: string, newSettings: Partial<UserSettings>) => {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(docRef, newSettings, { merge: true });
};
