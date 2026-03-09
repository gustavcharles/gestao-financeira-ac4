import { useRegisterSW } from 'virtual:pwa-register/react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';
import { useEffect, useState } from 'react';

export const ReloadPrompt = () => {
    const [dismissed, setDismissed] = useState(false);

    // Suprimir prompt se acabamos de atualizar nos últimos 10 minutos
    useEffect(() => {
        const lastUpdate = sessionStorage.getItem('pwa-last-update-attempt');
        if (lastUpdate) {
            const now = Date.now();
            if (now - parseInt(lastUpdate) < 10 * 60 * 1000) {
                setDismissed(true);
            }
        }
    }, []);

    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log(`[PWA] Service Worker at: ${swUrl}`);
            if (r) {
                // Verificar atualizações a cada hora
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000);

                // Se houver um worker esperando, e não tivermos suprimido, garantir que o estado reflita isso
                if (r.waiting && !dismissed) {
                    setNeedRefresh(true);
                }
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

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

    // Não mostrar se suprimido ou se nada a mostrar
    if (dismissed || (!offlineReady && !needRefresh)) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] max-w-sm w-full animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="bg-slate-800 dark:bg-slate-700 text-white p-4 rounded-xl shadow-2xl border border-slate-700 flex flex-col gap-3">
                <div className="flex items-start gap-3">
                    <div className="p-2 bg-primary-600 rounded-lg shrink-0">
                        {needRefresh ? <RefreshCw className="animate-spin-slow" size={20} /> : <AlertCircle size={20} />}
                    </div>
                    <div className="flex-1 pt-1">
                        <h3 className="font-semibold text-sm">
                            {needRefresh ? 'Nova versão disponível!' : 'Pronto para uso offline'}
                        </h3>
                        <p className="text-xs text-slate-300 mt-1">
                            {needRefresh
                                ? 'Uma nova atualização foi encontrada. Atualize para ver as novidades.'
                                : 'O aplicativo foi salvo em cache e está pronto para funcionar offline.'}
                        </p>
                    </div>
                    <button onClick={close} className="text-slate-400 hover:text-white p-1">
                        <X size={18} />
                    </button>
                </div>

                {needRefresh && (
                    <button
                        onClick={async () => {
                            console.log('[PWA] Forçando atualização do service worker...');

                            // Marcar tentativa de atualização para evitar prompt infinito após reload
                            sessionStorage.setItem('pwa-last-update-attempt', Date.now().toString());
                            setDismissed(true);

                            try {
                                if ('serviceWorker' in navigator) {
                                    const registrations = await navigator.serviceWorker.getRegistrations();
                                    for (const reg of registrations) {
                                        if (reg.waiting) {
                                            reg.waiting.postMessage({ type: 'SKIP_WAITING' });
                                        }
                                    }
                                }

                                updateServiceWorker(true);

                                setTimeout(() => {
                                    window.location.reload();
                                }, 1000);
                            } catch (err) {
                                console.error('[PWA] Erro ao atualizar:', err);
                                window.location.reload();
                            }
                        }}
                        className="w-full bg-primary-600 hover:bg-primary-700 active:scale-[0.98] text-white text-sm font-medium py-2.5 rounded-lg transition-all flex items-center justify-center gap-2 shadow-lg"
                    >
                        <RefreshCw size={16} />
                        Atualizar agora
                    </button>
                )}
            </div>
        </div>
    );
};
