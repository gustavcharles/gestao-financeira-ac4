import {
    collection,
    doc,
    getDocs,
    setDoc,
    getDoc,
    query,
    where,
    addDoc,
    deleteDoc,
    Timestamp
} from 'firebase/firestore';
import { db, logUserEvent } from '../../../services/firebase';
import type { ShiftScale, ShiftEvent } from '../types';
import { generateShifts } from '../utils/generator';

// Helper to remove undefined fields recursively (Firestore doesn't like undefined)
// Note: JSON.stringify converts Dates/Timestamps to strings, which is bad for Firestore Timestamps.
// Better approach: explicit function.
const removeUndefined = (obj: any): any => {
    if (obj === null || typeof obj !== 'object') {
        return obj;
    }

    // Handle specific Firestore types if needed, but they are objects.
    // Timestamp has toDate, seconds, nanoseconds
    if (obj.seconds !== undefined && obj.nanoseconds !== undefined) {
        return obj; // It's likely a Timestamp, keep it.
    }
    // Also check for instanceof Timestamp if imported? But easier to just check props or let it pass if not simple object.

    // Arrays
    if (Array.isArray(obj)) {
        return obj.map(removeUndefined);
    }

    const newObj: any = {};
    Object.keys(obj).forEach(key => {
        const val = obj[key];
        if (val !== undefined) {
            newObj[key] = removeUndefined(val);
        }
    });
    return newObj;
};

const SCALES_COLLECTION = 'scales';
const SHIFTS_COLLECTION = 'shifts';

