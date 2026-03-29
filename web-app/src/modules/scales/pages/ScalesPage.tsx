import React, { useState } from 'react';
import { useScales } from '../hooks/useScales';
import { ScaleForm } from '../components/ScaleForm';
import { CalendarView } from '../components/CalendarView';

import { useAuth } from '../../../contexts/AuthContext';
import { ScaleService } from '../services/scaleService';
import { ShiftDetailsModal } from '../components/ShiftDetailsModal';
import { Toast, type ToastType } from '../../../components/ui/Toast';
import type { ShiftScale, ShiftEvent } from '../types';
import { DEFAULT_SHIFT_TYPES } from '../types';
import { calculateShiftValue } from '../utils/ac4Calculator';
import { addTransaction } from '../../../services/transactions';
import { formatCurrency, getShiftedReferenceMonth } from '../../../utils/finance';
import { format, differenceInMinutes } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { DollarSign } from 'lucide-react';

// Modal para confirmar geração de receita após salvar escala AC-4
interface IncomeConfirmModalProps {
    shiftDate: string;
    shiftName: string;
    value: number;
    onConfirm: () => void;
    onSkip: () => void;
    isLoading: boolean;
}

const IncomeConfirmModal: React.FC<IncomeConfirmModalProps> = ({
    shiftDate, shiftName, value, onConfirm, onSkip, isLoading
}) => {
    const formattedDate = format(new Date(shiftDate + 'T12:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-sm border border-emerald-100 dark:border-emerald-800/30 overflow-hidden">
                {/* Header */}
                <div className="bg-emerald-50 dark:bg-emerald-900/30 p-5 border-b border-emerald-100 dark:border-emerald-800/30">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-emerald-100 dark:bg-emerald-800/50 flex items-center justify-center">
                            <DollarSign className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div>
                            <h3 className="font-bold text-gray-900 dark:text-white text-sm">Escala salva com sucesso!</h3>
                            <p className="text-xs text-emerald-700 dark:text-emerald-400">Deseja gerar a receita agora?</p>
                        </div>
                    </div>
                </div>

                {/* Body */}
                <div className="p-5 space-y-3">
                    <p className="text-sm text-gray-600 dark:text-gray-300">
                        Gerar receita financeira para o plantão:
                    </p>
                    <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3 space-y-1.5">
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Tipo:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200">{shiftName}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                            <span className="text-gray-500 dark:text-gray-400">Data:</span>
                            <span className="font-medium text-gray-800 dark:text-gray-200 capitalize">{formattedDate}</span>
                        </div>
                        <div className="flex justify-between text-sm border-t border-gray-200 dark:border-gray-600 pt-1.5 mt-1.5">
                            <span className="text-gray-500 dark:text-gray-400">Valor estimado:</span>
                            <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatCurrency(value)}</span>
                        </div>
                    </div>
                    <p className="text-xs text-gray-400 dark:text-gray-500">
                        A receita será criada como "Pendente" e o mês de referência será calculado automaticamente (+2 meses para AC-4).
                    </p>
                </div>

                {/* Footer */}
                <div className="px-5 pb-5 flex gap-3">
                    <button
                        onClick={onSkip}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
                    >
                        Agora não
                    </button>
                    <button
                        onClick={onConfirm}
                        disabled={isLoading}
                        className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-emerald-600 rounded-lg hover:bg-emerald-700 disabled:opacity-50 flex items-center justify-center gap-2 transition-colors"
                    >
                        {isLoading ? (
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                            <DollarSign className="w-4 h-4" />
                        )}
                        Gerar Receita
                    </button>
                </div>
            </div>
        </div>
    );
};

