import React, { useMemo } from 'react';
import { addMonths } from 'date-fns';
import { TrendingDown, Calendar, Info } from 'lucide-react';
import { formatCurrency, getMonthFromDate } from '../../utils/finance';
import type { Transaction } from '../../utils/finance';

interface ExpenseForecastCardProps {
    transactions: Transaction[];
}

export const ExpenseForecastCard: React.FC<ExpenseForecastCardProps> = ({ transactions }) => {
    const forecast = useMemo(() => {
        const today = new Date();
        const currentMonthStr = getMonthFromDate(today);
        const nextMonthDate = addMonths(today, 1);
        const nextMonthStr = getMonthFromDate(nextMonthDate);

        const expenses = transactions.filter(t => t.tipo === 'Despesa');

        // 1. Existing expenses for next month (including pre-created installments)
        const existingNextMonth = expenses.filter(t => t.mes_referencia === nextMonthStr);
        const existingTotal = existingNextMonth.reduce((acc, t) => acc + Number(t.valor), 0);

        // 2. Pending recurring bills
        const currentMonthRecurring = expenses.filter(t => 
            t.mes_referencia === currentMonthStr && t.recorrente
        );
        
        // Create a signature to avoid duplicates
        const nextMonthSigs = new Set(existingNextMonth.map(t => `${t.descricao}|${t.categoria}`));
        
        let pendingRecurringTotal = 0;
        const pendingItems: string[] = [];

        currentMonthRecurring.forEach(t => {
            const sig = `${t.descricao}|${t.categoria}`;
            if (!nextMonthSigs.has(sig)) {
                pendingRecurringTotal += Number(t.valor);
                pendingItems.push(t.descricao);
            }
        });

        return {
            total: existingTotal + pendingRecurringTotal,
            existingTotal,
            pendingRecurringTotal,
            nextMonthStr,
            hasInstallments: existingNextMonth.some(t => /\(\d+\/\d+\)/.test(t.descricao))
        };
    }, [transactions]);

    const nextMonthName = forecast.nextMonthStr.split(' ')[0];

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden h-full flex flex-col group">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <TrendingDown className="text-red-500" size={20} />
                        Previsão de Despesas
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        Comprometido para {nextMonthName}
                    </p>
                </div>
                <div className="bg-red-50 dark:bg-red-900/20 p-2 rounded-xl text-red-500">
                    <Calendar size={20} />
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center relative z-10 py-2">
                <p className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] mb-1">
                    Valor Confirmado
                </p>
                <div className="flex items-baseline gap-2 mb-4">
                    <span className="text-3xl font-bold text-slate-800 dark:text-white break-all">
                        {formatCurrency(forecast.total)}
                    </span>
                </div>

                <div className="space-y-3 bg-slate-50/50 dark:bg-slate-900/20 p-3 rounded-2xl border border-slate-100/50 dark:border-slate-700/30">
                    {/* Breakdown */}
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0"></span>
                            <span className="truncate">Despesas Fixas</span>
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0 ml-2">
                            {formatCurrency(forecast.pendingRecurringTotal)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-slate-500 dark:text-slate-400 flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0"></span>
                            <span className="truncate">Parcelas de Compras</span>
                        </span>
                        <span className="font-semibold text-slate-700 dark:text-slate-200 shrink-0 ml-2">
                            {formatCurrency(forecast.existingTotal)}
                        </span>
                    </div>
                </div>
            </div>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-700 relative z-10">
                <div className="flex items-center gap-2 text-[11px] text-slate-400 dark:text-slate-500 bg-slate-50 dark:bg-slate-900/30 p-2 rounded-xl border border-slate-100 dark:border-slate-800/50">
                    <Info size={14} className="text-indigo-500 shrink-0" />
                    <span>Calculado com base em contas recorrentes e compras parceladas já registradas.</span>
                </div>
            </div>

            {/* Decorative BG */}
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-red-500 rounded-full blur-3xl opacity-5 pointer-events-none"></div>
        </div>
    );
};
