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
    isToday,
    isSameDay,
    parseISO,
    isBefore,
    startOfDay
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight, ChevronRight as ChevronRightIcon } from 'lucide-react';
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
    const [selectedDate, setSelectedDate] = useState<Date>(new Date());
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
        setSelectedDate(newDate);
        onViewDateChange?.(newDate);
    };

    // Geração dos dias do grid (segunda-feira como início da semana)
    const getDays = () => {
        let start, end;
        if (viewMode === 'month') {
            const monthStart = startOfMonth(currentDate);
            const monthEnd = endOfMonth(currentDate);
            start = startOfWeek(monthStart, { weekStartsOn: 1 });
            end = endOfWeek(monthEnd, { weekStartsOn: 1 });
        } else {
            start = startOfWeek(currentDate, { weekStartsOn: 1 });
            end = endOfWeek(currentDate, { weekStartsOn: 1 });
        }
        return eachDayOfInterval({ start, end });
    };

    const days = getDays();

    // Helper para encontrar shifts do dia
    const getShiftsForDay = (day: Date) => {
        const dateStr = format(day, 'yyyy-MM-dd');
        return shifts.filter(s => s.date === dateStr && s.status !== 'canceled');
    };

    // Helper para definir etiqueta (badge) do plantão por categoria de escala (Diário, AC-4, Troca, Suplementar, Outros, Folga)
    const getBadgeInfo = (shift: ShiftEvent) => {
        const name = shift.shiftTypeSnapshot?.name?.toLowerCase() || '';
        const category = shift.scaleCategory || (shift.scaleId ? scales.find(s => s.id === shift.scaleId)?.category : undefined);

        // 1. Folga explícita
        if (name.includes('folga') || (category as string) === 'Folga') {
            return {
                label: 'FOLGA',
                shortLabel: 'FLG',
                colorClass: 'bg-[#22c55e] text-white shadow-sm',
                dotClass: 'bg-[#22c55e]',
                textClass: 'text-[#22c55e]'
            };
        }

        // 2. Categorias de Escala com Cores Distintas
        switch (category) {
            case 'AC-4':
                return {
                    label: 'AC-4',
                    shortLabel: 'AC4',
                    colorClass: 'bg-[#10b981] text-white shadow-sm',
                    dotClass: 'bg-[#10b981]',
                    textClass: 'text-[#10b981]'
                };

            case 'Troca':
                return {
                    label: 'TROCA',
                    shortLabel: 'TRC',
                    colorClass: 'bg-[#0ea5e9] text-white shadow-sm',
                    dotClass: 'bg-[#0ea5e9]',
                    textClass: 'text-sky-400'
                };

            case 'Suplementar':
                return {
                    label: 'SUPL.',
                    shortLabel: 'SUP',
                    colorClass: 'bg-[#8b5cf6] text-white shadow-sm',
                    dotClass: 'bg-[#8b5cf6]',
                    textClass: 'text-violet-400'
                };

            case 'Outros':
                return {
                    label: 'OUTROS',
                    shortLabel: 'OUT',
                    colorClass: 'bg-[#f59e0b] text-white shadow-sm',
                    dotClass: 'bg-[#f59e0b]',
                    textClass: 'text-amber-400'
                };

            case 'Diário':
            default:
                return {
                    label: 'DIÁRIO',
                    shortLabel: 'DIA',
                    colorClass: 'bg-[#ef4444] text-white shadow-sm',
                    dotClass: 'bg-[#ef4444]',
                    textClass: 'text-red-400'
                };
        }
    };

    // Plantões futuros a partir do dia selecionado ou de hoje para a seção "Próximos serviços"
    const todayStart = startOfDay(new Date());
    const filterStartDate = isBefore(selectedDate, todayStart) ? selectedDate : todayStart;

    const upcomingShifts = shifts
        .filter(s => s.status !== 'canceled' && !isBefore(startOfDay(parseISO(s.date)), filterStartDate))
        .sort((a, b) => parseISO(a.date).getTime() - parseISO(b.date).getTime())
        .slice(0, 10);

    return (
        <div className="bg-[#0b1329] text-white rounded-2xl sm:rounded-3xl px-2 py-3.5 sm:p-6 shadow-2xl border border-slate-800/80 max-w-4xl mx-auto space-y-4 sm:space-y-6">

            {/* Header com Nome do Mês Centralizado e Setas < Mês 2025 > estilo Print 1 */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 sm:gap-4 pb-2 border-b border-slate-800/60">

                {/* Visual Mode Selector & Hoje */}
                <div className="flex items-center space-x-2 order-2 sm:order-1">
                    <div className="flex bg-slate-900/90 rounded-xl p-1 border border-slate-800">
                        <button
                            onClick={() => setViewMode('month')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'month'
                                    ? 'bg-slate-800 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Mês
                        </button>
                        <button
                            onClick={() => setViewMode('week')}
                            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-all ${viewMode === 'week'
                                    ? 'bg-slate-800 text-white shadow'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                        >
                            Semana
                        </button>
                    </div>

                    <button
                        onClick={today}
                        className="px-3 py-1.5 text-xs font-semibold bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 border border-blue-500/30 rounded-xl transition-all"
                    >
                        Hoje
                    </button>
                </div>

                {/* Central Month Title with Nav Arrows */}
                <div className="flex items-center space-x-4 order-1 sm:order-2">
                    <button
                        onClick={prev}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-full transition-all"
                        aria-label="Mês Anterior"
                    >
                        <ChevronLeft className="w-6 h-6" />
                    </button>

                    <h2 className="text-xl sm:text-2xl font-bold tracking-wide text-white capitalize min-w-[140px] text-center">
                        {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
                    </h2>

                    <button
                        onClick={next}
                        className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800/60 rounded-full transition-all"
                        aria-label="Próximo Mês"
                    >
                        <ChevronRight className="w-6 h-6" />
                    </button>
                </div>

                <div className="hidden sm:block order-3 w-[120px]" />
            </div>

            {/* Dias da Semana (SEG TER QUA QUI SEX SÁB DOM) */}
            <div className="grid grid-cols-7 gap-1 text-center">
                {['SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB', 'DOM'].map(day => (
                    <div key={day} className="text-[11px] sm:text-xs font-bold tracking-wider text-slate-400 py-1">
                        {day}
                    </div>
                ))}
            </div>

            {/* Grid dos Dias do Calendário */}
            <div className="grid grid-cols-7 gap-1 sm:gap-2">
                {days.map(day => {
                    const dayShifts = getShiftsForDay(day);
                    const isCurrentMonth = isSameMonth(day, currentDate);
                    const isTodayDate = isToday(day);
                    const isSelected = isSameDay(day, selectedDate);

                    return (
                        <div
                            key={day.toISOString()}
                            onClick={() => {
                                setSelectedDate(day);
                                onDateClick?.(day);
                            }}
                            className={`
                                min-h-[66px] sm:min-h-[88px] rounded-xl sm:rounded-2xl p-1 sm:p-2 flex flex-col justify-between transition-all cursor-pointer relative group
                                ${isCurrentMonth ? 'bg-[#131b2e] hover:bg-[#18233c]' : 'bg-[#0e1628]/40 text-slate-600 opacity-40'}
                                ${isSelected ? 'ring-2 ring-blue-500 bg-[#172341] shadow-lg shadow-blue-500/10' : 'border border-slate-800/60'}
                            `}
                        >
                            {/* Número do Dia */}
                            <div className="flex justify-center items-center">
                                <span className={`
                                    text-xs sm:text-sm font-semibold tracking-tight
                                    ${isTodayDate
                                        ? 'bg-blue-600 text-white w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center shadow text-[11px] sm:text-xs'
                                        : isCurrentMonth ? 'text-white' : 'text-slate-500'
                                    }
                                `}>
                                    {format(day, 'd')}
                                </span>
                            </div>

                            {/* Badges de Plantões */}
                            <div className="flex flex-col gap-1 mt-1">
                                {dayShifts.map(shift => {
                                    const badge = getBadgeInfo(shift);
                                    return (
                                        <div
                                            key={shift.id}
                                            onClick={(e) => {
                                                e.stopPropagation();
                                                setSelectedDate(day);
                                                onShiftClick?.(shift);
                                            }}
                                            className={`
                                                ${badge.colorClass}
                                                text-[9px] sm:text-[11px] font-extrabold px-0.5 sm:px-2 py-0.5 rounded
                                                uppercase tracking-tighter sm:tracking-wider text-center transition-transform hover:scale-105
                                                cursor-pointer overflow-hidden leading-none flex items-center justify-center
                                            `}
                                            title={`${shift.shiftTypeSnapshot?.name || 'Plantão'} (${shift.shiftTypeSnapshot?.startTime} - ${shift.shiftTypeSnapshot?.endTime})`}
                                        >
                                            <span className="sm:hidden">{badge.shortLabel}</span>
                                            <span className="hidden sm:inline">{badge.label}</span>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    );
                })}
            </div>

            {/* Legenda de Categorias de Escala */}
            <div className="flex items-center justify-center flex-wrap gap-4 pt-3 pb-2 text-xs font-semibold border-t border-slate-800/60">
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#ef4444] inline-block shadow-sm" />
                    <span className="text-slate-300">DIÁRIO</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#10b981] inline-block shadow-sm" />
                    <span className="text-slate-300">AC-4</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#0ea5e9] inline-block shadow-sm" />
                    <span className="text-slate-300">TROCA</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#8b5cf6] inline-block shadow-sm" />
                    <span className="text-slate-300">SUPL.</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#f59e0b] inline-block shadow-sm" />
                    <span className="text-slate-300">OUTROS</span>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded-full bg-[#22c55e] inline-block shadow-sm" />
                    <span className="text-slate-300">FOLGA</span>
                </div>
            </div>

            {/* Seção Próximos Serviços (Estilo Print 1) */}
            <div className="pt-4 space-y-3">
                <h3 className="text-base sm:text-lg font-bold text-white tracking-wide">
                    Próximos serviços
                </h3>

                {upcomingShifts.length === 0 ? (
                    <div className="bg-[#131b2e] border border-slate-800/80 rounded-2xl p-4 text-center text-slate-400 text-sm">
                        Nenhum serviço agendado para os próximos dias.
                    </div>
                ) : (
                    <div className="space-y-2.5">
                        {upcomingShifts.map(shift => {
                            const badge = getBadgeInfo(shift);
                            const shiftDateObj = parseISO(shift.date);
                            const formattedDate = format(shiftDateObj, 'dd/MM/yyyy', { locale: ptBR });

                            return (
                                <div
                                    key={shift.id}
                                    onClick={() => onShiftClick?.(shift)}
                                    className="bg-[#131b2e] hover:bg-[#19243d] border border-slate-800/80 hover:border-slate-700/80 rounded-2xl p-3.5 sm:p-4 flex items-center justify-between transition-all cursor-pointer group shadow-sm"
                                >
                                    <div className="flex items-center space-x-3.5">
                                        {/* Dot Indicator */}
                                        <div className={`w-3.5 h-3.5 rounded-full ${badge.dotClass} flex-shrink-0 shadow`} />

                                        <div>
                                            <div className="text-sm sm:text-base font-semibold text-slate-100 group-hover:text-white transition-colors">
                                                {formattedDate} - <span className={`${badge.textClass} font-bold`}>{badge.label}</span>
                                            </div>
                                            <div className="text-xs sm:text-sm font-medium text-slate-400">
                                                {shift.shiftTypeSnapshot?.name || badge.label}
                                                {shift.shiftTypeSnapshot?.startTime && shift.shiftTypeSnapshot?.endTime
                                                    ? ` (${shift.shiftTypeSnapshot.startTime} - ${shift.shiftTypeSnapshot.endTime})`
                                                    : ''}
                                            </div>
                                        </div>
                                    </div>

                                    <ChevronRightIcon className="w-5 h-5 text-slate-500 group-hover:text-slate-200 transition-colors" />
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>

        </div>
    );
};

