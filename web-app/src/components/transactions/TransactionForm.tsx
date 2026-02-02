import React, { useState, useEffect } from 'react';
import { getShiftedReferenceMonth } from '../../utils/finance';
import type { Transaction } from '../../utils/finance';
import { X, Check } from 'lucide-react';
import { addMonths, format } from 'date-fns';

import { useSettings } from '../../hooks/useSettings';

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
    const currentCats = cats[initialData?.tipo || 'Despesa']?.length > 0
        ? cats
        : { Receita: ["Outros"], Despesa: ["Outros"] };

    const [tipo, setTipo] = useState<'Receita' | 'Despesa'>(initialData?.tipo || 'Despesa');
    const [descricao, setDescricao] = useState(initialData?.descricao || '');
    const [valor, setValor] = useState(initialData?.valor?.toString() || '');
    const [categoria, setCategoria] = useState(initialData?.categoria || currentCats['Despesa'][0]);
    const [data, setData] = useState(initialData?.data || new Date().toISOString().split('T')[0]);
    const [status, setStatus] = useState<'Pago' | 'Recebido' | 'Pendente'>(initialData?.status || 'Pendente');
    const [recorrente, setRecorrente] = useState(initialData?.recorrente || false);

    // Installment state
    const [isParcelado, setIsParcelado] = useState(false);
    const [numParcelas, setNumParcelas] = useState(2);

    const [loading, setLoading] = useState(false);

    // Reset category when Type changes if current category is invalid
    useEffect(() => {
        const typeCats = currentCats[tipo];
        if (!typeCats.includes(categoria)) {
            setCategoria(typeCats[0] || "Outros");
        }
    }, [tipo, currentCats]);

    // Update status options based on type
    useEffect(() => {
        if (tipo === 'Receita' && status === 'Pago') setStatus('Recebido');
        if (tipo === 'Despesa' && status === 'Recebido') setStatus('Pago');
    }, [tipo]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!descricao || !valor) return;

        setLoading(true);
        try {
            // FIX: Parse date components manually to create Local Time Date object
            // new Date("YYYY-MM-DD") creates UTC, which shifts to previous day in client timezone
            const [y, m, d] = data.split('-').map(Number);
            const baseDateObj = new Date(y, m - 1, d); // Month is 0-indexed

            const baseValue = parseFloat(valor.replace(',', '.'));

            if (isParcelado && !initialData && numParcelas > 1) {
                // Creates multiple transactions
                for (let i = 0; i < numParcelas; i++) {
                    const currentDate = addMonths(baseDateObj, i);
                    // Standardize date string YYYY-MM-DD
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
                        status: i === 0 ? status : 'Pendente', // Only first one keeps status user set? Or all? Usually others are pending.
                        recorrente: false // Installments usually aren't recurring in the sense of 'forever'
                    };
                    await onSave(payload);
                }
            } else {
                // Single transaction (or Editing)
                const mes_ref = getShiftedReferenceMonth(baseDateObj, categoria, tipo);

                const payload: Omit<Transaction, 'id'> = {
                    user_id: userId,
                    tipo,
                    descricao,
                    valor: baseValue,
                    categoria,
                    data,
                    mes_referencia: mes_ref,
                    status,
                    recorrente
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
                    {/* Tipo Switch */}
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
                            <select
                                value={categoria}
                                onChange={(e) => setCategoria(e.target.value)}
                                className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none dark:text-white"
                            >
                                {currentCats[tipo].map((c: string) => <option key={c} value={c}>{c}</option>)}
                            </select>
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

                    {/* Recurrence / Installments Options */}
                    {!initialData && (
                        <div className="space-y-3 pt-2">
                            {/* Only allow choosing between Recurrent OR Installments to avoid confusion */}
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
