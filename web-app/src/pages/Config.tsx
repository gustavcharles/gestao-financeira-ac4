import { useState } from 'react';
import { useSettings } from '../hooks/useSettings';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useAuth } from '../contexts/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../services/firebase';
import { Trash2, Plus, GripVertical, CheckCircle2, X, Bell, BellOff, BellRing, Loader2, MessageCircle, ExternalLink, Phone, Save } from 'lucide-react';
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

            {/* Profile Section */}
            <ProfileSection />

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

            {/* Push Notifications Section */}
            <NotificationsCard />

            {/* Support Section */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Suporte ao Cliente</h3>
                    <p className="text-slate-500 dark:text-slate-400 text-sm">Precisa de ajuda? Fale conosco diretamente pelo WhatsApp.</p>
                </div>
                <div className="p-6">
                    <div className="bg-emerald-50 dark:bg-emerald-900/10 border border-emerald-100 dark:border-emerald-900/30 rounded-2xl p-6 flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-emerald-500/20 shrink-0">
                                <MessageCircle size={24} />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-800 dark:text-white">Suporte via WhatsApp</h4>
                                <p className="text-sm text-slate-500 dark:text-slate-400">Atendimento humanizado para tirar suas dúvidas.</p>
                            </div>
                        </div>

                        <a
                            href="https://wa.me/5562982755654"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white px-6 py-3 rounded-xl font-bold flex items-center gap-2 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-emerald-500/25 w-full md:w-auto justify-center"
                        >
                            <MessageCircle size={20} />
                            Falar com Suporte
                            <ExternalLink size={14} className="opacity-50" />
                        </a>
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

function NotificationsCard() {
    const { isActive, isLoading, error, permission, enableNotifications, disableNotifications } = usePushNotifications();
    const [success, setSuccess] = useState(false);

    const handleEnable = async () => {
        setSuccess(false);
        const ok = await enableNotifications();
        if (ok) setSuccess(true);
    };

    const handleDisable = async () => {
        setSuccess(false);
        await disableNotifications();
    };

    const isDenied = permission === 'denied';
    const isUnsupported = permission === 'unsupported';
    const isInit = permission === 'loading';

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Notificações Push</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Receba lembretes dos seus próximos plantões</p>
            </div>
            <div className="p-6 space-y-4">
                {/* Status row */}
                <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-slate-700/30 rounded-xl border border-slate-100 dark:border-slate-700">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isActive ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-600' :
                            isDenied ? 'bg-red-100 dark:bg-red-900/30 text-red-500' :
                                isUnsupported ? 'bg-slate-100 dark:bg-slate-700 text-slate-400' :
                                    'bg-amber-100 dark:bg-amber-900/30 text-amber-500'
                            }`}>
                            {isActive ? <BellRing size={20} /> : isDenied || isUnsupported ? <BellOff size={20} /> : <Bell size={20} />}
                        </div>
                        <div>
                            <div className="font-medium text-slate-800 dark:text-slate-200 text-sm">
                                {isInit ? 'Verificando...' :
                                    isActive ? 'Notificações ativadas' :
                                        isDenied ? 'Permissão bloqueada' :
                                            isUnsupported ? 'Não suportado neste dispositivo' :
                                                'Notificações desativadas'}
                            </div>
                            <div className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                                {isActive ? 'Você receberá lembretes 24h antes dos plantões' :
                                    isDenied ? 'Habilite nas configurações do navegador/sistema' :
                                        isUnsupported ? 'Instale o app para receber notificações' :
                                            isInit ? '' :
                                                'Clique para ativar lembretes de plantões'}
                            </div>
                        </div>
                    </div>

                    {/* Botão ativar / desativar */}
                    {!isUnsupported && !isDenied && !isInit && (
                        isActive ? (
                            <button
                                onClick={handleDisable}
                                disabled={isLoading}
                                className="text-sm text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 font-medium flex items-center gap-1.5"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : 'Desativar'}
                            </button>
                        ) : (
                            <button
                                onClick={handleEnable}
                                disabled={isLoading}
                                className="bg-primary-600 hover:bg-primary-700 text-white text-sm font-medium px-4 py-2 rounded-lg flex items-center gap-2 transition-colors disabled:opacity-60"
                            >
                                {isLoading ? <Loader2 size={16} className="animate-spin" /> : <Bell size={16} />}
                                Ativar
                            </button>
                        )
                    )}
                    {isDenied && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 text-right max-w-[120px]">
                            Habilite no navegador e recarregue
                        </span>
                    )}
                </div>

                {/* Erro */}
                {error && (
                    <div className="flex items-center gap-2 text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 p-3 rounded-lg">
                        <X size={16} />
                        {error}
                    </div>
                )}

                {/* Sucesso */}
                {success && isActive && (
                    <div className="flex items-center gap-2 text-sm text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded-lg">
                        <CheckCircle2 size={16} />
                        Notificações ativadas! Você receberá um lembrete 24h antes de cada plantão.
                    </div>
                )}

                {/* Info */}
                <div className="text-xs text-slate-500 dark:text-slate-400 flex items-start gap-2">
                    <Bell size={12} className="mt-0.5 shrink-0" />
                    <span>As notificações funcionam mesmo com o app fechado, desde que instalado na tela inicial (Android) ou no Chrome Desktop.</span>
                </div>
            </div>
        </div>
    );
}

function ProfileSection() {
    const { currentUser, userProfile } = useAuth();
    const [phone, setPhone] = useState(userProfile?.phone || '');
    const [isSaving, setIsSaving] = useState(false);
    const [saved, setSaved] = useState(false);

    const handleSave = async () => {
        if (!currentUser) return;
        setIsSaving(true);
        setSaved(false);
        try {
            await updateDoc(doc(db, 'users', currentUser.uid), {
                phone: phone.replace(/\D/g, '') // Save only digits
            });
            setSaved(true);
            setTimeout(() => setSaved(false), 3000);
        } catch (error) {
            console.error('Error saving profile:', error);
            alert('Erro ao salvar o perfil.');
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white mb-1">Meu Perfil</h3>
                <p className="text-slate-500 dark:text-slate-400 text-sm">Gerencie suas informações pessoais</p>
            </div>

            <div className="p-6 space-y-4">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">E-mail</label>
                        <input
                            type="email"
                            value={currentUser?.email || ''}
                            disabled
                            className="w-full px-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl bg-slate-50 dark:bg-slate-700 text-slate-500 dark:text-slate-400 cursor-not-allowed"
                        />
                    </div>
                    <div className="flex-1">
                        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                            WhatsApp (com DDD)
                        </label>
                        <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Phone size={16} className="text-slate-400" />
                            </div>
                            <input
                                type="tel"
                                value={phone}
                                onChange={(e) => setPhone(e.target.value)}
                                placeholder="Ex: 11999999999"
                                className="w-full pl-10 pr-4 py-2 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
                            />
                        </div>
                    </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                    <div className="text-sm">
                        {userProfile?.phone ? (
                            <span className="text-emerald-600 dark:text-emerald-400 flex items-center gap-1 font-medium">
                                <CheckCircle2 size={16} /> WhatsApp configurado
                            </span>
                        ) : (
                            <span className="text-amber-500 flex items-center gap-1 font-medium">
                                <BellOff size={16} /> Insira seu número para receber avisos
                            </span>
                        )}
                    </div>

                    <button
                        onClick={handleSave}
                        disabled={isSaving}
                        className="bg-primary-600 hover:bg-primary-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2 disabled:opacity-50"
                    >
                        {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        {saved ? 'Salvo!' : 'Salvar Perfil'}
                    </button>
                </div>
            </div>
        </div>
    );
}



