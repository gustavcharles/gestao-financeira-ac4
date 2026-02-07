import { startOfHour, addHours, getHours, getDay } from 'date-fns';

export interface AC4Rates {
    nightWeekend: number; // 41.38
    nightWeekday: number; // 29.80
    dayWeekend: number;   // 36.41
    dayWeekday: number;   // 26.47
}

export const DEFAULT_AC4_RATES: AC4Rates = {
    nightWeekend: 41.38,
    nightWeekday: 29.80,
    dayWeekend: 36.41,
    dayWeekday: 26.47
};

/**
 * Calculates the value of an AC-4 shift based on start/end times and rates.
 * Logic based on user specification:
 * - Iterates hour by hour.
 * - Checks if hour is Night (22h-05h) or Day.
 * - Checks if operational day (adjusted for early morning) is Weekend (Fri, Sat, Sun for Night; Fri, Sat, Sun for Day).
 * 
 * Note: User spec for Day Weekend said "Sex, Sáb, Dom", matching Night logic (Fri night counts as weekend rate).
 */
export const calculateShiftValue = (start: Date, end: Date, rates: AC4Rates = DEFAULT_AC4_RATES): number => {
    let current = startOfHour(start);
    // If start is not exact hour, we might miss minutes, but user logic implies hour-based "tarifa".
    // "aplicar a tarifa correta dependendo se é dia/noite" usually implies full hour blocks.
    // If the user wants minute precision, we'd need to adjust, but "loop while" implies steps.
    // Let's stick to hour steps for now as per the snippet "current.setHours(current.getHours() + 1)".

    // Safety check: ensure we don't loop forever if dates are swapped
    if (start >= end) return 0;

    let totalValue = 0;

    // We clone current to not mutate the original if passed by ref (though startOfHour creates new)
    let iter = new Date(current);

    // To safe guard against infinite loops in dev
    let safetyCounter = 0;
    const MAX_HOURS = 24 * 7; // Max week shift?

    while (iter < end && safetyCounter < MAX_HOURS) {
        // Adjust for partial hours? 
        // User snippet: "totalValue += rate". This implies 1 hour = 1 rate.
        // If end is 08:30, the loop condition "current < end" handles the last block? 
        // If start 08:00, end 08:30. Loop 08:00 < 08:30. 
        // We add full rate. 
        // This is standard for "Hora AC-4", usually paid by full hour worked or started.

        const h = getHours(iter);
        const d = getDay(iter); // 0=Dom, 1=Seg, ..., 5=Sex, 6=Sáb

        let rate = 0;

        // Night Time: 22:00 to 04:59 (inclusive 4, exclusive 5?) "h < 5" -> 0,1,2,3,4. Correct.
        if (h >= 22 || h < 5) {
            // Adicional Noturno / Hora Noturna

            // "Se h < 5 operationalDay = d - 1" (Madrugada de Sábado (dia 6) conta como Sexta (dia 5) para fins de tarifa?)
            // User: "if (h < 5) operationalDay = (d === 0) ? 6 : d - 1;" 
            // Ex: Sunday (0) 03:00 -> operationalDay 6 (Saturday).
            // Ex: Saturday (6) 03:00 -> operationalDay 5 (Friday).
            // Ex: Monday (1) 03:00 -> operationalDay 0 (Sunday).

            let operationalDay = d;
            if (h < 5) {
                operationalDay = (d === 0) ? 6 : d - 1;
            }

            // User: "Sex(5), Sáb(6), Dom(0) (Noite) -> rate = 41.38"
            // Wait, "Sex, Sáb, Dom" for NIGHT usually means:
            // Friday Night (leading into Sat), Sat Night, Sun Night.
            // Let's verify logic.
            // Friday (5) 23:00 -> operationalDay 5. Matches.
            // Saturday (6) 03:00 -> operationalDay 5. Matches.
            // Monday (1) 03:00 -> operationalDay 0 (Sunday Night). Matches ?? 
            // User code: "operationalDay === 5 || operationalDay === 6 || operationalDay === 0"
            // So Sunday Night (leading into Monday) is counted as Weekend rate. 
            // This matches standard "Weekend" definitions often used in shifts (Friday night to Monday morning).

            if (operationalDay === 5 || operationalDay === 6 || operationalDay === 0) {
                rate = rates.nightWeekend;
            } else {
                rate = rates.nightWeekday;
            }
        } else {
            // Daytime: 05:00 to 21:59

            // User: "Sex(5), Sáb(6), Dom(0) rate -> 36.41"
            // So Friday Day is Weekend rate? 
            // Usually weekend starts Sat, but user said "incluindo Sexta".
            // If d === 5 (Friday), rate is Weekend.

            if (d === 5 || d === 6 || d === 0) {
                rate = rates.dayWeekend;
            } else {
                rate = rates.dayWeekday;
            }
        }

        totalValue += rate;

        // Advance 1 hour
        iter = addHours(iter, 1);
        safetyCounter++;
    }

    return parseFloat(totalValue.toFixed(2));
};
