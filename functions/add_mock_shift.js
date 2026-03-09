const admin = require("firebase-admin");
const { addHours } = require("date-fns");

if (!admin.apps.length) {
    admin.initializeApp();
}

async function addTestShift() {
    const db = admin.firestore();

    // Test timezone and shifting
    const now = new Date();
    // 36 hours from now (exactly in the middle of the 24-48 hour window)
    const testTime = addHours(now, 36);

    // Using the user UID Gustav provided earlier
    const testUserId = "CjfnSPTs7eXbCrtoBxWRqYwSzz63";

    console.log(`Adding test shift at ${testTime.toISOString()} for user ${testUserId}`);

    const newShift = {
        userId: testUserId,
        startTime: admin.firestore.Timestamp.fromDate(testTime),
        endTime: admin.firestore.Timestamp.fromDate(addHours(testTime, 4)),
        status: "scheduled",
        shiftTypeSnapshot: {
            name: "Test Shift"
        },
        date: testTime.toISOString().split("T")[0],
        createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection("shifts").add(newShift);

    console.log("Mock shift added.");
}

addTestShift().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
