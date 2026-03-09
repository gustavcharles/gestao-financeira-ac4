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
const FUNCTIONS_BASE = "https://us-central1-controle-contas-ac4.cloudfunctions.net";

export const createWhatsAppInstance = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappCreateInstance?adminKey=${ADMIN_KEY}`, {
            method: 'POST'
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao criar instância");
        return data;
    } catch (error: any) {
        throw new Error(error.message);
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
        throw new Error(error.message);
    }
};

export const getWhatsAppQRCode = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappGetQRCode?adminKey=${ADMIN_KEY}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao buscar QR Code");
        return data.data; // Retorna o base64
    } catch (error: any) {
        throw new Error(error.message);
    }
};

export const checkWhatsAppStatus = async () => {
    try {
        const response = await fetch(`${FUNCTIONS_BASE}/whatsappGetStatus?adminKey=${ADMIN_KEY}`);
        const data = await response.json();
        if (!response.ok) throw new Error(data.error?.message || data.error || "Erro ao buscar status");
        return data.data?.instance?.state || "disconnected";
    } catch (error: any) {
        throw new Error(error.message);
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
        throw new Error(error.message);
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
        throw new Error(error.message);
    }
};
