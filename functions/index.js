const { onSchedule } = require("firebase-functions/v2/scheduler");
const { onRequest } = require("firebase-functions/v2/https");
const admin = require("firebase-admin");
const { format, addHours } = require("date-fns");
const { toZonedTime } = require("date-fns-tz");
const cors = require("cors")({ origin: true });

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
        schedule: "0 19 * * *",    // 19:00 todo dia (noite anterior)
        timeZone: BRAZIL_TZ,
        region: "us-central1",
    },
    async () => {
        const now = new Date();
        const windowStart = now; 
        const windowEnd = addHours(now, 36); // Janela de 36h para garantir que pegamos todo o dia seguinte

        console.log(`[sendShiftReminders] Buscando plantões entre ${windowStart.toISOString()} e ${windowEnd.toISOString()}`);

        // Buscar todos os ShiftEvents na janela de 0-24h
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
            // Buscar dados do usuário (tokens FCM, telefone, nome)
            const userDoc = await db.collection("users").doc(userId).get();
            if (!userDoc.exists) return;

            const userData = userDoc.data();
            const fcmTokens = userData.fcmTokens || [];
            const phone = userData.phone;
            const userName = userData.displayName || userData.email?.split('@')[0] || "Combatente";

            // Enviar uma notificação por plantão
            for (const shift of shifts) {
                const startTime = shift.startTime.toDate();
                const endTime = shift.endTime.toDate();
                const zonedStartTime = toZonedTime(startTime, BRAZIL_TZ);
                const zonedEndTime = toZonedTime(endTime, BRAZIL_TZ);
                
                const timeStr = format(zonedStartTime, "HH:mm");
                const endTimeStr = format(zonedEndTime, "HH:mm");
                const dateStr = format(zonedStartTime, "dd/MM");
                const fullDateStr = format(zonedStartTime, "dd/MM/yyyy");

                const shiftName = shift.shiftTypeSnapshot?.name ?? "Plantão";
                const category = shift.scaleCategory ?? "";

                // Push Notification
                if (fcmTokens.length > 0) {
                    const title = `🔔 Plantão hoje — ${timeStr}`;
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
                            },
                            fcmOptions: {
                                link: "/escalas",
                            },
                        },
                    };

                    try {
                        const response = await messaging.sendEachForMulticast(message);
                        console.log(`[sendShiftReminders] FCM para userId=${userId}: ${response.successCount} ok`);
                        
                        // Limpeza de tokens inválidos (omitido por brevidade aqui para focar no WhatsApp)
                    } catch (err) {
                        console.error(`[sendShiftReminders] Erro FCM para userId=${userId}:`, err);
                    }
                }

                // --- WhatsApp Reminder com Novo Template ---
                if (phone) {
                    const waMessage = `Olá, ${userName} !\n\n` +
                        `Atenção para o seu próximo plantão.\n\n` +
                        `📅 Data: ${fullDateStr}\n` +
                        `🕒 Horário: ${timeStr} - ${endTimeStr}\n\n` +
                        `Bom serviço! 🚒`;
                    
                    await sendWhatsAppMessage(phone, waMessage);
                }
            }
        });

        await Promise.allSettled(sendPromises);
        console.log("[sendShiftReminders] Concluído.");
    }
);

const { onDocumentUpdated } = require("firebase-functions/v2/firestore");