export const ScalesPage: React.FC = () => {
    const { currentUser: user } = useAuth();
    const { scales, shifts, loading, refreshScales, refreshShifts, setViewDate } = useScales(user?.uid);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);

    const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
    const [initialFormDate, setInitialFormDate] = useState<Date | undefined>(undefined);

    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    // State for the income generation prompt after saving AC-4 scale
    const [incomePrompt, setIncomePrompt] = useState<{
        shiftDate: string;
        shiftName: string;
        value: number;
        startDate: Date;
        endDate: Date;
        hours: number;
        userId: string;
    } | null>(null);
    const [isGeneratingIncome, setIsGeneratingIncome] = useState(false);

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const activeScaleToEdit = editingScaleId ? scales.find(s => s.id === editingScaleId) : undefined;

    const handleSaveScale = async (scaleData: Omit<ShiftScale, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            if (!user) return;

            if (activeScaleToEdit) {
                // Update existing — no income prompt on edit
                await ScaleService.updateScale(activeScaleToEdit.id, scaleData);
                await refreshScales();
                setIsEditing(false);
            } else {
                // Create new scale
                const newScale: Omit<ShiftScale, 'id'> = {
                    ...scaleData,
                    createdAt: new Date() as any,
                    updatedAt: new Date() as any,
                    isActive: true
                };
                await ScaleService.createScale(newScale as any);
                await refreshScales();
                setIsEditing(false);

                // AC-4: offer income generation
                if (scaleData.category === 'AC-4') {
                    const shiftType = DEFAULT_SHIFT_TYPES.find(t => t.id === scaleData.defaultShiftTypeId) || DEFAULT_SHIFT_TYPES[0];

                    const startDateObj = scaleData.startDate.toDate();
                    const [y, m, d] = [startDateObj.getFullYear(), startDateObj.getMonth(), startDateObj.getDate()];

                    let startH: string;
                    let endH: string;

                    if (scaleData.customStartTime && scaleData.customEndTime) {
                        startH = scaleData.customStartTime;
                        endH = scaleData.customEndTime;
                    } else {
                        startH = shiftType.startTime;
                        endH = shiftType.endTime;
                    }

                    const [sh, sm] = startH.split(':').map(Number);
                    const [eh, em] = endH.split(':').map(Number);

                    const shiftStart = new Date(y, m, d, sh, sm);
                    let shiftEnd = new Date(y, m, d, eh, em);
                    if (shiftEnd <= shiftStart) shiftEnd.setDate(shiftEnd.getDate() + 1);

                    const value = calculateShiftValue(shiftStart, shiftEnd);
                    const hours = Math.floor(differenceInMinutes(shiftEnd, shiftStart) / 60);
                    const dateStr = format(startDateObj, 'yyyy-MM-dd');

                    if (value > 0) {
                        setIncomePrompt({
                            shiftDate: dateStr,
                            shiftName: shiftType.name,
                            value,
                            startDate: shiftStart,
                            endDate: shiftEnd,
                            hours,
                            userId: user.uid
                        });
                    }
                }
            }
        } catch (error) {
            console.error("Error saving scale:", error);
            showToast("Erro ao salvar escala via Firestore.", 'error');
        }
    };

    const handleConfirmIncome = async () => {
        if (!incomePrompt) return;
        setIsGeneratingIncome(true);
        try {
            await addTransaction({
                user_id: incomePrompt.userId,
                tipo: 'Receita',
                valor: incomePrompt.value,
                categoria: 'AC-4',
                descricao: `Serviço AC-4 - ${incomePrompt.shiftName}`,
                data: incomePrompt.shiftDate,
                status: 'Pendente',
                recorrente: false,
                mes_referencia: getShiftedReferenceMonth(
                    new Date(incomePrompt.shiftDate + 'T12:00:00'),
                    'AC-4',
                    'Receita'
                ),
                hours: incomePrompt.hours
            });
            setIncomePrompt(null);
            showToast(`Receita de ${formatCurrency(incomePrompt.value)} gerada com sucesso!`, 'success');
        } catch (error: any) {
            console.error("Erro ao gerar receita:", error);
            showToast(`Erro ao gerar receita: ${error.message || 'Desconhecido'}`, 'error');
        } finally {
            setIsGeneratingIncome(false);
        }
    };

    const handleDeleteScale = async () => {
        if (!activeScaleToEdit || !window.confirm("Tem certeza que deseja excluir esta escala?")) return;
        try {
            await ScaleService.deleteScale(activeScaleToEdit.id);
            await refreshScales();
            setIsEditing(false);
        } catch (error) {
            console.error("Error deleting scale:", error);
            showToast("Erro ao excluir escala.", 'error');
        }
    };

    const handleShiftAction = async (shiftId: string, mode: 'single' | 'following' | 'all' = 'single') => {
        try {
            const shiftToDelete = shifts.find(s => s.id === shiftId);
            if (!shiftToDelete || !user) return;

            if (mode === 'all') {
                if (shiftToDelete.scaleId) {
                    await ScaleService.deleteScale(shiftToDelete.scaleId);
                    showToast("Escala excluída com sucesso.", 'success');
                }
            } else if (mode === 'following') {
                if (shiftToDelete.scaleId) {
                    const shiftDate = new Date(shiftToDelete.date + 'T12:00:00');
                    const endDate = new Date(shiftDate);
                    endDate.setDate(endDate.getDate() - 1);

                    await ScaleService.terminateScale(shiftToDelete.scaleId, endDate);
                    showToast("Recorrência encerrada com sucesso.", 'success');
                }
            } else {
                const override: ShiftEvent = {
                    ...shiftToDelete,
                    isManualOverride: true,
                    status: 'canceled' as any
                };

                await ScaleService.saveShiftEvent(override);
                showToast("Plantão removido com sucesso.", 'success');
            }

            await refreshScales();
            setSelectedShift(null);
        } catch (error) {
            console.error("Error updating shift:", error);
            showToast("Erro ao atualizar plantão.", 'error');
        }
    };

    const handleDuplicateScale = async (scaleId: string, newStartDate: Date) => {
        try {
            await ScaleService.duplicateScale(scaleId, newStartDate);
            await refreshScales();
            refreshShifts();
            showToast('Escala duplicada com sucesso!', 'success');
            setSelectedShift(null);
        } catch (error) {
            console.error('Error duplicating scale:', error);
            showToast('Erro ao duplicar escala', 'error');
        }
    };

    // Loading inicial apenas (se não tiver escalas carregadas)
    if (loading && scales.length === 0) {
        return (
            <div className="flex justify-center items-center h-64">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
        );
    }

    // Se está editando, mostra o form
    if (isEditing) {
        return (
            <div className="max-w-4xl mx-auto p-4 space-y-6">
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold dark:text-white">
                        {activeScaleToEdit ? 'Editar Escala' : 'Nova Escala / Plantão'}
                    </h1>
                    <button
                        onClick={() => { setIsEditing(false); setEditingScaleId(null); setInitialFormDate(undefined); }}
                        className="text-gray-600 dark:text-gray-300 hover:text-gray-900"
                    >
                        Cancelar
                    </button>
                </div>

                <ScaleForm
                    userId={user?.uid || ''}
                    initialData={activeScaleToEdit}
                    onSubmit={handleSaveScale}
                    onCancel={() => { setIsEditing(false); setEditingScaleId(null); setInitialFormDate(undefined); }}
                    onDelete={activeScaleToEdit ? handleDeleteScale : undefined}
                    defaultDate={initialFormDate}
                />
            </div>
        );
    }

    // View principal: Calendário
    return (
        <div className="max-w-6xl mx-auto p-4 space-y-6">
            <div className="flex flex-col-reverse md:flex-col space-y-6 space-y-reverse md:space-y-6">

                {/* Header Card */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow gap-3 md:gap-4">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold dark:text-white">Minhas Escalas</h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            Gerencie suas escalas regulares e plantões extras
                        </p>
                    </div>
                    <div className="flex gap-2 w-full md:w-auto">
                        <button
                            onClick={() => { setEditingScaleId(null); setIsEditing(true); }}
                            className="flex-1 md:flex-initial px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                        >
                            + Nova Escala / Plantão
                        </button>
                    </div>
                </div>

                {/* Calendar */}
                <div className="relative">
                    {loading && (
                        <div className="absolute inset-0 bg-white/50 dark:bg-gray-800/50 flex justify-center items-center z-10 rounded-lg">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
                        </div>
                    )}
                    <CalendarView
                        shifts={shifts}
                        scales={scales}
                        onDateClick={(date) => {
                            setInitialFormDate(date);
                            setIsEditing(true);
                            setEditingScaleId(null);
                        }}
                        onShiftClick={(shift) => {
                            setSelectedShift(shift);
                        }}
                        onViewDateChange={setViewDate}
                    />

                    {selectedShift && (
                        <ShiftDetailsModal
                            shift={selectedShift}
                            scaleName={scales.find(s => s.id === selectedShift.scaleId)?.name}
                            isRecurrent={(() => {
                                const scale = scales.find(s => s.id === selectedShift.scaleId);
                                return scale ? !scale.isOneOff : false;
                            })()}
                            onClose={() => {
                                setSelectedShift(null);
                                refreshShifts();
                            }}
                            onDelete={handleShiftAction}
                            onEditScale={(scaleId) => {
                                setEditingScaleId(scaleId);
                                setIsEditing(true);
                                setSelectedShift(null);
                            }}
                            onDuplicateScale={handleDuplicateScale}
                        />
                    )}
                </div>
            </div>

            <Toast
                message={toast.message}
                type={toast.type}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
            />

            {/* Income generation prompt for AC-4 scales */}
            {incomePrompt && (
                <IncomeConfirmModal
                    shiftDate={incomePrompt.shiftDate}
                    shiftName={incomePrompt.shiftName}
                    value={incomePrompt.value}
                    onConfirm={handleConfirmIncome}
                    onSkip={() => setIncomePrompt(null)}
                    isLoading={isGeneratingIncome}
                />
            )}
        </div>
    );
};
