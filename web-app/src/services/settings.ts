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
    ac4MonthlyGoal?: number;
}

export const DEFAULT_SETTINGS: UserSettings = {
    categories: {
        Receita: [
            { name: "Salário", icon: "briefcase", color: "#10B981" },
            { name: "AC-4", icon: "shield", color: "#3B82F6" },
            { name: "Investimentos", icon: "trending-up", color: "#8B5CF6" },
            { name: "Renda Extra", icon: "dollar-sign", color: "#F59E0B" },
            { name: "Outros", icon: "more-horizontal", color: "#64748B" }
        ],
        Despesa: [
            { name: "Aluguel", icon: "home", color: "#3B82F6" },
            { name: "Energia", icon: "zap", color: "#F59E0B" },
            { name: "Internet", icon: "wifi", color: "#06B6D4" },
            { name: "Mercado", icon: "shopping-cart", color: "#F97316" },
            { name: "Combustível", icon: "car", color: "#64748B" },
            { name: "Alimentação", icon: "utensils", color: "#EF4444" },
            { name: "Farmácia", icon: "heart", color: "#EF4444" },
            { name: "Lazer", icon: "gamepad-2", color: "#8B5CF6" },
            { name: "Transporte", icon: "map-pin", color: "#6366F1" },
            { name: "Cartão", icon: "credit-card", color: "#8B5CF6" },
            { name: "Educação", icon: "graduation-cap", color: "#6366F1" },
            { name: "Assinaturas", icon: "video", color: "#EC4899" },
            { name: "Outros", icon: "more-horizontal", color: "#64748B" }
        ]
    },
    theme: 'blue',
    darkMode: false,
    showWelcome: true,
    ac4MonthlyGoal: 48
};

const SETTINGS_COLLECTION = "user_settings";

export const subscribeSettings = (userId: string, callback: (settings: UserSettings) => void) => {
    const docRef = doc(db, SETTINGS_COLLECTION, userId);

    return onSnapshot(docRef, async (docSnap) => {
        if (docSnap.exists()) {
            const data = docSnap.data();

            // Smart Merge Categories
            const baseCategories = data.categories || DEFAULT_SETTINGS.categories;
            const mergedCategories: { Receita: CategoryItem[], Despesa: CategoryItem[] } = {
                Receita: Array.isArray(baseCategories.Receita) ? [...baseCategories.Receita] : [...DEFAULT_SETTINGS.categories.Receita],
                Despesa: Array.isArray(baseCategories.Despesa) ? [...baseCategories.Despesa] : [...DEFAULT_SETTINGS.categories.Despesa]
            };

            let wasMerged = false;
            ['Receita', 'Despesa'].forEach(type => {
                const t = type as 'Receita' | 'Despesa';
                DEFAULT_SETTINGS.categories[t].forEach(defCat => {
                    const exists = mergedCategories[t].some(
                        (c: any) => (typeof c === 'string' ? c : c.name).toLowerCase() === defCat.name.toLowerCase()
                    );
                    if (!exists) {
                        mergedCategories[t].push(defCat);
                        wasMerged = true;
                    }
                });
            });

            // Auto-Migration Check for old string format
            let needsMigration = wasMerged;
            
            ['Receita', 'Despesa'].forEach(type => {
                const t = type as 'Receita' | 'Despesa';
                if (mergedCategories[t].some(c => typeof c === 'string')) {
                    mergedCategories[t] = (mergedCategories[t] as any[]).map(c => {
                        if (typeof c === 'string') {
                            const style = guessCategoryStyle(c);
                            return { name: c, icon: style.icon, color: style.color };
                        }
                        return c;
                    });
                    needsMigration = true;
                }
            });

            const currentSettings: UserSettings = {
                ...DEFAULT_SETTINGS,
                ...data,
                categories: mergedCategories
            };

            callback(currentSettings);

            // Persist migration/merge if needed
            if (needsMigration) {
                await setDoc(docRef, { categories: mergedCategories }, { merge: true });
                console.log("Auto-merged/migrated categories to latest version");
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
