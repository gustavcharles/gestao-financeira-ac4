/**
 * Script one-time para migrar usuários "active" sem trial para trial de 15 dias.
 * Usa o token do Firebase CLI para autenticação.
 *
 * Uso: cd functions && node migrate_to_trial.js
 */

const { execSync } = require("child_process");
const admin = require("firebase-admin");

// Obter access token do Firebase CLI
function getFirebaseToken() {
    try {
        // Use firebase CLI to get an access token
        const result = execSync("npx firebase-tools login:ci --no-localhost 2>&1", {
            encoding: "utf8",
            timeout: 5000,
        });
        return result.trim();
    } catch {
        return null;
    }
}

// Inicializa com o project ID explícito e credencial do gcloud/firebase
const app = admin.initializeApp({
    projectId: "controle-contas-ac4",
    credential: admin.credential.applicationDefault(),
});

const db = admin.firestore();

async function migrateActiveUsersToTrial() {
    const now = new Date();
    const trialEnds = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // +15 dias

    console.log("=== Migração de Usuários Ativos para Trial ===");
    console.log(`Data atual: ${now.toISOString()}`);
    console.log(`Trial expira em: ${trialEnds.toISOString()}`);
    console.log("");

    try {
        // Buscar todos os usuários com status "active" e role "user"
        const snapshot = await db
            .collection("users")
            .where("status", "==", "active")
            .where("role", "==", "user")
            .get();

        if (snapshot.empty) {
            console.log("Nenhum usuário encontrado com status 'active' e role 'user'.");
            return;
        }

        console.log(`Encontrados ${snapshot.size} usuários para migrar:\n`);

        const batch = db.batch();
        let count = 0;

        for (const docSnap of snapshot.docs) {
            const data = docSnap.data();

            // Pular o admin por segurança
            if (data.email === "gustav.charles@gmail.com") {
                console.log(`  PULANDO admin: ${data.email}`);
                continue;
            }

            console.log(`  -> ${data.email} (status: ${data.status}, plan: ${data.plan || "-"})`);

            batch.update(docSnap.ref, {
                status: "trial",
                plan: "trial",
                trialEndsAt: trialEnds,
                subscriptionEndsAt: null,
                paymentId: null,
            });

            count++;
        }

        if (count === 0) {
            console.log("\nNenhum usuário para atualizar.");
            return;
        }

        await batch.commit();
        console.log(`\n${count} usuários migrados para trial de 15 dias com sucesso!`);
        console.log(`   Trial expira em: ${trialEnds.toLocaleDateString("pt-BR")}`);
    } catch (error) {
        console.error("Erro:", error.message);
        throw error;
    }
}

migrateActiveUsersToTrial()
    .then(() => process.exit(0))
    .catch((err) => {
        console.error("Erro na migração:", err.message);
        process.exit(1);
    });
