import React from 'react';
import { X, Edit, Trash2, Calendar, FileText } from 'lucide-react';
import type { ShiftScale } from '../types';

interface ScaleDetailsModalProps {
    scale: ShiftScale;
    onClose: () => void;
    onEdit: () => void;
    onDelete: () => void;
}

export const ScaleDetailsModal: React.FC<ScaleDetailsModalProps> = ({ scale, onClose, onEdit, onDelete }) => {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in-95 duration-200">

                {/* Header */}
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
                        <FileText className="w-5 h-5 text-indigo-500" />
                        Detalhes da Escala
                    </h3>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    <div>
                        <h4 className="text-2xl font-bold text-gray-800 dark:text-white mb-1">
                            {scale.name}
                        </h4>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-800 dark:bg-indigo-900 dark:text-indigo-200">
                            {scale.category}
                        </span>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Padrão</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {scale.patternType}
                            </p>
                        </div>
                        <div className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg">
                            <span className="text-xs text-gray-500 dark:text-gray-400 uppercase font-semibold">Ciclo</span>
                            <p className="font-medium text-gray-900 dark:text-gray-100 mt-1">
                                {scale.isOneOff ? 'Único' : `${scale.cycleLength} dias`}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-start gap-3 bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg">
                        <Calendar className="w-5 h-5 text-blue-600 dark:text-blue-400 mt-0.5" />
                        <div>
                            <span className="text-sm font-medium text-blue-900 dark:text-blue-200 block">
                                Data de Início / Referência
                            </span>
                            <span className="text-base text-blue-700 dark:text-blue-300">
                                {new Date(scale.startDate.seconds * 1000).toLocaleDateString()}
                            </span>
                            {!scale.isOneOff && (
                                <p className="text-xs text-blue-600/80 dark:text-blue-400/80 mt-1">
                                    Dia inicial do ciclo de repetição.
                                </p>
                            )}
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="px-6 py-4 bg-gray-50 dark:bg-gray-800/50 border-t border-gray-100 dark:border-gray-700 flex gap-3">
                    <button
                        onClick={onDelete}
                        className="flex-1 flex items-center justify-center gap-2 px-4 py-2 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 hover:border-red-300 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-900/20 transition-all text-sm font-medium"
                    >
                        <Trash2 size={16} />
                        Excluir
                    </button>
                    <button
                        onClick={onEdit}
                        className="flex-[2] flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 shadow-md shadow-indigo-200 dark:shadow-none transition-all text-sm font-medium"
                    >
                        <Edit size={16} />
                        Configurar / Editar
                    </button>
                </div>

            </div>
        </div>
    );
};
