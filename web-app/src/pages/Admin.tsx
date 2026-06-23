import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, orderBy, query, Timestamp } from 'firebase/firestore';
import { db } from '../services/firebase';
import type { UserProfile } from '../contexts/AuthContext';
import { Check, X, Shield, User, Search, Loader2, RefreshCw, Clock, TrendingUp, AlertCircle, MessageSquare, QrCode, Send, Settings, Save, Smartphone, Star, Edit3, DollarSign, PieChart as PieChartIcon, Activity } from 'lucide-react';
import { format, differenceInDays, addDays } from 'date-fns';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { syncPaymentsFromSheets } from '../services/sheetsSync';
import {
    type WhatsAppConfig,
    subscribeWhatsAppConfig,
    saveWhatsAppConfig,
    createWhatsAppInstance,
    deleteWhatsAppInstance,
    getWhatsAppQRCode,
    checkWhatsAppStatus,
    sendWhatsAppTest,
    sendWhatsAppBroadcast
} from '../services/whatsappService';

interface UserData extends UserProfile {
    id: string;
    createdAt?: Timestamp | { toDate: () => Date } | string;
}

export const Admin = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncing, setSyncing] = useState(false);
    const [activeTab, setActiveTab] = useState<'users' | 'whatsapp' | 'feedback'>('users');
    const [editingUser, setEditingUser] = useState<UserData | null>(null);
    const [isUpdatingPlan, setIsUpdatingPlan] = useState(false);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const userList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as UserData));
            setUsers(userList);
        } catch (error) {
            console.error("Error fetching users:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleStatusChange = async (userId: string, newStatus: 'trial' | 'active' | 'expired' | 'blocked' | 'pending') => {
        try {
            await updateDoc(doc(db, 'users', userId), {
                status: newStatus
            });
            // Update local state optimistic
            setUsers(users.map(u => u.id === userId ? { ...u, status: newStatus } : u));
        } catch (error) {
            console.error("Error updating status:", error);
            alert("Erro ao atualizar status");
        }
    };

    const handleUpdatePlan = async (userId: string, updates: Partial<UserData>) => {
        setIsUpdatingPlan(true);
        try {
            const dataToUpdate: Record<string, unknown> = {};
            if (updates.status !== undefined) dataToUpdate.status = updates.status;
            if (updates.plan !== undefined) dataToUpdate.plan = updates.plan;
            if (updates.subscriptionEndsAt !== undefined) dataToUpdate.subscriptionEndsAt = updates.subscriptionEndsAt;
            if (updates.trialEndsAt !== undefined) dataToUpdate.trialEndsAt = updates.trialEndsAt;
            
            // Marca flag manual para não ser sobrescrito acidentalmente pelo Sheets Sync
            dataToUpdate.planIsManual = true;

            await updateDoc(doc(db, 'users', userId), dataToUpdate);

            // Optimistic update
            setUsers(users.map(u => u.id === userId ? { ...u, ...dataToUpdate } : u));
            setEditingUser(null);
            alert("Plano atualizado com sucesso (Manual)!");
        } catch (error) {
            console.error("Error updating plan:", error);
            alert("Erro ao atualizar plano");
        } finally {
            setIsUpdatingPlan(false);
        }
    };

    const handleSyncPayments = async () => {
        setSyncing(true);
        try {
            const result = await syncPaymentsFromSheets();

            // Recarregar lista de usuários
            await fetchUsers();

            // Criar modal customizado
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Sincronização Concluída!
                        </h3>
                        <p class="text-lg text-emerald-600 dark:text-emerald-400 font-semibold">
                            ✅ ${result.activatedCount} usuário(s) ativado(s)
                        </p>
                    </div>
                    ${result.errors.length > 0 ? `
                        <div class="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 mb-4">
                            <p class="text-red-800 dark:text-red-200 font-semibold mb-2">⚠️ Erros encontrados:</p>
                            <ul class="text-sm text-red-600 dark:text-red-300 space-y-1">
                                ${result.errors.map(err => `<li>• ${err}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}
                    <button 
                        onclick="this.closest('.fixed').remove()" 
                        class="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(modal);

            // Forçar re-render do React após sincronização
            setTimeout(() => {
                setSyncing(false);
            }, 100);

        } catch (err) { const error = err as Error;
            // Erro com modal customizado
            const modal = document.createElement('div');
            modal.className = 'fixed inset-0 bg-black/50 flex items-center justify-center z-50';
            modal.innerHTML = `
                <div class="bg-white dark:bg-slate-800 rounded-2xl p-6 max-w-md mx-4 shadow-2xl">
                    <div class="text-center mb-4">
                        <div class="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg class="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"></path>
                            </svg>
                        </div>
                        <h3 class="text-2xl font-bold text-slate-800 dark:text-white mb-2">
                            Erro na Sincronização
                        </h3>
                        <p class="text-red-600 dark:text-red-400">
                            ${error.message}
                        </p>
                    </div>
                    <button 
                        onclick="this.closest('.fixed').remove()" 
                        class="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-3 rounded-lg transition-colors"
                    >
                        OK
                    </button>
                </div>
            `;
            document.body.appendChild(modal);
        } finally {
            setSyncing(false);
        }
    };

    // Calculate metrics
    const activeUsers = users.filter(u => u.status === 'active');
    
    let mrr = 0;
    const plansDistribution = { basic: 0, monthly: 0, annual: 0, none: 0 };

    activeUsers.forEach(u => {
        if (u.plan === 'basic') {
            mrr += 9.90;
            plansDistribution.basic++;
        } else if (u.plan === 'monthly') {
            mrr += 15.90;
            plansDistribution.monthly++;
        } else if (u.plan === 'annual') {
            mrr += 12.49; // 149.90 / 12
            plansDistribution.annual++;
        } else {
            plansDistribution.none++;
        }
    });

    const arr = mrr * 12;

    const metrics = {
        total: users.length,
        trial: users.filter(u => u.status === 'trial').length,
        active: activeUsers.length,
        expired: users.filter(u => u.status === 'expired').length,
        expiringIn7Days: users.filter(u => {
            if (!u.trialEndsAt || u.status !== 'trial') return false;
            const trialEnd = u.trialEndsAt.toDate ? u.trialEndsAt.toDate() : new Date(u.trialEndsAt);
            const daysLeft = differenceInDays(trialEnd, new Date());
            return daysLeft >= 0 && daysLeft <= 7;
        }).length,
        activeExpiringIn7Days: activeUsers.filter(u => {
            if (!u.subscriptionEndsAt) return false;
            const subEnd = u.subscriptionEndsAt.toDate ? u.subscriptionEndsAt.toDate() : new Date(u.subscriptionEndsAt);
            const daysLeft = differenceInDays(subEnd, new Date());
            return daysLeft >= 0 && daysLeft <= 7;
        }).length,
        mrr,
        arr,
        plansDistribution
    };

    const pieData = [
        { name: 'Basic', value: metrics.plansDistribution.basic, color: '#3b82f6' }, // blue-500
        { name: 'Mensal Pro', value: metrics.plansDistribution.monthly, color: '#10b981' }, // emerald-500
        { name: 'Anual', value: metrics.plansDistribution.annual, color: '#f59e0b' }, // amber-500
    ].filter(item => item.value > 0);

    const filteredUsers = users.filter(user =>
        user.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <div className="flex items-center gap-2 text-primary-600 mb-1">
                        <Shield size={20} />
                        <span className="text-xs font-bold tracking-wider uppercase">Painel Administrativo</span>
                    </div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Gerenciar Usuários</h2>
                    <p className="text-slate-500 dark:text-slate-400">Controle de acesso e aprovações</p>
                </div>

                <div className="relative w-full md:w-64">
                    <Search className="absolute left-3 top-3 text-slate-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por email..."
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500"
                    />
                </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-slate-200 dark:border-slate-700 mb-6">
                <button
                    onClick={() => setActiveTab('users')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'users'
                        ? 'border-primary-500 text-primary-600 dark:text-primary-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <User size={18} /> Usuários
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('whatsapp')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'whatsapp'
                        ? 'border-emerald-500 text-emerald-600 dark:text-emerald-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <MessageSquare size={18} /> WhatsApp (Evolution API)
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('feedback')}
                    className={`pb-3 px-4 text-sm font-medium transition-colors border-b-2 ${activeTab === 'feedback'
                        ? 'border-amber-500 text-amber-600 dark:text-amber-400'
                        : 'border-transparent text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-300'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Star size={18} /> Feedback
                    </div>
                </button>
            </div>

            {activeTab === 'whatsapp' && <AdminWhatsApp users={users} />}
            {activeTab === 'feedback' && <AdminFeedback />}

            {activeTab === 'users' && (
                <>
                    {/* Metrics Dashboard */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                        <div className="bg-gradient-to-br from-amber-500 to-orange-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <Clock size={24} />
                                <span className="text-2xl font-bold">{metrics.trial}/50</span>
                            </div>
                            <p className="text-sm text-amber-100">Usuários em Trial</p>
                        </div>

                        <div className="bg-gradient-to-br from-emerald-500 to-green-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <Check size={24} />
                                <span className="text-2xl font-bold">{metrics.active}</span>
                            </div>
                            <p className="text-sm text-emerald-100">Assinaturas Ativas</p>
                        </div>

                        <div className="bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <AlertCircle size={24} />
                                <span className="text-2xl font-bold">{metrics.expiringIn7Days}</span>
                            </div>
                            <p className="text-sm text-orange-100">Expirando em 7 dias</p>
                        </div>

                        <div className="bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl p-5 text-white shadow-lg">
                            <div className="flex items-center justify-between mb-2">
                                <TrendingUp size={24} />
                                <span className="text-2xl font-bold">{metrics.total > 0 ? ((metrics.active / metrics.total) * 100).toFixed(0) : 0}%</span>
                            </div>
                            <p className="text-sm text-indigo-100">Taxa de Conversão</p>
                        </div>
                    </div>

                    {/* Financial Dashboard */}
                    <div className="mb-6 animate-in slide-in-from-bottom-4 duration-700">
                        <div className="flex items-center gap-2 mb-4">
                            <DollarSign className="text-emerald-600 dark:text-emerald-400" />
                            <h3 className="text-xl font-bold text-slate-800 dark:text-white">Previsibilidade Financeira</h3>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:border-emerald-500/50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-emerald-100 dark:bg-emerald-900/30 rounded-lg">
                                        <DollarSign size={20} className="text-emerald-600 dark:text-emerald-400" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">MRR (Receita Mensal)</p>
                                <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.mrr)}
                                </h4>
                            </div>

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:border-blue-500/50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg">
                                        <Activity size={20} className="text-blue-600 dark:text-blue-400" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">ARR (Receita Anual Estimada)</p>
                                <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                    {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(metrics.arr)}
                                </h4>
                            </div>

                            <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-5 shadow-sm hover:border-red-500/50 transition-colors">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="p-2 bg-red-100 dark:bg-red-900/30 rounded-lg">
                                        <AlertCircle size={20} className="text-red-600 dark:text-red-400" />
                                    </div>
                                </div>
                                <p className="text-sm text-slate-500 dark:text-slate-400 font-medium">Ativos expirando (7 dias)</p>
                                <h4 className="text-2xl font-black text-slate-800 dark:text-white mt-1">
                                    {metrics.activeExpiringIn7Days} <span className="text-sm font-normal text-slate-500">usuários</span>
                                </h4>
                            </div>
                        </div>

                        {/* Plan Distribution Chart */}
                        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-2xl p-6 shadow-sm mb-6 hover:shadow-md transition-shadow">
                            <div className="flex items-center gap-2 mb-6">
                                <PieChartIcon className="text-indigo-600 dark:text-indigo-400" size={20} />
                                <h4 className="text-lg font-bold text-slate-800 dark:text-white">Distribuição de Planos Ativos</h4>
                            </div>
                            
                            {pieData.length > 0 ? (
                                <div className="h-64 w-full">
                                    <ResponsiveContainer width="100%" height="100%">
                                        <PieChart>
                                            <Pie
                                                data={pieData}
                                                cx="50%"
                                                cy="50%"
                                                innerRadius={70}
                                                outerRadius={90}
                                                paddingAngle={5}
                                                dataKey="value"
                                            >
                                                {pieData.map((entry, index) => (
                                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                                ))}
                                            </Pie>
                                            <Tooltip 
                                                formatter={(value) => [`${value} usuário(s)`, 'Quantidade']}
                                                contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                                            />
                                            <Legend verticalAlign="bottom" height={36} iconType="circle" />
                                        </PieChart>
                                    </ResponsiveContainer>
                                </div>
                            ) : (
                                <div className="h-32 flex items-center justify-center text-slate-500 dark:text-slate-400 text-sm">
                                    Nenhum plano ativo encontrado.
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Sync Button */}
                    <div className="mb-6">
                        <button
                            onClick={handleSyncPayments}
                            disabled={syncing}
                            className="bg-indigo-600 text-white px-6 py-3 rounded-xl font-medium hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            <RefreshCw size={20} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Sincronizando...' : 'Sincronizar Pagamentos'}
                        </button>
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-2">
                            Sincroniza pagamentos confirmados do Google Sheets e ativa usuários automaticamente
                        </p>
                    </div>

                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-semibold">
                                    <tr>
                                        <th className="p-4">Usuário</th>
                                        <th className="p-4">Status</th>
                                        <th className="p-4">Plano</th>
                                        <th className="p-4">Dias Restantes</th>
                                        <th className="p-4">Função</th>
                                        <th className="p-4">Data Cadastro</th>
                                        <th className="p-4 text-right">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                                    {loading ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-500">
                                                <div className="flex justify-center items-center gap-2">
                                                    <Loader2 className="animate-spin" size={20} />
                                                    Carregando usuários...
                                                </div>
                                            </td>
                                        </tr>
                                    ) : filteredUsers.length === 0 ? (
                                        <tr>
                                            <td colSpan={7} className="p-8 text-center text-slate-500">
                                                Nenhum usuário encontrado.
                                            </td>
                                        </tr>
                                    ) : (
                                        filteredUsers.map(user => (
                                            <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                                <td className="p-4">
                                                    <div className="font-medium text-slate-800 dark:text-white flex items-center gap-2">
                                                        <User size={16} className="text-slate-400" />
                                                        {user.email}
                                                    </div>
                                                    <div className="text-xs text-slate-400 mt-0.5 font-mono ml-6">ID: {user.id.slice(0, 8)}...</div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold
                                                ${user.status === 'active' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' :
                                                            user.status === 'blocked' ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' :
                                                                user.status === 'trial' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400' :
                                                                    user.status === 'expired' ? 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400' :
                                                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                                            `}>
                                                        <span className={`w-1.5 h-1.5 rounded-full 
                                                    ${user.status === 'active' ? 'bg-emerald-500' :
                                                                user.status === 'blocked' ? 'bg-red-500' :
                                                                    user.status === 'trial' ? 'bg-blue-500' :
                                                                        user.status === 'expired' ? 'bg-gray-500' :
                                                                            'bg-amber-500'}
                                                `}></span>
                                                        {user.status === 'active' ? 'Ativo' :
                                                            user.status === 'blocked' ? 'Bloqueado' :
                                                                user.status === 'trial' ? 'Trial' :
                                                                    user.status === 'expired' ? 'Expirado' : 'Pendente'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-slate-600 dark:text-slate-300 capitalize">
                                                        {user.plan === 'annual' ? 'Anual' : 
                                                         user.plan === 'monthly' ? 'Mensal' : 
                                                         user.plan === 'basic' ? 'Basic' : 
                                                         user.plan === 'trial' ? 'Trial' : '-'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    {user.status === 'trial' && user.trialEndsAt ? (
                                                        (() => {
                                                            const trialEnd = user.trialEndsAt.toDate ? user.trialEndsAt.toDate() : new Date(user.trialEndsAt);
                                                            const daysLeft = differenceInDays(trialEnd, new Date());
                                                            return (
                                                                <span className={`font-medium ${daysLeft <= 3 ? 'text-red-600' :
                                                                    daysLeft <= 7 ? 'text-amber-600' :
                                                                        'text-blue-600'
                                                                    }`}>
                                                                    {daysLeft < 0 ? 'Expirado' : `${daysLeft} dias`}
                                                                </span>
                                                            );
                                                        })()
                                                    ) : user.status === 'active' && user.subscriptionEndsAt ? (
                                                        (() => {
                                                            const subEnd = user.subscriptionEndsAt.toDate ? user.subscriptionEndsAt.toDate() : new Date(user.subscriptionEndsAt);
                                                            const daysLeft = differenceInDays(subEnd, new Date());
                                                            return (
                                                                <span className="text-emerald-600 font-medium">
                                                                    {daysLeft} dias
                                                                </span>
                                                            );
                                                        })()
                                                    ) : (
                                                        <span className="text-slate-400">-</span>
                                                    )}
                                                </td>
                                                <td className="p-4">
                                                    <span className="text-slate-600 dark:text-slate-300 capitalize">{user.role}</span>
                                                </td>
                                                <td className="p-4 text-slate-500">
                                                    {(user.createdAt as Timestamp)?.toDate ? format((user.createdAt as Timestamp).toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                                                </td>
                                                <td className="p-4 text-right">
                                                    <div className="flex items-center justify-end gap-2">
                                                        <button
                                                            onClick={() => setEditingUser(user)}
                                                            title="Editar Plano/Acesso"
                                                            className="p-2 bg-indigo-50 text-indigo-600 hover:bg-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-400 dark:hover:bg-indigo-800/40 rounded-lg transition-colors border border-indigo-100 dark:border-indigo-800/50"
                                                        >
                                                            <Edit3 size={18} />
                                                        </button>
                                                        {user.role !== 'admin' && ( // Don't block admins
                                                            <>
                                                                {user.status !== 'active' && (
                                                                    <button
                                                                        onClick={() => handleStatusChange(user.id, 'active')}
                                                                        title="Aprovar"
                                                                        className="p-2 bg-emerald-100 text-emerald-600 hover:bg-emerald-200 rounded-lg transition-colors"
                                                                    >
                                                                        <Check size={18} />
                                                                    </button>
                                                                )}
                                                                {user.status !== 'blocked' && (
                                                                    <button
                                                                        onClick={() => handleStatusChange(user.id, 'blocked')}
                                                                        title="Bloquear"
                                                                        className="p-2 bg-red-100 text-red-600 hover:bg-red-200 rounded-lg transition-colors"
                                                                    >
                                                                        <X size={18} />
                                                                    </button>
                                                                )}
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Edit Plan Modal */}
                    {editingUser && (
                        <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                            <div className="bg-white dark:bg-slate-800 rounded-2xl w-full max-w-md shadow-2xl p-6 border border-slate-200 dark:border-slate-700">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-xl font-bold text-slate-800 dark:text-white flex items-center gap-2">
                                            <Shield className="text-indigo-600 dark:text-indigo-400" />
                                            Gerenciar Acesso
                                        </h3>
                                        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{editingUser.email}</p>
                                    </div>
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 p-2"
                                    >
                                        <X size={20} />
                                    </button>
                                </div>

                                <div className="space-y-4">
                                    <div>
                                        <label className="block text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300 mb-2">Plano Atual</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                                            value={editingUser.plan || 'trial'}
                                            onChange={(e) => setEditingUser({ ...editingUser, plan: e.target.value as UserData['plan'] })}
                                        >
                                            <option value="trial">Trial (Teste)</option>
                                            <option value="basic">Basic</option>
                                            <option value="monthly">Mensal</option>
                                            <option value="annual">Anual</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300 mb-2">Status da Conta</label>
                                        <select
                                            className="w-full bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-white rounded-xl px-4 py-3 focus:ring-2 focus:ring-indigo-500"
                                            value={editingUser.status}
                                            onChange={(e) => setEditingUser({ ...editingUser, status: e.target.value as UserData['status'] })}
                                        >
                                            <option value="trial">Trial</option>
                                            <option value="active">Ativo (Pago)</option>
                                            <option value="expired">Expirado</option>
                                            <option value="blocked">Bloqueado</option>
                                            <option value="pending">Pendente</option>
                                        </select>
                                    </div>

                                    <div className="pt-2">
                                        <label className="block text-sm font-semibold tracking-wide text-slate-600 dark:text-slate-300 mb-3">Estender Data de Acesso</label>
                                        <div className="grid grid-cols-3 gap-2">
                                            {[15, 30, 45].map(days => (
                                                <button
                                                    key={days}
                                                    type="button"
                                                    onClick={() => {
                                                        const field = editingUser.status === 'trial' ? 'trialEndsAt' : 'subscriptionEndsAt';
                                                        const currentVal = editingUser[field];
                                                        
                                                        let baseDate = new Date();
                                                        if (currentVal) {
                                                            const existingDate = currentVal.toDate ? currentVal.toDate() : new Date(currentVal);
                                                            if (existingDate > baseDate) {
                                                                baseDate = existingDate;
                                                            }
                                                        }
                                                        
                                                        const newDate = addDays(baseDate, days);
                                                        setEditingUser({
                                                            ...editingUser,
                                                            [field]: Timestamp.fromDate(newDate)
                                                        });
                                                    }}
                                                    className="py-2.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-400 dark:hover:bg-emerald-900/40 rounded-xl text-sm font-bold border border-emerald-200 dark:border-emerald-800 transition-colors"
                                                >
                                                    +{days} Dias
                                                </button>
                                            ))}
                                        </div>
                                        <p className="text-xs text-slate-500 mt-2">
                                            Vencimento configurado:{' '}
                                            <span className="font-semibold text-slate-700 dark:text-slate-300">
                                                {(() => {
                                                    const f = editingUser.status === 'trial' ? editingUser.trialEndsAt : editingUser.subscriptionEndsAt;
                                                    if (!f) return 'Nenhuma';
                                                    const d = f.toDate ? f.toDate() : new Date(f);
                                                    return format(d, 'dd/MM/yyyy');
                                                })()}
                                            </span>
                                        </p>
                                    </div>
                                </div>

                                <div className="mt-8 flex gap-3">
                                    <button
                                        onClick={() => setEditingUser(null)}
                                        className="flex-1 px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-300 dark:hover:bg-slate-600 rounded-xl font-medium transition-colors"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        onClick={() => handleUpdatePlan(editingUser.id, editingUser)}
                                        disabled={isUpdatingPlan}
                                        className="flex-1 px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-medium transition-colors flex justify-center items-center gap-2"
                                    >
                                        {isUpdatingPlan ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
                                        Salvar Manual
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

function AdminWhatsApp({ users }: { users: UserData[] }) {
    const [config, setConfig] = useState<WhatsAppConfig | null>(null);
    const [loadingConfig, setLoadingConfig] = useState(true);
    const [qrCode, setQrCode] = useState<string | null>(null);
    const [isCreating, setIsCreating] = useState(false);
    const [isLoadingQR, setIsLoadingQR] = useState(false);
    const [isCheckingStatus, setIsCheckingStatus] = useState(false);

    // Testing
    const [testPhone, setTestPhone] = useState('');
    const [testMessage, setTestMessage] = useState('Olá! Esta é uma mensagem de teste do sistema Gestão Financeira.');
    const [isTesting, setIsTesting] = useState(false);

    // Broadcast
    const [broadcastMessage, setBroadcastMessage] = useState('');
    const [isBroadcasting, setIsBroadcasting] = useState(false);

    // Config form
    const [formBaseUrl, setFormBaseUrl] = useState('');
    const [formApiKey, setFormApiKey] = useState('');
    const [formInstanceName, setFormInstanceName] = useState('');
    const [isSavingConfig, setIsSavingConfig] = useState(false);
    const [isRestarting, setIsRestarting] = useState(false);

    useEffect(() => {
        const unsubscribe = subscribeWhatsAppConfig((data) => {
            setConfig(data);
            if (!config) { // Set form initially
                setFormBaseUrl(data.baseUrl);
                setFormApiKey(data.apiKey);
                setFormInstanceName(data.instanceName);
            }
            setLoadingConfig(false);
        });
        return () => unsubscribe();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleRestartInstance = async () => {
        if (!confirm('Tem certeza? Isso irá apagar a instância atual na Evolution API e exigirá a leitura de um novo QR Code.')) return;
        setIsRestarting(true);
        try {
            await deleteWhatsAppInstance();
            setQrCode(null);
            alert('Instância apagada com sucesso. Você pode criar uma nova agora.');
        } catch (err) { const error = err as Error;
            console.error(error);
            alert('Erro ao apagar instância: ' + error.message);
        } finally {
            setIsRestarting(false);
        }
    };

    const handleSaveConfig = async () => {
        if (!formBaseUrl || !formApiKey || !formInstanceName) return alert('Preencha os campos obrigatórios!');
        setIsSavingConfig(true);

        let safeUrl = formBaseUrl.trim();
        // Corrige casos de erro comum: 'https://https://...'
        if (safeUrl.startsWith('https://https://')) {
            safeUrl = safeUrl.replace('https://https://', 'https://');
        } else if (safeUrl.startsWith('http://https://')) {
            safeUrl = safeUrl.replace('http://https://', 'https://');
        }

        try {
            // Garante que a URL tenha um protocolo
            if (!safeUrl.includes('://')) {
                safeUrl = 'https://' + safeUrl;
            }

            await saveWhatsAppConfig({
                baseUrl: safeUrl,
                apiKey: formApiKey,
                instanceName: formInstanceName,
                enabled: true
            });
            alert('Configuração salva com sucesso!');
        } catch (error) {
            console.error(error);
            alert('Erro ao salvar configuração.');
        } finally {
            setIsSavingConfig(false);
        }
    };

    const handleCreateInstance = async () => {
        if (!config?.baseUrl || !config?.apiKey || !config?.instanceName) {
            return alert('Salve as configurações primeiro!');
        }
        setIsCreating(true);
        try {
            await createWhatsAppInstance();
            alert('Instância criada (ou já existia). O status será atualizado.');
            handleCheckStatus();
        } catch (err) { const error = err as Error;
            alert('Erro: ' + error.message);
        } finally {
            setIsCreating(false);
        }
    };

    const handleGetQR = async () => {
        setIsLoadingQR(true);
        setQrCode(null);
        try {
            const data = await getWhatsAppQRCode();
            if (data && data.base64) {
                setQrCode(data.base64);
            } else {
                alert('QR Code não retornado. Verifique se a instância já está conectada ou se houve erro.');
                handleCheckStatus();
            }
        } catch (err) { const error = err as Error;
            alert('Erro: ' + error.message);
        } finally {
            setIsLoadingQR(false);
        }
    };

    // Polling do status e do QR Code
    useEffect(() => {
        let qrInterval: ReturnType<typeof setInterval>;
        let statusInterval: ReturnType<typeof setInterval>;
        
        const currentlyConnected = config?.status === 'open';

        // Se tem QR Code e não está conectado, monitora o status mais de perto
        if (qrCode && !currentlyConnected) {
            // Polling de STATUS (rápido - 5s) para detectar a conexão assim que o usuário ler
            statusInterval = setInterval(async () => {
                await handleCheckStatus();
            }, 5000);

            // Polling do QR CODE (lento - 40s) apenas para não deixar expirar
            qrInterval = setInterval(async () => {
                try {
                    const data = await getWhatsAppQRCode();
                    if (data && data.base64) {
                        setQrCode(data.base64);
                    }
                } catch (e) {
                    console.error('Erro no polling do QR Code', e);
                }
            }, 40000);
        }

        // Se conectou, limpa o QR Code imediatamente
        if (currentlyConnected && qrCode) {
            setQrCode(null);
        }

        return () => {
            if (qrInterval) clearInterval(qrInterval);
            if (statusInterval) clearInterval(statusInterval);
        };
    }, [qrCode, config?.status]);

    const handleCheckStatus = async () => {
        setIsCheckingStatus(true);
        try {
            const state = await checkWhatsAppStatus();
            if (state === 'open') {
                setQrCode(null);
            }
            // State is also updated in Firestore by the Cloud Function
        } catch (err) { const error = err as Error;
            alert('Erro: ' + error.message);
        } finally {
            setIsCheckingStatus(false);
        }
    };

    const handleSendTest = async () => {
        if (!testPhone || !testMessage) return alert('Preencha os campos');
        setIsTesting(true);
        try {
            await sendWhatsAppTest(testPhone, testMessage);
            alert('Enviado com sucesso!');
        } catch (err) { const error = err as Error;
            alert('Erro: ' + error.message);
        } finally {
            setIsTesting(false);
        }
    };

    const handleBroadcast = async () => {
        if (!broadcastMessage) return alert('Insira uma mensagem!');
        const confirmResult = window.confirm(`Atenção: Isso enviará a mensagem para TODOS os usuários ativos com número (${usersWithPhone} pessoas). Continuar?`);
        if (!confirmResult) return;

        setIsBroadcasting(true);
        try {
            const res = await sendWhatsAppBroadcast(broadcastMessage);
            alert(`Broadcast finalizado! Resultados: ${res.data?.results?.length || 0} enviados.`);
            setBroadcastMessage('');
        } catch (err) { const error = err as Error;
            alert('Erro: ' + error.message);
        } finally {
            setIsBroadcasting(false);
        }
    };

    if (loadingConfig) {
        return <div className="p-8 text-center text-slate-500"><Loader2 className="animate-spin mx-auto mb-2" />Carregando configurações...</div>;
    }

    const isConnected = config?.status === 'open';
    const usersWithPhone = users.filter(u => u.phone && u.status === 'active').length;

    return (
        <div className="space-y-6">
            {/* Sec 1: Instância */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                <div className="flex items-center justify-between mb-4">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                        <Settings className="text-emerald-500" /> API de Conexão
                    </h3>
                    <div className={`px-3 py-1 text-xs font-bold rounded-full ${isConnected ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                        }`}>
                        Status: {config?.status === 'open' ? 'Conectado ✅' : config?.status || 'Desconectado'}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Base URL (Cloudfy)</label>
                        <input type="text" value={formBaseUrl} onChange={e => setFormBaseUrl(e.target.value)} placeholder="https://..." className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Global API Key</label>
                        <input type="password" value={formApiKey} onChange={e => setFormApiKey(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
                    </div>
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Nome da Instância</label>
                        <input type="text" value={formInstanceName} onChange={e => setFormInstanceName(e.target.value)} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
                    </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                    <button onClick={handleSaveConfig} disabled={isSavingConfig} className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors disabled:opacity-50">
                        {isSavingConfig ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />} Salvar Configuração
                    </button>
                    <button onClick={handleCreateInstance} disabled={isCreating} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                        {isCreating ? <Loader2 size={16} className="animate-spin" /> : <Settings size={16} />} 1. Criar Instância
                    </button>
                    {!isConnected && (
                        <button onClick={handleGetQR} disabled={isLoadingQR} className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors dark:bg-blue-900/30 dark:text-blue-400 disabled:opacity-50">
                            {isLoadingQR ? <Loader2 size={16} className="animate-spin" /> : <QrCode size={16} />} 2. Ver QR Code (Atualiza a cada 40s)
                        </button>
                    )}
                    <button onClick={handleCheckStatus} disabled={isCheckingStatus} className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors dark:bg-slate-700 dark:text-slate-200 dark:hover:bg-slate-600 disabled:opacity-50">
                        {isCheckingStatus ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />} 3. Verificar Status
                    </button>

                    {config?.status && config.status !== 'disconnected' && (
                        <button onClick={handleRestartInstance} disabled={isRestarting} className="bg-red-50 hover:bg-red-100 text-red-600 px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-2 transition-colors dark:bg-red-900/20 dark:text-red-400 disabled:opacity-50 ml-auto border border-red-100 dark:border-red-900/30">
                            {isRestarting ? <Loader2 size={16} className="animate-spin" /> : <X size={16} />} Apagar Instância
                        </button>
                    )}
                </div>

                {qrCode && !isConnected && (
                    <div className="mt-6 p-4 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-center relative">
                        <p className="text-sm text-slate-500 mb-3">Escaneie o QR Code abaixo com seu WhatsApp para conectar.</p>
                        <p className="text-xs text-blue-600 font-medium mb-2 animate-pulse">Iniciando auto-atualização para evitar expiração...</p>
                        <img src={qrCode} alt="WhatsApp QR Code" className="w-64 h-64 mx-auto rounded-lg shadow-sm" />
                    </div>
                )}
            </div>

            {/* Sec 2 & 3: Envio de Mensagens */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

                {/* Teste */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2 mb-4">
                        <Smartphone className="text-blue-500" /> Teste Individual
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Número (com DDD)</label>
                            <input type="text" value={testPhone} onChange={e => setTestPhone(e.target.value)} placeholder="Ex: 556299999999" className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-900 dark:text-white" />
                        </div>
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mensagem</label>
                            <textarea value={testMessage} onChange={e => setTestMessage(e.target.value)} rows={3} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl resize-none text-slate-900 dark:text-white"></textarea>
                        </div>
                        <button onClick={handleSendTest} disabled={isTesting || !isConnected} className="w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed">
                            {isTesting ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />} Enviar Teste
                        </button>
                    </div>
                </div>

                {/* Broadcast */}
                <div className="bg-white dark:bg-slate-800 rounded-2xl p-6 border border-slate-200 dark:border-slate-700 shadow-sm border-t-4 border-t-red-500">
                    <div className="flex items-start justify-between mb-4">
                        <div>
                            <h3 className="font-bold text-lg text-slate-800 dark:text-white flex items-center gap-2">
                                <Send className="text-red-500" /> Broadcast Geral
                            </h3>
                            <p className="text-xs text-slate-500 mt-1">Envie para todos os <strong className="text-emerald-500">{usersWithPhone}</strong> usuários ativos com telefone.</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1">Mensagem (Suporta *negrito* etc)</label>
                            <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)} rows={4} className="w-full px-4 py-2 bg-slate-50 dark:bg-slate-700/50 border border-slate-200 dark:border-slate-600 rounded-xl resize-none text-slate-900 dark:text-white" placeholder="Digite o aviso geral..."></textarea>
                        </div>
                        <button onClick={handleBroadcast} disabled={isBroadcasting || !isConnected} className="w-full bg-red-600 hover:bg-red-700 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm shadow-red-500/20">
                            {isBroadcasting ? <Loader2 size={18} className="animate-spin" /> : <AlertCircle size={18} />} Enviar para Todos
                        </button>
                    </div>
                </div>

            </div>
        </div>
    );
}

interface FeedbackData {
    id: string;
    rating: number;
    comment: string;
    userEmail: string;
    userId: string;
    createdAt: Timestamp | { toDate: () => Date } | string;
    platform: string;
}

function AdminFeedback() {
    const [feedbacks, setFeedbacks] = useState<FeedbackData[]>([]);
    const [loading, setLoading] = useState(true);

    const fetchFeedback = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'app_feedback'), orderBy('createdAt', 'desc'));
            const snapshot = await getDocs(q);
            const list = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as FeedbackData));
            setFeedbacks(list);
        } catch (error) {
            console.error("Error fetching feedback:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchFeedback();
    }, []);

    return (
        <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
            <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                <h3 className="font-bold text-lg text-slate-800 dark:text-white">Avaliações do Aplicativo</h3>
                <button
                    onClick={fetchFeedback}
                    className="p-2 text-slate-500 hover:text-indigo-600 transition-colors"
                    title="Atualizar"
                >
                    <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                </button>
            </div>

            <div className="overflow-x-auto">
                <table className="w-full text-left">
                    <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-semibold">
                        <tr>
                            <th className="p-4">Avaliação</th>
                            <th className="p-4">Usuário</th>
                            <th className="p-4">Data</th>
                            <th className="p-4">Comentário</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                        {loading ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    <div className="flex justify-center items-center gap-2">
                                        <Loader2 className="animate-spin" size={20} />
                                        Carregando avaliações...
                                    </div>
                                </td>
                            </tr>
                        ) : feedbacks.length === 0 ? (
                            <tr>
                                <td colSpan={4} className="p-8 text-center text-slate-500">
                                    Nenhuma avaliação encontrada.
                                </td>
                            </tr>
                        ) : (
                            feedbacks.map(item => (
                                <tr key={item.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                                    <td className="p-4">
                                        <div className="flex items-center gap-1">
                                            {[1, 2, 3, 4, 5].map((star) => (
                                                <Star
                                                    key={star}
                                                    size={16}
                                                    className={star <= item.rating ? "fill-amber-400 text-amber-400" : "text-slate-300"}
                                                />
                                            ))}
                                            <span className="ml-1 font-bold text-slate-700 dark:text-slate-200">{item.rating}</span>
                                        </div>
                                    </td>
                                    <td className="p-4">
                                        <div className="font-medium text-slate-800 dark:text-white">{item.userEmail}</div>
                                        <div className="text-xs text-slate-400">ID: {item.userId.slice(0, 8)}...</div>
                                    </td>
                                    <td className="p-4 text-slate-500 whitespace-nowrap">
                                        {(item.createdAt as Timestamp)?.toDate ? format((item.createdAt as Timestamp).toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                                    </td>
                                    <td className="p-4">
                                        <p className="text-slate-600 dark:text-slate-300 max-w-md break-words">
                                            {item.comment || <span className="italic text-slate-400">Sem comentário</span>}
                                        </p>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
