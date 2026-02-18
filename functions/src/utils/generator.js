const admin = require("firebase-admin");
const {
  addDays,
  differenceInDays,
  format,
  isAfter,
  isBefore,
  startOfDay,
  addHours,
} = require("date-fns");

/**
 * Default shift types matching the web app
 */
const DEFAULT_SHIFT_TYPES = [
  {
    id: "plantao_diurno_12",
    name: "Plantão Diurno 12h",
    code: "D12",
    color: "#FBBF24",
    hours: 12,
    isNightShift: false,
    startTime: "08:00",
    endTime: "20:00",
  },
  {
    id: "plantao_diurno_10",
    name: "Plantão Diurno 10h",
    code: "D10",
    color: "#F59E0B",
    hours: 10,
    isNightShift: false,
    startTime: "08:00",
    endTime: "18:00",
  },
  {
    id: "plantao_noturno_12",
    name: "Plantão Noturno 12h",
    code: "N12",
    color: "#1E40AF",
    hours: 12,
    isNightShift: true,
    startTime: "20:00",
    endTime: "08:00",
  },
  {
    id: "plantao_24",
    name: "Plantão 24h",
    code: "24h",
    color: "#DC2626",
    hours: 24,
    isNightShift: true,
    startTime: "08:00",
    endTime: "08:00",
  },
];

/**
 * Find shift type by ID
 */
const getShiftTypeById = (id) => {
  return DEFAULT_SHIFT_TYPES.find((t) => t.id === id);
};

/**
 * Generate shifts for a scale within a date range
 * @param {Object} scale - The scale configuration from Firestore
 * @param {Date} rangeStart - Start date for generation
 * @param {Date} rangeEnd - End date for generation
 * @return {Array} Array of shift events
 */
