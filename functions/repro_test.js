const ical = require("ical-generator").default;
const {generateShifts, DEFAULT_SHIFT_TYPES} = require("./src/utils/generator");
const admin = require("firebase-admin");

// Mock Firestore Timestamp
const mockTimestamp = (date) => ({
  toDate: () => date,
});

// Mock Scale
const mockScale = {
  id: "scale_1",
  userId: "user_1",
  name: "Escala Teste",
  category: "AC-4",
  isActive: true,
  startDate: mockTimestamp(new Date()),
  patternType: "12x36",
  cycleLength: 2,
  defaultShiftTypeId: "plantao_diurno_12",
};

try {
  console.log("Generating shifts...");
  const today = new Date();
  const endDate = new Date();
  endDate.setMonth(endDate.getMonth() + 6);

  // Mock admin.firestore.Timestamp.fromDate used in generator.js
  // We need to patch this because we are not initializing admin
  admin.firestore.Timestamp = {
    fromDate: (date) => mockTimestamp(date),
  };

  const shifts = generateShifts(mockScale, today, endDate);
  console.log(`Generated ${shifts.length} shifts.`);

  console.log("Creating iCal...");
  const calendar = ical({
    name: "Minhas Escalas AC-4",
    timezone: "America/Sao_Paulo",
  });

  for (const shift of shifts) {
    const shiftType = shift.shiftTypeSnapshot;
    calendar.createEvent({
      start: shift.startTime.toDate(),
      end: shift.endTime.toDate(),
      summary: `${shiftType.code} - Test`,
      description: "Test Event",
      uid: shift.id,
    });
  }

  console.log("iCal Content Start:");
  console.log(calendar.toString().substring(0, 200));
  console.log("... iCal Content End");
  console.log("SUCCESS: iCal generated.");
} catch (error) {
  console.error("FAILURE:", error);
}
