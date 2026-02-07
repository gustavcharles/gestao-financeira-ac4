import { useState, useEffect, useCallback } from 'react';
import type { ShiftScale, ShiftEvent } from '../types';
import { ScaleService } from '../services/scaleService';

export const useScales = (userId: string | undefined) => {
    const [scales, setScales] = useState<ShiftScale[]>([]);
    const [shifts, setShifts] = useState<ShiftEvent[]>([]);
    const [loading, setLoading] = useState(true);

    // Estado para controlar o intervalo visualizado no calendário
    // Inicialmente o mês atual +/- 1 mês para buffer
    const [viewDatestamp, setViewDatestamp] = useState(Date.now());

    const fetchScales = useCallback(async () => {
        if (!userId) return;
        try {
            const userScales = await ScaleService.getUserScales(userId);
            setScales(userScales);
        } catch (error) {
            console.error("Error fetching scales:", error);
        }
    }, [userId]);

    const fetchShifts = useCallback(async (start: Date, end: Date) => {
        if (!userId) return;
        try {
            setLoading(true);
            const data = await ScaleService.getShiftsForPeriod(userId, start, end);
            setShifts(data);
        } catch (error) {
            console.error("Error fetching shifts:", error);
        } finally {
            setLoading(false);
        }
    }, [userId]);

    // Carregar escalas ao iniciar
    useEffect(() => {
        fetchScales().then(() => setLoading(false));
    }, [fetchScales]);

    // Atualizar shifts quando as escalas mudam ou a view muda
    // (Lógica simplificada: carrega 6 meses em volta de hoje por enquanto)
    useEffect(() => {
        if (scales.length > 0) {
            const start = new Date(viewDatestamp);
            start.setMonth(start.getMonth() - 2); // 2 meses antes
            const end = new Date(viewDatestamp);
            end.setMonth(end.getMonth() + 4); // 4 meses depois

            fetchShifts(start, end);
        }
    }, [scales, viewDatestamp, fetchShifts]);

    return {
        scales,
        shifts,
        loading,
        refreshScales: fetchScales,
        refreshShifts: () => setViewDatestamp(Date.now()), // Força reload
        setViewDate: (date: Date) => setViewDatestamp(date.getTime())
    };
};
