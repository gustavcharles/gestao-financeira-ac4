import { addDays, differenceInDays, format, isAfter, isBefore, startOfDay, addHours } from 'date-fns';
import { DEFAULT_SHIFT_TYPES } from '../types';
import type { ShiftEvent, ShiftScale, ShiftType } from '../types';
import { Timestamp } from 'firebase/firestore';

/**
 * Encontra um ShiftType pelo ID na lista de defaults ou (futuramente) customizados do usuário
 */
export const getShiftTypeById = (id: string): ShiftType | undefined => {
    return DEFAULT_SHIFT_TYPES.find(t => t.id === id);
};

/**
 * Gera uma lista de eventos de plantão para um intervalo de datas baseado na regra da escala.
 * 
 * @param scale A regra da escala (ex: 12x36 iniciando em 01/01/2026)
 * @param rangeStart Data de inicio da visualização/geração
 * @param rangeEnd Data final da visualização/geração
 */
export const generateShifts = (
    scale: ShiftScale,
    rangeStart: Date,
    rangeEnd: Date
): ShiftEvent[] => {
    const shifts: ShiftEvent[] = [];
    const today = startOfDay(new Date());

    // Normalizar datas para inicio do dia para cálculos de dias inteiros
    const startOfRange = startOfDay(rangeStart);
    const endOfRange = startOfDay(rangeEnd);

    // A data base da escala (o "Dia Zero" do ciclo)
    const scaleStartDate = scale.startDate.toDate();
    const startOfScale = startOfDay(scaleStartDate);

    // Se a range pedida é toda anterior ao inicio da escala, não gera nada
    if (isBefore(endOfRange, startOfScale)) {
        return [];
    }

    // Lógica para Plantão Único (One Off)
    if (scale.isOneOff) {
        // Verifica se a data do plantão único (scaleStartDate) está dentro do range solicitado
        if ((isAfter(scaleStartDate, rangeStart) || scaleStartDate.getTime() === rangeStart.getTime()) &&
            (isBefore(scaleStartDate, rangeEnd) || scaleStartDate.getTime() === rangeEnd.getTime()) ||
            (format(scaleStartDate, 'yyyy-MM-dd') === format(rangeStart, 'yyyy-MM-dd'))) {

            // Lógica mais flexível: Se o dia único está entre start e end (inclusive)
            const shiftType = getShiftTypeById(scale.defaultShiftTypeId);
            if (shiftType) {
                const [startHour, startMinute] = shiftType.startTime.split(':').map(Number);
                const shiftStartDateTime = addHours(addDays(scaleStartDate, 0), 0);
                shiftStartDateTime.setHours(startHour, startMinute, 0, 0);
                const shiftEndDateTime = addHours(shiftStartDateTime, shiftType.hours);

                return [{
                    id: `${format(scaleStartDate, 'yyyy-MM-dd')}-${scale.id}`,
                    userId: scale.userId,
                    scaleId: scale.id,
                    date: format(scaleStartDate, 'yyyy-MM-dd'),
                    startTime: Timestamp.fromDate(shiftStartDateTime),
                    endTime: Timestamp.fromDate(shiftEndDateTime),
                    shiftTypeId: scale.defaultShiftTypeId,
                    shiftTypeSnapshot: shiftType,
                    scaleCategory: scale.category, // Propagate Category
                    isManualOverride: false,
                    status: isBefore(shiftStartDateTime, today) ? 'completed' : 'scheduled'
                }];
            }
        }
        return []; // Se não estiver no range, retorna vazio
    }

    // Definir o dia de inicio da iteração:
    // Se a range começa depois da escala, podemos pular alguns ciclos para otimizar?
    // Sim, mas precisamos alinhar com o ciclo.
    // Vamos iterar do dia da rangeStart (ou scaleStart se rangeStart for antes) até rangeEnd.

    let currentIterDate = isBefore(startOfRange, startOfScale) ? startOfScale : startOfRange;

    // Mas cuidado: currentIterDate precisa estar alinhado com o ciclo se rangeStart > startOfScale
    // O ciclo é baseado em differenceInDays(current, startOfScale) % cycleLength

    // Loop dia a dia
    while (!isAfter(currentIterDate, endOfRange)) {
        const dayIndex = differenceInDays(currentIterDate, startOfScale);

        // Posição no ciclo (0 a cycleLength - 1)
        // Ex 12x36 (cycle 2): Dia 0=Trabalha, Dia 1=Folga. 
        // dayIndex 0 % 2 = 0 (Trabalha)
        // dayIndex 1 % 2 = 1 (Folga)
        // dayIndex 2 % 2 = 0 (Trabalha)
        const cyclePosition = dayIndex % scale.cycleLength;
        // O operador % pode retornar negativo se dayIndex for negativo, mas garantimos que current >= startOfScale

        let shiftTypeIdToAdd: string | null = null;

        if (['12x36', '24x72', '6x18', '24x96'].includes(scale.patternType)) {
            // Padrões simples: Trabalha no dia 0 do ciclo
            if (cyclePosition === 0) {
                shiftTypeIdToAdd = scale.defaultShiftTypeId;
            }
        } else if (scale.patternType === 'custom' && scale.cycleMap) {
            // Padrão complexo mapeado
            // Ex: cycleMap { 0: 'D12', 1: 'N12' } para escala D-N-F-F (cycleLength 4)
            if (scale.cycleMap[cyclePosition]) {
                shiftTypeIdToAdd = scale.cycleMap[cyclePosition];
            }
        }

        if (shiftTypeIdToAdd) {
            const shiftType = getShiftTypeById(shiftTypeIdToAdd);
            if (shiftType) {
                // Calcular data/hora inicio e fim reais baseado na hora do turno
                const [startHour, startMinute] = shiftType.startTime.split(':').map(Number);
                const shiftStartDateTime = addHours(addDays(currentIterDate, 0), 0); // Clone date
                shiftStartDateTime.setHours(startHour, startMinute, 0, 0);

                // Fim: Inicio + Horas de duração
                const shiftEndDateTime = addHours(shiftStartDateTime, shiftType.hours);

                shifts.push({
                    id: `${format(currentIterDate, 'yyyy-MM-dd')}-${scale.id}`, // ID determinístico `${date}-${scaleId}`
                    userId: scale.userId,
                    scaleId: scale.id,
                    date: format(currentIterDate, 'yyyy-MM-dd'),
                    startTime: Timestamp.fromDate(shiftStartDateTime),
                    endTime: Timestamp.fromDate(shiftEndDateTime),
                    shiftTypeId: shiftTypeIdToAdd,
                    shiftTypeSnapshot: shiftType,
                    scaleCategory: scale.category, // Propagate Category
                    isManualOverride: false,
                    status: isBefore(currentIterDate, today) ? 'completed' : 'scheduled'
                });
            }
        }

        currentIterDate = addDays(currentIterDate, 1);
    }

    return shifts;
};
