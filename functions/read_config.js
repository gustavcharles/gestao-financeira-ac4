const admin = require("firebase-admin");
admin.initializeApp({
  projectId: "controle-contas-ac4"
});
const db = admin.firestore();

async function check() {
  const docSnap = await db.collection("app_config").doc("whatsapp").get();
  if (!docSnap.exists) {
    console.log("Config document not found");
  } else {
    console.log(JSON.stringify(docSnap.data(), null, 2));
  }
}

check().catch(console.error);
