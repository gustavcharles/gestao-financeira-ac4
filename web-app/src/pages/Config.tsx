import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { Trash2, Plus, GripVertical, CheckCircle2 } from 'lucide-react';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ReportGenerator } from '../components/reports/ReportGenerator';

export const Config = () => {
    const { settings, saveSettings, loading } = useSettings();
    const [newCat, setNewCat] = useState('');
    const [activeTab, setActiveTab] = useState<'Receita' | 'Despesa'>('Despesa');

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [catToDelete, setCatToDelete] = useState<string | null>(null);

    const handleAdd = async () => {
        if (!newCat.trim()) return;
        const currentCats = settings.categories[activeTab] || [];
        if (currentCats.includes(newCat.trim())) {
            alert("Categoria já existe!");
            return;
        }

        const updatedCats = [...currentCats, newCat.trim()];

        await saveSettings({
            categories: {
                ...settings.categories,
                [activeTab]: updatedCats
            }
        });
        setNewCat('');
    };

    const requestDelete = (cat: string) => {
        setCatToDelete(cat);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (!catToDelete) return;

        const currentCats = settings.categories[activeTab];
        const updatedCats = currentCats.filter(c => c !== catToDelete);

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
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Gerenciar Categorias</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Adicione ou remova categorias para suas transações</p>
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
                    {/* Add New */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newCat}
                            onChange={(e) => setNewCat(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                            placeholder={`Nova categoria de ${activeTab}...`}
                            className="flex-1 px-4 py-2 border border-slate-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-900 text-slate-800 dark:text-white"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={!newCat.trim()}
                            className="bg-primary-600 text-white px-4 py-2 rounded-xl font-medium hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                        >
                            <Plus size={20} />
                            Adicionar
                        </button>
                    </div>

                    {/* List */}
                    <div className="space-y-2">
                        {currentList.map((cat) => (
                            <div key={cat} className="flex items-center justify-between p-3 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700 group">
                                <span className="font-medium text-slate-700 dark:text-slate-200 flex items-center gap-3">
                                    <div className="text-slate-300 dark:text-slate-500">
                                        <GripVertical size={16} />
                                    </div>
                                    {cat}
                                </span>
                                <button
                                    onClick={() => requestDelete(cat)}
                                    className="p-2 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                                    title="Excluir"
                                >
                                    <Trash2 size={18} />
                                </button>
                            </div>
                        ))}
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
                message={`Tem certeza que deseja excluir a categoria "${catToDelete}"?`}
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    );
};
