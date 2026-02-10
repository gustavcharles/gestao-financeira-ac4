import { AlertTriangle, ExternalLink } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../services/firebase';
import { signOut } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export const Expired = () => {
    const { userProfile } = useAuth();
    const navigate = useNavigate();

    const handleLogout = async () => {
        await signOut(auth);
        navigate('/login');
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <div className="max-w-md w-full bg-white dark:bg-slate-800 rounded-3xl shadow-xl p-8 text-center">
                <div className="w-20 h-20 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
                    <AlertTriangle className="text-red-600 dark:text-red-400" size={40} />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                    Período de Teste Expirado
                </h1>

                <p className="text-slate-600 dark:text-slate-300 mb-6">
                    Seu período de avaliação gratuita terminou.
                    <br />
                    Para continuar usando o <strong>Gestão AC-4</strong>, assine um de nossos planos.
                </p>

                <div className="space-y-3">
                    <a
                        href="https://www.asaas.com/c/83f4e2mfuicyr6k9"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 px-6 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        Ver Planos e Assinar
                        <ExternalLink size={18} />
                    </a>

                    <button
                        onClick={handleLogout}
                        className="w-full bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 font-medium py-3 px-6 rounded-lg transition-colors"
                    >
                        Sair
                    </button>
                </div>

                {userProfile?.email && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 mt-6">
                        Logado como: {userProfile.email}
                    </p>
                )}
            </div>
        </div>
    );
};
