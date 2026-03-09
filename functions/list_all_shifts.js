const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp();
}

async function debugAllShifts() {
    const db = admin.firestore();
    const testUserId = "CjfnSPTs7eXbCrtoBxWRqYwSzz63";

    const snap = await db.collection("shifts")
        .where("userId", "==", testUserId)
        .get();

    console.log(`Found ${snap.docs.length} shifts for user ${testUserId}`);

    snap.docs.forEach(doc => {
        const d = doc.data();
        console.log({
            id: doc.id,
            status: d.status,
            startTime: d.startTime ? d.startTime.toDate().toISOString() : "Missing",
            endTime: d.endTime ? d.endTime.toDate().toISOString() : "Missing",
        });
    });
}

debugAllShifts().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
