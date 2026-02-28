const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { format, addHours } = require("date-fns");
const { toZonedTime } = require("date-fns-tz");

admin.initializeApp();
const db = admin.firestore();
const messaging = admin.messaging();

const BRAZIL_TZ = "America/Sao_Paulo";

/**
 * Scheduled Function: roda todo dia às 07:00 BRT
 * Busca plantões nas próximas 24-48h e envia notificações push
 */
exports.sendShiftReminders = onSchedule(
    {
        schedule: "0 7 * * *",    // 07:00 todo dia
        timeZone: BRAZIL_TZ,
        region: "us-central1",
    },
    async () => {
        const now = new Date();
        const windowStart = addHours(now, 24);
        const windowEnd = addHours(now, 48);

        console.log(`[sendShiftReminders] Buscando plantões entre ${windowStart.toISOString()} e ${windowEnd.toISOString()}`);

        // Buscar todos os ShiftEvents na janela de 24-48h
        const shiftsSnap = await db
            .collection("shifts")
            .where("startTime", ">=", admin.firestore.Timestamp.fromDate(windowStart))
            .where("startTime", "<=", admin.firestore.Timestamp.fromDate(windowEnd))
            .where("status", "in", ["scheduled", "confirmed"])
            .get();

        if (shiftsSnap.empty) {
            console.log("[sendShiftReminders] Nenhum plantão encontrado na janela.");
            return;
        }

        console.log(`[sendShiftReminders] ${shiftsSnap.docs.length} plantões encontrados.`);

        // Agrupar por userId para buscar tokens uma vez por usuário
        const shiftsByUser = {};
        shiftsSnap.docs.forEach((doc) => {
            const shift = { id: doc.id, ...doc.data() };
            if (!shiftsByUser[shift.userId]) shiftsByUser[shift.userId] = [];
            shiftsByUser[shift.userId].push(shift);
        });

        const sendPromises = Object.entries(shiftsByUser).map(async ([userId, shifts]) => {
            // Buscar tokens FCM do usuário
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) return;

            const fcmTokens = userDoc.data()?.fcmTokens || [];
            if (fcmTokens.length === 0) return;

            // Enviar uma notificação por plantão
            for (const shift of shifts) {
                const startTime = shift.startTime.toDate();
                const zonedTime = toZonedTime(startTime, BRAZIL_TZ);
                const timeStr = format(zonedTime, "HH:mm");
                const dateStr = format(zonedTime, "dd/MM");

                const shiftName = shift.shiftTypeSnapshot?.name ?? "Plantão";
                const category = shift.scaleCategory ?? "";

                const title = `🔔 Plantão amanhã — ${timeStr}`;
                const body = `${shiftName}${category ? ` (${category})` : ""} · ${dateStr}`;

                const message = {
                    notification: { title, body },
                    data: {
                        shiftId: shift.id,
                        userId,
                        type: "shift_reminder",
                    },
                    tokens: fcmTokens,
                    android: {
                        notification: {
                            icon: "ic_notification",
                            channelId: "shift_reminders",
                            priority: "high",
                        },
                    },
                    webpush: {
                        notification: {
                            icon: "/pwa-192x192.png",
                            badge: "/pwa-192x192.png",
                            requireInteraction: false,
                        },
                        fcmOptions: {
                            link: "/escalas",
                        },
                    },
                };

                try {
                    const response = await messaging.sendEachForMulticast(message);
                    console.log(`[sendShiftReminders] Enviado para userId=${userId}: ${response.successCount} ok, ${response.failureCount} falhas`);

                    // Limpar tokens inválidos
                    const invalidTokens = [];
                    response.responses.forEach((resp, idx) => {
                        if (!resp.success) {
                            const code = resp.error?.code;
                            if (
                                code === "messaging/invalid-registration-token" ||
                                code === "messaging/registration-token-not-registered"
                            ) {
                                invalidTokens.push(fcmTokens[idx]);
                            }
                        }
                    });

                    if (invalidTokens.length > 0) {
                        console.log(`[sendShiftReminders] Removendo ${invalidTokens.length} tokens inválidos do userId=${userId}`);
                        await db.collection("users").doc(userId).update({
                            fcmTokens: admin.firestore.FieldValue.arrayRemove(...invalidTokens),
                        });
                    }
                } catch (err) {
                    console.error(`[sendShiftReminders] Erro ao enviar para userId=${userId}:`, err);
                }
            }
        });

        await Promise.allSettled(sendPromises);
        console.log("[sendShiftReminders] Concluído.");
    }
);

