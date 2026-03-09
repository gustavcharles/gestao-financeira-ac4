const admin = require("firebase-admin");
const { addHours } = require("date-fns");

if (!admin.apps.length) {
    admin.initializeApp();
}

async function checkShifts() {
    const db = admin.firestore();

    // Test timezone and shifting
    const now = new Date();
    const windowStart = addHours(now, 24);
    const windowEnd = addHours(now, 48);

    console.log(`Checking shifts between ${windowStart.toISOString()} and ${windowEnd.toISOString()}`);

    const shiftsSnap = await db
        .collection("shifts")
        .where("startTime", ">=", admin.firestore.Timestamp.fromDate(windowStart))
        .where("startTime", "<=", admin.firestore.Timestamp.fromDate(windowEnd))
        .where("status", "in", ["scheduled", "confirmed"])
        .get();

    console.log(`Found ${shiftsSnap.docs.length} shifts matching criteria.`);

    // Group exactly as the script does
    const shiftsByUser = {};
    shiftsSnap.docs.forEach((doc) => {
        const shift = { id: doc.id, ...doc.data() };
        if (!shiftsByUser[shift.userId]) shiftsByUser[shift.userId] = [];
        shiftsByUser[shift.userId].push(shift);
    });

    console.log(`Shifts grouped by ${Object.keys(shiftsByUser).length} users.`);

    // For each user with a shift, do they have tokens?
    for (const userId of Object.keys(shiftsByUser)) {
        const userDoc = await db.collection("users").doc(userId).get();
        const fcmTokens = userDoc.data()?.fcmTokens || [];
        console.log(`- User: ${userDoc.data()?.email} (${userId}) | Shifts: ${shiftsByUser[userId].length} | FCM Tokens: ${fcmTokens.length}`);
    }

    return "Done";
}

checkShifts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
