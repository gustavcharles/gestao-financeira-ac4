import React, { useState } from 'react';
import { DEFAULT_SHIFT_TYPES } from '../types';
import type { ShiftScale, ScalePatternType, ScaleCategory } from '../types';
import { Timestamp } from 'firebase/firestore';
import { addYears } from 'date-fns';

interface ScaleFormProps {
    initialData?: Partial<ShiftScale>;
    onSubmit: (scale: Omit<ShiftScale, 'id' | 'createdAt' | 'updatedAt'>) => void;
    onCancel: () => void;
    userId: string;
    onDelete?: () => void;
    defaultDate?: Date;
}

export const ScaleForm: React.FC<ScaleFormProps> = ({ initialData, onSubmit, onCancel, userId, onDelete, defaultDate }) => {
    const [name, setName] = useState(initialData?.name || '');
    const [category, setCategory] = useState<ScaleCategory>(initialData?.category || 'Diário');
    const [isOneOff, setIsOneOff] = useState(initialData?.isOneOff || false);
    const [patternType, setPatternType] = useState<ScalePatternType>(initialData?.patternType || '12x36');
    const [startDate, setStartDate] = useState(() => {
        if (initialData?.startDate) {
            return new Date(initialData.startDate.toDate()).toISOString().split('T')[0];
        }
        if (defaultDate) {
            return defaultDate.toISOString().split('T')[0];
        }
        return new Date().toISOString().split('T')[0];
    });
    const [defaultShiftTypeId, setDefaultShiftTypeId] = useState(initialData?.defaultShiftTypeId || DEFAULT_SHIFT_TYPES[0].id);

    const [useCustomTime, setUseCustomTime] = useState(!!(initialData?.customStartTime && initialData?.customEndTime));
    const [customStartTime, setCustomStartTime] = useState(initialData?.customStartTime || '08:00');
    const [customEndTime, setCustomEndTime] = useState(initialData?.customEndTime || '20:00');

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        // Determine cycle length based on pattern
        let cycleLength = 2;
        let finalPatternType = patternType;

        // Fix: If isOneOff is true, force single occurrence pattern
        if (isOneOff) {
            cycleLength = 1;
            finalPatternType = 'custom'; // Use 'custom' to indicate one-off
        } else {
            // Regular recurring pattern
            if (patternType === '12x36') cycleLength = 2;
            if (patternType === '24x72') cycleLength = 4;
            if (patternType === '6x18') cycleLength = 1;
            if (patternType === '24x96') cycleLength = 5;
            // TODO: Custom pattern logic
        }

        // Fix: Parse YYYY-MM-DD manually to ensure Local Midnight (avoiding UTC timezone shift)
        const [y, m, d] = startDate.split('-').map(Number);
        const localStartDate = new Date(y, m - 1, d);

        // Automatic 1-year expiration for all scales
        const autoEndDate = addYears(localStartDate, 1);

        onSubmit({
            userId,
            name,
            category,
            isOneOff,
            patternType: finalPatternType,
            startDate: Timestamp.fromDate(localStartDate),
            endDate: Timestamp.fromDate(autoEndDate), // Auto-expire after 1 year
            cycleLength,
            defaultShiftTypeId,
            customStartTime: (category === 'AC-4' && useCustomTime) ? customStartTime : null,
            customEndTime: (category === 'AC-4' && useCustomTime) ? customEndTime : null,
            isActive: true,
            cycleMap: {} // Simples por enquanto
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-white dark:bg-gray-800 p-6 rounded-lg shadow-md">
            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Nome da Escala</label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                    placeholder="Ex: Minha Escala 2026"
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Categoria</label>
                    <select
                        value={category}
                        onChange={(e) => setCategory(e.target.value as ScaleCategory)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                    >
                        <option value="Diário">Diário</option>
                        <option value="AC-4">Serviço AC-4</option>
                        <option value="Suplementar">Suplementar</option>
                        <option value="Troca">Troca de Serviço</option>
                        <option value="Outros">Outros</option>
                    </select>
                </div>

                <div className="flex items-center pt-6">
                    <label className="flex items-center space-x-2 cursor-pointer">
                        <input
                            type="checkbox"
                            checked={isOneOff}
                            onChange={(e) => setIsOneOff(e.target.checked)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 border-gray-300 shadow-sm"
                        />
                        <span className="text-sm font-medium text-gray-700 dark:text-gray-200">
                            Plantão Único (Sem repetição)
                        </span>
                    </label>
                </div>
            </div>

            {!isOneOff && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Padrão</label>
                        <select
                            value={patternType}
                            onChange={(e) => setPatternType(e.target.value as ScalePatternType)}
                            className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                        >
                            <option value="12x36">12x36 (Dia sim/não)</option>
                            <option value="24x72">24x72 (Plt 24h, 3 folgas)</option>
                            <option value="6x18">6x18 (Expediente/Todo dia)</option>
                            <option value="24x96">24x96 (Plt 24h, 4 folgas)</option>
                            {/* <option value="custom">Personalizado</option> */}
                        </select>
                    </div>
                </div>
            )}

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">Tipo de Plantão</label>
                <select
                    value={defaultShiftTypeId}
                    onChange={(e) => setDefaultShiftTypeId(e.target.value)}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                >
                    {DEFAULT_SHIFT_TYPES.map(type => (
                        <option key={type.id} value={type.id}>
                            {type.name} ({type.startTime}-{type.endTime})
                        </option>
                    ))}
                </select>
            </div>

            {
                category === 'AC-4' && (
                    <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30 animate-in fade-in slide-in-from-top-2 duration-200">
                        <div className="flex items-center gap-2 mb-3">
                            <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                Cálculo AC-4
                            </span>
                        </div>

                        <div className="mb-3">
                            <label className="flex items-center space-x-2 text-sm text-emerald-800 dark:text-emerald-200 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={useCustomTime}
                                    onChange={(e) => setUseCustomTime(e.target.checked)}
                                    className="rounded text-emerald-600 focus:ring-emerald-500"
                                />
                                <span>Informar horário real (Entrada/Saída)</span>
                            </label>
                        </div>

                        {useCustomTime && (
                            <div className="grid grid-cols-2 gap-4 animate-in slide-in-from-top-2">
                                <div>
                                    <label className="text-xs text-emerald-700 dark:text-emerald-300 block mb-1">Entrada</label>
                                    <input
                                        type="time"
                                        value={customStartTime}
                                        onChange={(e) => setCustomStartTime(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                                <div>
                                    <label className="text-xs text-emerald-700 dark:text-emerald-300 block mb-1">Saída</label>
                                    <input
                                        type="time"
                                        value={customEndTime}
                                        onChange={(e) => setCustomEndTime(e.target.value)}
                                        className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white p-2 border"
                                    />
                                </div>
                            </div>
                        )}
                    </div>
                )
            }

            <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    {isOneOff ? "Data do Plantão" : "Data de Início do Ciclo (Dia trabalhado)"}
                </label>
                <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white sm:text-sm p-2 border"
                />
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {isOneOff
                        ? "Escolha a data única deste serviço."
                        : "Escolha uma data em que você ESTÁ de plantão. A escala será gerada a partir deste dia."}
                </p>
            </div>

            <div className="flex flex-col-reverse sm:flex-row justify-between pt-4 gap-4 sm:gap-0">
                <div>
                    {onDelete && (
                        <button
                            type="button"
                            onClick={onDelete}
                            className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-red-600 bg-white border border-red-300 rounded-md shadow-sm hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 dark:bg-gray-700 dark:text-red-400 dark:border-red-800 dark:hover:bg-gray-600 min-h-[44px]"
                        >
                            Excluir
                        </button>
                    )}
                </div>
                <div className="flex flex-col sm:flex-row gap-3 sm:space-x-3 w-full sm:w-auto">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 min-h-[44px]"
                    >
                        Cancelar
                    </button>
                    <button
                        type="submit"
                        className="w-full sm:w-auto px-4 py-3 sm:py-2 text-sm font-medium text-white bg-indigo-600 border border-transparent rounded-md shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 min-h-[44px]"
                    >
                        Salvar Escala
                    </button>
                </div>
            </div>
        </form >
    );
};
