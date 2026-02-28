import { useState, useEffect } from 'react';
import { Download, X, Smartphone, Share, PlusSquare } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
    prompt(): Promise<void>;
    userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Detecta se é iOS (iPhone/iPad/iPod)
 */
function isIOS(): boolean {
    const ua = navigator.userAgent;
    return /iPad|iPhone|iPod/.test(ua) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
}

/**
 * Detecta se está rodando no Safari (não Chrome no iOS)
 */
function isIOSSafari(): boolean {
    const ua = navigator.userAgent;
    return isIOS() && /Safari/.test(ua) && !/CriOS|FxiOS|OPiOS|EdgiOS/.test(ua);
}

/**
 * Componente que exibe um banner convidando o usuário a instalar o app PWA.
 * - Android/Chrome: Captura beforeinstallprompt e mostra botão de instalação
 * - iOS/Safari: Mostra instruções visuais passo-a-passo
 */
export const InstallPrompt = () => {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [showBanner, setShowBanner] = useState(false);
    const [showIOSGuide, setShowIOSGuide] = useState(false);
    const [isInstalled, setIsInstalled] = useState(false);
    const [isIos] = useState(isIOS());
    const [isIosSafari] = useState(isIOSSafari());

    useEffect(() => {
        // Verificar se já está instalado como PWA
        const isStandalone = window.matchMedia('(display-mode: standalone)').matches
            || (window.navigator as any).standalone === true;

        if (isStandalone) {
            setIsInstalled(true);
            return;
        }

        // Verificar se o usuário dispensou o banner recentemente (24h)
        const dismissed = localStorage.getItem('pwa-install-dismissed');
        if (dismissed) {
            const dismissedTime = parseInt(dismissed, 10);
            if (Date.now() - dismissedTime < 24 * 60 * 60 * 1000) return;
        }

        // iOS: mostrar instruções manuais
        if (isIos) {
            setTimeout(() => setShowBanner(true), 3000);
            return;
        }

        // Android/Chrome: capturar beforeinstallprompt
        const handler = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setTimeout(() => setShowBanner(true), 3000);
        };

        window.addEventListener('beforeinstallprompt', handler);

        window.addEventListener('appinstalled', () => {
            setIsInstalled(true);
            setShowBanner(false);
            setDeferredPrompt(null);
        });

        return () => {
            window.removeEventListener('beforeinstallprompt', handler);
        };
    }, [isIos]);

    const handleInstall = async () => {
        if (!deferredPrompt) return;

        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            console.log('[PWA] Usuário aceitou a instalação');
        }

        setDeferredPrompt(null);
        setShowBanner(false);
    };

    const handleDismiss = () => {
        setShowBanner(false);
        setShowIOSGuide(false);
        localStorage.setItem('pwa-install-dismissed', Date.now().toString());
    };

    if (isInstalled || !showBanner) return null;

    // Se é iOS mas NÃO Safari, não mostra (não suporta PWA install)
    if (isIos && !isIosSafari && !deferredPrompt) return null;

    // Se é Android mas não tem o prompt, não mostra
    if (!isIos && !deferredPrompt) return null;

    return (
        <div className="fixed bottom-4 left-4 right-4 z-[100] max-w-md mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white p-4 rounded-2xl shadow-2xl border border-indigo-400/20">
                <div className="flex items-start gap-3">
                    <div className="p-2.5 bg-white/15 rounded-xl shrink-0 backdrop-blur-sm">
                        <Smartphone size={22} />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h3 className="font-bold text-sm">
                            Instalar Gestão AC-4 Pro
                        </h3>
                        <p className="text-xs text-indigo-100 mt-1 leading-relaxed">
                            Acesse direto da tela inicial, com notificações e modo offline!
                        </p>
                    </div>
                    <button
                        onClick={handleDismiss}
                        className="text-indigo-200 hover:text-white p-1 -mt-1 -mr-1 shrink-0"
                        aria-label="Fechar"
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Android: botão direto */}
                {!isIos && deferredPrompt && (
                    <button
                        onClick={handleInstall}
                        className="w-full mt-3 bg-white text-indigo-700 font-semibold text-sm py-2.5 rounded-xl 
                                   hover:bg-indigo-50 active:scale-[0.98] transition-all duration-200 
                                   flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Download size={16} />
                        Instalar aplicativo
                    </button>
                )}

                {/* iOS: botão para mostrar instruções */}
                {isIos && !showIOSGuide && (
                    <button
                        onClick={() => setShowIOSGuide(true)}
                        className="w-full mt-3 bg-white text-indigo-700 font-semibold text-sm py-2.5 rounded-xl 
                                   hover:bg-indigo-50 active:scale-[0.98] transition-all duration-200 
                                   flex items-center justify-center gap-2 shadow-lg"
                    >
                        <Download size={16} />
                        Ver como instalar
                    </button>
                )}

                {/* iOS: instruções passo-a-passo */}
                {isIos && showIOSGuide && (
                    <div className="mt-3 bg-white/10 backdrop-blur-sm rounded-xl p-3 space-y-3">
                        <p className="text-xs font-semibold text-indigo-100 uppercase tracking-wider">
                            Siga os passos abaixo:
                        </p>

                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold">
                                1
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span>Toque no ícone</span>
                                <span className="inline-flex items-center justify-center bg-white/20 rounded-md p-1">
                                    <Share size={16} />
                                </span>
                                <span className="font-medium">Compartilhar</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold">
                                2
                            </div>
                            <div className="flex items-center gap-2 text-sm">
                                <span>Role e toque em</span>
                                <span className="inline-flex items-center justify-center bg-white/20 rounded-md p-1">
                                    <PlusSquare size={16} />
                                </span>
                                <span className="font-medium">Tela de Início</span>
                            </div>
                        </div>

                        <div className="flex items-center gap-3">
                            <div className="w-7 h-7 bg-white/20 rounded-lg flex items-center justify-center shrink-0 text-sm font-bold">
                                3
                            </div>
                            <div className="text-sm">
                                Toque em <span className="font-medium">Adicionar</span> para confirmar
                            </div>
                        </div>

                        {!isIosSafari && (
                            <div className="bg-amber-500/20 border border-amber-400/30 rounded-lg p-2 mt-2">
                                <p className="text-xs text-amber-100">
                                    ⚠️ Para instalar, abra este site no <strong>Safari</strong>.
                                    Outros navegadores no iOS não suportam apps PWA.
                                </p>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};
