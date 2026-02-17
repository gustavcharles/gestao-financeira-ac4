import { generateShifts } from '../src/modules/scales/utils/generator';
import { ShiftScale } from '../src/modules/scales/types';
import { Timestamp } from 'firebase/firestore';

const mockTimestamp = (date: Date) => ({
    seconds: Math.floor(date.getTime() / 1000),
    nanoseconds: 0,
    toDate: () => date,
    toMillis: () => date.getTime(),
    isEqual: (other: any) => false,
    valueOf: () => date.getTime().toString(),
    toJSON: () => ({ seconds: Math.floor(date.getTime() / 1000), nanoseconds: 0 })
}) as unknown as Timestamp;

const runVerification = () => {
    console.log("Starting Verification...");

    const startDate = new Date('2024-01-01T00:00:00');

    // Scale definition with valid IDs found in DEFAULT_SHIFT_TYPES
    const scale: ShiftScale = {
        id: 'test-scale',
        userId: 'user-1',
        name: 'Test Scale',
        isOneOff: false,
        patternType: '12x36',
        cycleLength: 2,
        defaultShiftTypeId: 'plantao_diurno_12',
        startDate: mockTimestamp(startDate),
        isActive: true,
        createdAt: mockTimestamp(new Date()),
        updatedAt: mockTimestamp(new Date()),
        category: 'AC-4',
        customStartTime: undefined,
        customEndTime: undefined,
    };

    // Test 1: Default 12x36 generation (every other day)
    // Range: 10 days. Should have 5 shifts: 1, 3, 5, 7, 9
    const rangeStart = new Date('2024-01-01T00:00:00');
    const rangeEnd = new Date('2024-01-10T00:00:00');

    console.log("\nTest 1: Normal generation (no end date)");
    const shifts1 = generateShifts(scale, rangeStart, rangeEnd);
    console.log(`Generated ${shifts1.length} shifts.`);
    if (shifts1.length === 5) {
        console.log("PASS: Correct number of shifts.");
    } else {
        console.error(`FAIL: Expected 5 shifts, got ${shifts1.length}`);
    }

    // Test 2: With End Date (Cut off halfway)
    // End Date: Jan 05. Should have shifts: 1, 3, 5. (Jan 7, 9 should be excluded)
    console.log("\nTest 2: With End Date (2024-01-05)");
    scale.endDate = mockTimestamp(new Date('2024-01-05T23:59:59'));
    const shifts2 = generateShifts(scale, rangeStart, rangeEnd);
    console.log(`Generated ${shifts2.length} shifts.`);

    const lastShift2 = shifts2[shifts2.length - 1];
    if (shifts2.length === 3 && lastShift2?.date === '2024-01-05') {
        console.log("PASS: Correctly stopped at end date.");
    } else {
        console.error(`FAIL: Expected 3 shifts (last on 2024-01-05), got ${shifts2.length}. Last: ${lastShift2?.date}`);
    }

    // Test 3: End Date matching a non-shift day
    // End Date: Jan 06. Should still have shifts: 1, 3, 5.
    console.log("\nTest 3: End Date on non-shift day (2024-01-06)");
    scale.endDate = mockTimestamp(new Date('2024-01-06T23:59:59'));
    const shifts3 = generateShifts(scale, rangeStart, rangeEnd);
    console.log(`Generated ${shifts3.length} shifts.`);
    // Still expect 3 shifts (1, 3, 5). Next would be 7, which is > 6.
    if (shifts3.length === 3) {
        console.log("PASS: Correctly stopped at end date.");
    } else {
        console.error(`FAIL: Expected 3 shifts, got ${shifts3.length}`);
    }

    // Test 4: End Date before start date
    // End Date: 2023-12-31. Should be 0.
    console.log("\nTest 4: End Date before start");
    scale.endDate = mockTimestamp(new Date('2023-12-31T23:59:59'));
    const shifts4 = generateShifts(scale, rangeStart, rangeEnd);
    console.log(`Generated ${shifts4.length} shifts.`);
    if (shifts4.length === 0) {
        console.log("PASS: No shifts generated.");
    } else {
        console.error(`FAIL: Expected 0 shifts, got ${shifts4.length}`);
    }

    console.log("\nVerification Complete.");
};

runVerification();
