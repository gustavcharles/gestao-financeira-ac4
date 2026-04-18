const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

// Firebase Secrets
const OPENROUTER_API_KEY = defineSecret("OPENROUTER_API_KEY");

// Configuração do OpenRouter — modelos em ordem de prioridade (fallback automático)
const OPENROUTER_MODELS = [
    "google/gemini-2.0-flash-001",                   // 1º: Gemini 2.0 Flash — Estabilidade e baixo custo
    "google/gemini-2.0-flash-lite-preview-02-05:free", // 2º: Flash Lite (Gratuito se disponível)
    "liquid/lfm-2.5-1.2b-instruct:free",             // 3º: Liquid LFM (Backup estável)
    "meta-llama/llama-3.3-70b-instruct:free",       // 4º: Llama 3.3 70B
    "qwen/qwen3-next-80b-a3b-instruct:free",         // 5º: Qwen3 80B
    "google/gemma-3-27b-it:free",                    // 6º: Gemma 3
];
const OPENROUTER_URL = "https://openrouter.ai/api/v1/chat/completions";

// Cache de conexão Firestore (evita lentidão em cold starts)
let _db = null;
function getDb() {
    if (admin.apps.length === 0) {
        admin.initializeApp();
    }
    if (!_db) _db = admin.firestore();
    return _db;
}

// ─────────────────────────────────────────────
// UTILITÁRIOS
// ─────────────────────────────────────────────

/** Busca a configuração do WhatsApp no Firestore */
async function getWhatsAppConfig() {
    const docSnap = await getDb().collection("app_config").doc("whatsapp").get();
    if (!docSnap.exists) return null;
    return docSnap.data();
}

/** Extrai o número de telefone do remoteJid da Evolution API */
function extractPhoneNumber(remoteJid) {
    return remoteJid.split("@")[0];
}

/**
 * No Brasil, o WhatsApp às vezes omite o "9" do número de celular.
 * Insere o 9 após o DDD quando o número tem 10 dígitos.
 */
function insertBrazilianNinthDigit(phone) {
    if (phone.length === 10) {
        return phone.slice(0, 2) + "9" + phone.slice(2);
    }
    return phone;
}

/**
 * Busca o usuário no Firestore pelo número de telefone.
 * Tenta múltiplos formatos para garantir correspondência.
 */
async function findUserByPhone(rawPhone) {
    const db = getDb();
    const cleanPhone = rawPhone.replace(/\D/g, "");

    const candidates = new Set();
    candidates.add(cleanPhone);

    const withoutCountry = cleanPhone.startsWith("55") ? cleanPhone.slice(2) : cleanPhone;
    candidates.add(withoutCountry);
    candidates.add(insertBrazilianNinthDigit(withoutCountry));
    candidates.add("55" + withoutCountry);
    candidates.add("55" + insertBrazilianNinthDigit(withoutCountry));

    console.log(`[Agent] Buscando usuário. Variações: ${[...candidates].join(", ")}`);
    
    // Timeout de 10s para evitar que a função trave infinitamente
    const timeout = new Promise((_, reject) => 
        setTimeout(() => reject(new Error("Firestore Timeout")), 10000)
    );

    for (const phone of candidates) {
        try {
            const snap = await Promise.race([
                db.collection("users").where("phone", "==", phone).limit(1).get(),
                timeout
            ]);
            
            if (!snap.empty) {
                console.log(`[Agent] Usuário encontrado com o número: ${phone}`);
                return { id: snap.docs[0].id, ...snap.docs[0].data() };
            }
        } catch (err) {
            console.error(`[Agent] Erro ou Timeout ao buscar ${phone}:`, err);
        }
    }

    return null;
}

/**
 * Calcula o mês de referência conforme as regras de negócio:
 * - Receita "AC-4"    → mês da data + 2
 * - Receita "Salário" → mês da data + 1
 * - Demais            → mês da data
 */