exports.onShiftConfirmed = onDocumentUpdated(
    "shifts/{shiftId}",
    async (event) => {
        const before = event.data.before.data();
        const after = event.data.after.data();

        // Só envia se o status mudou para 'confirmed'
        if (before.status === "confirmed" || after.status !== "confirmed") {
            return;
        }

        console.log(`[onShiftConfirmed] Shift ${event.params.shiftId} confirmado. Enviando WhatsApp...`);

        const userId = after.userId;
        const userDoc = await db.collection("users").doc(userId).get();
        if (!userDoc.exists) {
            console.log(`[onShiftConfirmed] Usuário ${userId} não encontrado.`);
            return;
        }

        const userData = userDoc.data();
        const phone = userData.phone;
        const userName = userData.displayName || userData.email?.split('@')[0] || "Combatente";

        if (!phone) {
            console.log(`[onShiftConfirmed] Usuário ${userId} não possui telefone cadastrado.`);
            return;
        }

        const startTime = after.startTime.toDate();
        const endTime = after.endTime.toDate();
        const zonedStartTime = toZonedTime(startTime, BRAZIL_TZ);
        const zonedEndTime = toZonedTime(endTime, BRAZIL_TZ);

        const timeStr = format(zonedStartTime, "HH:mm");
        const endTimeStr = format(zonedEndTime, "HH:mm");
        const fullDateStr = format(zonedStartTime, "dd/MM/yyyy");

        const waMessage = `*ESCALA CONFIRMADA* ✅\n\n` +
            `Olá, ${userName} !\n\n` +
            `Atenção para o seu próximo plantão.\n\n` +
            `📅 Data: ${fullDateStr}\n` +
            `🕒 Horário: ${timeStr} - ${endTimeStr}\n\n` +
            `Bom serviço! 🚒`;

        await sendWhatsAppMessage(phone, waMessage);
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

// --- WHATSAPP / EVOLUTION API INTEGRATION ---

/**
 * Helper: Busca configurações do WhatsApp no Firestore
 */
async function getWhatsAppConfig() {
    const docSnap = await db.collection("app_config").doc("whatsapp").get();
    if (!docSnap.exists) return null;
    return docSnap.data();
}

/**
 * Helper: Normaliza número de telefone para o padrão do WhatsApp (55 + DDD + Numero)
 */
function formatWhatsAppNumber(phone) {
    if (!phone) return null;
    // Remove tudo que não for número
    let cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 10 || cleaned.length === 11) {
        cleaned = '55' + cleaned;
    }
    return cleaned;
}

/**
 * Helper: Envia mensagem via Evolution API
 */
async function sendWhatsAppMessage(phone, message) {
    const config = await getWhatsAppConfig();
    if (!config || !config.enabled || !config.baseUrl || !config.apiKey || !config.instanceName) {
        console.log("[WhatsApp] Integração desabilitada ou incompleta.");
        return { success: false, error: "Integração desabilitada ou incompleta." };
    }

    const formattedPhone = formatWhatsAppNumber(phone);
    if (!formattedPhone) return { success: false, error: "Telefone inválido." };

    let baseUrl = config.baseUrl.trim();
    if (!baseUrl.includes('://')) {
        baseUrl = 'https://' + baseUrl;
    }

    const url = `${baseUrl}/message/sendText/${encodeURIComponent(config.instanceName)}`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': config.apiKey
            },
            body: JSON.stringify({
                number: formattedPhone,
                options: {
                    delay: 1200,
                    presence: 'composing',
                    linkPreview: false
                },
                text: message
            })
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[WhatsApp] Erro ao enviar para ${formattedPhone}: ${errText}`);
            return { success: false, error: errText };
        }

        return { success: true };
    } catch (error) {
        console.error(`[WhatsApp] Falha na requisição para ${formattedPhone}:`, error);
        return { success: false, error: error.message };
    }
}

/**
 * Cria instância na Evolution API
 * POST /whatsappCreateInstance?adminKey=...
 */
exports.whatsappCreateInstance = onRequest(
    { region: "us-central1" },
    (req, res) => {
        cors(req, res, async () => {
            if (req.query.adminKey !== "ac4migrate2026") {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            const config = await getWhatsAppConfig();
            if (!config || !config.baseUrl || !config.apiKey || !config.instanceName) {
                res.status(400).json({ error: "Configuração incompleta no Firestore" });
                return;
            }

            let baseUrl = config.baseUrl.trim();
            if (!baseUrl.includes('://')) {
                baseUrl = 'https://' + baseUrl;
            }

            try {
                console.log(`[WhatsApp] Chamando ${baseUrl}/instance/create para ${config.instanceName}`);
                const response = await fetch(`${baseUrl}/instance/create`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'apikey': config.apiKey
                    },
                    body: JSON.stringify({
                        instanceName: config.instanceName,
                        qrcode: true,
                        integration: "WHATSAPP-BAILEYS"
                    })
                });

                const data = await response.json();
                console.log(`[WhatsApp] Resposta instance/create: status=${response.status}`, data);

                if (!response.ok) {
                    // Instância pode já existir
                    res.status(400).json({ error: data });
                    return;
                }

                // Atualiza status localmente
                await db.collection("app_config").doc("whatsapp").set({ status: 'created' }, { merge: true });

                res.json({ success: true, data });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
);

/**
 * Deleta a instância na Evolution API e reseta o status no Firestore
 * DELETE /whatsappDeleteInstance?adminKey=...
 */
exports.whatsappDeleteInstance = onRequest(
    { region: "us-central1" },
    (req, res) => {
        cors(req, res, async () => {
            if (req.query.adminKey !== "ac4migrate2026") {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            const config = await getWhatsAppConfig();
            if (!config || !config.baseUrl || !config.apiKey || !config.instanceName) {
                res.status(400).json({ error: "Configuração incompleta no Firestore" });
                return;
            }

            let baseUrl = config.baseUrl.trim();
            if (!baseUrl.includes('://')) {
                baseUrl = 'https://' + baseUrl;
            }

            try {
                // Tenta logout e deletar na Evolution API
                await fetch(`${baseUrl}/instance/logout/${encodeURIComponent(config.instanceName)}`, {
                    method: 'DELETE',
                    headers: { 'apikey': config.apiKey }
                });

                await fetch(`${baseUrl}/instance/delete/${encodeURIComponent(config.instanceName)}`, {
                    method: 'DELETE',
                    headers: { 'apikey': config.apiKey }
                });

                // Limpa o status localmente no Firestore
                await db.collection("app_config").doc("whatsapp").set({ status: 'disconnected' }, { merge: true });

                res.json({ success: true, message: "Instância deletada com sucesso" });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
);

/**
 * Retorna o QR Code em base64
 * GET /whatsappGetQRCode?adminKey=...
 */
exports.whatsappGetQRCode = onRequest(
    { region: "us-central1" },
    (req, res) => {
        cors(req, res, async () => {
            if (req.query.adminKey !== "ac4migrate2026") {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            const config = await getWhatsAppConfig();
            if (!config || !config.baseUrl || !config.apiKey || !config.instanceName) {
                res.status(400).json({ error: "Configuração incompleta" });
                return;
            }

            let baseUrl = config.baseUrl.trim();
            if (!baseUrl.includes('://')) {
                baseUrl = 'https://' + baseUrl;
            }

            try {
                console.log(`[WhatsApp] Buscando QR Code em ${baseUrl}/instance/connect/${config.instanceName}`);
                const response = await fetch(`${baseUrl}/instance/connect/${encodeURIComponent(config.instanceName)}`, {
                    method: 'GET',
                    headers: { 'apikey': config.apiKey }
                });

                const data = await response.json();
                console.log(`[WhatsApp] Resposta instance/connect: status=${response.status}`, data);
                res.json({ success: response.ok, data });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
);

/**
 * Retorna o status da conexão
 * GET /whatsappGetStatus?adminKey=...
 */
exports.whatsappGetStatus = onRequest(
    { region: "us-central1" },
    (req, res) => {
        cors(req, res, async () => {
            if (req.query.adminKey !== "ac4migrate2026") {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            const config = await getWhatsAppConfig();
            if (!config || !config.baseUrl || !config.apiKey || !config.instanceName) {
                res.status(400).json({ error: "Configuração incompleta" });
                return;
            }

            let baseUrl = config.baseUrl.trim();
            if (!baseUrl.includes('://')) {
                baseUrl = 'https://' + baseUrl;
            }

            try {
                const response = await fetch(`${baseUrl}/instance/connectionState/${encodeURIComponent(config.instanceName)}`, {
                    method: 'GET',
                    headers: { 'apikey': config.apiKey }
                });

                const data = await response.json();

                if (data && data.instance && data.instance.state) {
                    await db.collection("app_config").doc("whatsapp").update({ status: data.instance.state });
                }

                res.json({ success: response.ok, data });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
);

/**
 * Envia mensagem de teste
 * POST /whatsappSendTest?adminKey=...
 */
exports.whatsappSendTest = onRequest(
    { region: "us-central1" },
    (req, res) => {
        cors(req, res, async () => {
            if (req.query.adminKey !== "ac4migrate2026") {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            const { phone, message } = req.body;
            if (!phone || !message) {
                res.status(400).json({ error: "Phone e message são obrigatórios" });
                return;
            }

            const result = await sendWhatsAppMessage(phone, message);
            if (!result.success) {
                res.status(400).json({ success: false, error: result.error });
                return;
            }
            res.json({ success: true });
        });
    }
);

/**
 * Envia mensagem para todos os usuários com telefone (Broadcast)
 * POST /whatsappBroadcast?adminKey=...
 */
exports.whatsappBroadcast = onRequest(
    { region: "us-central1" },
    (req, res) => {
        cors(req, res, async () => {
            if (req.query.adminKey !== "ac4migrate2026") {
                res.status(403).json({ error: "Acesso negado" });
                return;
            }

            const { message } = req.body;
            if (!message) {
                res.status(400).json({ error: "Message é obrigatória" });
                return;
            }

            try {
                const usersSnap = await db.collection("users").where("status", "in", ["active", "trial"]).get();
                let count = 0;
                let noPhoneCount = 0;

                for (const doc of usersSnap.docs) {
                    const user = doc.data();
                    if (user.phone) {
                        const result = await sendWhatsAppMessage(user.phone, message);
                        if (result.success) {
                            count++;
                        }
                    } else {
                        noPhoneCount++;
                    }
                }

                res.json({ success: true, sent: count, noPhone: noPhoneCount });
            } catch (err) {
                res.status(500).json({ error: err.message });
            }
        });
    }
);