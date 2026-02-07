import { useState } from 'react';
import { X, Clock, Calendar, Trash2, DollarSign, Settings, Copy } from 'lucide-react';
import { format, addDays, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { ShiftEvent } from '../types';
import { calculateShiftValue } from '../utils/ac4Calculator';
import { formatCurrency, getShiftedReferenceMonth } from '../../../utils/finance';
import { addTransaction } from '../../../services/transactions';
import { useAuth } from '../../../contexts/AuthContext';
import { ScaleService } from '../services/scaleService';
import { Timestamp } from 'firebase/firestore';

interface ShiftDetailsModalProps {
    shift: ShiftEvent;
    scaleName?: string;
    onClose: () => void;
    onDelete?: (shiftId: string) => void;
    onEditScale?: (scaleId: string) => void;
    onDuplicateScale?: (scaleId: string, newStartDate: Date) => void;
}

export const ShiftDetailsModal: React.FC<ShiftDetailsModalProps> = ({ shift, scaleName, onClose, onDelete, onEditScale, onDuplicateScale }) => {
    const { currentUser } = useAuth();
    const [currentShift, setCurrentShift] = useState<ShiftEvent>(shift); // Use local state to update UI immediately without re-fetch
    const [useManualTime, setUseManualTime] = useState(false);
    const [feedback, setFeedback] = useState<{ type: 'success' | 'error', message: string } | null>(null);
    const [confirmAction, setConfirmAction] = useState<{ message: string, onConfirm: () => void, type?: 'danger' | 'info' } | null>(null);

    // Initialize with formatted string HH:mm
    const [manualStartTime, setManualStartTime] = useState(() => {
        const d = shift?.startTime?.toDate ? shift.startTime.toDate() : new Date(shift?.startTime as any || Date.now());
        return format(d, 'HH:mm');
    });

    const [manualEndTime, setManualEndTime] = useState(() => {
        const d = shift?.endTime?.toDate ? shift.endTime.toDate() : new Date(shift?.endTime as any || Date.now());
        return format(d, 'HH:mm');
    });

    const [isDuplicating, setIsDuplicating] = useState(false);
    const [duplicateDate, setDuplicateDate] = useState('');

    const getFormattedTime = (timestamp: any) => {
        const date = timestamp?.toDate ? timestamp.toDate() : new Date(timestamp);
        return format(date, 'HH:mm');
    };

    const getDuration = () => {
        const start = currentShift.startTime?.toDate ? currentShift.startTime.toDate() : new Date(currentShift.startTime as any);
        const end = currentShift.endTime?.toDate ? currentShift.endTime.toDate() : new Date(currentShift.endTime as any);
        const diffMinutes = differenceInMinutes(end, start);
        const hours = Math.floor(diffMinutes / 60);
        return `${hours}h`;
    };

    if (!currentShift) return null;

    // Helper to get effective dates based on inputs
    const getEffectiveDates = () => {
        if (!useManualTime) {
            const start = currentShift.startTime.toDate ? currentShift.startTime.toDate() : new Date(currentShift.startTime as any);
            const end = currentShift.endTime.toDate ? currentShift.endTime.toDate() : new Date(currentShift.endTime as any);
            return { start, end };
        }

        // Construct dates from Manual Strings
        // Base day is currentShift.date (YYYY-MM-DD)
        const baseDateStr = currentShift.date;
        const start = new Date(`${baseDateStr}T${manualStartTime}:00`);
        let end = new Date(`${baseDateStr}T${manualEndTime}:00`);

        if (end < start) {
            end = addDays(end, 1);
        }
        return { start, end };
    }

    const handleGenerateRevenue = async () => {
        if (!currentUser) return;

        // Confirm action
        setConfirmAction({
            message: "Deseja gerar uma receita financeira baseada neste plantão AC-4?",
            type: 'info',
            onConfirm: async () => {
                setConfirmAction(null);
                try {
                    setFeedback(null); // Clear previous feedback
                    // Calculate Value using effective dates
                    const { start, end } = getEffectiveDates();
                    const value = calculateShiftValue(start, end);

                    if (value <= 0) {
                        setFeedback({ type: 'error', message: "Valor calculado é zero. Verifique os horários." });
                        return;
                    }

                    // Create Transaction
                    await addTransaction({
                        user_id: currentUser.uid,
                        tipo: 'Receita',
                        valor: value,
                        categoria: 'AC-4',
                        descricao: `Serviço AC-4 - ${shift.shiftTypeSnapshot.name} ${useManualTime ? '(Horário Real)' : ''}`,
                        data: shift.date, // YYYY-MM-DD
                        status: 'Pendente', // Default to Pending for AC-4
                        recorrente: false,
                        mes_referencia: getShiftedReferenceMonth(new Date(shift.date + 'T12:00:00'), 'AC-4', 'Receita')
                    });

                    // Update shift status to 'confirmed'
                    const updatedShift = {
                        ...currentShift,
                        status: 'confirmed' as const,
                        isManualOverride: true
                    };

                    await ScaleService.saveShiftEvent(updatedShift);
                    setCurrentShift(updatedShift); // Update UI

                    setFeedback({ type: 'success', message: `Receita de ${formatCurrency(value)} gerada com sucesso!` });
                    // Don't close immediately so user sees success.
                    // onClose(); 
                    setTimeout(() => onClose(), 2000);
                } catch (error: any) {
                    console.error("Erro ao gerar receita:", error);
                    setFeedback({ type: 'error', message: `Erro ao salvar receita: ${error.message || 'Desconhecido'}` });
                }
            }
        });
    };

    const handleSaveTimes = async () => {
        try {
            setFeedback(null);
            const { start, end } = getEffectiveDates();

            // Update the shift event in Firestore
            const updatedShift = {
                ...currentShift,
                startTime: Timestamp.fromDate(start),
                endTime: Timestamp.fromDate(end),
                isManualOverride: true
            };

            await ScaleService.saveShiftEvent(updatedShift);
            setCurrentShift(updatedShift); // Update UI immediately

            setFeedback({ type: 'success', message: "Horários atualizados com sucesso!" });
            // onClose();
        } catch (e: any) {
            console.error(e);
            setFeedback({ type: 'error', message: `Erro ao salvar horários: ${e.message || 'Erro desconhecido'}` });
        }
    };


    const handleDelete = () => {
        setConfirmAction({
            message: "Deseja realmente remover este plantão? \n(Isso criará uma exceção na sua escala)",
            type: 'danger',
            onConfirm: () => {
                setConfirmAction(null);
                if (onDelete) onDelete(currentShift.id);
            }
        });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in duration-200">
                {/* Header */}
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700" style={{ borderLeft: `6px solid ${currentShift.shiftTypeSnapshot.color}` }}>
                    <div>
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">
                            Detalhes do Plantão
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            {currentShift.shiftTypeSnapshot.name}
                        </p>
                        {scaleName && (
                            <p className="text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                                Escala: {scaleName}
                            </p>
                        )}
                        {currentShift.scaleCategory && (
                            <span className={`inline-flex items-center px-2 py-0.5 mt-1 rounded text-xs font-medium 
                                ${currentShift.scaleCategory === 'AC-4' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300' :
                                    currentShift.scaleCategory === 'Suplementar' ? 'bg-violet-100 text-violet-800 dark:bg-violet-900/30 dark:text-violet-300' :
                                        currentShift.scaleCategory === 'Troca' ? 'bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-300' :
                                            currentShift.scaleCategory === 'Outros' ? 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300' :
                                                'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' // Diário default
                                }`}>
                                {currentShift.scaleCategory}
                            </span>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Feedback Toast Inline */}
                {feedback && (
                    <div className={`px-4 py-2 text-sm font-medium flex justify-between items-center ${feedback.type === 'success' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>
                        <span>{feedback.message}</span>
                        <button onClick={() => setFeedback(null)} className="ml-2 opacity-50 hover:opacity-100"><X size={14} /></button>
                    </div>
                )}

                {/* Content */}
                <div className="p-6 space-y-4">
                    <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                        <Calendar className="w-5 h-5 text-indigo-500" />
                        <span className="text-lg capitalize">
                            {format(new Date(currentShift.date + 'T00:00:00'), "EEEE, d 'de' MMMM", { locale: ptBR })}
                        </span>
                    </div>

                    <div className="flex items-center space-x-3 text-gray-700 dark:text-gray-300">
                        <Clock className="w-5 h-5 text-indigo-500" />
                        <span className="text-lg">
                            {getFormattedTime(currentShift.startTime)} - {getFormattedTime(currentShift.endTime)}
                        </span>
                        <span className="text-sm bg-gray-100 dark:bg-gray-700 px-2 py-1 rounded">
                            {getDuration()}
                        </span>
                    </div>

                    {/* Categoria AC-4 Check */}
                    {(currentShift.scaleCategory === 'AC-4' || currentShift.shiftTypeSnapshot.isAC4) && (
                        <div className="bg-emerald-50 dark:bg-emerald-900/20 p-4 rounded-lg border border-emerald-100 dark:border-emerald-800/30">

                            <div className="flex items-center gap-2 mb-2">
                                <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                                <span className="font-bold text-emerald-800 dark:text-emerald-300">
                                    Cálculo AC-4
                                </span>
                            </div>

                            {/* Manual Time Checkbox */}
                            <div className="mb-3">
                                <label className="flex items-center space-x-2 text-sm text-emerald-800 dark:text-emerald-200 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={useManualTime}
                                        onChange={(e) => setUseManualTime(e.target.checked)}
                                        className="rounded text-emerald-600 focus:ring-emerald-500"
                                    />
                                    <span>Informar horário real (Entrada/Saída)</span>
                                </label>
                            </div>

                            {useManualTime && (
                                <div className="grid grid-cols-2 gap-2 mb-3 animate-in slide-in-from-top-2">
                                    <div>
                                        <label className="text-xs text-emerald-700 dark:text-emerald-300 block mb-1">Entrada</label>
                                        <input
                                            type="time"
                                            value={manualStartTime}
                                            onChange={(e) => setManualStartTime(e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs text-emerald-700 dark:text-emerald-300 block mb-1">Saída</label>
                                        <input
                                            type="time"
                                            value={manualEndTime}
                                            onChange={(e) => setManualEndTime(e.target.value)}
                                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-emerald-500 focus:ring-emerald-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                                        />
                                    </div>
                                    <div className="col-span-2 flex justify-end">
                                        <button
                                            className="text-xs bg-indigo-100 text-indigo-700 px-3 py-1 rounded-md font-medium hover:bg-indigo-200 transition-colors"
                                            onClick={handleSaveTimes}
                                        >
                                            Salvar Horários
                                        </button>
                                    </div>
                                </div>
                            )}

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-emerald-100 dark:border-emerald-800/30">
                                <span className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
                                    {(() => {
                                        const { start, end } = getEffectiveDates();
                                        const val = calculateShiftValue(start, end);
                                        return formatCurrency(val);
                                    })()}
                                </span>
                                <button
                                    className="text-xs bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full font-medium hover:bg-emerald-200 transition-colors shadow-sm"
                                    onClick={handleGenerateRevenue}
                                >
                                    Gerar Receita
                                </button>
                            </div>
                        </div>
                    )}

                    <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                        <div className="flex justify-between items-center">
                            <span className={`px-2 py-1 rounded text-xs font-semibold ${currentShift.status === 'confirmed' ? 'bg-green-100 text-green-800' :
                                currentShift.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                                    'bg-gray-100 text-gray-800'
                                }`}>
                                Status: {currentShift.status === 'confirmed' ? 'Confirmado' : 'Agendado'}
                            </span>

                            {currentShift.isManualOverride && (
                                <span className="text-xs text-orange-600 bg-orange-100 px-2 py-1 rounded">
                                    Manual / Editado
                                </span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex flex-col sm:flex-row justify-end gap-3 sm:space-x-3">
                    {onDelete && (
                        <button
                            onClick={handleDelete}
                            className="flex items-center justify-center px-4 py-3 sm:py-2 text-sm text-red-600 bg-red-50 hover:bg-red-100 rounded-md transition-colors w-full sm:w-auto min-h-[44px]"
                        >

                            <Trash2 size={16} className="mr-2" />
                            Remover
                        </button>
                    )}

                    {onEditScale && shift.scaleId && (
                        <div className="flex flex-col sm:flex-row gap-3 sm:space-x-2 w-full sm:w-auto">
                            {onDuplicateScale && (
                                <button
                                    onClick={() => setIsDuplicating(true)}
                                    className="flex items-center justify-center px-3 py-3 sm:py-2 text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:hover:bg-indigo-900/50 rounded-md transition-colors w-full sm:w-auto min-h-[44px]"
                                    title="Duplicar Escala"
                                >
                                    <Copy size={16} className="mr-2" />
                                    Duplicar
                                </button>
                            )}
                            <button
                                onClick={() => onEditScale(shift.scaleId!)}
                                className="flex items-center justify-center px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-200 dark:hover:bg-gray-600 rounded-md transition-colors w-full sm:w-auto min-h-[44px]"
                            >
                                <Settings size={16} className="mr-2" />
                                Configurar
                            </button>
                        </div>
                    )}

                    <button
                        onClick={onClose}
                        className="px-4 py-3 sm:py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 w-full sm:w-auto min-h-[44px]"
                    >
                        Fechar
                    </button>
                </div>
            </div>

            {/* Custom Confirmation Overlay */}
            {confirmAction && (
                <div className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/20 backdrop-blur-[1px] animate-in fade-in duration-200">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-600 transform transition-all scale-100">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-2">
                            Confirmação
                        </h4>
                        <p className="text-gray-600 dark:text-gray-300 mb-6 whitespace-pre-line">
                            {confirmAction.message}
                        </p>
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setConfirmAction(null)}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={confirmAction.onConfirm}
                                className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors ${confirmAction.type === 'danger'
                                    ? 'bg-red-600 hover:bg-red-700'
                                    : 'bg-indigo-600 hover:bg-indigo-700'
                                    }`}
                            >
                                Confirmar
                            </button>
                        </div>
                    </div>
                </div>
            )}
            {/* Duplication Modal Overlay */}
            {isDuplicating && (
                <div className="absolute inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-[1px] rounded-lg">
                    <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-2xl max-w-sm w-full border border-gray-200 dark:border-gray-600 animate-in fade-in zoom-in duration-200">
                        <h4 className="text-lg font-bold text-gray-900 dark:text-white mb-4">
                            Duplicar Escala
                        </h4>
                        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                            Escolha a data de início da nova escala:
                        </p>
                        <input
                            type="date"
                            value={duplicateDate}
                            onChange={(e) => setDuplicateDate(e.target.value)}
                            className="w-full text-sm border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white mb-6"
                        />
                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setIsDuplicating(false)}
                                className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                            >
                                Cancelar
                            </button>
                            <button
                                disabled={!duplicateDate}
                                onClick={() => {
                                    if (onDuplicateScale && shift.scaleId && duplicateDate) {
                                        // Adjust date for timezone if necessary or just use string
                                        // Creating date object at midnight local time
                                        const date = new Date(duplicateDate + 'T12:00:00'); // Use mid-day to avoid timezone shifting
                                        onDuplicateScale(shift.scaleId, date);
                                        setIsDuplicating(false);
                                    }
                                }}
                                className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                Confirmar Duplicação
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
