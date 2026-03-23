const { addDays, differenceInDays, addHours, startOfDay, isAfter, isBefore } = require('date-fns');

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

    // One-off (single shift)
    if (scale.isOneOff) {
        if (!isAfter(startOfScale, effectiveEndRange) && !isBefore(startOfScale, startOfRange)) {
            const shiftStartDateTime = new Date(startOfScale);
            // We use the custom time or a default if not present (backend doesn't have DEFAULT_SHIFT_TYPES easily available)
            // But we assume the scale object passed from Firestore has the necessary snapshot info if it was ever edited,
            // or we use the custom times saved in the scale doc.
            const startTimeStr = scale.customStartTime || "08:00";
            const endTimeStr = scale.customEndTime || "20:00";
            
            const [sH, sM] = startTimeStr.split(':').map(Number);
            shiftStartDateTime.setHours(sH, sM, 0, 0);

            // Simple duration calculation or default 12h
            let durationHours = 12;
            if (scale.customStartTime && scale.customEndTime) {
                const [eH, eM] = endTimeStr.split(':').map(Number);
                const sDate = new Date(2000, 0, 1, sH, sM);
                let eDate = new Date(2000, 0, 1, eH, eM);
                if (eDate < sDate) eDate = addDays(eDate, 1);
                durationHours = (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60);
            }

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
            const startTimeStr = scale.customStartTime || "08:00";
            const endTimeStr = scale.customEndTime || "20:00";
            const [sH, sM] = startTimeStr.split(':').map(Number);
            
            const shiftStartDateTime = new Date(currentIterDate);
            shiftStartDateTime.setHours(sH, sM, 0, 0);

            let durationHours = 12; // Default
            if (scale.customStartTime && scale.customEndTime) {
                 const [eH, eM] = endTimeStr.split(':').map(Number);
                 const sDate = new Date(2000, 0, 1, sH, sM);
                 let eDate = new Date(2000, 0, 1, eH, eM);
                 if (eDate < sDate) eDate = addDays(eDate, 1);
                 durationHours = (eDate.getTime() - sDate.getTime()) / (1000 * 60 * 60);
            }

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