const generateShifts = (scale, rangeStart, rangeEnd) => {
  const shifts = [];
  const today = startOfDay(new Date());

  // Normalize dates to start of day
  const startOfRange = startOfDay(rangeStart);
  const endOfRange = startOfDay(rangeEnd);

  // Convert Firestore Timestamp to Date
  const scaleStartDate = scale.startDate.toDate();

  // Determine effective end date
  let effectiveEndRange = endOfRange;
  if (scale.endDate) {
    const scaleEndDate = startOfDay(scale.endDate.toDate());
    if (isBefore(scaleEndDate, effectiveEndRange)) {
      effectiveEndRange = scaleEndDate;
    }
  }

  const startOfScale = startOfDay(scaleStartDate);

  // Early returns for out-of-range requests
  if (isBefore(effectiveEndRange, startOfScale)) {
    return [];
  }

  if (isAfter(startOfRange, effectiveEndRange)) {
    return [];
  }

  // Handle one-off scales (single shift)
  if (scale.isOneOff) {
    if (!isAfter(startOfScale, effectiveEndRange) &&
            !isBefore(startOfScale, startOfRange)) {
      const shiftType = getShiftTypeById(scale.defaultShiftTypeId);
      if (shiftType) {
        const startTimeStr = scale.customStartTime || shiftType.startTime;
        const endTimeStr = scale.customEndTime || shiftType.endTime;
        let hours = shiftType.hours;

        // Re-calculate hours if custom times
        if (scale.customStartTime && scale.customEndTime) {
          const [sH, sM] = startTimeStr.split(":").map(Number);
          const [eH, eM] = endTimeStr.split(":").map(Number);
          const startDateObj = new Date(2000, 0, 1, sH, sM);
          let endDateObj = new Date(2000, 0, 1, eH, eM);
          if (endDateObj < startDateObj) {
            endDateObj = addDays(endDateObj, 1);
          }
          hours = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
        }

        const [startHour, startMinute] = startTimeStr.split(":").map(Number);
        const shiftStartDateTime = new Date(startOfScale);
        shiftStartDateTime.setHours(startHour, startMinute, 0, 0);

        const shiftEndDateTime = addHours(shiftStartDateTime, hours);
        const dateStr = format(startOfScale, "yyyy-MM-dd");

        shifts.push({
          id: `${dateStr}-${scale.id}`,
          userId: scale.userId,
          scaleId: scale.id,
          date: dateStr,
          startTime: admin.firestore.Timestamp.fromDate(shiftStartDateTime),
          endTime: admin.firestore.Timestamp.fromDate(shiftEndDateTime),
          shiftTypeId: scale.defaultShiftTypeId,
          shiftTypeSnapshot: {
            ...shiftType,
            startTime: startTimeStr,
            endTime: endTimeStr,
            hours: hours,
            isAC4: scale.category === "AC-4" || shiftType.isAC4,
          },
          scaleCategory: scale.category,
          status: "confirmed",
          isManualOverride: false,
        });
      }
    }
    return shifts;
  }

  // Handle recurring scales
  let currentIterDate = isBefore(startOfRange, startOfScale) ?
        startOfScale :
        startOfRange;

  while (!isAfter(currentIterDate, effectiveEndRange)) {
    const dayIndex = differenceInDays(currentIterDate, startOfScale);
    const cyclePosition = dayIndex % scale.cycleLength;

    let shiftTypeIdToAdd = null;

    // Determine if this day has a shift based on pattern
    if (["12x36", "24x72", "6x18", "24x96"].includes(scale.patternType)) {
      if (cyclePosition === 0) {
        shiftTypeIdToAdd = scale.defaultShiftTypeId;
      }
    } else if (scale.patternType === "custom" && scale.cycleMap) {
      if (scale.cycleMap[cyclePosition]) {
        shiftTypeIdToAdd = scale.cycleMap[cyclePosition];
      }
    }

    if (shiftTypeIdToAdd) {
      const shiftType = getShiftTypeById(shiftTypeIdToAdd);
      if (shiftType) {
        let startTimeStr = shiftType.startTime;
        let endTimeStr = shiftType.endTime;
        let hours = shiftType.hours;

        // Override with custom times if they exist
        if (scale.customStartTime && scale.customEndTime) {
          startTimeStr = scale.customStartTime;
          endTimeStr = scale.customEndTime;

          const [sH, sM] = startTimeStr.split(":").map(Number);
          const [eH, eM] = endTimeStr.split(":").map(Number);
          const startDateObj = new Date(2000, 0, 1, sH, sM);
          let endDateObj = new Date(2000, 0, 1, eH, eM);
          if (endDateObj < startDateObj) {
            endDateObj = addDays(endDateObj, 1);
          }
          hours = (endDateObj.getTime() - startDateObj.getTime()) / (1000 * 60 * 60);
        }

        const [startHour, startMinute] = startTimeStr.split(":").map(Number);
        const shiftStartDateTime = new Date(currentIterDate);
        shiftStartDateTime.setHours(startHour, startMinute, 0, 0);

        const shiftEndDateTime = addHours(shiftStartDateTime, hours);

        shifts.push({
          id: `${format(currentIterDate, "yyyy-MM-dd")}-${scale.id}`,
          userId: scale.userId,
          scaleId: scale.id,
          date: format(currentIterDate, "yyyy-MM-dd"),
          startTime: admin.firestore.Timestamp.fromDate(shiftStartDateTime),
          endTime: admin.firestore.Timestamp.fromDate(shiftEndDateTime),
          shiftTypeId: shiftTypeIdToAdd,
          shiftTypeSnapshot: {
            ...shiftType,
            startTime: startTimeStr,
            endTime: endTimeStr,
            hours: hours,
            isAC4: scale.category === "AC-4" || shiftType.isAC4,
          },
          scaleCategory: scale.category,
          isManualOverride: false,
          status: isBefore(currentIterDate, today) ? "completed" : "scheduled",
        });
      }
    }

    currentIterDate = addDays(currentIterDate, 1);
  }

  return shifts;
};


module.exports = {
  generateShifts,
  getShiftTypeById,
  DEFAULT_SHIFT_TYPES,
};
