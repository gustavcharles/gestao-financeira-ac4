import { useRegisterSW } from 'virtual:pwa-register/react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ReloadPrompt = () => {
    const [dismissed, setDismissed] = useState(false);
    const [isUpdating, setIsUpdating] = useState(false);

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log(`[PWA] Service Worker registrado em: ${swUrl}`);
            if (r) {
                // Verificar atualizações periodicamente
                setInterval(() => {
                    r.update();
                }, 30 * 60 * 1000);

                // Se houver um worker esperando, indicar atualização necessária
                if (r.waiting) {
                    setNeedRefresh(true);
                }
            }
        },
        onRegisterError(error) {
            console.error('[PWA] Erro no registro do Service Worker:', error);
        },
    });

    // Escutar mudança de controlador (quando o novo SW assume o controle de fato)
    useEffect(() => {
        if ('serviceWorker' in navigator) {
            let refreshing = false;
            const handleControllerChange = () => {
                if (!refreshing) {
                    refreshing = true;
                    console.log('[PWA] Novo Service Worker ativo, recarregando página...');
                    window.location.reload();
                }
            };
            navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange);
            return () => {
                navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange);
            };
        }
    }, []);

    // Auto-fechar mensagem de "Pronto para uso offline" após 5 segundos
    useEffect(() => {
        if (offlineReady) {
            const timer = setTimeout(() => {
                setOfflineReady(false);
            }, 5000);
            return () => clearTimeout(timer);
        }
    }, [offlineReady, setOfflineReady]);

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
        setDismissed(true);
    };

    const handleApplyUpdate = async () => {
        if (isUpdating) return;
        setIsUpdating(true);
        console.log('[PWA] Aplicando atualização do Service Worker...');

        try {
            if ('serviceWorker' in navigator) {
                const registrations = await navigator.serviceWorker.getRegistrations();
                for (const reg of registrations) {
                    if (reg.waiting) {
                        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                    }
                }
            }

            // Dispara atualização através do helper oficial
            await updateServiceWorker(true);

            // Fallback de recarregamento caso o evento controllerchange não seja acionado em 1.5s
            setTimeout(() => {
                window.location.reload();
            }, 1500);
        } catch (err) {
            console.error('[PWA] Erro ao disparar atualização:', err);
            window.location.reload();
        }
    };

    // Não mostrar se suprimido pelo usuário ou se nada a mostrar
    if (dismissed || (!offlineReady && !needRefresh)) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-600 rounded-lg shrink-0">
                        {needRefresh ? <RefreshCw className={isUpdating ? "animate-spin" : "animate-spin-slow"} size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-sm">
                            {needRefresh ? 'Nova versão disponível!' : 'Pronto para uso offline'}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                            {needRefresh
                                ? 'Uma nova atualização foi encontrada. Atualize para carregar as novidades.'
                                : 'O aplicativo foi salvo em cache e está pronto para funcionar offline.'}
                        </p>
                    </div>
                    <button onClick={close} className="text-slate-400 hover:text-white p-1">
                        <X size={18} />
                    </button>
                </div>

                {needRefresh && (
                    <button
                        onClick={handleApplyUpdate}
                        disabled={isUpdating}
                        className="w-full bg-primary-600 hover:bg-primary-700 disabled:opacity-70 active:scale-[0.98] text-white text-sm font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <RefreshCw size={16} className={isUpdating ? "animate-spin" : ""} />
                        {isUpdating ? 'Atualizando...' : 'Atualizar agora'}
                    </button>
                )}
            </div>
        </div>
    );
};
