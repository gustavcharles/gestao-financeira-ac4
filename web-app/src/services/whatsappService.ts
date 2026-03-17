import { doc, setDoc, onSnapshot } from "firebase/firestore";
import { db } from "./firebase";

export interface WhatsAppConfig {
    baseUrl: string;
    apiKey: string;
    instanceName: string;
    enabled: boolean;
    status: 'disconnected' | 'created' | 'open' | 'connecting' | 'qrcode' | string;
}

const DEFAULT_CONFIG: WhatsAppConfig = {
    baseUrl: "",
    apiKey: "",
    instanceName: "gestao-ac4",
    enabled: false,
    status: "disconnected"
};

const DOC_ID = "whatsapp";
const COLLECTION = "app_config";

export const subscribeWhatsAppConfig = (callback: (config: WhatsAppConfig) => void) => {
    const docRef = doc(db, COLLECTION, DOC_ID);

    return onSnapshot(docRef, (docSnap) => {
        if (docSnap.exists()) {
            callback({ ...DEFAULT_CONFIG, ...docSnap.data() } as WhatsAppConfig);
        } else {
            callback(DEFAULT_CONFIG);
        }
    });
};

export const saveWhatsAppConfig = async (config: Partial<WhatsAppConfig>) => {
    const docRef = doc(db, COLLECTION, DOC_ID);
    await setDoc(docRef, config, { merge: true });
};

// Funções para chamar as Cloud Functions
const ADMIN_KEY = "ac4migrate2026"; // Chave de proteção provisória definida no back-end
const PROJECT_ID = import.meta.env.VITE_FIREBASE_PROJECT_ID || "controle-contas-ac4";
const FUNCTIONS_BASE = `https://us-central1-${PROJECT_ID}.cloudfunctions.net`;

export const createWhatsAppInstance = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappCreateInstance?adminKey=${ADMIN_KEY}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao criar instância");
        return data;
    } catch (error: any) {
        console.error("error in createWhatsAppInstance:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const deleteWhatsAppInstance = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappDeleteInstance?adminKey=${ADMIN_KEY}`, {
            method: 'DELETE'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao deletar instância");
        return data;
    } catch (error: any) {
        console.error("error in deleteWhatsAppInstance:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const getWhatsAppQRCode = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappGetQRCode?adminKey=${ADMIN_KEY}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao buscar QR Code");
        return data.data; // Retorna o base64
    } catch (error: any) {
        console.error("error in getWhatsAppQRCode:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const checkWhatsAppStatus = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappGetStatus?adminKey=${ADMIN_KEY}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao buscar status");
        return data.data?.instance?.state || "disconnected";
    } catch (error: any) {
        console.error("error in checkWhatsAppStatus:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const sendWhatsAppTest = async (phone: string, message: string) => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappSendTest?adminKey=${ADMIN_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, message })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro ao enviar teste (Status: " + response.status + ")");
        if (data.success === false) {
            throw new Error(data.error || data.message || "Erro desconhecido ao enviar via Evolution API");
        }
        return data.success;
    } catch (error: any) {
        console.error("error in sendWhatsAppTest:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};

export const sendWhatsAppBroadcast = async (message: string) => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappBroadcast?adminKey=${ADMIN_KEY}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ message })
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Erro no broadcast");
        return data;
    } catch (error: any) {
        console.error("error in whatsappBroadcast:", error);
        throw new Error(error instanceof Error ? error.message : String(error));
    }
};
