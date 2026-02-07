import { useMemo, useState, useEffect } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { useSettings } from '../hooks/useSettings';
import { useScales } from '../modules/scales/hooks/useScales';
import { useAuth } from '../contexts/AuthContext';
import { calculateShiftValue } from '../modules/scales/utils/ac4Calculator';
import { formatCurrency, getMonthFromDate, generateAdvancedInsights } from '../utils/finance';
import {
    TrendingUp,
    Wallet,
    ArrowUpRight,
    ArrowDownRight,
    AlertCircle,
    Calendar,
    Clock,
    DollarSign
} from 'lucide-react';
import {
    AreaChart,
    Area,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    PieChart,
    Pie,
    Cell,
    BarChart,
    Bar,
    Legend
} from 'recharts';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export const Dashboard = () => {
    const { transactions, loading } = useTransactions();
    const { settings, saveSettings } = useSettings();

    const { currentUser } = useAuth();
    // Fetch scales/shifts for dashboard. 
    // Note: useScales expects userId. It manages its own state. 
    // We might want to ensure it doesn't over-fetch if Dashboard re-renders.
    const { shifts } = useScales(currentUser?.uid);
    const [selectedMonth, setSelectedMonth] = useState<string>('Todos');

    // Generate Month Options
    const months = useMemo(() => {
        const uniqueMonths = Array.from(new Set(transactions.map(t => t.mes_referencia)));

        const monthMap: { [key: string]: number } = {
            'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
            'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
        };

        return uniqueMonths.sort((a, b) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');

            if (yearA !== yearB) {
                return Number(yearB) - Number(yearA); // Descending Year (Newest first)
            }
            return (monthMap[monthB] || 0) - (monthMap[monthA] || 0); // Descending Month (Newest first)
        });
    }, [transactions]);

    // Set default month to current if available and not set
    useEffect(() => {
        if (selectedMonth === 'Todos' && months.length > 0) {
            const current = getMonthFromDate(new Date());
            if (months.includes(current)) {
                setSelectedMonth(current);
            }
        }
    }, [months]);

    const filteredData = useMemo(() => {
        if (selectedMonth === 'Todos') return transactions;
        return transactions.filter(t => t.mes_referencia === selectedMonth);
    }, [transactions, selectedMonth]);

    // Calculations
    const calculations = useMemo(() => {
        let rec = 0;
        let desp = 0;

        filteredData.forEach(t => {
            if (t.tipo === 'Receita') rec += Number(t.valor);
            else if (t.tipo === 'Despesa') desp += Number(t.valor);
        });

        return { rec, desp, saldo: rec - desp };
    }, [filteredData]);

    // Advanced Insights
    const advancedInsights = useMemo(() => {
        return generateAdvancedInsights(transactions, selectedMonth);
    }, [transactions, selectedMonth]);

    // Chart Data
    const chartData = useMemo(() => {
        const dailyMap = new Map<string, number>();
        filteredData.forEach(t => {
            const val = Number(t.valor);
            const prev = dailyMap.get(t.data) || 0;
            dailyMap.set(t.data, prev + val);
        });

        const dailyFlow = Array.from(dailyMap.entries())
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => a.date.localeCompare(b.date));

        return dailyFlow;
    }, [filteredData]);

    // Extra Chart Data
    const extraCharts = useMemo(() => {
        // 1. Pie Chart: Despesas por Categoria
        const catMap = new Map<string, number>();
        filteredData.filter(t => t.tipo === 'Despesa').forEach(t => {
            const current = catMap.get(t.categoria) || 0;
            catMap.set(t.categoria, current + Number(t.valor));
        });
        const categoryData = Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        // 2. Heatmap: Activity Volume by Day
        const heatMap = new Map<string, number>();
        filteredData.forEach(t => {
            const current = heatMap.get(t.data) || 0;
            heatMap.set(t.data, current + Number(t.valor));
        });

        // 3. Annual Bar Chart
        const annualMap = new Map<string, { receita: number, despesa: number }>();
        transactions.forEach(t => {
            const key = t.mes_referencia;
            const curr = annualMap.get(key) || { receita: 0, despesa: 0 };
            if (t.tipo === 'Receita') curr.receita += Number(t.valor);
            else if (t.tipo === 'Despesa') curr.despesa += Number(t.valor);
            annualMap.set(key, curr);
        });
        const annualData = Array.from(annualMap.entries())
            .map(([name, { receita, despesa }]) => ({ name, receita, despesa }))
            .sort((a, b) => {
                const monthMap: { [key: string]: number } = {
                    'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
                    'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
                };
                const [monthA, yearA] = a.name.split(' ');
                const [monthB, yearB] = b.name.split(' ');

                if (yearA !== yearB) return Number(yearA) - Number(yearB);
                return (monthMap[monthA] || 0) - (monthMap[monthB] || 0);
            });

        return { categoryData, heatMap, annualData };
    }, [filteredData, transactions]);

    // Scales Insights
    const scalesInsights = useMemo(() => {
        if (!shifts || shifts.length === 0) return { nextShift: null, ac4Total: 0 };

        const now = new Date();
        const nowStr = format(now, 'yyyy-MM-dd');

        // 1. Next Shift
        // Find first shift with date >= today

        const futureShifts = shifts
            .filter(s => s.status !== 'canceled') // Don't show canceled
            .filter(s => s.date >= nowStr) // Rough filter by day
            .sort((a, b) => a.date.localeCompare(b.date));

        // Refine for time? If today, check if endTime > now?
        // Simple: First one in list is likely next if sorted.
        const nextShift = futureShifts[0] || null;

        // 2. AC-4 / Extra Revenue Estimate for Selected Month
        let ac4Total = 0;
        if (selectedMonth !== 'Todos') {
            shifts.forEach(s => {
                if (s.status === 'canceled') return;

                // Check if shift is in selected month
                // Shift has 'date' YYYY-MM-DD.
                // We need to match with "Janeiro 2026".
                const shiftDate = parseISO(s.date);
                const shiftMonthStr = getMonthFromDate(shiftDate);

                if (shiftMonthStr === selectedMonth) {
                    // Check if AC-4
                    if (s.shiftTypeSnapshot?.isAC4) {
                        const start = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime as any);
                        const end = s.endTime.toDate ? s.endTime.toDate() : new Date(s.endTime as any);
                        ac4Total += calculateShiftValue(start, end);
                    }
                }
            });
        }

        return { nextShift, ac4Total };
    }, [shifts, selectedMonth]);

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

    if (loading) return <div className="p-10 text-center">Carregando dashboard...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header & Filter */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Dashboard</h2>
                    <p className="text-slate-500 dark:text-slate-400">Visão geral das suas finanças</p>
                </div>

                <select
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-white py-2 px-4 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none shadow-sm"
                >
                    <option value="Todos">Todos os Períodos</option>
                    {months.map(m => <option key={m} value={m}>{m}</option>)}
                </select>
            </div>

            {/* Welcome Card */}
            {settings.showWelcome && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-900 dark:to-purple-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden animate-in slide-in-from-top-4 duration-500 mb-6">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-3">👋 Bem-vindo ao Gestão AC-4!</h3>
                        <div className="space-y-2 mb-4 text-indigo-100">
                            <p className="font-medium">Primeiros Passos:</p>
                            <ul className="list-disc list-inside space-y-1 ml-2 text-sm">
                                <li>Adicione sua primeira receita</li>
                                <li>Configure categorias personalizadas</li>
                                <li>Explore o dashboard</li>
                            </ul>
                        </div>
                        <button
                            onClick={() => saveSettings({ showWelcome: false })}
                            className="bg-white text-indigo-600 px-4 py-2 rounded-xl font-bold text-sm hover:bg-indigo-50 transition-colors shadow-sm icon-link cursor-pointer"
                        >
                            Entendi!
                        </button>
                    </div>
                    {/* Decorative circles */}
                    <div className="absolute top-0 right-0 -mr-8 -mt-8 w-32 h-32 bg-white opacity-10 rounded-full blur-2xl"></div>
                    <div className="absolute bottom-0 right-12 w-24 h-24 bg-purple-400 opacity-20 rounded-full blur-xl"></div>
                </div>
            )}

            {/* Scales & Finance Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">

                {/* Main Feature Card: Saldo (Modified to be 2 cols) */}
                <div className="lg:col-span-2 relative overflow-hidden bg-gradient-to-br from-primary-600 to-slate-900 rounded-3xl p-8 text-white shadow-xl shadow-primary-900/10">
                    <div className="relative z-10">
                        <div className="text-primary-100 font-medium mb-2 flex items-center gap-2">
                            <Wallet size={20} />
                            <span>Saldo do Mês</span>
                        </div>
                        <div className="text-4xl md:text-5xl font-bold mb-6 tracking-tight">
                            {formatCurrency(calculations.saldo)}
                        </div>

                        <div className="flex flex-wrap gap-6 text-sm font-medium">
                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                    <ArrowUpRight size={18} />
                                </div>
                                <div>
                                    <div className="text-primary-200 text-xs">Receitas</div>
                                    <div className="text-emerald-400 text-lg">{formatCurrency(calculations.rec)}</div>
                                </div>
                            </div>

                            <div className="flex items-center gap-2 bg-white/10 px-4 py-2 rounded-full backdrop-blur-sm">
                                <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                    <ArrowDownRight size={18} />
                                </div>
                                <div>
                                    <div className="text-primary-200 text-xs">Despesas</div>
                                    <div className="text-red-400 text-lg">{formatCurrency(calculations.desp)}</div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-64 h-64 bg-primary-500 rounded-full blur-3xl opacity-20"></div>
                    <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-40 h-40 bg-purple-500 rounded-full blur-3xl opacity-20"></div>
                </div>

                {/* Scales / Next Shift Widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col justify-between">
                    <div>
                        <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                            <Calendar className="text-indigo-500" size={20} />
                            Próximo Plantão
                        </h3>

                        {scalesInsights.nextShift ? (
                            <div className="mt-2">
                                <div className="flex items-center justify-between mb-2">
                                    <span className="text-3xl font-bold text-slate-800 dark:text-white">
                                        {scalesInsights.nextShift.date.split('-')[2]}
                                    </span>
                                    <span className="text-sm uppercase font-bold text-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-1 rounded">
                                        {format(parseISO(scalesInsights.nextShift.date), 'MMM', { locale: ptBR })}
                                    </span>
                                </div>
                                <div className="text-sm text-slate-500 dark:text-slate-400 mb-1">
                                    {format(parseISO(scalesInsights.nextShift.date), 'EEEE', { locale: ptBR })}
                                </div>
                                <div className="font-medium text-slate-700 dark:text-gray-200">
                                    {scalesInsights.nextShift.shiftTypeSnapshot.name}
                                </div>
                                <div className="flex items-center gap-1 text-xs text-slate-400 mt-2">
                                    <Clock size={12} />
                                    {scalesInsights.nextShift.shiftTypeSnapshot.startTime} - {scalesInsights.nextShift.shiftTypeSnapshot.endTime}
                                </div>
                            </div>
                        ) : (
                            <div className="text-slate-400 text-sm py-4">
                                Nenhum plantão agendado em breve.
                            </div>
                        )}
                    </div>

                    {/* AC-4 Projection */}
                    {scalesInsights.ac4Total > 0 && selectedMonth !== 'Todos' && (
                        <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700">
                            <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 mb-1">
                                <DollarSign size={16} />
                                <span className="text-xs font-bold uppercase">Projeção AC-4</span>
                            </div>
                            <div className="text-2xl font-bold text-slate-800 dark:text-white">
                                {formatCurrency(scalesInsights.ac4Total)}
                            </div>
                            <p className="text-xs text-slate-400">
                                Estimado no mês selecionado
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Advanced Insights */}
            {advancedInsights.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                    {advancedInsights.map((insight, index) => (
                        <div key={index} className="bg-gradient-to-r from-emerald-50 to-teal-50 dark:from-emerald-900/20 dark:to-teal-900/20 p-4 rounded-2xl border border-emerald-100 dark:border-emerald-800/30 flex items-center gap-4 shadow-sm animate-in fade-in slide-in-from-bottom-2">
                            <div className="text-2xl">{insight.split(' ')[0]}</div>
                            <p className="font-semibold text-emerald-800 dark:text-emerald-200 text-sm">
                                {insight.substring(2)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 pb-20 md:pb-0">

                {/* 1. Area Chart (Fluxo Diário) */}
                <div className="lg:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="text-primary-500" size={20} />
                        Fluxo Financeiro Diário
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.1} />
                                        <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)' }}
                                    formatter={(value: any) => [formatCurrency(value), 'Volume']}
                                    labelFormatter={(label) => {
                                        const [, m, d] = label.split('-');
                                        return `${d}/${m}`;
                                    }}
                                />
                                <Area type="monotone" dataKey="value" stroke="#3B82F6" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Pie Chart (Despesas por Categoria) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <AlertCircle className="text-amber-500" size={20} />
                        Despesas por Categoria
                    </h3>
                    <div className="h-[300px] w-full flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={extraCharts.categoryData}
                                    innerRadius={60}
                                    outerRadius={80}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {extraCharts.categoryData.map((_entry, index) => (
                                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip formatter={(val: number | undefined) => formatCurrency(val || 0)} />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 3. Heatmap Indicator (Top Spending Days) */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm col-span-1 lg:col-span-1">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <TrendingUp className="text-red-500" size={20} />
                        Dias de Maior Gasto
                    </h3>
                    <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                        {Array.from(extraCharts.heatMap.entries())
                            .sort((a, b) => b[1] - a[1])
                            .slice(0, 6)
                            .map(([date, val], idx) => (
                                <div key={date} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold text-xs ${idx === 0 ? 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400' :
                                            idx === 1 ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400' :
                                                'bg-slate-100 text-slate-600 dark:bg-slate-700 dark:text-slate-400'
                                            }`}>
                                            {date.split('-')[2]}
                                        </div>
                                        <span className="text-sm text-slate-600 dark:text-slate-300">
                                            {format(parseISO(date), "dd 'de' MMMM", { locale: ptBR })}
                                        </span>
                                    </div>
                                    <span className="font-bold text-slate-800 dark:text-white text-sm">
                                        {formatCurrency(val)}
                                    </span>
                                </div>
                            ))}
                    </div>
                </div>

                {/* 4. Annual Comparison Bar Chart */}
                <div className="lg:col-span-2 xl:col-span-2 bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-6 flex items-center gap-2">
                        <TrendingUp className="text-emerald-500" size={20} />
                        Comparativo Anual (Rec e Desp)
                    </h3>
                    <div className="h-[300px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={extraCharts.annualData}>
                                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                                <Tooltip
                                    cursor={{ fill: 'transparent' }}
                                    contentStyle={{ borderRadius: '12px', border: 'none' }}
                                    formatter={(value: any) => formatCurrency(value)}
                                />
                                <Legend />
                                <Bar name="Receitas" dataKey="receita" fill="#10B981" radius={[4, 4, 0, 0]} />
                                <Bar name="Despesas" dataKey="despesa" fill="#EF4444" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};
