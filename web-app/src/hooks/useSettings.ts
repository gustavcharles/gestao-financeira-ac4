import { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { subscribeSettings, updateSettings, DEFAULT_SETTINGS } from '../services/settings';
import type { UserSettings } from '../services/settings';

export const useSettings = () => {
    const { currentUser } = useAuth();
    const [settings, setSettings] = useState<UserSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!currentUser) {
            setLoading(false);
            return;
        }

        const unsubscribe = subscribeSettings(currentUser.uid, (data) => {
            setSettings(data);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [currentUser]);

    const saveSettings = async (newSettings: Partial<UserSettings>) => {
        if (!currentUser) return;
        await updateSettings(currentUser.uid, newSettings);
    };

    return { settings, loading, saveSettings };
};