export const ScaleService = {
    /**
     * Cria uma nova definição de escala
     */
    async createScale(scale: Omit<ShiftScale, 'id'>): Promise<string> {
        const docRef = await addDoc(collection(db, SCALES_COLLECTION), scale);

        logUserEvent('scale_created', { name: scale.name });

        return docRef.id;
    },

    /**
     * Duplica uma escala existente para uma nova data de início
     */
    async duplicateScale(originalScaleId: string, newStartDate: Date): Promise<string> {
        console.log('🔄 [duplicateScale] Starting duplication...', { originalScaleId, newStartDate });

        const originalRef = doc(db, SCALES_COLLECTION, originalScaleId);
        const originalSnap = await getDoc(originalRef);

        if (!originalSnap.exists()) {
            console.error('❌ [duplicateScale] Original scale not found!');
            throw new Error("Escala original não encontrada");
        }

        const data = originalSnap.data() as ShiftScale;
        console.log('📋 [duplicateScale] Original scale data:', data);

        // Calculate new endDate based on new startDate (1 year expiration)
        const newEndDate = new Date(newStartDate);
        newEndDate.setFullYear(newEndDate.getFullYear() + 1);
        console.log('📅 [duplicateScale] Calculated dates:', { newStartDate, newEndDate });

        // Destructure to exclude the id field instead of deleting it
        const { id, ...scaleWithoutId } = data;

        // Create copy
        const newScale: Omit<ShiftScale, 'id'> = {
            ...scaleWithoutId,
            name: `${data.name} (Cópia)`,
            startDate: Timestamp.fromDate(newStartDate),
            endDate: Timestamp.fromDate(newEndDate), // Recalculate based on new startDate
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            isActive: true
        };

        console.log('📝 [duplicateScale] New scale to create:', newScale);

        const newScaleId = await this.createScale(newScale);
        console.log('✅ [duplicateScale] Scale created successfully!', { newScaleId });

        return newScaleId;
    },

    /**
     * Atualiza uma escala existente
     */
    async updateScale(id: string, scale: Partial<ShiftScale>): Promise<void> {
        const docRef = doc(db, SCALES_COLLECTION, id);
        await setDoc(docRef, { ...scale, updatedAt: new Date() }, { merge: true });
    },

    /**
     * Remove uma escala
     */
    async deleteScale(id: string): Promise<void> {
        await deleteDoc(doc(db, SCALES_COLLECTION, id));
    },

    /**
     * Encerra uma escala em uma data específica (update endDate)
     */
    async terminateScale(id: string, endDate: Date): Promise<void> {
        const docRef = doc(db, SCALES_COLLECTION, id);
        // Set end date to the provided date
        await setDoc(docRef, {
            endDate: Timestamp.fromDate(endDate),
            updatedAt: Timestamp.now()
        }, { merge: true });
    },

    /**
     * Busca as escalas de um usuário
     */
    async getUserScales(userId: string): Promise<ShiftScale[]> {
        const q = query(
            collection(db, SCALES_COLLECTION),
            where('userId', '==', userId),
            where('isActive', '==', true)
        );

        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        } as ShiftScale));
    },

    /**
     * Salva (ou atualiza) um evento de plantão específico (Override ou Extra)
     */
    async saveShiftEvent(event: ShiftEvent): Promise<void> {
        // Se já tem ID, atualiza. Se não, cria com ID determinístico ou auto-gerado.
        // Preferimos ID determinístico "yyyy-mm-dd-scaleId" para evitar duplicatas, 
        // mas eventos manuais extras podem precisar de auto-ID.

        const docId = event.id || `${event.date}-${event.scaleId}`; // Fallback simple ID
        const eventRef = doc(db, SHIFTS_COLLECTION, docId);

        // Sanitize event to remove undefined values (e.g. optional fields in shiftTypeSnapshot)
        const sanitizedEvent = removeUndefined(event);

        await setDoc(eventRef, sanitizedEvent, { merge: true });
    },

    /**
     * Remove um plantão (apenas se for override/manual, 
     * se for gerado pela escala, a gente deve marcar como "canceled" e salvar o override)
     */
    async deleteShiftEvent(eventId: string): Promise<void> {
        await deleteDoc(doc(db, SHIFTS_COLLECTION, eventId));
    },

    /**
     * Retorna os plantões consolidados (Gerados + Overrides) para um período
     */
    async getShiftsForPeriod(
        userId: string,
        start: Date,
        end: Date
    ): Promise<ShiftEvent[]> {
        // 1. Buscar escalas ativas do usuário
        console.log('🔎 [getShiftsForPeriod] Called:', { userId, start, end });
        const scales = await this.getUserScales(userId);
        console.log(`📊 [getShiftsForPeriod] Found ${scales.length} scales for user`);
        if (scales.length > 0) {
            console.log('📋 [getShiftsForPeriod] Scales:', scales.map(s => ({ name: s.name, id: s.id, isActive: s.isActive })));
        }

        // 2. Gerar plantões teóricos para cada escala
        let allShifts: ShiftEvent[] = [];
        scales.forEach(scale => {
            console.log(`🔄 [getShiftsForPeriod] Generating shifts for scale: "${scale.name}" (${scale.id})...`);
            const generated = generateShifts(scale, start, end);
            console.log(`  ✅ Generated ${generated.length} shifts`);
            allShifts = [...allShifts, ...generated];
        });
        console.log(`📦 [getShiftsForPeriod] Total generated shifts: ${allShifts.length}`);
        if (allShifts.length > 0) {
            console.log('📋 [getShiftsForPeriod] Sample shifts:', allShifts.slice(0, 2));
        }

        // 3. Buscar overrides/exceções salvas no Firestore para este período
        // Nota: Query por string de data "YYYY-MM-DD" funciona se a gente garantir range exata,
        // mas Firestore range query em string é tricky. Melhor query e filtrar ou armazenar Timestamp.
        // Vamos assumir que buscamos por userId e filtramos in-memory por enquanto (volume baixo de events manuais)
        // OU melhor: campo `date` string YYYY-MM-DD permite range query lexical segura? Sim.

        // Convertendo datas para YYYY-MM-DD para query
        const startStr = start.toISOString().split('T')[0];
        const endStr = end.toISOString().split('T')[0];

        const q = query(
            collection(db, SHIFTS_COLLECTION),
            where('userId', '==', userId),
            where('date', '>=', startStr),
            where('date', '<=', endStr)
        );

        const snapshot = await getDocs(q);
        const overrides = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ShiftEvent));

        // 4. Merge
        // Mapa para substituição rápida
        const overrideMap = new Map<string, ShiftEvent>();
        overrides.forEach(ov => overrideMap.set(ov.id, ov));

        // Substituir ou Adicionar
        const mergedShifts: ShiftEvent[] = [];

        // A. Adicionar gerados (se não houver override substituindo)
        allShifts.forEach(gen => {
            // O ID gerado em `generator.ts` é `${date}-${userId}` (precisamos melhorar isso para bater com o override)
            // O ideal é que o override saiba qual ID de "escala" ele está substituindo.
            // Se o user editar um plantão gerado, o ID salvo no banco deve ser igual ao ID gerado.
            // Vamos padronizar o ID no generator: `${date}-${scaleId}`
            const consistentId = `${gen.date}-${gen.scaleId}`;
            gen.id = consistentId; // Garantir ID consistente

            if (overrideMap.has(consistentId)) {
                // Tem override, usa o do banco
                mergedShifts.push(overrideMap.get(consistentId)!);
                overrideMap.delete(consistentId); // Remove do mapa para não duplicar depois
            } else {
                mergedShifts.push(gen);
            }
        });

        // B. Adicionar o que sobrou no overrideMap (Plantões Extras manuais sem escala base)
        overrideMap.forEach(ov => mergedShifts.push(ov));

        return mergedShifts;
    }
};
