const admin = require("firebase-admin");
const serviceAccount = require("./service-account.json"); // Precisaremos que o usuário forneça isso ou usaremos o default se estiver no ambiente certo

if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.applicationDefault(), // Tenta usar o default do sistema
        projectId: 'controle-contas-ac4'
    });
}

const db = admin.firestore();

async function checkUser(userId) {
    console.log(`--- Verificando usuário: ${userId} ---`);
    try {
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            console.log("ERRO: Usuário não encontrado no Firestore.");
            return;
        }

        const data = userDoc.data();
        console.log("Email:", data.email);
        console.log("Display Name:", data.displayName);
        console.log("Phone:", data.phone);
        
        const fcmTokens = data.fcmTokens || [];
        console.log(`Tokens FCM encontrados: ${fcmTokens.length}`);
        
        fcmTokens.forEach((token, i) => {
            console.log(`Token [${i}]: ${token.substring(0, 20)}...`);
        });

        if (fcmTokens.length === 0) {
            console.log("ALERTA: O usuário não tem tokens registrados. As notificações não chegarão.");
        }

    } catch (err) {
        console.error("Erro ao buscar dados:", err.message);
    }
}

// Pega o ID da linha de comando
const targetId = process.argv[2];
if (!targetId) {
    console.log("Uso: node check_tokens.js <userId>");
} else {
    checkUser(targetId);
}
