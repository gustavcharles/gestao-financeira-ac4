import React from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmModalProps {
    isOpen: boolean;
    title: string;
    message: string;
    onConfirm: () => void;
    onCancel: () => void;
    confirmText?: string;
    cancelText?: string;
    type?: 'danger' | 'info' | 'warning';
}

export const ConfirmModal: React.FC<ConfirmModalProps> = ({
    isOpen,
    title,
    message,
    onConfirm,
    onCancel,
    confirmText = "Confirmar",
    cancelText = "Cancelar",
    type = 'danger'
}) => {
    if (!isOpen) return null;

    const colors = {
        danger: {
            bg: 'bg-red-50 dark:bg-red-900/20',
            icon: 'text-red-600 dark:text-red-400',
            button: 'bg-red-600 hover:bg-red-700 shadow-red-200 dark:shadow-none',
            iconBg: 'bg-white dark:bg-slate-800'
        },
        warning: {
            bg: 'bg-amber-50 dark:bg-amber-900/20',
            icon: 'text-amber-600 dark:text-amber-400',
            button: 'bg-amber-600 hover:bg-amber-700 shadow-amber-200 dark:shadow-none',
            iconBg: 'bg-white dark:bg-slate-800'
        },
        info: {
            bg: 'bg-blue-50 dark:bg-blue-900/20',
            icon: 'text-blue-600 dark:text-blue-400',
            button: 'bg-blue-600 hover:bg-blue-700 shadow-blue-200 dark:shadow-none',
            iconBg: 'bg-white dark:bg-slate-800'
        }
    };

    const activeColor = colors[type];

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div
                className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 slide-in-from-bottom-4 duration-300 pointer-events-auto"
                onClick={(e) => e.stopPropagation()} // Prevent closing when clicking inside
            >
                <div className="p-6 text-center relative">
                    <button
                        onClick={onCancel}
                        className="absolute right-4 top-4 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                    >
                        <X size={20} />
                    </button>

                    <div className={`mx-auto w-16 h-16 ${activeColor.bg} rounded-full flex items-center justify-center mb-4`}>
                        <div className={`${activeColor.iconBg} p-3 rounded-full shadow-sm`}>
                            <AlertTriangle size={24} className={activeColor.icon} />
                        </div>
                    </div>

                    <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-2">{title}</h3>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 leading-relaxed">
                        {message}
                    </p>

                    <div className="flex gap-3 justify-center">
                        <button
                            onClick={onCancel}
                            className="px-5 py-2.5 rounded-xl border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors"
                        >
                            {cancelText}
                        </button>
                        <button
                            onClick={onConfirm}
                            className={`px-5 py-2.5 rounded-xl text-white font-medium shadow-lg transition-all transform active:scale-95 ${activeColor.button}`}
                        >
                            {confirmText}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};
