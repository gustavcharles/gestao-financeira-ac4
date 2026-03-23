const admin = require("firebase-admin");

if (!admin.apps.length) {
    admin.initializeApp({
        projectId: "controle-contas-ac4"
    });
}

async function checkConfig() {
    const db = admin.firestore();
    
    console.log("--- WHATSAPP CONFIG ---");
    const configSnap = await db.collection("app_config").doc("whatsapp").get();
    if (configSnap.exists) {
        console.log(JSON.stringify(configSnap.data(), null, 2));
    } else {
        console.log("Config not found!");
    }

    console.log("\n--- ACTIVE SCALES ---");
    const scalesSnap = await db.collection("scales").where("isActive", "==", true).limit(5).get();
    console.log(`Found ${scalesSnap.docs.length} active scales.`);
    scalesSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`- Scale ID: ${doc.id}, Name: ${d.name}, User: ${d.userId}`);
    });

    console.log("\n--- RECENT SHIFTS ---");
    const shiftsSnap = await db.collection("shifts").orderBy("startTime", "desc").limit(5).get();
    console.log(`Found ${shiftsSnap.docs.length} shifts in collection.`);
    shiftsSnap.docs.forEach(doc => {
        const d = doc.data();
        console.log(`- Shift ID: ${doc.id}, User: ${d.userId}, Status: ${d.status}, Date: ${d.date}`);
    });
}

checkConfig().then(() => process.exit(0)).catch(e => { console.error(e); process.exit(1); });
