import React, { useState } from 'react';
import { formatCurrency } from '../../utils/finance';
import { Zap, Target, Edit2, CheckCircle2, DollarSign } from 'lucide-react';
import type { ShiftEvent } from '../../modules/scales/types';

interface ExtraordinaryHoursCardProps {
    shifts: ShiftEvent[];
    selectedMonth: string;
    ac4Total: number;
    ac4Hours: number;
    goal: number;
    onSaveGoal: (newGoal: number) => void;
}

export const ExtraordinaryHoursCard: React.FC<ExtraordinaryHoursCardProps> = ({
    shifts,
    selectedMonth,
    ac4Total,
    ac4Hours,
    goal,
    onSaveGoal
}) => {
    // Goal State
    const [isEditingGoal, setIsEditingGoal] = useState(false);
    const [tempGoal, setTempGoal] = useState(goal.toString());

    // Save Goal
    const handleSaveGoal = () => {
        let val = parseInt(tempGoal);
        if (isNaN(val)) val = 48;
        if (val > 192) val = 192; // Max limit logic
        if (val < 0) val = 0;

        onSaveGoal(val);
        setIsEditingGoal(false);
    };

    // Use passed props directly for monthly totals
    const totalHoursMonth = ac4Hours;
    const totalValueMonth = ac4Total;

    // Annual Stats Calculation
    const currentYear = new Date().getFullYear();
    let totalHoursYear = 0;

    shifts.forEach(s => {
        if (s.status === 'canceled') return;

        // Dynamic duration calculation to match Dashboard.tsx logic
        const isAC4 = s.shiftTypeSnapshot?.isAC4 ||
            s.scaleCategory === 'AC-4' ||
            s.shiftTypeSnapshot?.name?.includes('AC-4');

        if (isAC4) {
            const shiftDate = new Date(s.date + 'T12:00:00');
            if (shiftDate.getFullYear() === currentYear) {
                const start = s.startTime.toDate ? s.startTime.toDate() : new Date(s.startTime as any);
                const end = s.endTime.toDate ? s.endTime.toDate() : new Date(s.endTime as any);
                const durationMs = end.getTime() - start.getTime();
                const h = durationMs > 0 ? durationMs / (1000 * 60 * 60) : 0;
                totalHoursYear += h;
            }
        }
    });

    const percentage = Math.min((totalHoursMonth / goal) * 100, 100);

    return (
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl border border-slate-100 dark:border-slate-700 shadow-sm relative overflow-hidden h-full flex flex-col group">
            <div className="flex justify-between items-start mb-4 relative z-10">
                <div>
                    <h3 className="font-bold text-slate-800 dark:text-white flex items-center gap-2">
                        <Zap className="text-violet-500" size={20} />
                        Horas Extraordinárias
                    </h3>
                    <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
                        {selectedMonth === 'Todos'
                            ? 'Total Acumulado (Todos os Períodos)'
                            : `Total no Mês (${selectedMonth.split(' ')[0]})`}
                    </p>
                </div>
                {/* Edit Goal Button */}
                <div className="flex items-center">
                    {isEditingGoal ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-2">
                            <input
                                type="number"
                                value={tempGoal}
                                onChange={(e) => setTempGoal(e.target.value)}
                                className="w-16 px-2 py-1 text-sm border border-slate-300 rounded-lg dark:bg-slate-700 dark:border-slate-600 dark:text-white focus:ring-2 focus:ring-violet-500 outline-none"
                                autoFocus
                            />
                            <button onClick={handleSaveGoal} className="text-emerald-500 hover:text-emerald-600 p-1 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded-full transition-colors"><CheckCircle2 size={18} /></button>
                        </div>
                    ) : (
                        <button
                            onClick={() => { setTempGoal(goal.toString()); setIsEditingGoal(true); }}
                            className="text-xs text-slate-400 hover:text-violet-500 font-medium flex items-center gap-1.5 px-2 py-1 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-all"
                        >
                            <Target size={14} />
                            <span>Meta: {goal}h</span>
                            <Edit2 size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex-1 flex flex-col justify-center relative z-10">
                <div className="flex items-end gap-2 mb-2">
                    <span className="text-4xl font-bold text-slate-800 dark:text-white">
                        {totalHoursMonth}h
                    </span>
                    <div className="flex flex-col mb-1.5">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {selectedMonth === 'Todos' ? 'ACUMULADO' : 'NO MÊS'}
                        </span>
                        {selectedMonth !== 'Todos' && (
                            <span className="text-xs text-slate-400 font-medium">
                                / {goal}h (Meta)
                            </span>
                        )}
                    </div>
                </div>

                {/* Progress Bar */}
                <div className="h-3 w-full bg-slate-100 dark:bg-slate-700 rounded-full overflow-hidden mb-2">
                    <div
                        className={`h-full rounded-full transition-all duration-1000 ${percentage >= 100 ? 'bg-emerald-500' :
                            percentage >= 80 ? 'bg-amber-500' : 'bg-violet-500'
                            }`}
                        style={{ width: `${percentage}%` }}
                    />
                </div>

                <div className="flex justify-between items-center text-xs font-medium">
                    <span className="text-slate-500 dark:text-slate-400">
                        {percentage >= 100 ? 'Cota Atingida!' : `${(100 - percentage).toFixed(0)}% restante`}
                    </span>
                    <span className="text-slate-500 dark:text-slate-400">
                        Anual: {totalHoursYear}h
                    </span>
                </div>
            </div>

            {/* Projected Value (Work Based) */}
            <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-700 relative z-10">
                <div className="flex justify-between items-center">
                    <span className="text-sm text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        <DollarSign size={14} />
                        Valor Estimado (Mês)
                    </span>
                    <span className="font-bold text-slate-800 dark:text-white">
                        {formatCurrency(totalValueMonth)}
                    </span>
                </div>
            </div>

            {/* Decorative BG */}
            <div className="absolute top-0 right-0 -mr-6 -mt-6 w-32 h-32 bg-violet-500 rounded-full blur-3xl opacity-10 pointer-events-none"></div>
        </div>
    );
};
