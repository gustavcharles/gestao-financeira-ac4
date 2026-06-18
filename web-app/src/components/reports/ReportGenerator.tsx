import React, { useState, useMemo } from 'react';
import { useTransactions } from '../../hooks/useTransactions';
import { generateDetailedReport, generateAnnualReport } from '../../utils/report';
import { getMonthFromDate } from '../../utils/finance';
import { Download, Calendar } from 'lucide-react';

export const ReportGenerator = () => {
    const { transactions } = useTransactions();
    const [selectedMonth, setSelectedMonth] = useState<string>('');
    const [selectedYear, setSelectedYear] = useState<string>('');

    // Unique months logic
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

    // Unique years logic
    const years = useMemo(() => {
        const unique = Array.from(new Set(transactions.map(t => {
            const refParts = t.mes_referencia.split(' ');
            if (refParts.length === 2 && !isNaN(Number(refParts[1]))) {
                return refParts[1];
            }
            return t.data.split('-')[0];
        })));
        return unique.filter(y => y && !isNaN(Number(y))).sort((a, b) => Number(b) - Number(a));
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
    }, [months, selectedMonth]);

    // Default to current year if not set
    React.useEffect(() => {
        if (!selectedYear && years.length > 0) {
            const currentYear = new Date().getFullYear().toString();
            if (years.includes(currentYear)) {
                setSelectedYear(currentYear);
            } else {
                setSelectedYear(years[0]);
            }
        }
    }, [years, selectedYear]);

    const handleGenerateMonthly = () => {
        if (!selectedMonth) return;
        const filtered = transactions.filter(t => t.mes_referencia === selectedMonth);
        generateDetailedReport(filtered, selectedMonth);
    };

    const handleGenerateAnnual = () => {
        if (!selectedYear) return;
        generateAnnualReport(transactions, selectedYear);
    };

    return (
        <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Monthly Report */}
                <div className="p-5 bg-slate-50 dark:bg-slate-700/20 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-1">Relatório Mensal</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Gere um compilado com gráficos e lançamentos detalhados de um mês específico.
                        </p>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Calendar size={14} />
                            Mês de Referência
                        </label>
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-white"
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
                        onClick={handleGenerateMonthly}
                        disabled={!selectedMonth || months.length === 0}
                        className="w-full bg-slate-800 hover:bg-slate-900 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <Download size={18} />
                        Gerar PDF Mensal
                    </button>
                </div>

                {/* Annual Report */}
                <div className="p-5 bg-slate-50 dark:bg-slate-700/20 rounded-2xl border border-slate-100 dark:border-slate-700 flex flex-col justify-between gap-4">
                    <div>
                        <h4 className="font-bold text-slate-800 dark:text-white mb-1">Relatório Anual</h4>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mb-4">
                            Gere um consolidado anual com totais por categoria, maiores lançamentos e fluxo de caixa mensal.
                        </p>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2 flex items-center gap-1.5">
                            <Calendar size={14} />
                            Ano de Referência
                        </label>
                        <select
                            value={selectedYear}
                            onChange={(e) => setSelectedYear(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-800 text-slate-700 dark:text-white"
                        >
                            <option value="" disabled>Selecione um ano...</option>
                            {years.map(y => (
                                <option key={y} value={y}>{y}</option>
                            ))}
                        </select>
                        {years.length === 0 && (
                            <p className="text-xs text-orange-500 mt-1">Nenhum ano disponível ainda.</p>
                        )}
                    </div>
                    <button
                        onClick={handleGenerateAnnual}
                        disabled={!selectedYear || years.length === 0}
                        className="w-full bg-primary-600 hover:bg-primary-700 text-white px-4 py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-md"
                    >
                        <Download size={18} />
                        Gerar PDF Anual
                    </button>
                </div>
            </div>
        </div>
    );
};
