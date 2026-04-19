import { collection, query, where, getDocs, updateDoc, doc, Timestamp } from 'firebase/firestore';
import { db } from './firebase';

interface SyncResult {
    activatedCount: number;
    errors: string[];
}

// Configuração - Substitua pelos seus valores
const SHEETS_API_KEY = import.meta.env.VITE_GOOGLE_SHEETS_API_KEY || '';
const SHEET_ID = import.meta.env.VITE_GOOGLE_SHEET_ID || '';
const RANGE = 'Pagamentos!A:G'; // Aba "Pagamentos" - Colunas A até G

export async function syncPaymentsFromSheets(): Promise<SyncResult> {
    const errors: string[] = [];
    let activatedCount = 0;

    try {
        if (!SHEETS_API_KEY || !SHEET_ID) {
            throw new Error('Configuração do Google Sheets não encontrada. Configure VITE_GOOGLE_SHEETS_API_KEY e VITE_GOOGLE_SHEET_ID no arquivo .env');
        }

        // 1. Ler dados do Google Sheets via API pública
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${SHEETS_API_KEY}`;
        const response = await fetch(url);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`Erro ao acessar Google Sheets: ${errorData.error?.message || response.statusText}`);
        }

        const data = await response.json();

        if (!data.values || data.values.length === 0) {
            console.log('Nenhum dado encontrado na planilha');
            return { activatedCount: 0, errors: [] };
        }

        const rows = data.values;
        const headers = rows[0]; // Primeira linha = cabeçalhos

        console.log('📊 Cabeçalhos encontrados:', headers);

        // Encontrar índices das colunas (adaptado para sua planilha)
        // Sua planilha: DataHora | Evento | Cliente | Email | Valor | Status | ID Pagamento
        const emailIdx = headers.findIndex((h: string) => h?.toLowerCase().includes('email'));
        const statusIdx = headers.findIndex((h: string) => h?.toLowerCase().includes('status'));
        const idPagamentoIdx = headers.findIndex((h: string) =>
            h?.toLowerCase().includes('id') && h?.toLowerCase().includes('pagamento')
        );

        console.log('📍 Índices das colunas:', { emailIdx, statusIdx, idPagamentoIdx });

        if (emailIdx === -1 || statusIdx === -1 || idPagamentoIdx === -1) {
            throw new Error(`Colunas obrigatórias não encontradas na aba "Pagamentos".\nCertifique-se de ter: Email, Status, ID Pagamento\nCabeçalhos encontrados: ${headers.join(', ')}`);
        }

        // 2. Processar cada linha
        for (let i = 1; i < rows.length; i++) {
            try {
                const row = rows[i];
                const email = row[emailIdx]?.toLowerCase().trim();
                const status = row[statusIdx]?.toLowerCase().trim();
                const idPagamento = row[idPagamentoIdx]?.trim(); // ID Pagamento do Asaas

                console.log(`📝 Linha ${i + 1}:`, { email, status, idPagamento });

                // Apenas processar pagamentos confirmados
                // Aceita: "confirmed", "confirmado", "CONFIRMED", "CONFIRMADO", etc.
                if (!status || (status !== 'confirmed' && status !== 'confirmado' && status !== 'pago')) {
                    console.log(`⏭️ Linha ${i + 1} ignorada - Status: ${status}`);
                    continue;
                }

                if (!email || !idPagamento) {
                    console.log(`⏭️ Linha ${i + 1} ignorada - Email ou ID Pagamento vazio`);
                    continue;
                }

                // 3. Buscar usuário no Firebase
                const usersRef = collection(db, 'users');
                const q = query(usersRef, where('email', '==', email));
                const snapshot = await getDocs(q);

                if (snapshot.empty) {
                    errors.push(`Usuário não encontrado: ${email}`);
                    console.log(`❌ Usuário não encontrado: ${email}`);
                    continue;
                }

                const userDoc = snapshot.docs[0];
                const userData = userDoc.data();

                // 4. Verificar se já foi sincronizado
                if (userData.paymentId === idPagamento) {
                    console.log(`⏭️ Pagamento ${idPagamento} já processado para ${email}`);
                    continue; // Já processado
                }

                // Se o plano foi alterado manualmente pelo DEV/Admin, não sobrescrevemos
                if (userData.planIsManual) {
                    console.log(`⏭️ Usuário ${email} ignorado pois possui edição manual do plano.`);
                    continue;
                }

                // 5. Atualizar status do usuário
                const now = Timestamp.now();
                const subscriptionEndsAt = Timestamp.fromDate(
                    new Date(Date.now() + 365 * 24 * 60 * 60 * 1000) // +1 ano
                );

                await updateDoc(doc(db, 'users', userDoc.id), {
                    status: 'active',
                    plan: 'annual',
                    subscriptionEndsAt: subscriptionEndsAt,
                    paymentId: idPagamento,
                    lastSyncAt: now,
                });

                activatedCount++;
                console.log(`✅ Usuário ativado: ${email} (Pagamento: ${idPagamento})`);

            } catch (rowError: any) {
                errors.push(`Erro na linha ${i + 1}: ${rowError.message}`);
                console.error(`Erro ao processar linha ${i + 1}:`, rowError);
            }
        }

        console.log(`Sincronização concluída. ${activatedCount} usuários ativados.`);
        return { activatedCount, errors };

    } catch (error: any) {
        console.error('Erro ao sincronizar pagamentos:', error);
        throw error;
    }
}
