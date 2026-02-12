import React, { useState, useEffect } from 'react';
import { getShiftedReferenceMonth } from '../../utils/finance';
import type { Transaction } from '../../utils/finance';
import { calculateShiftValue } from '../../modules/scales/utils/ac4Calculator';
import { X, Check, Clock } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { DEFAULT_SHIFT_TYPES } from '../../modules/scales/types';

import { useSettings } from '../../hooks/useSettings';
import type { CategoryItem } from '../../services/settings';
import { CategorySelect } from '../ui/CategorySelect';

interface TransactionFormProps {
    initialData?: Transaction | null;
    userId: string;
    onSave: (data: Omit<Transaction, 'id'>) => Promise<void>;
    onClose: () => void;
}

export const TransactionForm: React.FC<TransactionFormProps> = ({ initialData, userId, onSave, onClose }) => {
    const { settings } = useSettings();
    const cats = settings.categories;

    // Fallback if settings are empty (shouldn't happen due to defaults)
    const fallbackCat: CategoryItem = { name: "Outros", icon: "more-horizontal", color: "#64748B" };

    // Ensure we work with CategoryItem[]
    const safeCats = {
        Receita: (cats.Receita || [fallbackCat]).map(c => typeof c === 'string' ? { name: c, icon: 'more-horizontal', color: '#64748B' } : c),
        Despesa: (cats.Despesa || [fallbackCat]).map(c => typeof c === 'string' ? { name: c, icon: 'more-horizontal', color: '#64748B' } : c)
    };

    const currentCats = safeCats;

    const [tipo, setTipo] = useState<'Receita' | 'Despesa'>(initialData?.tipo || 'Despesa');
    const [descricao, setDescricao] = useState(initialData?.descricao || '');
    const [valor, setValor] = useState(initialData?.valor?.toString() || '');

    // Initial category might be just a name string from Transaction
    const [categoria, setCategoria] = useState(initialData?.categoria || (currentCats['Despesa'][0]?.name || "Outros"));

    const [data, setData] = useState(initialData?.data || new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'Pago' | 'Recebido' | 'Pendente'>(initialData?.status || 'Pendente');
    const [recorrente, setRecorrente] = useState(initialData?.recorrente || false);

    // AC-4 Specific State
    const [startTime, setStartTime] = useState(initialData?.startTime || '');
    const [endTime, setEndTime] = useState(initialData?.endTime || '');
    const [calculatedHours, setCalculatedHours] = useState(initialData?.hours || 0);

    // Scale Form emulation
    const [selectedShiftTypeId, setSelectedShiftTypeId] = useState(DEFAULT_SHIFT_TYPES[0].id);
    const [useCustomTime, setUseCustomTime] = useState(!!(initialData?.startTime && initialData?.endTime)); // Default to custom if editing existing with times? Or just false.

    // Installment state
    const [isParcelado, setIsParcelado] = useState(false);
    const [numParcelas, setNumParcelas] = useState(2);

    const [loading, setLoading] = useState(false);

    // Check if category is AC-4
    const isAC4 = categoria.toUpperCase().includes('AC-4') || categoria.toUpperCase().includes('AC4');

    // Reset category when Type changes if current category is invalid
    useEffect(() => {
        const typeCats = currentCats[tipo];
        if (!typeCats.some(c => c.name === categoria)) {
            setCategoria(typeCats[0]?.name || "Outros");
        }
    }, [tipo, currentCats]);

    // Update status options based on type
    useEffect(() => {
        if (tipo === 'Receita' && status === 'Pago') setStatus('Recebido');
        if (tipo === 'Despesa' && status === 'Recebido') setStatus('Pago');
    }, [tipo]);

    // Sync ShiftType with Times (ScaleForm logic)
    useEffect(() => {
        if (isAC4 && !useCustomTime) {
            const shiftType = DEFAULT_SHIFT_TYPES.find(t => t.id === selectedShiftTypeId);
            if (shiftType) {
                setStartTime(shiftType.startTime);
                setEndTime(shiftType.endTime);
            }
        }
    }, [isAC4, useCustomTime, selectedShiftTypeId]);

    // AC-4 Calculation Logic
    useEffect(() => {
        if (isAC4 && startTime && endTime && data) {
            try {
                // Construct Date objects for calculation
                // We use the Transaction Date for the context
                const [y, m, d] = data.split('-').map(Number);
                const dateObj = new Date(y, m - 1, d);

                // Parse Time
                const [startH, startM] = startTime.split(':').map(Number);
                const [endH, endM] = endTime.split(':').map(Number);

                const start = new Date(dateObj);
                start.setHours(startH, startM, 0, 0);

                const end = new Date(dateObj);
                end.setHours(endH, endM, 0, 0);

                // Handle overnight shift (end time <= start time)
                // If equal (e.g. 08:00 to 08:00), assume 24h shift
                if (end <= start) {
                    end.setDate(end.getDate() + 1);
                }

                // Calculate Value
                const val = calculateShiftValue(start, end);
                setValor(val.toFixed(2));

                // Calculate Hours
                const diffMs = end.getTime() - start.getTime();
                const diffHours = diffMs / (1000 * 60 * 60);
                setCalculatedHours(parseFloat(diffHours.toFixed(1)));

            } catch (e) {
                console.error("Error calculating AC-4 value", e);
            }
        }
    }, [isAC4, startTime, endTime, data]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descricao || !valor) return;

        setLoading(true);
        try {
            const [y, m, d] = data.split('-').map(Number);
            const baseDateObj = new Date(y, m - 1, d);
            const baseValue = parseFloat(valor.replace(',', '.'));

            if (isParcelado && !initialData && numParcelas > 1) {
                for (let i = 0; i < numParcelas; i++) {
                    const currentDate = addMonths(baseDateObj, i);
                    const dateStr = format(currentDate, 'yyyy-MM-dd');
                    const mes_ref = getShiftedReferenceMonth(currentDate, categoria, tipo);

                    const payload: Omit<Transaction, 'id'> = {
                        user_id: userId,
                        tipo,
                        descricao: `${descricao} (${i + 1}/${numParcelas})`,
                        valor: baseValue,
                        categoria,
                        data: dateStr,
                        mes_referencia: mes_ref,
                        status: i === 0 ? status : 'Pendente',
                        recorrente: false
                    };
                    await onSave(payload);
                }
            } else {
                const mes_ref = getShiftedReferenceMonth(baseDateObj, categoria, tipo);

                const payload: Omit<Transaction, 'id'> = {
                    user_id: userId,
                    tipo,
                    descricao,
                    valor: baseValue,
                    categoria,
                    data: format(baseDateObj, 'yyyy-MM-dd'),
                    mes_referencia: mes_ref,
                    status,
                    recorrente,
                    // Save AC-4 specifics if applicable
                    ...(isAC4 ? { startTime, endTime, hours: calculatedHours } : {})
                };
                await onSave(payload);
            }

            onClose();
        } catch (err) {
            console.error(err);
            alert("Erro ao salvar transação");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 overflow-y-auto max-h-[90vh]">
                <div className="flex justify-between items-center p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">
                        {initialData ? 'Editar Transação' : 'Nova Transação'}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="flex bg-slate-100 dark:bg-slate-700 p-1 rounded-xl">
                        {(['Receita', 'Despesa'] as const).map(t => (
                            <button
                                key={t}
                                type="button"
                                onClick={() => setTipo(t)}
                                className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${tipo === t
                                    ? (t === 'Receita' ? 'bg-emerald-500 text-white shadow-lg shadow-emerald-200 dark:shadow-none' : 'bg-red-500 text-white shadow-lg shadow-red-200 dark:shadow-none')
                                    : 'text-slate-500 dark:text-slate-300 hover:text-slate-700 dark:hover:text-white'
                                    }`}
                            >
                                {t}
                            </button>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Valor {isParcelado ? '(da Parcela)' : ''}</label>
                            <input
                                type="number"
                                step="0.01"
                                required
                                value={valor}
                                onChange={(e) => setValor(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                                placeholder="0,00"
                                disabled={isAC4 && !!startTime && !!endTime} // Disable if auto-calculated
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Data</label>
                            <input
                                type="date"
                                required
                                value={data}
                                onChange={(e) => setData(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                            />
                        </div>
                    </div>

                    {/* AC-4 Time Inputs (ScaleForm Style) */}
                    {isAC4 && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-xl border border-emerald-100 dark:border-emerald-800/30 animate-in fade-in slide-in-from-top-2 duration-200 space-y-4">

                            <div className="flex items-center gap-2 border-b border-emerald-200 dark:border-emerald-800 pb-2">
                                <Clock size={16} className="text-emerald-600 dark:text-emerald-400" />
                                <span className="font-bold text-sm text-emerald-800 dark:text-emerald-300">
                                    Cálculo AC-4
                                </span>
                            </div>

                            {/* Dropdown for Shift Type */}
                            <div>
                                <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">Tipo de Plantão</label>
                                <select
                                    value={selectedShiftTypeId}
                                    onChange={(e) => {
                                        setSelectedShiftTypeId(e.target.value);
                                        // If changing type, ensure we reset custom time toggle if user wants 'presets'
                                        // But ScaleForm keeps 'useCustomTime' separate. 
                                        // If user selects a type, we usually want to apply it immediately unless Custom is checked.
                                        // If Custom is checked, changing dropdown does nothing visually until unchecked.
                                    }}
                                    disabled={useCustomTime}
                                    className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white text-sm disabled:opacity-50"
                                >
                                    {DEFAULT_SHIFT_TYPES.map(type => (
                                        <option key={type.id} value={type.id}>
                                            {type.name} ({type.hours}h)
                                        </option>
                                    ))}
                                </select>
                            </div>

                            {/* Checkbox for Custom Time */}
                            <div className="flex items-center">
                                <label className="flex items-center space-x-2 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useCustomTime}
                                        onChange={(e) => {
                                            setUseCustomTime(e.target.checked);
                                            // If unchecked, it will auto-revert to selectedShiftTypeId times via useEffect
                                        }}
                                        className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4"
                                    />
                                    <span className="text-sm font-medium text-emerald-800 dark:text-emerald-200">
                                        Informar horário real (Entrada/Saída)
                                    </span>
                                </label>
                            </div>

                            {/* Time Inputs (Conditional) */}
                            {useCustomTime && (
                                <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                                            Entrada
                                        </label>
                                        <input
                                            type="time"
                                            value={startTime}
                                            onChange={(e) => setStartTime(e.target.value)}
                                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-emerald-700 dark:text-emerald-300 mb-1">
                                            Saída
                                        </label>
                                        <input
                                            type="time"
                                            value={endTime}
                                            onChange={(e) => setEndTime(e.target.value)}
                                            className="w-full px-4 py-2 bg-white dark:bg-gray-700 border border-emerald-200 dark:border-emerald-700 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none dark:text-white"
                                        />
                                    </div>
                                </div>
                            )}

                            {calculatedHours > 0 && (
                                <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 font-bold bg-white/50 dark:bg-black/20 py-2 rounded-lg border border-emerald-100 dark:border-emerald-800/20">
                                    {calculatedHours} horas &rarr; R$ {valor}
                                </div>
                            )}
                        </div>
                    )}

                    <div>
                        <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Descrição</label>
                        <input
                            type="text"
                            required
                            value={descricao}
                            onChange={(e) => setDescricao(e.target.value)}
                            className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                            placeholder="Ex: Supermercado"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Categoria</label>
                            <CategorySelect
                                categories={currentCats[tipo]}
                                value={categoria}
                                onChange={setCategoria}
                            />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Status</label>
                            <select
                                value={status}
                                onChange={(e) => setStatus(e.target.value as any)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                            >
                                {tipo === 'Receita' ? (
                                    <>
                                        <option value="Recebido">Recebido</option>
                                        <option value="Pendente">Pendente</option>
                                    </>
                                ) : (
                                    <>
                                        <option value="Pago">Pago</option>
                                        <option value="Pendente">Pendente</option>
                                    </>
                                )}
                            </select>
                        </div>
                    </div>

                    {!initialData && (
                        <div className="space-y-3 pt-2">
                            <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="recorrente"
                                        checked={recorrente}
                                        disabled={isParcelado}
                                        onChange={(e) => setRecorrente(e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300 disabled:opacity-50"
                                    />
                                    <label htmlFor="recorrente" className={`text-sm font-medium ${isParcelado ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                        Recorrente
                                    </label>
                                </div>

                                <div className="flex items-center gap-2">
                                    <input
                                        type="checkbox"
                                        id="parcelado"
                                        checked={isParcelado}
                                        disabled={recorrente}
                                        onChange={(e) => setIsParcelado(e.target.checked)}
                                        className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300 disabled:opacity-50"
                                    />
                                    <label htmlFor="parcelado" className={`text-sm font-medium ${recorrente ? 'text-slate-400 dark:text-slate-500' : 'text-slate-600 dark:text-slate-300'}`}>
                                        Parcelado?
                                    </label>
                                </div>
                            </div>

                            {isParcelado && (
                                <div className="animate-in slide-in-from-top-2 duration-200 bg-slate-50 dark:bg-slate-700 p-3 rounded-xl border border-slate-100 dark:border-slate-600">
                                    <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Número de Parcelas</label>
                                    <div className="flex items-center gap-3">
                                        <input
                                            type="range"
                                            min="2"
                                            max="36"
                                            value={numParcelas}
                                            onChange={(e) => setNumParcelas(parseInt(e.target.value))}
                                            className="flex-1"
                                        />
                                        <div className="w-12 text-center font-bold text-slate-700 dark:text-white bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 rounded-lg py-1">
                                            {numParcelas}x
                                        </div>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {initialData && (
                        <div className="flex items-center gap-2 pt-2">
                            <input
                                type="checkbox"
                                id="recorrente_edit"
                                checked={recorrente}
                                onChange={(e) => setRecorrente(e.target.checked)}
                                className="w-5 h-5 text-primary-600 rounded focus:ring-primary-500 border-gray-300"
                            />
                            <label htmlFor="recorrente_edit" className="text-sm text-slate-600 font-medium">
                                Recorrente (Repetir todo mês)
                            </label>
                        </div>
                    )}

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-3 mt-4 bg-primary-600 text-white font-bold rounded-xl shadow-lg shadow-primary-200 hover:bg-primary-700 transition-colors flex justify-center items-center gap-2"
                    >
                        {loading ? <div className="animate-spin w-5 h-5 border-2 border-white/50 border-t-white rounded-full" /> : <><Check size={20} /> Salvar</>}
                    </button>
                </form>
            </div>
        </div>
    );
};