function getShiftedReferenceMonth(dateStr, categoria, tipo) {
    const MONTH_NAMES = [
        "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
        "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    const dateObj = new Date(dateStr + "T12:00:00");
    let shift = 0;

    if (tipo === "Receita") {
        if (categoria === "AC-4") shift = 2;
        else if (categoria === "Salário") shift = 1;
    }

    dateObj.setMonth(dateObj.getMonth() + shift);
    return `${MONTH_NAMES[dateObj.getMonth()]} ${dateObj.getFullYear()}`;
}

/**
 * Faz o download de mídia (áudio/imagem) via Evolution API
 */
async function downloadMedia(config, fullMessageBody) {
    let baseUrl = config.baseUrl.trim();
    if (!baseUrl.includes("://")) baseUrl = "https://" + baseUrl;

    const url = `${baseUrl}/chat/getBase64FromMediaMessage/${encodeURIComponent(config.instanceName)}`;

    try {
        console.log(`[Agent] Baixando mídia...`);
        const response = await fetch(url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "apikey": config.apiKey,
            },
            body: JSON.stringify({ message: fullMessageBody, convertToMp4: false }),
        });

        if (!response.ok) {
            const errText = await response.text();
            console.error(`[Agent] Erro ao baixar mídia (${response.status}): ${errText}`);
            return null;
        }

        const data = await response.json();
        return { base64: data.base64, mimetype: data.mimetype };
    } catch (err) {
        console.error("[Agent] Falha na requisição de download de mídia:", err);
        return null;
    }
}

/**
 * Envia mensagem de texto ao usuário via WhatsApp
 */
async function sendWhatsAppReply(phoneNumber, message) {
    const config = await getWhatsAppConfig();
    if (!config || !config.enabled || !config.baseUrl || !config.apiKey || !config.instanceName) {
        console.log("[Agent] Integração WhatsApp desabilitada.");
        return;
    }

    let baseUrl = config.baseUrl.trim();
    if (!baseUrl.includes("://")) baseUrl = "https://" + baseUrl;

    const url = `${baseUrl}/message/sendText/${encodeURIComponent(config.instanceName)}`;

    try {
        await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "apikey": config.apiKey },
            body: JSON.stringify({
                number: phoneNumber,
                options: { delay: 1000, presence: "composing", linkPreview: false },
                text: message,
            }),
        });
    } catch (err) {
        console.error("[Agent] Falha ao enviar resposta WhatsApp:", err);
    }
}

/**
 * Monta o System Prompt com as categorias do usuário
 */
function buildSystemPrompt(categories) {
    const today = new Date().toISOString().split("T")[0];
    const receitaCats = (categories.Receita || []).map(c => c.name || c).join(", ");
    const despesaCats = (categories.Despesa || []).map(c => c.name || c).join(", ");

    return `Você é um assistente financeiro pessoal inteligente e objetivo. Analise a mensagem ou imagem enviada e extraia os dados de um lançamento financeiro.

CATEGORIAS DISPONÍVEIS:
- Receitas: ${receitaCats}
- Despesas: ${despesaCats}

REGRAS DE NEGÓCIO:
- Receita categoria "Salário": mês de referência = mês da data + 1.
- Receita categoria "AC-4" (serviço militar/bombeiro): mês de referência = mês da data + 2.
- Todas as outras: mês de referência = mês atual da data.

INSTRUÇÕES:
1. Identifique se é Despesa ou Receita com base no contexto.
2. Extraia: descrição, valor numérico, categoria (das listas acima), data.
3. Se a data não for mencionada, use hoje: ${today}.
4. Escolha a categoria mais próxima das disponíveis. Use "Outros" se não houver correspondência.
5. Para imagens de notas/comprovantes, extraia os dados do documento.

RETORNE APENAS um JSON válido, sem markdown, sem texto adicional:
{"tipo":"Despesa","descricao":"string","valor":number,"categoria":"string","data":"YYYY-MM-DD","status":"Pendente"}

ou

{"tipo":"Receita","descricao":"string","valor":number,"categoria":"string","data":"YYYY-MM-DD","status":"Pendente"}

Se a mensagem NÃO for sobre finanças ou estiver incompleta demais para extrair valor:
{"erro":"motivo resumido em até 10 palavras"}`;
}

