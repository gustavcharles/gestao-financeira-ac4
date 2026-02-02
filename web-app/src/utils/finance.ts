import { format, addMonths, subMonths, getDate, setDate, lastDayOfMonth, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface Transaction {
    id?: string;
    user_id: string;
    tipo: 'Receita' | 'Despesa';
    descricao: string;
    categoria: string;
    valor: number;
    data: string; // ISO Date String YYYY-MM-DD
    mes_referencia: string; // "Janeiro 2026"
    status: 'Pago' | 'Recebido' | 'Pendente';
    recorrente: boolean;
    created_at?: any;
}

export const MONTH_MAP: { [key: string]: number } = {
    "Janeiro": 0, "Fevereiro": 1, "Março": 2, "Abril": 3,
    "Maio": 4, "Junho": 5, "Julho": 6, "Agosto": 7,
    "Setembro": 8, "Outubro": 9, "Novembro": 10, "Dezembro": 11
};

export const formatCurrency = (value: number): string => {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
};

export const getMonthFromDate = (date: Date): string => {
    const monthName = format(date, 'MMMM', { locale: ptBR });
    // Capitalize first letter
    const formattedMonth = monthName.charAt(0).toUpperCase() + monthName.slice(1);
    return `${formattedMonth} ${date.getFullYear()}`;
};

export const getShiftedReferenceMonth = (dateObj: Date, category: string, type: 'Receita' | 'Despesa'): string => {
    let shift = 0;
    if (type === 'Receita') {
        if (category === 'AC-4') {
            shift = 2;
        }
    }

    if (shift > 0) {
        const newDate = addMonths(dateObj, shift);
        return getMonthFromDate(newDate);
    }

    return getMonthFromDate(dateObj);
};

// This function would likely be called in a service or effect, 
// taking the full list of transactions to check for recurrence.
export const checkRecurringBills = (transactions: Transaction[]): Transaction[] => {
    const today = new Date();
    const currentMonthStr = getMonthFromDate(today);

    const lastMonthDate = subMonths(today, 1);
    const lastMonthStr = getMonthFromDate(lastMonthDate);

    // 1. Get recurring headers from last month
    const recurringLastMonth = transactions.filter(t =>
        t.mes_referencia === lastMonthStr && t.recorrente
    );

    if (recurringLastMonth.length === 0) return [];

    // 2. Check overlap in current month
    const currentMonthTransactions = transactions.filter(t =>
        t.mes_referencia === currentMonthStr
    );

    // Create a set of signatures (descricao + categoria)
    const existingSigs = new Set(
        currentMonthTransactions.map(t => `${t.descricao}|${t.categoria}`)
    );

    const newTransactions: Transaction[] = [];

    recurringLastMonth.forEach(t => {
        const sig = `${t.descricao}|${t.categoria}`;
        if (!existingSigs.has(sig)) {
            // Create new transaction
            // Try to keep same day
            const originalDate = new Date(t.data); // Assuming YYYY-MM-DD
            const targetDay = getDate(originalDate);

            const lastDay = lastDayOfMonth(today);
            const safeDay = Math.min(targetDay, getDate(lastDay));

            const newDateObj = setDate(today, safeDay);
            const newDateStr = format(newDateObj, 'yyyy-MM-dd');

            newTransactions.push({
                user_id: t.user_id,
                tipo: t.tipo,
                descricao: t.descricao,
                categoria: t.categoria,
                valor: t.valor,
                data: newDateStr,
                mes_referencia: currentMonthStr,
                status: 'Pendente',
                recorrente: true
            });
        }
    });

    return newTransactions;
};

export const generateAdvancedInsights = (transactions: Transaction[], selectedMonth: string): string[] => {
    const insights: string[] = [];
    const expenses = transactions.filter(t => t.tipo === 'Despesa');

    if (expenses.length === 0) return insights;

    // 1. Spending Patterns (Weekend)
    const dayCounts = new Map<number, number>();
    expenses.forEach(t => {
        // Parse ISO String Date (YYYY-MM-DD)
        const date = parseISO(t.data);
        const day = date.getDay(); // 0 = Sun, 6 = Sat
        dayCounts.set(day, (dayCounts.get(day) || 0) + 1);
    });

    let context = 'none';
    let maxCount = 0;
    dayCounts.forEach((count, day) => {
        if (count > maxCount) {
            maxCount = count;
            // date-fns: 0=Sun, 6=Sat
            if (day === 0 || day === 6) context = 'weekend';
            else context = 'weekday';
        }
    });

    if (context === 'weekend') {
        insights.push("💡 Você gasta mais nos fins de semana!");
    }

    // 2. Potential Savings (vs Average)
    // Calculate total expenses per month
    const monthlyExpenses = new Map<string, number>();
    expenses.forEach(t => {
        const m = t.mes_referencia;
        monthlyExpenses.set(m, (monthlyExpenses.get(m) || 0) + Number(t.valor));
    });

    if (monthlyExpenses.size > 0) {
        let totalAllMonths = 0;
        monthlyExpenses.forEach(val => totalAllMonths += val);
        const avgMonthly = totalAllMonths / monthlyExpenses.size;

        const currentMonthExpense = monthlyExpenses.get(selectedMonth) || 0;

        // Savings Insight (< 90% of average)
        if (currentMonthExpense > 0 && currentMonthExpense < avgMonthly * 0.9) {
            const economy = avgMonthly - currentMonthExpense;
            insights.push(`🎉 Você economizou ${formatCurrency(economy)} em relação à média!`);
        } else if (currentMonthExpense > avgMonthly * 1.1) {
            // Overspending Insight (> 110% of average)
            const excess = currentMonthExpense - avgMonthly;
            insights.push(`⚠️ Gastos ${formatCurrency(excess)} acima da média mensal.`);
        }
    }

    // 3. Top Category Insight (Always distinct if data exists)
    if (expenses.length > 0) {
        const catMap = new Map<string, number>();
        expenses.filter(t => t.mes_referencia === selectedMonth).forEach(t => {
            catMap.set(t.categoria, (catMap.get(t.categoria) || 0) + t.valor);
        });

        if (catMap.size > 0) {
            const sortedCats = Array.from(catMap.entries()).sort((a, b) => b[1] - a[1]);
            const topCat = sortedCats[0];
            insights.push(`📊 Maior gasto do mês: ${topCat[0]} (${formatCurrency(topCat[1])})`);
        }
    }

    return insights;
};
