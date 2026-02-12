import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";
import { guessCategoryStyle } from "../utils/categoryIcons";

export interface CategoryItem {
    name: string;
    icon: string;
    color: string;
}

export interface UserSettings {
    categories: {
        Receita: CategoryItem[];
        Despesa: CategoryItem[];
    };
    theme?: 'blue' | 'green' | 'purple';
    darkMode?: boolean;
    showWelcome?: boolean;
}

export const DEFAULT_SETTINGS: UserSettings = {
    categories: {
        Receita: [
            { name: "Salário", icon: "briefcase", color: "#10B981" },
            { name: "AC-4", icon: "shield", color: "#3B82F6" },
            { name: "Renda Extra", icon: "trending-up", color: "#F59E0B" },
            { name: "Outros", icon: "more-horizontal", color: "#64748B" }
        ],
        Despesa: [
            { name: "Aluguel", icon: "home", color: "#3B82F6" },
            { name: "Energia", icon: "zap", color: "#F59E0B" },
            { name: "Consórcio", icon: "car", color: "#64748B" },
            { name: "IPASGO", icon: "heart", color: "#EF4444" },
            { name: "Saneago", icon: "droplet", color: "#06B6D4" },
            { name: "Internet", icon: "wifi", color: "#06B6D4" },
            { name: "Cartão", icon: "credit-card", color: "#8B5CF6" },
            { name: "Outros", icon: "more-horizontal", color: "#64748B" }
        ]
    },
    theme: 'blue',
    darkMode: false,
    showWelcome: true
};

const SETTINGS_COLLECTION = "user_settings";

export const subscribeSettings = (userId: string, callback: (settings: UserSettings) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);

    return onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Auto-Migration Check
            let needsMigration = false;
            const migratedCategories: any = { ...data.categories };

            // Check if categories are strings (old format) and convert
            if (migratedCategories && (
                (migratedCategories.Receita && typeof migratedCategories.Receita[0] === 'string') ||
                (migratedCategories.Despesa && typeof migratedCategories.Despesa[0] === 'string')
            )) {

                ['Receita', 'Despesa'].forEach(type => {
                    if (Array.isArray(migratedCategories[type]) && typeof migratedCategories[type][0] === 'string') {
                        migratedCategories[type] = (migratedCategories[type] as string[]).map(catName => {
                            const style = guessCategoryStyle(catName);
                            return {
                                name: catName,
                                icon: style.icon,
                                color: style.color
                            };
                        });
                    }
                });

                needsMigration = true;
            }

            const currentSettings: UserSettings = {
                ...DEFAULT_SETTINGS,
                ...data,
                categories: needsMigration ? migratedCategories : (data.categories || DEFAULT_SETTINGS.categories)
            };

            callback(currentSettings);

            // Persist migration if needed
            if (needsMigration) {
                await setDoc(docRef, { categories: migratedCategories }, { merge: true });
                console.log("Auto-migrated categories to new format");
            }

        } else {
            callback(DEFAULT_SETTINGS);
        }
    });
};

export const updateSettings = async (userId: string, newSettings: Partial<UserSettings>) => {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);
    await setDoc(docRef, newSettings, { merge: true });
};
