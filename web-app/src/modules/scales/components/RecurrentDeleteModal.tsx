import React, { useState } from 'react';
import { X, Trash2, Wallet } from 'lucide-react';

interface RecurrentDeleteModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: (mode: 'single' | 'following' | 'all') => void;
}

export const RecurrentDeleteModal: React.FC<RecurrentDeleteModalProps> = ({ isOpen, onClose, onConfirm }) => {
    const [selectedMode, setSelectedMode] = useState<'single' | 'following' | 'all'>('single');

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-200">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
                <div className="flex justify-between items-center p-4 border-b border-gray-100 dark:border-gray-700">
                    <h3 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <Trash2 className="w-5 h-5 text-red-500" />
                        Excluir evento recorrente
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">
                        Este é um evento que se repete. Como você deseja excluí-lo?
                    </p>

                    <div className="space-y-3">
                        {/* Option 1: Only this event */}
                        <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedMode === 'single' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}>
                            <input
                                type="radio"
                                name="deleteMode"
                                value="single"
                                checked={selectedMode === 'single'}
                                onChange={() => setSelectedMode('single')}
                                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Este evento</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Remove apenas este plantão da agenda. Outros dias permanecem inalterados.
                                </span>
                            </div>
                        </label>

                        {/* Option 2: This and following */}
                        <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedMode === 'following' ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-indigo-300'}`}>
                            <input
                                type="radio"
                                name="deleteMode"
                                value="following"
                                checked={selectedMode === 'following'}
                                onChange={() => setSelectedMode('following')}
                                className="mt-1 w-4 h-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Este e os eventos seguintes</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Encerra a repetição a partir desta data. Eventos passados são mantidos.
                                </span>
                            </div>
                        </label>

                        {/* Option 3: All events */}
                        <label className={`flex items-start p-3 rounded-lg border-2 cursor-pointer transition-all ${selectedMode === 'all' ? 'border-red-500 bg-red-50 dark:bg-red-900/20' : 'border-gray-200 dark:border-gray-700 hover:border-red-300'}`}>
                            <input
                                type="radio"
                                name="deleteMode"
                                value="all"
                                checked={selectedMode === 'all'}
                                onChange={() => setSelectedMode('all')}
                                className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500"
                            />
                            <div className="ml-3">
                                <span className="block text-sm font-medium text-gray-900 dark:text-white">Todos os eventos</span>
                                <span className="block text-xs text-gray-500 dark:text-gray-400 mt-1">
                                    Exclui a escala inteira e todo o histórico de agendamentos visuais no calendário.
                                </span>
                            </div>
                        </label>
                    </div>

                    {selectedMode === 'all' && (
                        <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 text-amber-800 dark:text-amber-200 text-xs rounded-md flex items-start">
                            <Wallet className="w-4 h-4 mr-2 flex-shrink-0 mt-0.5" />
                            <span>
                                <strong>Atenção:</strong> Transações financeiras já geradas (Financeiro) NÃO serão excluídas automaticamente para preservar seu histórico.
                            </span>
                        </div>
                    )}
                </div>

                <div className="p-4 bg-gray-50 dark:bg-gray-800/50 flex justify-end space-x-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700 rounded-md transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={() => onConfirm(selectedMode)}
                        className={`px-4 py-2 text-sm font-medium text-white rounded-md shadow-sm transition-colors ${selectedMode === 'all' ? 'bg-red-600 hover:bg-red-700' : 'bg-indigo-600 hover:bg-indigo-700'
                            }`}
                    >
                        Excluir
                    </button>
                </div>
            </div>
        </div>
    );
};