/**
 * Chama a API do OpenRouter com fallback automático entre modelos.
 * Em caso de erro 429 (rate limit), tenta o próximo modelo da lista.
 */
async function callOpenRouter(apiKey, messages) {
    let lastError = null;

    for (const model of OPENROUTER_MODELS) {
        console.log(`[Agent] Tentando modelo: ${model}`);
        try {
            const response = await fetch(OPENROUTER_URL, {
                method: "POST",
                headers: {
                    "Authorization": `Bearer ${apiKey}`,
                    "Content-Type": "application/json",
                    "HTTP-Referer": "https://controle-contas-ac4.firebaseapp.com",
                    "X-Title": "Gestão Financeira AC-4",
                },
                body: JSON.stringify({
                    model: model,
                    messages: messages,
                    temperature: 0.1,
                    max_tokens: 512,
                }),
            });

            if (response.status === 429) {
                const errText = await response.text();
                console.warn(`[Agent] Modelo ${model} com rate limit. Aguardando 2s antes do fallback...`);
                lastError = new Error(`OpenRouter 429 em ${model}: ${errText}`);
                
                // Pequeno delay antes de tentar o próximo modelo para evitar bloqueio sequencial
                await new Promise(resolve => setTimeout(resolve, 2000));
                continue; 
            }

            if (!response.ok) {
                const errText = await response.text();
                throw new Error(`OpenRouter ${response.status} em ${model}: ${errText}`);
            }

            const data = await response.json();

            if (!data.choices || data.choices.length === 0) {
                throw new Error(`OpenRouter retornou resposta vazia para ${model}.`);
            }

            console.log(`[Agent] Resposta obtida com sucesso via ${model}`);
            return data.choices[0].message.content;

        } catch (err) {
            if (err.message.includes("429")) {
                lastError = err;
                continue; // tenta o próximo
            }
            throw err; // outros erros: não tenta próximo modelo
        }
    }

    // Todos os modelos falharam
    throw lastError || new Error("Todos os modelos OpenRouter estão indisponíveis.");
}


// ─────────────────────────────────────────────
// CLOUD FUNCTION PRINCIPAL — WEBHOOK
// ─────────────────────────────────────────────

