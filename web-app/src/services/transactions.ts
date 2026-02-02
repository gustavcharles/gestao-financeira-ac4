import {
    collection,
    query,
    where,
    onSnapshot,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase";
import type { Transaction } from "../utils/finance";

const COLLECTION_NAME = "transacoes";

export const subscribeTransactions = (
    userId: string,
    callback: (data: Transaction[]) => void
) => {
    const q = query(
        collection(db, COLLECTION_NAME),
        where("user_id", "==", userId)
    );

    const unsubscribe = onSnapshot(q,
        (querySnapshot) => {
            const transactions: Transaction[] = [];
            querySnapshot.forEach((doc) => {
                const data = doc.data();

                // Handle legacy data where 'data' might be a Timestamp
                let dateStr = data.data;
                if (data.data && typeof data.data.toDate === 'function') {
                    dateStr = data.data.toDate().toISOString().split('T')[0];
                }

                transactions.push({
                    ...data,
                    id: doc.id, // Ensure Firestore ID wins
                    data: dateStr
                } as Transaction);
            });
            callback(transactions);
        },
        (error) => {
            console.error("Error fetching transactions:", error);
            // Return empty list on error to stop loading state
            callback([]);
        }
    );

    return unsubscribe;
};

export const addTransaction = async (transaction: Omit<Transaction, 'id'>) => {
    try {
        const docRef = await addDoc(collection(db, COLLECTION_NAME), {
            ...transaction,
            created_at: Timestamp.now()
        });
        return docRef.id;
    } catch (error) {
        console.error("Error adding transaction: ", error);
        throw error;
    }
};

export const updateTransaction = async (id: string, data: Partial<Transaction>) => {
    try {
        const docRef = doc(db, COLLECTION_NAME, id);
        await updateDoc(docRef, data);
    } catch (error) {
        console.error("Error updating transaction: ", error);
        throw error;
    }
};

export const deleteTransaction = async (id: string) => {
    try {
        await deleteDoc(doc(db, COLLECTION_NAME, id));
    } catch (error) {
        console.error("Error deleting transaction: ", error);
        throw error;
    }
};
