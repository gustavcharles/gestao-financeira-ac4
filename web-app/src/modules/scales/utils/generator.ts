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

    // Determine the effective end date for generation
    let effectiveEndRange = endOfRange;
    if (scale.endDate) {
        const scaleEndDate = startOfDay(scale.endDate.toDate());
        if (isBefore(scaleEndDate, effectiveEndRange)) {
            effectiveEndRange = scaleEndDate;
        }
    }

    const startOfScale = startOfDay(scaleStartDate);

    // Se a range pedida é toda anterior ao inicio da escala, não gera nada
    if (isBefore(effectiveEndRange, startOfScale)) {
        return [];
    }

    // Se a range começa depois do fim da escala, também nada
    if (isAfter(startOfRange, effectiveEndRange)) {
        return [];
    }

    // ... (rest of the code)

    // Handle one-off scales (single shift on startDate only)
    if (scale.isOneOff) {
        // Check if startDate is within the range
        if (!isAfter(startOfScale, effectiveEndRange) && !isBefore(startOfScale, startOfRange)) {
            const shiftType = getShiftTypeById(scale.defaultShiftTypeId);
            if (shiftType) {
                // Use custom times if available, otherwise use shift type defaults
                let startTimeStr = scale.customStartTime || shiftType.startTime;
                let endTimeStr = scale.customEndTime || shiftType.endTime;
                let hours = shiftType.hours;

                // Re-calculate hours if custom times are used
                if (scale.customStartTime && scale.customEndTime) {
                    const [sH, sM] = startTimeStr.split(':').map(Number);
                    const [eH, eM] = endTimeStr.split(':').map(Number);
                    const startDateObj = new Date(2000, 0, 1, sH, sM);
                    let endDateObj = new Date(2000, 0, 1, eH, eM);
                    if (endDateObj < startDateObj) {
                        endDateObj = addDays(endDateObj, 1);
                    }
                    hours = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
                }

                const [startHour, startMinute] = startTimeStr.split(':').map(Number);
                const shiftStartDateTime = new Date(startOfScale);
                shiftStartDateTime.setHours(startHour, startMinute, 0, 0);

                const shiftEndDateTime = addHours(shiftStartDateTime, hours);

                const dateStr = format(startOfScale, 'yyyy-MM-dd');
                const shiftId = `${dateStr}-${scale.id}`;

                shifts.push({
                    id: shiftId,
                    userId: scale.userId,
                    scaleId: scale.id,
                    date: dateStr,
                    startTime: Timestamp.fromDate(shiftStartDateTime),
                    endTime: Timestamp.fromDate(shiftEndDateTime),
                    shiftTypeId: scale.defaultShiftTypeId,
                    shiftTypeSnapshot: {
                        ...shiftType,
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                        hours: hours,
                        isAC4: scale.category === 'AC-4' || shiftType.isAC4
                    },
                    scaleCategory: scale.category,
                    status: 'confirmed',
                    isManualOverride: false
                });
            }
        }
        // For one-off scales, return immediately after creating the single shift
        return shifts;
    }

    // Initialize iteration date
    let currentIterDate = isBefore(startOfRange, startOfScale) ? startOfScale : startOfRange;

    // Loop dia a dia
    while (!isAfter(currentIterDate, effectiveEndRange)) {
        const dayIndex = differenceInDays(currentIterDate, startOfScale);
        const cyclePosition = dayIndex % scale.cycleLength;

        let shiftTypeIdToAdd: string | null = null;

        if (['12x36', '24x72', '6x18', '24x96'].includes(scale.patternType)) {
            if (cyclePosition === 0) {
                shiftTypeIdToAdd = scale.defaultShiftTypeId;
            }
        } else if (scale.patternType === 'custom' && scale.cycleMap) {
            if (scale.cycleMap[cyclePosition]) {
                shiftTypeIdToAdd = scale.cycleMap[cyclePosition];
            }
        }

        if (shiftTypeIdToAdd) {
            const shiftType = getShiftTypeById(shiftTypeIdToAdd);
            if (shiftType) {
                // Calcular data/hora inicio e fim reais
                let startTimeStr = shiftType.startTime;
                let endTimeStr = shiftType.endTime;
                let hours = shiftType.hours;

                // Override com horários customizados da escala se existirem
                if (scale.customStartTime && scale.customEndTime) {
                    startTimeStr = scale.customStartTime;
                    endTimeStr = scale.customEndTime;

                    // Re-calcular horas se forem customizados
                    const [sH, sM] = startTimeStr.split(':').map(Number);
                    const [eH, eM] = endTimeStr.split(':').map(Number);
                    const startDateObj = new Date(2000, 0, 1, sH, sM);
                    let endDateObj = new Date(2000, 0, 1, eH, eM);
                    if (endDateObj < startDateObj) {
                        endDateObj = addDays(endDateObj, 1);
                    }
                    hours = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
                }

                const [startHour, startMinute] = startTimeStr.split(':').map(Number);
                const shiftStartDateTime = new Date(currentIterDate);
                shiftStartDateTime.setHours(startHour, startMinute, 0, 0);

                // Fim: Inicio + Horas de duração
                const shiftEndDateTime = addHours(shiftStartDateTime, hours);

                shifts.push({
                    id: `${format(currentIterDate, 'yyyy-MM-dd')}-${scale.id}`,
                    userId: scale.userId,
                    scaleId: scale.id,
                    date: format(currentIterDate, 'yyyy-MM-dd'),
                    startTime: Timestamp.fromDate(shiftStartDateTime),
                    endTime: Timestamp.fromDate(shiftEndDateTime),
                    shiftTypeId: shiftTypeIdToAdd,
                    shiftTypeSnapshot: {
                        ...shiftType,
                        startTime: startTimeStr,
                        endTime: endTimeStr,
                        hours: hours,
                        isAC4: scale.category === 'AC-4' || shiftType.isAC4 // Force flag if category is AC-4
                    },
                    scaleCategory: scale.category,
                    isManualOverride: false,
                    status: isBefore(currentIterDate, today) ? 'completed' : 'scheduled'
                });
            }
        }

        currentIterDate = addDays(currentIterDate, 1);
    }

    return shifts;
};
