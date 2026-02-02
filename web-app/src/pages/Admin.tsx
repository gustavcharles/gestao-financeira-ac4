import { useEffect, useState } from 'react';
import { collection, getDocs, updateDoc, doc, orderBy, query } from 'firebase/firestore'; // Removed onSnapshot for simplicity first, or stick to getDocs
import { db } from '../services/firebase';
import type { UserProfile } from '../contexts/AuthContext';
import { Check, X, Shield, User, Search, Loader2 } from 'lucide-react';
import { format } from 'date-fns';

interface UserData extends UserProfile {
    id: string;
    createdAt?: any;
}

export const Admin = () => {
    const [users, setUsers] = useState<UserData[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');

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

    const handleStatusChange = async (userId: string, newStatus: 'active' | 'blocked' | 'pending') => {
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

            <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-slate-50 dark:bg-slate-700/50 text-slate-500 dark:text-slate-400 text-sm font-semibold">
                            <tr>
                                <th className="p-4">Usuário</th>
                                <th className="p-4">Status</th>
                                <th className="p-4">Função</th>
                                <th className="p-4">Data Cadastro</th>
                                <th className="p-4 text-right">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-700 text-sm">
                            {loading ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
                                        <div className="flex justify-center items-center gap-2">
                                            <Loader2 className="animate-spin" size={20} />
                                            Carregando usuários...
                                        </div>
                                    </td>
                                </tr>
                            ) : filteredUsers.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="p-8 text-center text-slate-500">
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
                                                        'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'}
                                            `}>
                                                <span className={`w-1.5 h-1.5 rounded-full 
                                                    ${user.status === 'active' ? 'bg-emerald-500' :
                                                        user.status === 'blocked' ? 'bg-red-500' :
                                                            'bg-amber-500'}
                                                `}></span>
                                                {user.status === 'active' ? 'Ativo' :
                                                    user.status === 'blocked' ? 'Bloqueado' : 'Pendente'}
                                            </span>
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
