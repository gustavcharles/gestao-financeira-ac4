import React, { useState, useEffect } from 'react';
import { CalendarService } from '../services/calendarService';
import { Copy, CheckCircle, ExternalLink, AlertCircle, Calendar } from 'lucide-react';
import type { ScaleCategory } from '../types';

interface ExportCalendarModalProps {
    userId: string;
    onClose: () => void;
}

const AVAILABLE_CATEGORIES: { value: ScaleCategory; label: string }[] = [
    { value: 'AC-4', label: 'AC-4' },
    { value: 'Diário', label: 'Plantões Diários' },
    { value: 'Suplementar', label: 'Suplementar' },
    { value: 'Troca', label: 'Troca' },
    { value: 'Outros', label: 'Outros' },
];

export const ExportCalendarModal: React.FC<ExportCalendarModalProps> = ({ userId, onClose }) => {
    const [calendarUrl, setCalendarUrl] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [copied, setCopied] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedCategories, setSelectedCategories] = useState<ScaleCategory[]>([]);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchUrlAndPreferences = async () => {
            try {
                // Load saved preferences
                const preferences = await CalendarService.getCalendarPreferences(userId);
                const categories = preferences?.categories || ['AC-4', 'Diário', 'Suplementar', 'Troca', 'Outros'];
                setSelectedCategories(categories);

                // Generate URL with selected categories
                const url = await CalendarService.getCalendarUrl(userId, categories);
                setCalendarUrl(url);
            } catch (err) {
                console.error('Error fetching calendar URL:', err);
                setError('Erro ao gerar URL do calendário');
            } finally {
                setLoading(false);
            }
        };

        fetchUrlAndPreferences();
    }, [userId]);


    const handleToggleCategory = async (category: ScaleCategory) => {
        const newCategories = selectedCategories.includes(category)
            ? selectedCategories.filter(c => c !== category)
            : [...selectedCategories, category];

        // Ensure at least one category is selected
        if (newCategories.length === 0) {
            return;
        }

        setSelectedCategories(newCategories);
        setSaving(true);

        try {
            // Save preferences to Firestore
            await CalendarService.saveCalendarPreferences(userId, newCategories);

            // Regenerate URL with new categories
            const url = await CalendarService.getCalendarUrl(userId, newCategories);
            setCalendarUrl(url);
        } catch (err) {
            console.error('Error saving preferences:', err);
        } finally {
            setSaving(false);
        }
    };

    const handleCopyUrl = async () => {
        try {
            await navigator.clipboard.writeText(calendarUrl);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        } catch (err) {
            console.error('Error copying to clipboard:', err);
        }
    };

    const handleOpenGoogleCalendar = () => {
        const googleUrl = CalendarService.getGoogleCalendarLink(calendarUrl);
        window.open(googleUrl, '_blank');
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-start p-6 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 dark:bg-indigo-900 rounded-lg">
                            <Calendar className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold dark:text-white">Exportar para Google Calendar</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                Sincronize suas escalas automaticamente
                            </p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        ✕
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {loading ? (
                        <div className="flex justify-center py-8">
                            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
                        </div>
                    ) : error ? (
                        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 flex items-start gap-3">
                            <AlertCircle className="w-5 h-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <p className="text-red-800 dark:text-red-200 font-medium">Erro</p>
                                <p className="text-red-700 dark:text-red-300 text-sm">{error}</p>
                            </div>
                        </div>
                    ) : (
                        <>
                            {/* Important Notice */}
                            <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                                <div className="flex items-start gap-3">
                                    <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 flex-shrink-0 mt-0.5" />
                                    <div className="space-y-2">
                                        <p className="text-amber-900 dark:text-amber-100 font-medium text-sm">
                                            Importante:
                                        </p>
                                        <ul className="text-amber-800 dark:text-amber-200 text-sm space-y-1 list-disc list-inside">
                                            <li>As atualizações podem levar algumas horas para aparecer no Google Calendar</li>
                                            <li>O link gerado é único e privado. Não compartilhe com terceiros</li>
                                            <li>Você não poderá editar eventos diretamente no Google Calendar</li>
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            {/* Category Selection */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    Categorias de Escalas
                                </label>
                                <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                                    Selecione quais categorias você deseja exportar para o Google Calendar
                                </p>
                                <div className="grid grid-cols-2 gap-2">
                                    {AVAILABLE_CATEGORIES.map(({ value, label }) => (
                                        <label
                                            key={value}
                                            className="flex items-center gap-2 p-3 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer transition-colors"
                                        >
                                            <input
                                                type="checkbox"
                                                checked={selectedCategories.includes(value)}
                                                onChange={() => handleToggleCategory(value)}
                                                disabled={saving || (selectedCategories.length === 1 && selectedCategories.includes(value))}
                                                className="w-4 h-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                                            />
                                            <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                                        </label>
                                    ))}
                                </div>
                                {saving && (
                                    <p className="text-xs text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                                        <span className="animate-spin">⟳</span> Salvando preferências...
                                    </p>
                                )}
                            </div>

                            {/* URL Display */}
                            <div className="space-y-3">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                                    URL de Assinatura
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={calendarUrl}
                                        readOnly
                                        className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm font-mono"
                                    />
                                    <button
                                        onClick={handleCopyUrl}
                                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors flex items-center gap-2"
                                    >
                                        {copied ? (
                                            <>
                                                <CheckCircle className="w-4 h-4 text-green-600 dark:text-green-400" />
                                                <span className="text-green-600 dark:text-green-400 text-sm">Copiado!</span>
                                            </>
                                        ) : (
                                            <>
                                                <Copy className="w-4 h-4 text-gray-600 dark:text-gray-400" />
                                                <span className="text-gray-600 dark:text-gray-400 text-sm">Copiar</span>
                                            </>
                                        )}
                                    </button>
                                </div>
                            </div>

                            {/* Google Calendar Button */}
                            <button
                                onClick={handleOpenGoogleCalendar}
                                className="w-full px-4 py-3 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2 font-medium"
                            >
                                <ExternalLink className="w-5 h-5" />
                                Adicionar ao Google Calendar
                            </button>

                            {/* Instructions */}
                            <div className="space-y-3">
                                <h3 className="font-medium text-gray-900 dark:text-gray-100">
                                    Como adicionar manualmente:
                                </h3>
                                <ol className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                                    <li className="flex gap-2">
                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">1.</span>
                                        <span>Copie a URL acima</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">2.</span>
                                        <span>Abra o Google Calendar (calendar.google.com)</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">3.</span>
                                        <span>Clique no "+" ao lado de "Outros calendários"</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">4.</span>
                                        <span>Selecione "A partir de URL"</span>
                                    </li>
                                    <li className="flex gap-2">
                                        <span className="font-medium text-indigo-600 dark:text-indigo-400">5.</span>
                                        <span>Cole a URL e clique em "Adicionar calendário"</span>
                                    </li>
                                </ol>
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                    >
                        Fechar
                    </button>
                </div>
            </div>
        </div>
    );
};
