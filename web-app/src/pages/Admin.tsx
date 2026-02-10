import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore'; // Removed onSnapshot for simplicity first, or stick to getDocs
import { db } from '../services/firebase';
import type { UserProfile } from '../contexts/AuthContext';
import { Check, X, Shield, User, Search, Loader2, RefreshCw, Clock, TrendingUp, AlertCircle } from 'lucide-react';
import { format, differenceInDays } from 'date-fns';
import { syncPaymentsFromSheets } from '../services/sheetsSync';

interface UserData extends UserProfile {
    id: string;
    createdAt?: any;
}

export const Admin = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [syncing, setSyncing] = useState(false);

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

        } catch (error: any) {
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
    const metrics = {
        total: users.length,
        trial: users.filter(u => u.status === 'trial').length,
        active: users.filter(u => u.status === 'active').length,
        expired: users.filter(u => u.status === 'expired').length,
        expiringIn7Days: users.filter(u => {
            if (!u.trialEndsAt || u.status !== 'trial') return false;
            const trialEnd = u.trialEndsAt.toDate ? u.trialEndsAt.toDate() : new Date(u.trialEndsAt);
            const daysLeft = differenceInDays(trialEnd, new Date());
            return daysLeft >= 0 && daysLeft <= 7;
        }).length,
    };

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
                                                {user.plan === 'annual' ? 'Anual' : user.plan === 'trial' ? 'Trial' : '-'}
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
                                            {user.createdAt?.toDate ? format(user.createdAt.toDate(), 'dd/MM/yyyy HH:mm') : '-'}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
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
        </div>
    );
};
