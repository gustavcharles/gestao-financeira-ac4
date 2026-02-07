import { Timestamp } from 'firebase/firestore';

/**
 * Representa um tipo de plantão (ex: Dia, Noite, Administrativo)
 */
export interface ShiftType {
    id: string; // ex: 'D12', 'N12', 'ADM'
    name: string; // ex: 'Dia 12h', 'Noite 12h'
    code: string; // ex: 'D', 'N' para display curto
    color: string; // Hex color for UI
    hours: number; // Duration in hours (used for reports)
    isNightShift: boolean; // Flag for financial calculation (Adicional Noturno)
    isAC4?: boolean; // Flag if this is an Extra Duty (AC-4)
    startTime: string; // "08:00", "20:00"
    endTime: string; // "20:00", "08:00"
}

/**
 * Padrões suportados de escala
 */
export type ScalePatternType =
    | '12x36' // Trabalha 12h, folga 36h (Dia sim, dia não alternando turno se for D/N) - Comum: D-N-F-F ou D-F-D-F de dia?
    // Interpretação comum 12x36 militar:
    // "Dia sim dia não" geralmente é fixo Dia ou fixo Noite? 
    // - Padrão "12x36 Diurno": Trabalha 12h dia, folga 36h (volta dia seguinte não, no outro sim)
    // - Padrão "12x36 Noturno": Trabalha 12h noite, folga 36h
    | '24x72' // Trabalha 24h, folga 72h (1 dia on, 3 off)
    | '6x18'  // Trabalha 6h, folga 18h (Todo dia)
    | '24x96' // Trabalha 24h, folga 96h (1 dia on, 4 off)
    | 'custom'; // Custom cycle defined by user

export type ScaleCategory = 'AC-4' | 'Diário' | 'Suplementar' | 'Troca' | 'Outros';

/**
 * Definição da Escala do Usuário (A Regra)
 */
export interface ShiftScale {
    id: string;
    userId: string;
    name: string; // ex: "Minhas Escalas"
    category: ScaleCategory; // Categoria da escala
    isOneOff: boolean; // Se true, é um plantão único (sem repetição)
    patternType: ScalePatternType;
    startDate: Timestamp; // Data de referência para início do ciclo ou Do Plantão Único

    // Para padrões customizados ou variações
    // Ex: 12x36 -> cycleLength: 2, workDays: [0] (trabalha dia 0 do ciclo)
    // Ex: 24x72 -> cycleLength: 4, workDays: [0]
    cycleLength: number;

    // Definição do que é o "Trabalho" no ciclo
    // Pode ser apenas um ID de ShiftType padrão
    defaultShiftTypeId: string;

    // Para escalas complexas onde o tipo de turno muda no ciclo
    // Ex: "D N F F" (Dia, Noite, Folga, Folga) -> cycleLength 4
    // 0: ShiftType.Dia, 1: ShiftType.Noite, 2: null, 3: null
    cycleMap?: Record<number, string>; // index do ciclo -> shiftTypeId

    isActive: boolean;
    createdAt: Timestamp;
    updatedAt: Timestamp;
}

/**
 * Ocorrência de um Plantão no Calendário (O Fato)
 */
export interface ShiftEvent {
    id: string; // Auto-generated or `date-userId`
    userId: string;
    scaleId: string; // Reference to the rule generated from
    date: string; // ISO Date "YYYY-MM-DD" (Chave de busca principal)
    startTime: Timestamp; // Data/Hora exata inicio
    endTime: Timestamp; // Data/Hora exata fim

    shiftTypeId: string;
    shiftTypeSnapshot: ShiftType;

    // Denormalized for easier checks
    scaleCategory?: ScaleCategory;

    isManualOverride: boolean; // Se foi editado manualmente/troca
    note?: string; // Observações (ex: "Troca com Recruta Zero")

    status: 'scheduled' | 'confirmed' | 'completed' | 'canceled';
}

export const DEFAULT_SHIFT_TYPES: ShiftType[] = [
    {
        id: 'plantao_diurno_12',
        name: 'Plantão Diurno 12h',
        code: 'D12',
        color: '#FBBF24', // Amber
        hours: 12,
        isNightShift: false,
        startTime: '08:00',
        endTime: '20:00'
    },
    {
        id: 'plantao_diurno_10',
        name: 'Plantão Diurno 10h',
        code: 'D10',
        color: '#F59E0B', // Amber 600
        hours: 10,
        isNightShift: false,
        startTime: '08:00',
        endTime: '18:00'
    },
    {
        id: 'plantao_noturno_12',
        name: 'Plantão Noturno 12h',
        code: 'N12',
        color: '#1E40AF', // Blue
        hours: 12,
        isNightShift: true,
        startTime: '20:00',
        endTime: '08:00'
    },
    {
        id: 'plantao_24',
        name: 'Plantão 24h',
        code: '24h',
        color: '#DC2626', // Red
        hours: 24,
        isNightShift: true, // Contém parte noturna
        startTime: '08:00',
        endTime: '08:00' // +1 day
    }
];
