const { addDays, differenceInDays, addHours, startOfDay, isAfter, isBefore } = require('date-fns');
const { fromZonedTime } = require('date-fns-tz');

const BRAZIL_TZ = 'America/Sao_Paulo';

/**
 * Minimal version of the shift generator for backend use.
 * Focuses only on generating the timestamps and metadata for reminders.
 */
function generateShiftsForBackend(scale, rangeStart, rangeEnd) {
    const shifts = [];
    
    // Normalize dates
    const startOfRange = startOfDay(rangeStart);
    const endOfRange = startOfDay(rangeEnd);
    const scaleStartDate = scale.startDate.toDate ? scale.startDate.toDate() : new Date(scale.startDate);
    const startOfScale = startOfDay(scaleStartDate);

    // End date boundary
    let effectiveEndRange = endOfRange;
    if (scale.endDate) {
        const scaleEndDate = startOfDay(scale.endDate.toDate ? scale.endDate.toDate() : new Date(scale.endDate));
        if (isBefore(scaleEndDate, effectiveEndRange)) {
            effectiveEndRange = scaleEndDate;
        }
    }

    if (isBefore(effectiveEndRange, startOfScale) || isAfter(startOfRange, effectiveEndRange)) {
        return [];
    }

    const startTimeStr = scale.customStartTime || "08:00";
    const endTimeStr = scale.customEndTime || "20:00";
    const [sH, sM] = startTimeStr.split(':').map(Number);
    const [eH, eM] = endTimeStr.split(':').map(Number);

    // Calculate duration once
    const sDate = new Date(2000, 0, 1, sH, sM);
    let eDate = new Date(2000, 0, 1, eH, eM);
    if (eDate < sDate) eDate = addDays(eDate, 1);
    const durationHours = (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60);

    // One-off (single shift)
    if (scale.isOneOff) {
        if (!isAfter(startOfScale, effectiveEndRange) && !isBefore(startOfScale, startOfRange)) {
            const dateStrPart = scaleStartDate.toISOString().split('T')[0];
            const shiftStartDateTime = fromZonedTime(`${dateStrPart} ${startTimeStr}:00`, BRAZIL_TZ);
            const shiftEndDateTime = addHours(shiftStartDateTime, durationHours);
            const dateStr = shiftStartDateTime.toISOString().split('T')[0];

            shifts.push({
                id: `${dateStr}-${scale.id}`,
                userId: scale.userId,
                scaleId: scale.id,
                date: dateStr,
                startTime: shiftStartDateTime,
                endTime: shiftEndDateTime,
                status: 'scheduled',
                shiftTypeSnapshot: { name: scale.name || "Plantão" }
            });
        }
        return shifts;
    }

    // Iterative generation for patterns (12x36, 24x72, etc.)
    let currentIterDate = isBefore(startOfRange, startOfScale) ? startOfScale : startOfRange;

    while (!isAfter(currentIterDate, effectiveEndRange)) {
        const dayIndex = differenceInDays(currentIterDate, startOfScale);
        const cyclePosition = dayIndex % scale.cycleLength;

        let shouldGenerate = false;
        if (['12x36', '24x72', '6x18', '24x96'].includes(scale.patternType)) {
            if (cyclePosition === 0) shouldGenerate = true;
        } else if (scale.patternType === 'custom' && scale.cycleMap) {
            if (scale.cycleMap[cyclePosition]) shouldGenerate = true;
        }

        if (shouldGenerate) {
            const dateStrPart = currentIterDate.toISOString().split('T')[0];
            const shiftStartDateTime = fromZonedTime(`${dateStrPart} ${startTimeStr}:00`, BRAZIL_TZ);
            const shiftEndDateTime = addHours(shiftStartDateTime, durationHours);
            const dateStr = currentIterDate.toISOString().split('T')[0];

            shifts.push({
                id: `${dateStr}-${scale.id}`,
                userId: scale.userId,
                scaleId: scale.id,
                date: dateStr,
                startTime: shiftStartDateTime,
                endTime: shiftEndDateTime,
                status: 'scheduled',
                shiftTypeSnapshot: { name: scale.name || "Plantão" }
            });
        }
        currentIterDate = addDays(currentIterDate, 1);
    }

    return shifts;
}

module.exports = { generateShiftsForBackend };
