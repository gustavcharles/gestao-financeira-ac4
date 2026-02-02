import { auth } from '../services/firebase';
import { Clock, LogOut, ShieldAlert } from 'lucide-react';

export const Pending = () => {
    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden p-8 text-center">
                <div className="mx-auto w-20 h-20 bg-amber-50 dark:bg-amber-900/20 rounded-full flex items-center justify-center mb-6 text-amber-500">
                    <Clock size={40} />
                </div>

                <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-3">
                    Aprovação Pendente
                </h1>

                <p className="text-slate-500 dark:text-slate-400 mb-8 leading-relaxed">
                    Sua conta foi criada com sucesso, mas precisa ser ativada por um administrador antes de acessar o sistema.
                    <br /><br />
                    <span className="text-xs bg-slate-100 dark:bg-slate-700 px-3 py-1 rounded-full font-medium">
                        Status: Aguardando Liberação
                    </span>
                </p>

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 p-4 rounded-xl text-left mb-8 flex gap-3 text-sm text-amber-800 dark:text-amber-200">
                    <ShieldAlert className="shrink-0" size={20} />
                    <p>Por favor, entre em contato com o suporte ou aguarde a notificação de ativação.</p>
                </div>

                <button
                    onClick={() => auth.signOut()}
                    className="w-full py-3 bg-white dark:bg-slate-700 border-2 border-slate-100 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-slate-600 transition-colors flex items-center justify-center gap-2"
                >
                    <LogOut size={20} />
                    Sair e Tentar Depois
                </button>
            </div>
        </div>
    );
};
