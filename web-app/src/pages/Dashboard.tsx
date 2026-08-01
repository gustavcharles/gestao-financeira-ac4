import { useMemo, useState } from 'react';
import { ExtraordinaryHoursCard } from '../components/dashboard/ExtraordinaryHoursCard';
import { ExpenseForecastCard } from '../components/dashboard/ExpenseForecastCard';
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
    Shield,
    Bell,
    TrendingDown,
    ChevronDown,
    Sparkles
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
import { format, parseISO, subMonths } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { TrialBanner } from '../components/TrialBanner';

export const Dashboard = () => {
    const { transactions, loading } = useTransactions();
    const { settings, saveSettings } = useSettings();
    const { currentUser } = useAuth();
    const { shifts } = useScales(currentUser?.uid);
    const [selectedMonth, setSelectedMonth] = useState<string>(() => getMonthFromDate(new Date()));

    // Generate Month Options
    const months = useMemo(() => {
        const uniqueMonths = new Set<string>();

        transactions.forEach(t => uniqueMonths.add(t.mes_referencia));

        if (shifts) {
            shifts.forEach(s => {
                if (s.date) {
                    try {
                        const shiftDate = parseISO(s.date);
                        const monthStr = getMonthFromDate(shiftDate);
                        uniqueMonths.add(monthStr);
                    } catch {
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
                return Number(yearB) - Number(yearA);
            }
            return (monthMap[monthB] || 0) - (monthMap[monthA] || 0);
        });
    }, [transactions, shifts]);

    const filteredData = useMemo(() => {
        if (selectedMonth === 'Todos') return transactions;
        return transactions.filter(t => t.mes_referencia === selectedMonth);
    }, [transactions, selectedMonth]);

    // Financial Calculations
    const calculations = useMemo(() => {
        let rec = 0;
        let desp = 0;
        let ac4Total = 0;
        const recByCat = new Map<string, number>();

        filteredData.forEach(t => {
            const valor = Number(t.valor);
            if (t.tipo === 'Receita') {
                rec += valor;
                recByCat.set(t.categoria, (recByCat.get(t.categoria) || 0) + valor);
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

    // Comparativo Ganhos Extras com mês anterior
    const ac4Trend = useMemo(() => {
        const currentMonthAc4 = calculations.ac4Total;
        let prevMonthAc4 = 0;

        // Calcular mês anterior
        const now = new Date();
        const prevDate = subMonths(now, 1);
        const prevMonthStr = getMonthFromDate(prevDate);

        transactions.forEach(t => {
            if (t.tipo === 'Receita' && t.categoria === 'AC-4' && t.mes_referencia === prevMonthStr) {
                prevMonthAc4 += Number(t.valor);
            }
        });

        if (prevMonthAc4 === 0) return { percent: 0, isUp: true };

        const diff = ((currentMonthAc4 - prevMonthAc4) / prevMonthAc4) * 100;
        return {
            percent: Math.abs(Math.round(diff * 10) / 10),
            isUp: diff >= 0
        };
    }, [calculations.ac4Total, transactions]);

    // Advanced Insights
    const advancedInsights = useMemo(() => {
        return generateAdvancedInsights(transactions, selectedMonth);
    }, [transactions, selectedMonth]);

    // Mini Bar Chart Data for Ganhos Extras
    const miniBarData = useMemo(() => {
        const monthsList = months.slice(0, 6).reverse();
        if (monthsList.length === 0) {
            return [
                { name: 'M1', val: 1200 },
                { name: 'M2', val: 2100 },
                { name: 'M3', val: 1800 },
                { name: 'M4', val: 2800 },
                { name: 'M5', val: 3210 }
            ];
        }

        return monthsList.map(m => {
            let total = 0;
            transactions.forEach(t => {
                if (t.tipo === 'Receita' && t.categoria === 'AC-4' && t.mes_referencia === m) {
                    total += Number(t.valor);
                }
            });
            return { name: m.split(' ')[0].substring(0, 3), val: total };
        });
    }, [transactions, months]);

    // Chart Data
    const chartData = useMemo(() => {
        const dailyMap = new Map<string, number>();
        filteredData.forEach(t => {
            const val = Number(t.valor);
            const prev = dailyMap.get(t.data) || 0;
            dailyMap.set(t.data, prev + val);
        });

        return Array.from(dailyMap.entries())
            .map(([date, value]) => ({ date, value }))
            .sort((a, b) => a.date.localeCompare(b.date));
    }, [filteredData]);

    // Extra Chart Data
    const extraCharts = useMemo(() => {
        const catMap = new Map<string, number>();
        filteredData.filter(t => t.tipo === 'Despesa').forEach(t => {
            const current = catMap.get(t.categoria) || 0;
            catMap.set(t.categoria, current + Number(t.valor));
        });
        const categoryData = Array.from(catMap.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value);

        const heatMap = new Map<string, number>();
        filteredData.forEach(t => {
            const current = heatMap.get(t.data) || 0;
            heatMap.set(t.data, current + Number(t.valor));
        });

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

        const upcomingShifts = shifts
            .filter(s => s.status !== 'canceled')
            .filter(s => s.date >= nowStr)
            .sort((a, b) => a.date.localeCompare(b.date))
            .slice(0, 5);

        let ac4Total = 0;
        let ac4Hours = 0;

        shifts.forEach(s => {
            if (s.status === 'canceled') return;

            const isAC4 = s.shiftTypeSnapshot?.isAC4 ||
                s.scaleCategory === 'AC-4' ||
                s.shiftTypeSnapshot?.name?.includes('AC-4');

            if (isAC4) {
                const shiftDate = parseISO(s.date);
                const shiftMonthStr = getMonthFromDate(shiftDate);

                const start = typeof (s.startTime as { toDate?: () => Date })?.toDate === 'function' ? (s.startTime as { toDate: () => Date }).toDate() : new Date(s.startTime as unknown as string);
                const end = typeof (s.endTime as { toDate?: () => Date })?.toDate === 'function' ? (s.endTime as { toDate: () => Date }).toDate() : new Date(s.endTime as unknown as string);
                const val = calculateShiftValue(start, end);
                const durationMs = end.getTime() - start.getTime();
                const h = durationMs > 0 ? durationMs / (1000 * 60 * 60) : 0;

                let match = false;
                if (selectedMonth === 'Todos') {
                    match = true;
                } else if (shiftMonthStr === selectedMonth) {
                    match = true;
                }

                if (match) {
                    ac4Total += val;
                    ac4Hours += h;
                }
            }
        });

        return { upcomingShifts, ac4Total, ac4Hours };
    }, [shifts, selectedMonth]);

    const COLORS = ['#10B981', '#3B82F6', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#6366F1'];

    if (loading) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-500"></div>
            </div>
        );
    }

    return (
        <div className="max-w-4xl mx-auto space-y-6 text-white pb-12 animate-in fade-in duration-300">

            {/* Header Brand Bar (Estilo Print "Gestão AC4 PRO") */}
            <div className="bg-[#0b1329] border border-slate-800/80 rounded-3xl p-4 flex items-center justify-between shadow-xl">
                <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center shadow-lg shadow-blue-500/20 border border-blue-400/30">
                        <Shield className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h1 className="text-lg sm:text-xl font-extrabold tracking-wide text-white flex items-center gap-1.5">
                            Gestão <span className="text-blue-500">AC4 PRO</span>
                        </h1>
                        <p className="text-xs text-slate-400">Painel Financeiro & Escalas</p>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <button className="p-2.5 rounded-2xl bg-slate-900/90 text-slate-400 hover:text-white border border-slate-800 transition-all relative">
                        <Bell className="w-5 h-5" />
                        <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-blue-500" />
                    </button>
                </div>
            </div>

            {/* Trial Banner */}
            <TrialBanner />

            {/* Welcome Card */}
            {settings.showWelcome && (
                <div className="bg-gradient-to-r from-blue-600 to-indigo-800 rounded-3xl p-5 text-white shadow-xl relative overflow-hidden animate-in slide-in-from-top-4 duration-500">
                    <div className="relative z-10">
                        <h3 className="text-lg font-bold mb-2 flex items-center gap-2">
                            <Sparkles className="w-5 h-5 text-yellow-300" /> Bem-vindo ao Gestão AC-4 Pro!
                        </h3>
                        <p className="text-xs text-blue-100 mb-3">
                            Gerencie suas escalas de serviço, controle receitas extraordinárias AC-4 e acompanhe suas finanças.
                        </p>
                        <button
                            onClick={() => saveSettings({ showWelcome: false })}
                            className="bg-white text-blue-700 px-4 py-1.5 rounded-xl font-semibold text-xs hover:bg-blue-50 transition-colors shadow-sm cursor-pointer"
                        >
                            Entendi!
                        </button>
                    </div>
                </div>
            )}

            {/* Card 1: Resumo Financeiro (Estilo do Print do Usuário) */}
            <div className="space-y-2">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide">
                    Resumo financeiro
                </h2>

                <div className="bg-[#131b2e] border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
                    {/* Header Saldo */}
                    <div className="flex items-center justify-between">
                        <div>
                            <div className="text-xs sm:text-sm font-semibold text-slate-300 flex items-center gap-2">
                                <Wallet className="w-4 h-4 text-emerald-400" />
                                <span>Saldo do Mês</span>
                            </div>
                            <div className={`text-2xl sm:text-3xl font-extrabold tracking-tight mt-1 ${calculations.saldo >= 0 ? 'text-white' : 'text-red-400'}`}>
                                {formatCurrency(calculations.saldo)}
                            </div>
                        </div>

                        <div className="text-xs text-slate-400 font-medium bg-[#18233c] border border-slate-700/60 px-3 py-1.5 rounded-xl">
                            {selectedMonth === 'Todos' ? 'Todos os Períodos' : selectedMonth}
                        </div>
                    </div>

                    {/* Bloco Receitas (com sub-breakdown Salário / AC-4) */}
                    <div className="bg-[#18233c] border border-slate-700/50 rounded-2xl p-4 space-y-2.5">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                                    <ArrowUpRight className="w-4 h-4" />
                                </div>
                                <span className="font-bold text-sm sm:text-base text-slate-100">Receitas</span>
                            </div>
                            <span className="font-extrabold text-sm sm:text-base text-[#22c55e]">
                                {formatCurrency(calculations.rec)}
                            </span>
                        </div>

                        {/* Sub-breakdown: Salário, AC-4, etc com linha guia no lado esquerdo */}
                        {calculations.recCategories.length > 0 && (
                            <div className="ml-4 pl-4 border-l-2 border-emerald-500/40 space-y-1.5 pt-1">
                                {calculations.recCategories.map((cat, idx) => (
                                    <div key={idx} className="flex justify-between items-center text-xs sm:text-sm text-slate-300">
                                        <span className="font-medium text-slate-300">{cat.name}</span>
                                        <span className="font-semibold text-emerald-400">
                                            {formatCurrency(cat.value)}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Bloco Despesas */}
                    <div className="bg-[#18233c] border border-slate-700/50 rounded-2xl p-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-red-500/20 border border-red-500/30 flex items-center justify-center text-red-400">
                                <ArrowDownRight className="w-4 h-4" />
                            </div>
                            <span className="font-bold text-sm sm:text-base text-slate-100">Despesas</span>
                        </div>
                        <span className="font-extrabold text-sm sm:text-base text-red-400">
                            {formatCurrency(calculations.desp)}
                        </span>
                    </div>
                </div>
            </div>

            {/* Card 2: Ganhos Extras (Estilo Print) */}
            <div className="space-y-2">
                <div className="flex items-center justify-between">
                    <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide">
                        Ganhos extras
                    </h2>

                    <div className="relative">
                        <select
                            value={selectedMonth}
                            onChange={(e) => setSelectedMonth(e.target.value)}
                            className="bg-[#131b2e] border border-slate-700/60 text-slate-300 text-xs py-1.5 px-3 pr-8 rounded-xl outline-none cursor-pointer appearance-none shadow-sm hover:border-slate-600 transition-colors"
                        >
                            <option value="Todos">Todos os Períodos</option>
                            {months.map(m => <option key={m} value={m}>{m}</option>)}
                        </select>
                        <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5 pointer-events-none" />
                    </div>
                </div>

                <div className="bg-[#131b2e] border border-slate-800/80 rounded-3xl p-5 sm:p-6 shadow-xl flex items-center justify-between gap-4">
                    <div className="space-y-2">
                        <div className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
                            {formatCurrency(calculations.ac4Total)}
                        </div>

                        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-semibold">
                            {ac4Trend.isUp ? (
                                <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                            ) : (
                                <TrendingDown className="w-4 h-4 text-red-400" />
                            )}
                            <span>{ac4Trend.percent}%</span>
                            <span className="text-slate-400 font-normal">em relação ao mês anterior</span>
                        </div>
                    </div>

                    {/* Mini Vertical Bar Chart Graphic (Lado Direito) */}
                    <div className="w-36 h-16 flex items-center justify-end">
                        <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={miniBarData}>
                                <Bar dataKey="val" fill="#2563eb" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>
            </div>

            {/* Cards de Análise (Horas Extraordinárias AC-4 e Previsão de Despesas) antes de Minhas Escalas */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <ExtraordinaryHoursCard
                    shifts={shifts}
                    selectedMonth={selectedMonth}
                    ac4Total={scalesInsights.ac4Total}
                    ac4Hours={scalesInsights.ac4Hours}
                    goal={settings.ac4MonthlyGoal || 48}
                    onSaveGoal={(newGoal) => saveSettings({ ac4MonthlyGoal: newGoal })}
                />

                <ExpenseForecastCard transactions={transactions} />
            </div>

            {/* Card 3: Minhas Escalas (Estilo Print) */}
            <div className="space-y-3">
                <h2 className="text-base sm:text-lg font-bold text-slate-100 tracking-wide">
                    Minhas escalas
                </h2>

                {scalesInsights.upcomingShifts.length === 0 ? (
                    <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-5 text-center text-slate-400 text-sm">
                        Nenhum plantão agendado nos próximos dias.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {scalesInsights.upcomingShifts.map((shift, idx) => {
                            const dateObj = parseISO(shift.date);
                            const dayNum = format(dateObj, 'dd');
                            const monthAbbr = format(dateObj, 'MMM', { locale: ptBR }).toUpperCase();
                            const isAC4 = shift.scaleCategory === 'AC-4' || shift.shiftTypeSnapshot?.isAC4;
                            const isFolga = shift.shiftTypeSnapshot?.name?.toLowerCase().includes('folga');

                            return (
                                <div
                                    key={idx}
                                    className="bg-[#131b2e] hover:bg-[#18233c] border border-slate-800/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all shadow-sm"
                                >
                                    <div className="flex items-center gap-3.5">
                                        {/* Date Box (Estilo Print: 24 MAI em quadrado azul escuro) */}
                                        <div className="bg-[#1a2744] border border-blue-500/20 rounded-xl px-3 py-2 text-center min-w-[52px] flex flex-col items-center justify-center">
                                            <span className="text-base sm:text-lg font-bold text-blue-400 leading-none">
                                                {dayNum}
                                            </span>
                                            <span className="text-[10px] font-bold text-blue-300 uppercase tracking-wider mt-0.5">
                                                {monthAbbr}
                                            </span>
                                        </div>

                                        {/* Shift Info */}
                                        <div>
                                            <div className="text-sm sm:text-base font-semibold text-slate-100">
                                                {isAC4 ? 'Escala Extra (AC-4)' : isFolga ? 'Folga' : shift.shiftTypeSnapshot?.name || 'Escala Diária'}
                                            </div>
                                            <div className="text-xs text-slate-400 font-medium">
                                                {isFolga ? 'Dia de descanso' : `${shift.shiftTypeSnapshot?.startTime || '08:00'} às ${shift.shiftTypeSnapshot?.endTime || '20:00'}`}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Status Badge (Confirmada em Verde / Programada em Azul) */}
                                    <div>
                                        <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${isAC4
                                                ? 'bg-[#16382c] text-[#4ade80] border-emerald-800/60'
                                                : isFolga
                                                    ? 'bg-[#1e293b] text-slate-400 border-slate-700/60'
                                                    : 'bg-[#1a2b4c] text-[#60a5fa] border-blue-800/60'
                                            }`}>
                                            {shift.status === 'confirmed' ? 'Confirmada' : 'Programada'}
                                        </span>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

            {/* Insights & Fluxo Financeiro */}
            {advancedInsights.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {advancedInsights.map((insight, index) => (
                        <div key={index} className="bg-[#131b2e] border border-slate-800/80 p-4 rounded-2xl flex items-center gap-3 shadow-sm">
                            <span className="text-xl">{insight.split(' ')[0]}</span>
                            <p className="font-medium text-slate-200 text-xs sm:text-sm">
                                {insight.substring(2)}
                            </p>
                        </div>
                    ))}
                </div>
            )}

            {/* Chart Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                {/* 1. Area Chart (Fluxo Diário) */}
                <div className="bg-[#131b2e] border border-slate-800/80 p-5 sm:p-6 rounded-3xl shadow-xl">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <TrendingUp className="text-blue-500" size={18} />
                        Fluxo Financeiro Diário
                    </h3>
                    <div className="h-[240px] w-full">
                        <ResponsiveContainer width="100%" height="100%">
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorVal" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3} />
                                        <stop offset="95%" stopColor="#2563eb" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <XAxis dataKey="date" hide />
                                <YAxis hide />
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', background: '#0b1329', border: '1px solid #1e293b', color: '#fff' }}
                                    formatter={(value: unknown) => [formatCurrency(Number(value) || 0), 'Volume']}
                                />
                                <Area type="monotone" dataKey="value" stroke="#2563eb" strokeWidth={3} fillOpacity={1} fill="url(#colorVal)" />
                            </AreaChart>
                        </ResponsiveContainer>
                    </div>
                </div>

                {/* 2. Pie Chart (Despesas por Categoria) */}
                <div className="bg-[#131b2e] border border-slate-800/80 p-5 sm:p-6 rounded-3xl shadow-xl">
                    <h3 className="font-bold text-white mb-4 flex items-center gap-2 text-sm sm:text-base">
                        <AlertCircle className="text-amber-500" size={18} />
                        Despesas por Categoria
                    </h3>
                    <div className="h-[240px] w-full flex flex-col justify-center">
                        <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                                <Pie
                                    data={extraCharts.categoryData}
                                    innerRadius={50}
                                    outerRadius={75}
                                    paddingAngle={5}
                                    dataKey="value"
                                >
                                    {extraCharts.categoryData.map((entry, index) => {
                                        const catList = settings.categories['Despesa'] || [];
                                        const catItem = Array.isArray(catList)
                                            ? catList.find((c: unknown) => {
                                                if (typeof c === 'object' && c !== null && 'name' in c) {
                                                    return (c as { name: string }).name === entry.name;
                                                }
                                                return c === entry.name;
                                            })
                                            : null;
                                        const color = typeof catItem === 'object' && catItem !== null && 'color' in catItem ? (catItem as { color?: string }).color : COLORS[index % COLORS.length];

                                        return <Cell key={`cell-${index}`} fill={color || COLORS[index % COLORS.length]} />;
                                    })}
                                </Pie>
                                <Tooltip
                                    contentStyle={{ borderRadius: '12px', background: '#0b1329', border: '1px solid #1e293b', color: '#fff' }}
                                    formatter={(val: unknown) => formatCurrency(Number(val) || 0)}
                                />
                                <Legend />
                            </PieChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
};
