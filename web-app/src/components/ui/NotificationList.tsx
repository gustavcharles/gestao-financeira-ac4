import { Bell, Calendar, AlertTriangle, X } from 'lucide-react';
import type { DueBill } from '../../services/alertService';

interface NotificationListProps {
    alerts: DueBill[];
    isOpen: boolean;
    onClose: () => void;
}

export const NotificationList = ({ alerts, isOpen, onClose }: NotificationListProps) => {
    if (!isOpen) return null;

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <>
            {/* Backdrop for mobile to close when clicking outside/scrolling */}
            <div
                className="fixed inset-0 z-40 bg-transparent"
                onClick={onClose}
            />

            <div className="fixed top-16 right-4 z-50 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-700 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-2">
                        <Bell size={18} className="text-slate-500 dark:text-slate-400" />
                        <h3 className="font-bold text-slate-800 dark:text-white">Notificações</h3>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={18} />
                    </button>
                </div>

                <div className="max-h-[60vh] overflow-y-auto p-2">
                    {alerts.length === 0 ? (
                        <div className="py-8 text-center text-slate-500 dark:text-slate-400">
                            <div className="w-12 h-12 mx-auto bg-slate-50 dark:bg-slate-700 rounded-full flex items-center justify-center mb-3">
                                <Bell size={24} className="opacity-30" />
                            </div>
                            <p className="text-sm">Nenhuma notificação</p>
                            <p className="text-xs opacity-70">Suas contas estão em dia!</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {alerts.map((bill) => (
                                <div key={bill.id} className="p-3 bg-red-50 dark:bg-red-900/10 rounded-xl border border-red-100 dark:border-red-900/30 flex gap-3">
                                    <div className="shrink-0 mt-1">
                                        <AlertTriangle size={16} className="text-red-500" />
                                    </div>
                                    <div className="flex-1">
                                        <h4 className="font-semibold text-slate-800 dark:text-slate-200 text-sm">{bill.description}</h4>
                                        <div className="flex items-center justify-between mt-1">
                                            <span className="text-xs font-medium text-red-600 dark:text-red-400">
                                                {formatCurrency(bill.amount)}
                                            </span>
                                            <div className="flex items-center gap-1 text-xs text-slate-500 dark:text-slate-400">
                                                <Calendar size={12} />
                                                {(() => {
                                                    try {
                                                        const [, m, d] = bill.dueDate.split('-');
                                                        return `${d}/${m}`;
                                                    } catch {
                                                        return bill.dueDate;
                                                    }
                                                })()}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </>
    );
};
