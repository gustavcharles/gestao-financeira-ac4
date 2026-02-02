import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeTransactions, addTransaction } from '../services/transactions';
import { checkRecurringBills } from '../utils/finance';
import type { Transaction } from '../utils/finance';

export const useTransactions = () => {
    const { currentUser } = useAuth();
    const [transactions, setTransactions] = useState<Transaction[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) return;

        const unsubscribe = subscribeTransactions(currentUser.uid, (data) => {
            setTransactions(data);
            setLoading(false);

            // Check recurrences once loaded
            // Ideally run this only once per session or less frequent, 
            // but for now checking on data load is acceptable if efficient.
            // We need to prevent infinite loop if addTransaction triggers update.
            // NOTE: checkRecurringBills returns valid NEW transactions only.
        });

        return () => unsubscribe();
    }, [currentUser]);

    // Separate effect for recurrence to avoid loop issues
    useEffect(() => {
        if (!loading && transactions.length > 0) {
            const newBills = checkRecurringBills(transactions);
            if (newBills.length > 0) {
                newBills.forEach(bill => {
                    addTransaction(bill);
                });
            }
        }
    }, [loading, transactions.length]); // Dependency check: simple length might not be enough but good enough here

    return { transactions, loading };
};
