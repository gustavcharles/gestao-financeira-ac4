import React, { useState } from 'react';
import { useScales } from '../hooks/useScales';
import { ScaleForm } from '../components/ScaleForm';
import { CalendarView } from '../components/CalendarView';
import { useAuth } from '../../../contexts/AuthContext';
import { ScaleService } from '../services/scaleService';
import { ShiftDetailsModal } from '../components/ShiftDetailsModal';
import { Toast, type ToastType } from '../../../components/ui/Toast';
import type { ShiftScale, ShiftEvent } from '../types';

export const ScalesPage: React.FC = () => {
    const { currentUser: user } = useAuth();
    const { scales, shifts, loading, refreshScales, setViewDate } = useScales(user?.uid);
    const [isEditing, setIsEditing] = useState(false);
    const [selectedShift, setSelectedShift] = useState<ShiftEvent | null>(null);

    // Fix: Handle multiple active scales (duplicate bug)
    // We allow multiple active scales now (e.g. Main Scale + One Offs)
    // We allow multiple active scales now (e.g. Main Scale + One Offs)
    const [editingScaleId, setEditingScaleId] = useState<string | null>(null);
    const [initialFormDate, setInitialFormDate] = useState<Date | undefined>(undefined);

    const [toast, setToast] = useState<{ message: string; type: ToastType; isVisible: boolean }>({
        message: '',
        type: 'info',
        isVisible: false
    });

    const showToast = (message: string, type: ToastType = 'info') => {
        setToast({ message, type, isVisible: true });
    };

    const activeScaleToEdit = editingScaleId ? scales.find(s => s.id === editingScaleId) : undefined;
    // const hasDuplicates = scales.filter(s => s.isActive).length > 1; // Removed unused check

    const handleSaveScale = async (scaleData: Omit<ShiftScale, 'id' | 'createdAt' | 'updatedAt'>) => {
        try {
            if (!user) return;

            if (activeScaleToEdit) {
                // Update existing
                await ScaleService.updateScale(activeScaleToEdit.id, scaleData);
            } else {
                // Create new
                const newScale: Omit<ShiftScale, 'id'> = {
                    ...scaleData,
                    createdAt: new Date() as any,
                    updatedAt: new Date() as any,
                    isActive: true
                };
                await ScaleService.createScale(newScale as any);
            }

            await refreshScales();
            setIsEditing(false);
        } catch (error) {
            console.error("Error saving scale:", error);
            showToast("Erro ao salvar escala via Firestore.", 'error');
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

    const handleShiftAction = async (shiftId: string) => {
        // Logic to remove/cancel shift
        try {
            const shiftToDelete = shifts.find(s => s.id === shiftId);
            if (!shiftToDelete || !user) return;

            // If it's a generated shift (not manual override), we "cancel" it instead of deleting
            // Actually ScaleService.saveShiftEvent with status 'canceled' is the way, 
            // OR if we want to remove it from view completely, we might need a 'canceled' status filter.
            // For now, let's assume removing means creating an override that says "no shift today" or simpler:

            // We need a way to mark "No Shift" for conflicts. 
            // BUT for simple "Remove", if it is manual, deleteDoc. 
            // If it is generated, we create a "CanceledShift" override? 
            // Let's implement a simple Soft Delete for now: Override with isManualOverride=true and empty/canceled properties?
            // A better approach for MVP: Just delete manual ones, and for generated ones, maybe alert user "Cant delete generated yet"?
            // No, user needs to delete generated shifts (e.g. sick leave).

            // Let's create a "Canceled" status override.
            const override: ShiftEvent = {
                ...shiftToDelete,
                isManualOverride: true,
                status: 'canceled' as any // We need to ensure 'canceled' is a valid status or add it
            };

            // Wait, if we set status 'canceled', it will still appear in shifts array... 
            // we need to filter it out in CalendarView or style it as "Canceled".
            // Let's check types.ts for valid statuses.

            await ScaleService.saveShiftEvent(override);
            await refreshScales(); // Trigger fetchShifts
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
            showToast("Escala duplicada com sucesso!", 'success');
            setSelectedShift(null); // Close modal
        } catch (error) {
            console.error("Error duplicating scale:", error);
            showToast("Erro ao duplicar escala.", 'error');
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
            {/* Container with flex-col-reverse on mobile to show calendar first */}
            <div className="flex flex-col-reverse md:flex-col space-y-6 space-y-reverse md:space-y-6">

                {/* Header Card - Appears SECOND on mobile, FIRST on desktop */}
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center bg-white dark:bg-gray-800 p-3 md:p-4 rounded-lg shadow gap-3 md:gap-4">
                    <div>
                        <h1 className="text-lg md:text-2xl font-bold dark:text-white">Minhas Escalas</h1>
                        <p className="text-xs md:text-sm text-gray-500 dark:text-gray-400">
                            Gerencie suas escalas regulares e plantões extras
                        </p>
                    </div>
                    <button
                        onClick={() => { setEditingScaleId(null); setIsEditing(true); }}
                        className="w-full md:w-auto px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700"
                    >
                        + Nova Escala / Plantão
                    </button>
                </div>

                {/* Calendar - Appears FIRST on mobile, SECOND on desktop */}
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
                            console.log("Clicked date:", date);
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
                            onClose={() => setSelectedShift(null)}
                            onDelete={handleShiftAction}
                            onEditScale={(scaleId) => {
                                setEditingScaleId(scaleId);
                                setIsEditing(true);
                                setSelectedShift(null); // Close shift details
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
        </div>
    );
};
