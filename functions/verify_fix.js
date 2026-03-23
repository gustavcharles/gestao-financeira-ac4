const { generateShiftsForBackend } = require('./utils/generator');
const { addDays, format } = require('date-fns');

// Mock Firestore-like Timestamp
class MockTimestamp {
    constructor(date) {
        this.date = date;
    }
    toDate() {
        return this.date;
    }
}

function testGenerator() {
    console.log("--- Testing generateShiftsForBackend ---");

    const today = new Date();
    const windowStart = today;
    const windowEnd = addDays(today, 2);

    // Case 1: 12x36 Scale
    const scale12x36 = {
        id: "scale_1",
        userId: "user_1",
        name: "Escala 12x36 Teste",
        startDate: new MockTimestamp(today),
        cycleLength: 2,
        patternType: "12x36",
        customStartTime: "07:00",
        customEndTime: "19:00",
        isActive: true
    };

    const shifts12x36 = generateShiftsForBackend(scale12x36, windowStart, windowEnd);
    console.log(`\n12x36 Scale: Generated ${shifts12x36.length} shifts.`);
    shifts12x36.forEach(s => {
        console.log(`  - Date: ${s.date}, Start: ${format(s.startTime, 'HH:mm')}, End: ${format(s.endTime, 'HH:mm')}`);
    });

    // Case 2: One-off Scale
    const scaleOneOff = {
        id: "scale_2",
        userId: "user_2",
        name: "Plantão Extra",
        startDate: new MockTimestamp(addDays(today, 1)),
        isOneOff: true,
        customStartTime: "20:00",
        customEndTime: "08:00",
        isActive: true
    };

    const shiftsOneOff = generateShiftsForBackend(scaleOneOff, windowStart, windowEnd);
    console.log(`\nOne-Off Scale: Generated ${shiftsOneOff.length} shifts.`);
    shiftsOneOff.forEach(s => {
        console.log(`  - Date: ${s.date}, Start: ${format(s.startTime, 'HH:mm')}, End: ${format(s.endTime, 'HH:mm')}`);
    });

    // Validation
    if (shifts12x36.length >= 1 && shiftsOneOff.length === 1) {
        console.log("\nSuccess: Generator logic works correctly for backend reminders.");
    } else {
        console.log("\nFailure: Unexpected number of shifts generated.");
        process.exit(1);
    }
}

testGenerator();
