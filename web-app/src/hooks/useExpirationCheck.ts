import { useEffect } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { useAuth } from '../contexts/AuthContext';

/**
 * Hook para verificar expiração de trial/assinatura no login do usuário
 * Executa automaticamente quando o usuário faz login
 */
export function useExpirationCheck() {
    const { currentUser, userProfile } = useAuth();

    useEffect(() => {
        if (!currentUser || !userProfile) {
            console.log('[ExpirationCheck] Aguardando autenticação...', { currentUser: !!currentUser, userProfile: !!userProfile });
            return;
        }

        console.log('[ExpirationCheck] Iniciando verificação para:', userProfile.email);
        console.log('[ExpirationCheck] Status atual:', userProfile.status);
        console.log('[ExpirationCheck] Trial ends at:', userProfile.trialEndsAt);

        const checkExpiration = async () => {
            try {
                const now = new Date();
                console.log('[ExpirationCheck] Data atual:', now.toISOString());
                let needsUpdate = false;
                const updates: any = {};

                // Verificar trial expirado
                if (userProfile.status === 'trial' && userProfile.trialEndsAt) {
                    const trialEnd = userProfile.trialEndsAt.toDate ?
                        userProfile.trialEndsAt.toDate() :
                        new Date(userProfile.trialEndsAt);

                    console.log('[ExpirationCheck] Data de expiração do trial:', trialEnd.toISOString());
                    console.log('[ExpirationCheck] Trial expirado?', now > trialEnd);

                    if (now > trialEnd) {
                        updates.status = 'expired';
                        needsUpdate = true;
                        console.log('✅ Trial expirado para:', userProfile.email);
                    }
                }

                // Verificar assinatura expirada
                if (userProfile.status === 'active' && userProfile.subscriptionEndsAt) {
                    const subEnd = userProfile.subscriptionEndsAt.toDate ?
                        userProfile.subscriptionEndsAt.toDate() :
                        new Date(userProfile.subscriptionEndsAt);

                    if (now > subEnd) {
                        updates.status = 'expired';
                        needsUpdate = true;
                        console.log('Assinatura expirada para:', userProfile.email);
                    }
                }

                // Atualizar se necessário
                if (needsUpdate) {
                    await updateDoc(doc(db, 'users', currentUser.uid), updates);
                    console.log('Status atualizado para expired. Recarregando página...');
                    // Forçar reload para atualizar o contexto de autenticação
                    window.location.reload();
                }

            } catch (error) {
                console.error('Erro ao verificar expiração:', error);
            }
        };

        checkExpiration();
    }, [currentUser, userProfile]);
}
