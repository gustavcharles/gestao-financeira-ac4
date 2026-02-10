import { differenceInDays } from 'date-fns';
import { Clock, ExternalLink, AlertTriangle } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const TrialBanner = () => {
    const { userProfile } = useAuth();

    if (!userProfile) return null;

    // Não mostrar banner para admin ou usuários ativos
    if (userProfile.role === 'admin' || userProfile.status === 'active') return null;

    // Banner para usuários com trial expirado
    if (userProfile.status === 'expired') {
        return (
            <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-4 mb-6 rounded-r-xl">
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <AlertTriangle className="text-red-500 flex-shrink-0" size={24} />
                        <div>
                            <h3 className="font-bold text-red-800 dark:text-red-200">
                                Período de teste expirado
                            </h3>
                            <p className="text-sm text-red-600 dark:text-red-300">
                                Assine agora para continuar usando o sistema
                            </p>
                        </div>
                    </div>
                    <a
                        href="https://www.asaas.com/c/83f4e2mfuicyr6k9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="bg-red-600 text-white px-6 py-2 rounded-lg font-medium hover:bg-red-700 transition-colors flex items-center gap-2 whitespace-nowrap"
                    >
                        Assinar Agora
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        );
    }

    // Banner para usuários em trial
    if (userProfile.status === 'trial' && userProfile.trialEndsAt) {
        const trialEnd = userProfile.trialEndsAt.toDate ?
            userProfile.trialEndsAt.toDate() :
            new Date(userProfile.trialEndsAt);

        const daysLeft = differenceInDays(trialEnd, new Date());
        const isUrgent = daysLeft <= 3;

        // Não mostrar se já expirou (será tratado pela verificação automática)
        if (daysLeft < 0) return null;

        return (
            <div className={`border-l-4 p-4 mb-6 rounded-r-xl ${isUrgent
                ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500'
                : 'bg-blue-50 dark:bg-blue-900/20 border-blue-500'
                }`}>
                <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                        <Clock
                            className={`flex-shrink-0 ${isUrgent ? 'text-amber-500' : 'text-blue-500'}`}
                            size={24}
                        />
                        <div>
                            <h3 className={`font-bold ${isUrgent
                                ? 'text-amber-800 dark:text-amber-200'
                                : 'text-blue-800 dark:text-blue-200'
                                }`}>
                                {daysLeft === 0
                                    ? 'Último dia de teste!'
                                    : daysLeft === 1
                                        ? 'Falta 1 dia do seu período de teste'
                                        : `Faltam ${daysLeft} dias do seu período de teste`
                                }
                            </h3>
                            <p className={`text-sm ${isUrgent
                                ? 'text-amber-600 dark:text-amber-300'
                                : 'text-blue-600 dark:text-blue-300'
                                }`}>
                                Garanta acesso ilimitado com desconto especial
                            </p>
                        </div>
                    </div>
                    <a
                        href="https://www.asaas.com/c/83f4e2mfuicyr6k9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 whitespace-nowrap ${isUrgent
                            ? 'bg-amber-600 text-white hover:bg-amber-700'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        Ver Planos
                        <ExternalLink size={16} />
                    </a>
                </div>
            </div>
        );
    }

    return null;
};
