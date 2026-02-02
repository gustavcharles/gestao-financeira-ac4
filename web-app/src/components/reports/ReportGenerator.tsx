import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { generateDetailedReport } from '../../utils/report';
import { getMonthFromDate } from '../../utils/finance';
import { Download, Calendar } from 'lucide-react';

export const ReportGenerator = () => {
    const { transactions } = useTransactions();
    const [selectedMonth, setSelectedMonth] = useState<string>('');

    // Unique months logic (shared with Dashboard but simplified here)
    const months = useMemo(() => {
        const unique = Array.from(new Set(transactions.map(t => t.mes_referencia)));
        const monthMap: { [key: string]: number } = {
            'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
            'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
        };
        return unique.sort((a, b) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');
            if (yearA !== yearB) return Number(yearB) - Number(yearA);
            return (monthMap[monthB] || 0) - (monthMap[monthA] || 0);
        });
    }, [transactions]);

    // Default to current month if not set
    React.useEffect(() => {
        if (!selectedMonth && months.length > 0) {
            const current = getMonthFromDate(new Date());
            if (months.includes(current)) {
                setSelectedMonth(current);
            } else {
                setSelectedMonth(months[0]);
            }
        }
    }, [months]);

    const handleGenerate = () => {
        if (!selectedMonth) return;
        const filtered = transactions.filter(t => t.mes_referencia === selectedMonth);
        generateDetailedReport(filtered, selectedMonth);
    };

    return (
        <div className="flex flex-col md:flex-row items-end gap-4">
            <div className="flex-1 w-full">
                <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-2">
                    <Calendar size={16} />
                    Selecione o Mês de Referência
                </label>
                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="w-full px-4 py-3 border border-slate-200 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-slate-50 text-slate-700"
                >
                    <option value="" disabled>Selecione um mês...</option>
                    {months.map(m => (
                        <option key={m} value={m}>{m}</option>
                    ))}
                </select>
                {months.length === 0 && (
                    <p className="text-xs text-orange-500 mt-1">Nenhuma transação registrada ainda.</p>
                )}
            </div>

            <button
                onClick={handleGenerate}
                disabled={!selectedMonth || months.length === 0}
                className="w-full md:w-auto bg-slate-800 text-white px-6 py-3 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-slate-200 mb-[1px]"
            >
                <Download size={20} />
                Gerar Relatório Completo
            </button>
        </div>
    );
};
