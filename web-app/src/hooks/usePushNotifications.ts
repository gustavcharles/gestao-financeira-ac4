import { getToken, onMessage, isSupported as isFCMSupported, type Messaging } from 'firebase/messaging';
import { doc, updateDoc, arrayUnion, arrayRemove, getDoc } from 'firebase/firestore';
import { useState, useEffect, useCallback, useRef } from 'react';
import { getMessaging } from 'firebase/messaging';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';
import { getApps } from 'firebase/app';

const VAPID_KEY = 'BHzxqJn_UJAQeEyZXNGQUWjeTMJ_bTmYqKbPuKRNhoEApEn9Ouw_SjoOhZ3vMMeaj9Ny6SrzviElfbpmGplZVkE';

export type NotificationPermissionStatus = 'default' | 'granted' | 'denied' | 'unsupported' | 'loading';

/**
 * Hook para gerenciar notificações push FCM.
 * Resolve o problema de inicialização assíncrona do messaging e
 * rastreia corretamente se o token está salvo no Firestore.
 */
export function usePushNotifications() {
    const { currentUser } = useAuth();
    const [permission, setPermission] = useState<NotificationPermissionStatus>('loading');
    const [isRegistered, setIsRegistered] = useState(false); // token salvo no Firestore?
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagingRef = useRef<Messaging | null>(null);

    // 1. Inicializar messaging (resolve a Promise async)
    useEffect(() => {
        isFCMSupported().then((supported) => {
            if (!supported || !('Notification' in window)) {
                setPermission('unsupported');
                return;
            }

            // Obtém a instância já inicializada do app Firebase
            const app = getApps()[0];
            if (app) {
                messagingRef.current = getMessaging(app);
            }

            setPermission(Notification.permission as 'default' | 'granted' | 'denied');
        });
    }, []);

    // 2. Checar se o token já está registrado no Firestore
    useEffect(() => {
        if (!currentUser || permission !== 'granted' || !messagingRef.current) return;

        const checkToken = async () => {
            try {
                const token = await getToken(messagingRef.current!, { vapidKey: VAPID_KEY });
                if (!token) { setIsRegistered(false); return; }

                const userSnap = await getDoc(doc(db, 'users', currentUser.uid));
                const tokens: string[] = userSnap.data()?.fcmTokens ?? [];
                
                if (!tokens.includes(token)) {
                    // Auto-heal: If permission is granted but token isn't in Firestore, save it automatically
                    await updateDoc(doc(db, 'users', currentUser.uid), {
                        fcmTokens: arrayUnion(token)
                    });
                }
                
                setIsRegistered(true);
            } catch {
                setIsRegistered(false);
            }
        };

        checkToken();
    }, [currentUser, permission]);

    // 3. Ouvir mensagens em foreground
    useEffect(() => {
        if (!messagingRef.current || permission !== 'granted') return;

        const unsubscribe = onMessage(messagingRef.current, (payload) => {
            console.log('[FCM] Foreground message:', payload);
            if (payload.notification) {
                new Notification(payload.notification.title ?? 'Gestão AC-4 Pro', {
                    body: payload.notification.body,
                    icon: '/pwa-192x192.png',
                });
            }
        });

        return () => unsubscribe();
    }, [permission]);

    const enableNotifications = useCallback(async (): Promise<boolean> => {
        if (permission === 'unsupported' || !messagingRef.current) {
            setError('Notificações não são suportadas neste navegador.');
            return false;
        }

        setIsLoading(true);
        setError(null);

        try {
            // Pede permissão (só abre o dialog se ainda for 'default')
            const result = await Notification.requestPermission();
            setPermission(result as 'default' | 'granted' | 'denied');

            if (result !== 'granted') {
                setError('Permissão negada. Habilite nas configurações do navegador.');
                return false;
            }

            // Obtém token FCM
            const token = await getToken(messagingRef.current, { vapidKey: VAPID_KEY });
            if (!token) {
                setError('Não foi possível obter o token FCM. Verifique a VAPID key.');
                return false;
            }

            // Salva no Firestore
            if (currentUser) {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    fcmTokens: arrayUnion(token),
                });
            }

            setIsRegistered(true);
            console.log('[FCM] Token registrado:', token.substring(0, 20) + '...');
            return true;
        } catch (err: any) {
            console.error('[FCM] Erro ao ativar:', err);
            setError('Erro ao ativar notificações. Tente novamente.');
            return false;
        } finally {
            setIsLoading(false);
        }
    }, [permission, currentUser]);

    const disableNotifications = useCallback(async () => {
        if (!messagingRef.current || !currentUser) return;

        setIsLoading(true);
        setError(null);

        try {
            const token = await getToken(messagingRef.current, { vapidKey: VAPID_KEY });
            if (token) {
                await updateDoc(doc(db, 'users', currentUser.uid), {
                    fcmTokens: arrayRemove(token),
                });
            }
            // Token removido do Firestore — não receberá mais notificações
            setIsRegistered(false);
        } catch (err) {
            console.error('[FCM] Erro ao desativar:', err);
            setError('Erro ao desativar notificações.');
        } finally {
            setIsLoading(false);
        }
    }, [currentUser]);

    // "Ativo" = permissão concedida E token salvo no Firestore
    const isActive = permission === 'granted' && isRegistered;

    return {
        isSupported: permission !== 'unsupported',
        permission,
        isActive,
        isLoading,
        error,
        enableNotifications,
        disableNotifications,
    };
}
