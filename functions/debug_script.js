const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json"); // We need this or default credential

// Initialize app (assuming default credentials work in this environment or using empty config if running in cloud shell/emulator context, but here we might need to rely on existing admin init if we run via firebase functions:shell? No, standalone script needs creds.)
// Actually, simpler: I can run this inside `firebase functions:shell` to get auth for free!
// I'll write the script to be pasted into `firebase functions:shell` OR just export a function I can call.

// Let's create a standalone script that uses application default credentials (ADC) if available,
// or I can modify the existing `repro_test.js` to use the Admin SDK against the real DB?
// No, connecting to real Prod DB from here might be blocked or require key.
// BETTER: I will add a temporary HTTP function to `index.js` called `debug` that prints this info.
// Then I call it with the user ID. simpler and no auth issues.

const { onRequest } = require("firebase-functions/v2/https");
const db = admin.firestore();

exports.debugUserData = onRequest(async (req, res) => {
  const userId = req.query.userId || "e37d-44d9-b10f-ec264e2425b6"; // Default to the one form chat

  try {
    const scalesSnap = await db.collection("scales")
      .where("userId", "==", userId)
      // .where("isActive", "==", true) // Let's see ALL scales
      .get();

    const activeScales = [];
    const inactiveScales = [];

    scalesSnap.forEach((doc) => {
      const data = doc.data();
      const info = { id: doc.id, name: data.name, isActive: data.isActive, category: data.category };
      if (data.isActive) activeScales.push(info);
      else inactiveScales.push(info);
    });

    const shiftsSnap = await db.collection("shifts")
      .where("userId", "==", userId)
      .limit(50) // Just a sample
      .get();

    const shifts = [];
    shiftsSnap.forEach((doc) => {
      const data = doc.data();
      shifts.push({
        id: doc.id,
        scaleId: data.scaleId,
        date: data.date,
        status: data.status,
        type: data.isManualOverride ? "MANUAL" : "GENERATED_COPY?",
      });
    });

    res.json({
      userId,
      activeScalesCount: activeScales.length,
      activeScales,
      inactiveScalesCount: inactiveScales.length,
      inactiveScales,
      sampleShifts: shifts,
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});
