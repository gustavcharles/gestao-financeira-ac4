import { useRegisterSW } from 'virtual:pwa-register/react';
import { AlertCircle, RefreshCw, X } from 'lucide-react';

export const ReloadPrompt = () => {
    const {
        offlineReady: [offlineReady, setOfflineReady],
        needRefresh: [needRefresh, setNeedRefresh],
        updateServiceWorker,
    } = useRegisterSW({
        onRegisteredSW(swUrl, r) {
            console.log(`Service Worker at: ${swUrl}`);
            // Check for updates every hour
            if (r) {
                setInterval(() => {
                    r.update();
                }, 60 * 60 * 1000);
            }
        },
        onRegisterError(error) {
            console.log('SW registration error', error);
        },
    });

    const close = () => {
        setOfflineReady(false);
        setNeedRefresh(false);
    };

    if (!offlineReady && !needRefresh) return null;

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
                        onClick={() => updateServiceWorker(true)}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        <RefreshCw size={16} />
                        Atualizar agora
                    </button>
                )}
            </div>
        </div>
    );
};