exports.whatsappAgentWebhook = onRequest(
    {
        region: "us-central1",
        secrets: [OPENROUTER_API_KEY],
        timeoutSeconds: 60,
        memory: "256MiB",
    },
    async (req, res) => {
        // Agora o res.send(200) fica no final para garantir que o processo termine

        try {
            const body = req.body;

            if (!body || body.event !== "messages.upsert") return;

            const data = body.data;
            if (!data || !data.key) return;

            if (data.key.fromMe) return;

            const remoteJid = data.key.remoteJid;
            if (!remoteJid) return;

            if (remoteJid.includes("@g.us")) return;

            const phoneNumber = extractPhoneNumber(remoteJid);
            const messageType = data.messageType;

            console.log(`[Agent] Nova mensagem de ${phoneNumber}, tipo: ${messageType}`);

            const supportedTypes = ["conversation", "extendedTextMessage", "audioMessage", "imageMessage"];
            if (!supportedTypes.includes(messageType)) {
                console.log(`[Agent] Tipo não suportado: ${messageType}. Ignorando.`);
                return;
            }

            // ── Identifica o usuário ──
            const user = await findUserByPhone(phoneNumber);
            if (!user) {
                console.log(`[Agent] Usuário não encontrado para: ${phoneNumber}`);
                await sendWhatsAppReply(
                    phoneNumber,
                    "⚠️ *Número não vinculado*\n\n" +
                    "Seu número de WhatsApp não está associado a nenhuma conta.\n\n" +
                    "Acesse o app e cadastre seu número em:\n" +
                    "*Configurações → Meu Perfil → WhatsApp* 📱"
                );
                return;
            }

            console.log(`[Agent] Usuário: ${user.id} (${user.email || "sem email"})`);

            // ── Busca categorias do usuário ──
            const db = getDb();
            const settingsDoc = await db.collection("user_settings").doc(user.id).get();

            const defaultCategories = {
                Receita: [
                    { name: "Salário" }, { name: "AC-4" }, { name: "Renda Extra" }, { name: "Investimentos" }, { name: "Outros" }
                ],
                Despesa: [
                    { name: "Aluguel" }, { name: "Energia" }, { name: "Internet" }, { name: "Mercado" }, 
                    { name: "Combustível" }, { name: "Alimentação" }, { name: "Farmácia" }, 
                    { name: "Lazer" }, { name: "Transporte" }, { name: "Cartão" }, 
                    { name: "Educação" }, { name: "Assinaturas" }, { name: "Outros" }
                ],
            };

            const baseCategories = settingsDoc.exists
                ? (settingsDoc.data().categories || defaultCategories)
                : defaultCategories;

            // Smart Merge: Ensure backend agent sees both user-defined and new default categories
            const mergedCategories = {
                Receita: Array.isArray(baseCategories.Receita) ? [...baseCategories.Receita] : [...defaultCategories.Receita],
                Despesa: Array.isArray(baseCategories.Despesa) ? [...baseCategories.Despesa] : [...defaultCategories.Despesa]
            };

            ['Receita', 'Despesa'].forEach(type => {
                defaultCategories[type].forEach(defCat => {
                    const exists = mergedCategories[type].some(
                        c => (c.name || c).toLowerCase() === defCat.name.toLowerCase()
                    );
                    if (!exists) {
                        mergedCategories[type].push(defCat);
                    }
                });
            });

            const systemPrompt = buildSystemPrompt(mergedCategories);
            let messages = [];

            // ── Monta o conteúdo para o OpenRouter ──

            if (messageType === "conversation") {
                const text = data.message?.conversation || "";
                if (!text.trim()) return;
                messages = [{ role: "user", content: systemPrompt + "\n\nMensagem do usuário:\n" + text }];

            } else if (messageType === "extendedTextMessage") {
                const text = data.message?.extendedTextMessage?.text || "";
                if (!text.trim()) return;
                messages = [{ role: "user", content: systemPrompt + "\n\nMensagem do usuário:\n" + text }];

            } else if (messageType === "audioMessage") {
                const config = await getWhatsAppConfig();
                if (!config) { return; }

                console.log(`[Agent] Processando áudio para ${phoneNumber}...`);
                const media = await downloadMedia(config, data);

                if (!media || !media.base64) {
                    await sendWhatsAppReply(phoneNumber,
                        "❌ Não consegui processar seu áudio. Tente enviar novamente ou use *texto*.");
                    return;
                }

                const mimeType = media.mimetype || "audio/ogg";
                const format = mimeType.includes("ogg") ? "ogg" : "mp3";

                messages = [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: systemPrompt +
                                "\n\nO usuário enviou um áudio. Transcreva o que ele disse e extraia os dados financeiros para o JSON de lançamento."
                        },
                        {
                            type: "input_audio",
                            input_audio: {
                                data: media.base64,
                                format: format
                            }
                        }
                    ]
                }];

            } else if (messageType === "imageMessage") {
                const config = await getWhatsAppConfig();
                if (!config) { return; }

                const caption = data.message?.imageMessage?.caption || "";
                const media = await downloadMedia(config, data);

                if (!media || !media.base64) {
                    await sendWhatsAppReply(phoneNumber,
                        "❌ Não consegui processar sua imagem. Tente enviar uma mensagem de *texto*.");
                    return;
                }

                const mimeType = media.mimetype || "image/jpeg";
                messages = [{
                    role: "user",
                    content: [
                        {
                            type: "text",
                            text: systemPrompt +
                                "\n\nO usuário enviou uma imagem (nota fiscal, comprovante ou recibo). " +
                                (caption ? `Legenda: "${caption}". ` : "") +
                                "Extraia os dados financeiros relevantes:"
                        },
                        {
                            type: "image_url",
                            image_url: { url: `data:${mimeType};base64,${media.base64}` }
                        }
                    ]
                }];
            }

            if (messages.length === 0) return;

            // ── Chama OpenRouter ──
            console.log(`[Agent] Chamando OpenRouter para ${user.id}...`);
            const rawText = await callOpenRouter(OPENROUTER_API_KEY.value(), messages);
            console.log(`[Agent] Resposta do modelo: ${rawText}`);

            // ── Parse do JSON ──
            let parsed;
            try {
                const cleaned = rawText
                    .replace(/```json\n?/g, "")
                    .replace(/```\n?/g, "")
                    .trim();
                parsed = JSON.parse(cleaned);
            } catch (parseErr) {
                console.error("[Agent] Falha ao parsear JSON. Raw:", rawText);
                await sendWhatsAppReply(phoneNumber,
                    "🤔 Não entendi muito bem. Tente ser mais direto:\n\n" +
                    '• _"paguei 80 reais no mercado hoje"_\n' +
                    '• _"recebi salário de 4000"_\n' +
                    '• _"conta de luz 180"_\n' +
                    "• 📸 Foto de uma nota fiscal"
                );
                return;
            }

            // ── Erro retornado pela IA ──
            if (parsed.erro) {
                await sendWhatsAppReply(phoneNumber,
                    `🤔 Não consegui identificar um lançamento financeiro.\n\n` +
                    `*Motivo:* ${parsed.erro}\n\n` +
                    `Tente:\n` +
                    '• _"gastei 50 no mercado"_\n' +
                    '• _"recebi AC-4 de 800"_\n' +
                    '• 📸 Foto de uma nota fiscal'
                );
                return;
            }

            // ── Valida campos obrigatórios ──
            if (!parsed.tipo || !parsed.descricao || !parsed.valor || !parsed.categoria || !parsed.data) {
                console.warn("[Agent] JSON incompleto:", parsed);
                await sendWhatsAppReply(phoneNumber,
                    "⚠️ Não consegui extrair todas as informações.\n\n" +
                    'Exemplo: _"paguei 150 de internet hoje"_'
                );
                return;
            }

            // ── Calcula mês de referência ──
            const mesReferencia = getShiftedReferenceMonth(parsed.data, parsed.categoria, parsed.tipo);

            // ── Salva no Firestore ──
            const transaction = {
                user_id: user.id,
                tipo: parsed.tipo,
                descricao: parsed.descricao,
                valor: Number(parsed.valor),
                categoria: parsed.categoria,
                data: parsed.data,
                mes_referencia: mesReferencia,
                status: parsed.status || "Pendente",
                recorrente: false,
                created_at: admin.firestore.Timestamp.now(),
                fonte: "whatsapp_agent",
            };

            const docRef = await db.collection("transacoes").add(transaction);
            console.log(`[Agent] ✅ Salvo! ID: ${docRef.id} | ${parsed.tipo} R$ ${parsed.valor} | ${user.id}`);

            // ── Confirmação para o usuário ──
            const emoji = parsed.tipo === "Receita" ? "💚" : "🔴";
            const sinal = parsed.tipo === "Receita" ? "+" : "-";
            const valorFormatado = Number(parsed.valor).toLocaleString("pt-BR", {
                style: "currency", currency: "BRL",
            });
            const dataFormatada = new Date(parsed.data + "T12:00:00").toLocaleDateString("pt-BR");

            const confirmMsg =
                `${emoji} *Lançamento registrado!*\n\n` +
                `📝 *Descrição:* ${parsed.descricao}\n` +
                `💰 *Valor:* ${sinal}${valorFormatado}\n` +
                `🏷️ *Categoria:* ${parsed.categoria}\n` +
                `📅 *Data:* ${dataFormatada}\n` +
                `📆 *Mês Ref.:* ${mesReferencia}\n` +
                `⏳ *Status:* ${transaction.status}\n\n` +
                `_Acesse o app para editar ou visualizar._`;

            await sendWhatsAppReply(phoneNumber, confirmMsg);

        } catch (err) {
            console.error("[Agent] Erro geral:", err);
        } finally {
            // Garante que a Evolution API receba o OK mesmo se houver erro interno posterior
            if (!res.headersSent) {
                res.status(200).send("OK");
            }
        }
    }
);
