import React, { useState } from 'react';
import {
    format,
    startOfMonth,
    endOfMonth,
    startOfWeek,
    endOfWeek,
    eachDayOfInterval,
    isSameMonth,
    addMonths,
    subMonths,
    addWeeks,
    subWeeks,
    isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ShiftEvent, ShiftScale } from '../types';

interface CalendarViewProps {
    shifts: ShiftEvent[];
    scales: ShiftScale[];
    onDateClick?: (date: Date) => void;
    onShiftClick?: (shift: ShiftEvent) => void;
    onViewDateChange?: (date: Date) => void;
}

type ViewMode = 'month' | 'week';

export const CalendarView: React.FC<CalendarViewProps> = ({
    shifts,
    scales,
    onDateClick,
    onShiftClick,
    onViewDateChange
}) => {
    const [currentDate, setCurrentDate] = useState(new Date());
    const [viewMode, setViewMode] = useState<ViewMode>('month');

    // Navegação
    const next = () => {
        let newDate;
        if (viewMode === 'month') newDate = addMonths(currentDate, 1);
        else newDate = addWeeks(currentDate, 1);
        setCurrentDate(newDate);
        onViewDateChange?.(newDate);
    };

    const prev = () => {
        let newDate;
        if (viewMode === 'month') newDate = subMonths(currentDate, 1);
        else newDate = subWeeks(currentDate, 1);
        setCurrentDate(newDate);
        onViewDateChange?.(newDate);
    };

    const today = () => {
        const newDate = new Date();
        setCurrentDate(newDate);
        onViewDateChange?.(newDate);
    };

    // Geração dos dias do grid
    const getDays = () => {
        let start, end;
        if (viewMode === 'month') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            start = startOfWeek(monthStart);
            end = endOfWeek(monthEnd);
        } else {
            start = startOfWeek(currentDate);
            end = endOfWeek(currentDate);
        }
        return eachDayOfInterval({ start, end });
    };

    const days = getDays();

    // Helper para encontrar shifts do dia
    const getShiftsForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        // Filter instead of find
        const dayShifts = shifts.filter(s => s.date === dateStr && s.status !== 'canceled');
        return dayShifts;
    };

    const getShiftColor = (shift: ShiftEvent) => {
        // 1. Try denormalized category
        let category = shift.scaleCategory;

        // 2. Fallback to lookup in scales prop if missing
        if (!category && shift.scaleId) {
            const scale = scales.find(s => s.id === shift.scaleId);
            if (scale) category = scale.category;
        }

        // 3. Map category to color
        switch (category) {
            case 'AC-4':
                return '#10B981'; // Emerald 500 (Green)
            case 'Suplementar':
                return '#8B5CF6'; // Violet 500 (Purple)
            case 'Troca':
                return '#0EA5E9'; // Sky 500 (Blue) - Distinct from Navy Blue of Night Shift
            case 'Outros':
                return '#6B7280'; // Gray 500
            case 'Diário':
            default:
                // For Diário or unknown, preserve the Semantic Color of the Shift Type (Day=Amber, Night=Blue, 24h=Red)
                return shift.shiftTypeSnapshot.color;
        }
    };

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
            {/* Header */}
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 gap-4 sm:gap-0">
                <div className="flex items-center space-x-2">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-white capitalize">
                        {format(currentDate, viewMode === 'month' ? 'MMMM yyyy' : "'Semana de' d 'de' MMMM", { locale: ptBR })}
                    </h2>
                </div>

                <div className="flex items-center justify-between w-full sm:w-auto space-x-2">
                    <div className="flex bg-gray-100 dark:bg-gray-700 rounded-lg p-1 mr-2">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${viewMode === 'month'
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center ${viewMode === 'week'
                                ? 'bg-white dark:bg-gray-600 text-indigo-600 dark:text-white shadow-sm'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'
                                }`}
                        >
                            Semana
                        </button>
                    </div>

                    <div className="flex items-center space-x-1">
                        <button
                            onClick={prev}
                            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Anterior"
                        >
                            <span className="text-xl">←</span>
                        </button>
                        <button
                            onClick={today}
                            className="px-4 py-2 text-sm font-medium bg-indigo-50 dark:bg-indigo-900 text-indigo-600 dark:text-indigo-200 rounded-lg hover:bg-indigo-100 min-h-[44px] flex items-center"
                        >
                            Hoje
                        </button>
                        <button
                            onClick={next}
                            className="p-3 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full min-h-[44px] min-w-[44px] flex items-center justify-center"
                            aria-label="Próximo"
                        >
                            <span className="text-xl">→</span>
                        </button>
                    </div>
                </div>
            </div>

            {/* Grid */}
            <div className={`grid ${viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'} gap-px bg-gray-200 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-700`}>
                {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
                    <div key={day} className="bg-gray-50 dark:bg-gray-800 p-2 text-center text-xs font-medium text-gray-500 dark:text-gray-400">
                        {day}
                    </div>
                ))}
            </div>

            <div className={`grid ${viewMode === 'month' ? 'grid-cols-7' : 'grid-cols-7'} gap-px bg-gray-200 dark:bg-gray-700`}>
                {days.map(day => {
                    const shiftsForDay = getShiftsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => onDateClick && onDateClick(day)}
                            className={`
                min-h-[80px] sm:min-h-[120px] bg-white dark:bg-gray-800 p-1 sm:p-2 relative hover:bg-gray-50 dark:hover:bg-gray-750 transition-colors cursor-pointer
                ${!isCurrentMonth && viewMode === 'month' ? 'bg-gray-50 dark:bg-gray-900' : ''}
              `}
                        >
                            <div className={`
                text-xs sm:text-sm font-medium mb-1
                ${isTodayDate
                                    ? 'bg-indigo-600 text-white w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full'
                                    : (!isCurrentMonth && viewMode === 'month' ? 'text-gray-400 dark:text-gray-600' : 'text-gray-700 dark:text-gray-300')
                                }
              `}>
                                {format(day, 'd')}
                            </div>

                            <div className="flex flex-col gap-1 mt-1">
                                {shiftsForDay.map(shift => (
                                    <div
                                        key={shift.id}
                                        onClick={(e) => { e.stopPropagation(); onShiftClick && onShiftClick(shift); }}
                                        className="p-1 rounded text-[10px] sm:text-xs font-semibold text-white shadow-sm overflow-hidden text-ellipsis whitespace-nowrap hover:opacity-90 transition-opacity min-h-[24px] flex items-center"
                                        style={{ backgroundColor: getShiftColor(shift) }}
                                        title={`${shift.shiftTypeSnapshot.name} - ${shift.shiftTypeSnapshot.startTime} às ${shift.shiftTypeSnapshot.endTime}`}
                                    >
                                        <div className="flex justify-between items-center w-full px-1">
                                            <span>{shift.shiftTypeSnapshot.code}</span>
                                            <span className="opacity-75 font-normal ml-1 hidden sm:inline">
                                                {shift.shiftTypeSnapshot.startTime}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
