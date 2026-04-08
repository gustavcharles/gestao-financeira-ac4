import { useMemo, useState, useEffect } from 'react';
import { ExtraordinaryHoursCard } from '../components/dashboard/ExtraordinaryHoursCard';
import { ExpenseForecastCard } from '../components/dashboard/ExpenseForecastCard';

// ... existing imports ...

// Inside Dashboard component ...

// ... existing imports ...
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
    Clock
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
import { TrialBanner } from '../components/TrialBanner';

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
        const uniqueMonths = new Set<string>();

        // 1. Add months from Transactions (Financial)
        transactions.forEach(t => uniqueMonths.add(t.mes_referencia));

        // 2. Add months from Shifts (Work) to ensure they appear even if unpaid yet
        if (shifts) {
            shifts.forEach(s => {
                // Ensure we handle shifts with valid dates
                if (s.date) {
                    try {
                        const shiftDate = parseISO(s.date);
                        const monthStr = getMonthFromDate(shiftDate);
                        uniqueMonths.add(monthStr);
                    } catch (e) {
                        console.warn('Invalid shift date:', s.date);
                    }
                }
            });
        }

        const monthMap: { [key: string]: number } = {
            'Janeiro': 0, 'Fevereiro': 1, 'Março': 2, 'Abril': 3, 'Maio': 4, 'Junho': 5,
            'Julho': 6, 'Agosto': 7, 'Setembro': 8, 'Outubro': 9, 'Novembro': 10, 'Dezembro': 11
        };

        return Array.from(uniqueMonths).sort((a, b) => {
            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');

            if (yearA !== yearB) {
                return Number(yearB) - Number(yearA); // Descending Year (Newest first)
            }
            return (monthMap[monthB] || 0) - (monthMap[monthA] || 0); // Descending Month (Newest first)
        });
    }, [transactions, shifts]);

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
        let ac4Total = 0;
        const recByCat = new Map<string, number>();

        filteredData.forEach(t => {
            const valor = Number(t.valor);
            if (t.tipo === 'Receita') {
                rec += valor;
                // Group by category
                recByCat.set(t.categoria, (recByCat.get(t.categoria) || 0) + valor);
                
                // AC-4 specific logic
                if (t.categoria === 'AC-4') {
                    ac4Total += valor;
                }
            } else if (t.tipo === 'Despesa') {
                desp += valor;
            }
        });

        const recCategories = Array.from(recByCat.entries())
            .map(([name, value]) => ({ name, value }))
            .filter(cat => cat.value > 0)
            .sort((a, b) => b.value - a.value);

        return { rec, desp, saldo: rec - desp, ac4Total, recCategories };
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

    // Scales Insights & Stats
    const scalesInsights = useMemo(() => {
        if (!shifts || shifts.length === 0) return { upcomingShifts: [], ac4Total: 0, ac4Hours: 0 };

        const now = new Date();
        const nowStr = format(now, 'yyyy-MM-dd');

        // 1. Upcoming Shifts (Top 3)
        const upcomingShifts = shifts
            .filter(s => s.status !== 'canceled')
            .filter(s => s.date >= nowStr)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 3);

        // 2. AC-4 Logic (Work Month Basis)
        let ac4Total = 0;
        let ac4Hours = 0;

        shifts.forEach(s => {
            if (s.status === 'canceled') return;

            // Only consider AC-4 shifts
            const isAC4 = s.shiftTypeSnapshot?.isAC4 ||
                s.scaleCategory === 'AC-4' ||
                s.shiftTypeSnapshot?.name?.includes('AC-4');

            if (isAC4) {
                const shiftDate = parseISO(s.date);
                const shiftMonthStr = getMonthFromDate(shiftDate); // Work Month (e.g., Janeiro 2026)

                const start = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime as any);
                const end = s.endTime.toDate ? s.endTime.toDate() : new Date(s.endTime as any);
                const val = calculateShiftValue(start, end);

                // Calculate hours dynamically (in case user edited times but snapshot hours remained static)
                // Use minutes for precision then convert to hours
                const durationMs = end.getTime() - start.getTime();
                const h = durationMs > 0 ? durationMs / (1000 * 60 * 60) : 0;

                // Filter Logic: Match WORK MONTH
                let match = false;

                if (selectedMonth === 'Todos') {
                    // Match Year of the current context? 
                    // User said: "Annual calculation... sum of hours within the year Ex. 2026"
                    // If "Todos" is selected, usually implies All Time or Current Year.
                    // The Dashboard main filter "selectedMonth" is 'Janeiro 2026', 'Fevereiro 2026', etc.
                    // Or 'Todos'.
                    // If 'Todos', we sum everything available (logic of "All Periods").
                    match = true;
                } else {
                    // Match specific Work Month
                    if (shiftMonthStr === selectedMonth) {
                        match = true;
                    }
                    // Note: If user wants "Yearly Total" displayed somewhere while "Jan" is selected,
                    // we might need separate counters. 
                    // But the card usually displays stats for the *Selected Period*.
                    // If the card has a separate "Annual Total" display, we need to handle that.
                    // Let's assume the stats returned are for the VIEWED period.
                }

                if (match) {
                    ac4Total += val;
                    ac4Hours += h;
                }
            }
        });

        // NOTE: We are intentionally ignoring 'transactions' for the HOURS count here.
        // The user specifically requested "Work Month" logic. 
        // Transactions typically represent "Payment Month" (Cash Flow).
        // Mixing them causes double counting and date mismatches.
        // This card now represents "Production" (Hours Worked).

        return { upcomingShifts, ac4Total, ac4Hours };
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

            {/* Trial Banner */}
            <TrialBanner />

            {/* Welcome Card */}
            {settings.showWelcome && (
                <div className="bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-900 dark:to-purple-900 rounded-3xl p-6 text-white shadow-lg relative overflow-hidden animate-in slide-in-from-top-4 duration-500 mb-6">
                    <div className="relative z-10">
                        <h3 className="text-xl font-bold mb-3">👋 Bem-vindo ao Gestão AC-4 Pro!</h3>
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
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-6">

                {/* Main Feature Card: Saldo (Now 1 col) */}
                <div className="relative overflow-visible bg-gradient-to-br from-primary-600 to-slate-900 rounded-3xl p-6 text-white shadow-xl shadow-primary-900/10 flex flex-col h-full">
                    <div className="relative z-10 flex flex-col h-full justify-between">
                        <div>
                            <div className="text-primary-100 font-medium mb-1 flex items-center gap-2">
                                <Wallet size={18} />
                                <span>Saldo do Mês</span>
                            </div>
                            <div className="text-3xl font-bold tracking-tight">
                                {formatCurrency(calculations.saldo)}
                            </div>
                        </div>

                        <div className="flex flex-col gap-2 mt-4">
                            <div className="flex flex-col gap-1">
                                <div className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm transition-colors hover:bg-white/20">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                                            <ArrowUpRight size={16} />
                                        </div>
                                        <div className="text-primary-100 font-medium text-sm">Receitas</div>
                                    </div>
                                    <div className="text-emerald-400 font-bold">{formatCurrency(calculations.rec)}</div>
                                </div>
                                
                                {/* Categorias de Receita (Decomposition) */}
                                {calculations.recCategories.length > 0 && (
                                    <div className="flex flex-col gap-1.5 px-4 pb-2 pt-1 border-l-2 border-emerald-500/20 ml-7 animate-in fade-in slide-in-from-top-1">
                                        {calculations.recCategories.map((cat, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-xs md:text-[11px] text-white/90 font-medium">
                                                <span className="truncate pr-2">{cat.name}</span>
                                                <span className="whitespace-nowrap font-semibold text-emerald-400/90">{formatCurrency(cat.value)}</span>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div className="flex items-center justify-between bg-white/10 px-4 py-3 rounded-xl backdrop-blur-sm transition-colors hover:bg-white/20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-red-500/20 flex items-center justify-center text-red-400">
                                        <ArrowDownRight size={16} />
                                    </div>
                                    <div className="text-primary-100 font-medium text-sm">Despesas</div>
                                </div>
                                <div className="text-red-400 font-bold">{formatCurrency(calculations.desp)}</div>
                            </div>
                        </div>
                    </div>

                    {/* Decorative Background Elements */}
                    <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-primary-500 rounded-full blur-3xl opacity-20 pointer-events-none"></div>
                </div>

                <div className="lg:col-span-1">
                    <ExtraordinaryHoursCard
                        shifts={shifts}
                        selectedMonth={selectedMonth}
                        ac4Total={scalesInsights.ac4Total}
                        ac4Hours={scalesInsights.ac4Hours}
                        goal={settings.ac4MonthlyGoal || 48}
                        onSaveGoal={(newGoal) => saveSettings({ ac4MonthlyGoal: newGoal })}
                    />
                </div>

                {/* Expense Forecast Card (New) */}
                <div className="lg:col-span-1">
                    <ExpenseForecastCard transactions={transactions} />
                </div>

                {/* Scales / Next Shift Widget */}
                <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col h-full">
                    <h3 className="font-bold text-slate-800 dark:text-white mb-4 flex items-center gap-2">
                        <Calendar className="text-indigo-500" size={20} />
                        Próximos Plantões
                    </h3>

                    <div className="flex-1 overflow-y-auto pr-1 custom-scrollbar">
                        {scalesInsights.upcomingShifts.length > 0 ? (
                            <div className="space-y-4">
                                {scalesInsights.upcomingShifts.map((shift, index) => (
                                    <div key={index} className="flex items-start gap-4 p-3 hover:bg-slate-50 dark:hover:bg-slate-700/30 rounded-2xl transition-colors border border-transparent hover:border-slate-100 dark:hover:border-slate-700/50">
                                        <div className="flex flex-col items-center justify-center min-w-[3.5rem] bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl p-2.5 text-center border border-indigo-100 dark:border-indigo-500/10">
                                            <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">{format(parseISO(shift.date), 'MMM', { locale: ptBR })}</span>
                                            <span className="text-2xl font-bold text-slate-800 dark:text-white leading-none mt-0.5">{shift.date.split('-')[2]}</span>
                                        </div>
                                        <div className="flex-1 py-0.5">
                                            <div className="font-bold text-slate-700 dark:text-slate-100 text-sm mb-0.5 line-clamp-1">{shift.shiftTypeSnapshot.name}</div>
                                            <div className="text-xs text-slate-500 dark:text-slate-400 capitalize mb-2 font-medium">
                                                {format(parseISO(shift.date), 'EEEE', { locale: ptBR })}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="flex items-center gap-1.5 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2.5 py-1 rounded-full border border-slate-200 dark:border-slate-700">
                                                    <Clock size={10} />
                                                    {shift.shiftTypeSnapshot.startTime} - {shift.shiftTypeSnapshot.endTime}
                                                </div>
                                                {shift.scaleCategory && (
                                                    <span className={`text-[10px] font-bold px-2 py-1 rounded-full border ${shift.scaleCategory === 'AC-4'
                                                        ? 'text-violet-600 dark:text-violet-400 bg-violet-100 dark:bg-violet-900/30 border-violet-200 dark:border-violet-800/30'
                                                        : shift.scaleCategory === 'Diário'
                                                            ? 'text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 border-amber-200 dark:border-amber-800/30'
                                                            : 'text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700'
                                                        }`}>
                                                        {shift.scaleCategory}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="h-full flex flex-col items-center justify-center text-slate-400 text-sm py-8 gap-3">
                                <div className="w-12 h-12 bg-slate-50 dark:bg-slate-800 rounded-full flex items-center justify-center">
                                    <Calendar size={24} className="opacity-40" />
                                </div>
                                <span className="max-w-[150px] text-center opacity-80">Nenhum plantão agendado para os próximos dias.</span>
                            </div>
                        )}
                    </div>
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
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-6 pb-20 md:pb-0">

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
                                    {extraCharts.categoryData.map((entry, index) => {
                                        const catList = settings.categories['Despesa'] || [];
                                        const catItem = Array.isArray(catList)
                                            ? catList.find((c: any) => c.name === entry.name || c === entry.name)
                                            : null;
                                        const color = typeof catItem === 'object' ? catItem?.color : COLORS[index % COLORS.length];

                                        return <Cell key={`cell-${index}`} fill={color || COLORS[index % COLORS.length]} />;
                                    })}
                                </Pie>
                                <Tooltip formatter={(val: any) => formatCurrency(val || 0)} />
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