/**
 * HTTP trigger para testar o envio de notificação manualmente
 * Acesse: POST /testNotification?userId=<uid>
 * Protegido por Admin SDK check — remover após testes
 */
exports.testNotification = onRequest(
    { region: "us-central1" },
    async (req, res) => {
        const userId = req.query.userId;
        if (!userId) {
            res.status(400).json({ error: "userId é obrigatório" });
            return;
        }

        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            res.status(404).json({ error: "Usuário não encontrado" });
            return;
        }

        const fcmTokens = userDoc.data()?.fcmTokens || [];
        if (fcmTokens.length === 0) {
            res.status(400).json({ error: "Usuário não tem tokens FCM registrados" });
            return;
        }

        const message = {
            notification: {
                title: "🔔 Teste — Gestão AC-4 Pro",
                body: "Notificações push funcionando! Plantão diurno amanhã às 08:00.",
            },
            tokens: fcmTokens,
            webpush: {
                notification: {
                    icon: "/pwa-192x192.png",
                    badge: "/pwa-192x192.png",
                },
                fcmOptions: { link: "/escalas" },
            },
        };

        try {
            const response = await messaging.sendEachForMulticast(message);
            res.json({
                success: true,
                successCount: response.successCount,
                failureCount: response.failureCount,
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);

/**
 * ONE-TIME HTTP trigger para migrar usuários "active" para trial de 15 dias.
 * Acesse: GET /migrateToTrial?adminKey=ac4migrate2026
 * REMOVER APÓS USO!
 */
exports.migrateToTrial = onRequest(
    { region: "us-central1" },
    async (req, res) => {
        // Proteção simples
        if (req.query.adminKey !== "ac4migrate2026") {
            res.status(403).json({ error: "Acesso negado" });
            return;
        }

        // Modo diagnóstico: listar todos os usuários
        if (req.query.action === "check") {
            const allUsers = await db.collection("users").get();
            const users = allUsers.docs.map((d) => ({
                email: d.data().email,
                status: d.data().status,
                role: d.data().role,
                plan: d.data().plan || null,
                trialEndsAt: d.data().trialEndsAt ? d.data().trialEndsAt.toDate().toISOString() : null,
            }));
            res.json({ total: users.length, users });
            return;
        }

        // Limpar trialEndsAt para que trial comece no próximo login
        if (req.query.action === "resetTrial") {
            const snapshot = await db
                .collection("users")
                .where("status", "==", "trial")
                .where("role", "==", "user")
                .get();

            const batch = db.batch();
            const reset = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (data.email === "gustav.charles@gmail.com") continue;
                batch.update(docSnap.ref, { trialEndsAt: null });
                reset.push(data.email);
            }

            await batch.commit();
            res.json({ success: true, count: reset.length, users: reset });
            return;
        }

        const now = new Date();
        const trialEnds = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000);

        try {
            const snapshot = await db
                .collection("users")
                .where("status", "==", "active")
                .where("role", "==", "user")
                .get();

            if (snapshot.empty) {
                res.json({ message: "Nenhum usuário encontrado", count: 0 });
                return;
            }

            const batch = db.batch();
            const migrated = [];

            for (const docSnap of snapshot.docs) {
                const data = docSnap.data();
                if (data.email === "gustav.charles@gmail.com") continue;

                batch.update(docSnap.ref, {
                    status: "trial",
                    plan: "trial",
                    trialEndsAt: trialEnds,
                    subscriptionEndsAt: null,
                    paymentId: null,
                });
                migrated.push(data.email);
            }

            await batch.commit();
            res.json({
                success: true,
                count: migrated.length,
                trialEndsAt: trialEnds.toISOString(),
                users: migrated,
            });
        } catch (err) {
            res.status(500).json({ error: err.message });
        }
    }
);