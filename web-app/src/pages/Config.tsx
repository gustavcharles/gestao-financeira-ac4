import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Plus, GripVertical, CheckCircle2, X } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ReportGenerator } from '../components/reports/ReportGenerator';
import { CategoryIconPicker } from '../components/ui/CategoryIconPicker';
import { getIconComponent, CATEGORY_COLORS } from '../utils/categoryIcons';
import type { CategoryItem } from '../services/settings';

export const Config = () => {
    const { settings, saveSettings, loading } = useSettings();
    const [activeTab, setActiveTab] = useState<'Receita' | 'Despesa'>('Despesa');

    // Add/Edit State
    const [isAdding, setIsAdding] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [newCatName, setNewCatName] = useState('');
    const [newCatIcon, setNewCatIcon] = useState('more-horizontal');
    const [newCatColor, setNewCatColor] = useState(CATEGORY_COLORS[0]);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [catToDelete, setCatToDelete] = useState<CategoryItem | null>(null);

    const handleSave = async () => {
        if (!newCatName.trim()) return;

        const currentCats = settings.categories[activeTab] || [];

        // Check for duplicate name (exclude current item if editing)
        const isDuplicate = currentCats.some((c, idx) =>
            c.name.toLowerCase() === newCatName.trim().toLowerCase() && idx !== editingIndex
        );

        if (isDuplicate) {
            alert("Categoria já existe!");
            return;
        }

        const newItem: CategoryItem = {
            name: newCatName.trim(),
            icon: newCatIcon,
            color: newCatColor
        };

        let updatedCats = [...currentCats];
        if (editingIndex !== null) {
            // Update existing
            updatedCats[editingIndex] = newItem;
        } else {
            // Add new
            updatedCats.push(newItem);
        }

        await saveSettings({
            categories: {
                ...settings.categories,
                [activeTab]: updatedCats
            }
        });

        resetForm();
    };

    const startEditing = (cat: CategoryItem, index: number) => {
        setNewCatName(cat.name);
        setNewCatIcon(cat.icon);
        setNewCatColor(cat.color);
        setEditingIndex(index);
        setIsAdding(true);
    };

    const resetForm = () => {
        setNewCatName('');
        setNewCatIcon('more-horizontal');
        setNewCatColor(CATEGORY_COLORS[0]);
        setEditingIndex(null);
        setIsAdding(false);
    };

    const requestDelete = (cat: CategoryItem) => {
        setCatToDelete(cat);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!catToDelete) return;

        const currentCats = settings.categories[activeTab];
        const updatedCats = currentCats.filter(c => c.name !== catToDelete.name);

        await saveSettings({
            categories: {
                ...settings.categories,
                [activeTab]: updatedCats
            }
        });

        setIsDeleteModalOpen(false);
        setCatToDelete(null);
    };

    if (loading) return <div className="p-10 text-center">Carregando configurações...</div>;

    const currentList = settings.categories[activeTab] || [];

    return (
        <div className="space-y-6 max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500 pb-20 md:pb-0">
            <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Configurações</h2>

            {/* Categories Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Gerenciar Categorias</h3>
                        <p className="text-slate-500 dark:text-slate-400 text-sm">Personalize as categorias do seu sistema.</p>
                    </div>
                </div>

                {/* Tabs */}
                <div className="flex border-b border-slate-100 dark:border-slate-700">
                    <button
                        onClick={() => setActiveTab('Despesa')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'Despesa'
                            ? 'border-red-500 text-red-600 dark:text-red-400 bg-red-50/50 dark:bg-red-900/10'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        Despesas
                    </button>
                    <button
                        onClick={() => setActiveTab('Receita')}
                        className={`flex-1 py-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'Receita'
                            ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400 bg-emerald-50/50 dark:bg-emerald-900/10'
                            : 'border-transparent text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800'
                            }`}
                    >
                        Receitas
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Add New Header */}
                    <div className="flex justify-between items-center">
                        <h4 className="font-semibold text-slate-700 dark:text-slate-200">
                            Categorias de {activeTab}s
                        </h4>
                        {!isAdding && (
                            <button
                                onClick={() => {
                                    resetForm();
                                    setIsAdding(true);
                                }}
                                className="bg-primary-600 text-white px-3 py-1.5 rounded-lg text-sm font-medium hover:bg-primary-700 flex items-center gap-2 transition-colors"
                            >
                                <Plus size={16} />
                                Nova Categoria
                            </button>
                        )}
                    </div>

                    {/* Add/Edit Form */}
                    {isAdding && (
                        <div className="bg-slate-50 dark:bg-slate-700/30 p-4 rounded-xl border border-primary-200 dark:border-primary-900/50 animate-in fade-in zoom-in-95 duration-200 space-y-4">
                            <div className="flex justify-between items-start">
                                <h5 className="font-medium text-slate-800 dark:text-white text-sm">
                                    {editingIndex !== null ? 'Editar Categoria' : 'Nova Categoria'}
                                </h5>
                                <button onClick={resetForm} className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                                    <X size={18} />
                                </button>
                            </div>

                            <div>
                                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Nome</label>
                                <input
                                    type="text"
                                    value={newCatName}
                                    onChange={(e) => setNewCatName(e.target.value)}
                                    placeholder="Ex: Assinaturas"
                                    className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                                />
                            </div>

                            <CategoryIconPicker
                                selectedIcon={newCatIcon}
                                onSelectIcon={setNewCatIcon}
                                selectedColor={newCatColor}
                                onSelectColor={setNewCatColor}
                            />

                            <div className="flex justify-end gap-2 pt-2">
                                <button
                                    onClick={resetForm}
                                    className="px-4 py-2 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-600 rounded-lg text-sm font-medium transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleSave}
                                    disabled={!newCatName.trim()}
                                    className="bg-primary-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                                >
                                    <CheckCircle2 size={16} />
                                    {editingIndex !== null ? 'Atualizar' : 'Salvar'}
                                </button>
                            </div>
                        </div>
                    )}

                    {/* List */}
                    <div className="space-y-3">
                        {currentList.map((cat, idx) => {
                            const Icon = getIconComponent(cat.icon);
                            return (
                                <div key={idx} className="flex items-center justify-between p-3 bg-white dark:bg-slate-800 rounded-xl border border-slate-100 dark:border-slate-700 group hover:shadow-sm transition-all">
                                    <div className="flex items-center gap-4">

                                        <div
                                            className="w-10 h-10 rounded-lg flex items-center justify-center text-white shadow-sm"
                                            style={{ backgroundColor: cat.color }}
                                        >
                                            <Icon size={20} />
                                        </div>

                                        <span className="font-medium text-slate-700 dark:text-slate-200">
                                            {cat.name}
                                        </span>
                                    </div>

                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => startEditing(cat, idx)}
                                            className="p-2 text-slate-300 dark:text-slate-600 hover:text-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Editar"
                                        >
                                            <div className="w-4 h-4">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"></path></svg>
                                            </div>
                                        </button>
                                        <button
                                            className="p-2 text-slate-300 dark:text-slate-600 cursor-move hover:text-slate-500 dark:hover:text-slate-400"
                                            title="Reordenar (Em breve)"
                                        >
                                            <GripVertical size={16} />
                                        </button>
                                        <button
                                            onClick={() => requestDelete(cat)}
                                            className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                            title="Excluir"
                                        >
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            );
                        })}
                        {currentList.length === 0 && (
                            <div className="text-center py-8 text-slate-400 italic">
                                Nenhuma categoria cadastrada.
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Appearance Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Aparência</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Personalize as cores do sistema</p>
                </div>
                <div className="p-6">
                    <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-3">Tema do Sistema</label>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {[
                            { id: 'blue', name: 'Azul Padrão', color: '#3B82F6' },
                            { id: 'green', name: 'Verde Militar', color: '#10B981' },
                            { id: 'purple', name: 'Roxo Noturno', color: '#8B5CF6' },
                        ].map((theme) => {
                            const isSelected = (settings.theme || 'blue') === theme.id;
                            return (
                                <button
                                    key={theme.id}
                                    onClick={() => saveSettings({ theme: theme.id as any })}
                                    className={`
                                        relative flex items-center gap-3 p-4 rounded-xl border-2 transition-all text-left
                                        ${isSelected
                                            ? 'border-primary-500 bg-primary-50 dark:bg-slate-700 ring-2 ring-primary-200 dark:ring-slate-600 ring-offset-2 dark:ring-offset-slate-800'
                                            : 'border-slate-100 dark:border-slate-700 hover:border-slate-200 dark:hover:border-slate-600 hover:bg-slate-50 dark:hover:bg-slate-700'}
                                    `}
                                >
                                    <div
                                        className="w-10 h-10 rounded-full shadow-sm flex items-center justify-center text-white"
                                        style={{ backgroundColor: theme.color }}
                                    >
                                        {isSelected && <CheckCircle2 size={20} />}
                                    </div>
                                    <span className={`font-medium ${isSelected ? 'text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'}`}>
                                        {theme.name}
                                    </span>
                                </button>
                            );
                        })}
                    </div>

                    <div className="mt-6 flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                        <div>
                            <h4 className="font-medium text-slate-800 dark:text-slate-200">Modo Escuro</h4>
                            <p className="text-sm text-slate-500 dark:text-slate-400">Ativar visualização noturna</p>
                        </div>
                        <button
                            onClick={() => saveSettings({ darkMode: !settings.darkMode })}
                            className={`
                                relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2 dark:ring-offset-slate-800
                                ${settings.darkMode ? 'bg-primary-600' : 'bg-slate-200 dark:bg-slate-600'}
                            `}
                        >
                            <span
                                className={`
                                    inline-block h-4 w-4 transform rounded-full bg-white transition duration-200 ease-in-out
                                    ${settings.darkMode ? 'translate-x-6' : 'translate-x-1'}
                                `}
                            />
                        </button>
                    </div>
                </div>
            </div>

            {/* Reports Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Relatórios Avançados</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Gere relatórios detalhados com gráficos e análises</p>
                </div>
                <div className="p-6">
                    <ReportGenerator />
                </div>
            </div>

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Excluir Categoria"
                message={`Tem certeza que deseja excluir a categoria "${catToDelete?.name}"?`}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    );
};
