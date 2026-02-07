import React, { useState, useMemo } from 'react';
import { useTransactions } from '../hooks/useTransactions';
import { TransactionForm } from '../components/transactions/TransactionForm';
import { addTransaction, updateTransaction, deleteTransaction } from '../services/transactions';
import { formatCurrency, getMonthFromDate } from '../utils/finance';
import type { Transaction } from '../utils/finance';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { generateTransactionReport } from '../utils/report';

import {
    Plus,
    Search,
    Trash2,
    Edit2,
    TrendingUp,
    TrendingDown,
    CheckCircle2,
    Copy,
    FileText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { ConfirmModal } from '../components/ui/ConfirmModal';

import { useLocation } from 'react-router-dom';

interface TransactionsProps {
    defaultType?: 'Todos' | 'Receita' | 'Despesa';
}

export const Transactions: React.FC<TransactionsProps> = ({ defaultType = 'Todos' }) => {

    const { transactions, loading } = useTransactions();
    const { currentUser } = useAuth();
    const location = useLocation();

    const [searchTerm, setSearchTerm] = useState('');
    const [typeFilter, setTypeFilter] = useState<'Todos' | 'Receita' | 'Despesa'>(defaultType);
    const [monthFilter, setMonthFilter] = useState<string>('Todos'); // "Todos" or "Janeiro 2026"
    const [sortOrder, setSortOrder] = useState<'desc' | 'asc'>('desc'); // 'desc' = Newest first

    const [isFormOpen, setIsFormOpen] = useState(false);
    const [editingItem, setEditingItem] = useState<Transaction | null>(null);

    // Deletion State
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    const [itemToDelete, setItemToDelete] = useState<string | null>(null);

    // Month Options - Sorted chronologically
    const months = useMemo(() => {
        const uniqueMonths = Array.from(new Set(transactions.map(t => t.mes_referencia)));

        // Sort months chronologically (Janeiro 2026, Fevereiro 2026, etc.)
        return uniqueMonths.sort((a, b) => {
            // Parse "Mês Ano" format (e.g., "Janeiro 2026")
            const monthNames = [
                'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
                'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
            ];

            const [monthA, yearA] = a.split(' ');
            const [monthB, yearB] = b.split(' ');

            const yearDiff = parseInt(yearB) - parseInt(yearA);
            if (yearDiff !== 0) return yearDiff; // Sort by year first (descending)

            // Then by month (descending within same year)
            return monthNames.indexOf(monthB) - monthNames.indexOf(monthA);
        });
    }, [transactions]);

    // Sync type filter when prop changes
    React.useEffect(() => {
        if (defaultType) setTypeFilter(defaultType);
    }, [defaultType]);

    // Check if we are on the 'novo' route
    React.useEffect(() => {
        if (location.pathname.includes('/novo')) {
            setIsFormOpen(true);
        }
    }, [location]);

    // Initialize month filter to current
    React.useEffect(() => {
        if (monthFilter === 'Todos' && months.length > 0) {
            const current = getMonthFromDate(new Date());
            if (months.includes(current)) setMonthFilter(current);
        }
    }, [months]);

    const filtered = useMemo(() => {
        return transactions.filter(t => {
            const matchSearch = t.descricao.toLowerCase().includes(searchTerm.toLowerCase()) ||
                t.categoria.toLowerCase().includes(searchTerm.toLowerCase());
            const matchType = typeFilter === 'Todos' || t.tipo === typeFilter;
            const matchMonth = monthFilter === 'Todos' || t.mes_referencia === monthFilter;

            return matchSearch && matchType && matchMonth;
        }).sort((a, b) => {
            if (sortOrder === 'desc') {
                return b.data.localeCompare(a.data);
            } else {
                return a.data.localeCompare(b.data);
            }
        });
    }, [transactions, searchTerm, typeFilter, monthFilter, sortOrder]);

    const handleSave = async (data: Omit<Transaction, 'id'>) => {
        if (editingItem && editingItem.id) {
            await updateTransaction(editingItem.id, data);
        } else {
            await addTransaction(data);
        }
    };

    const handleEdit = (item: Transaction) => {
        setEditingItem(item);
        setIsFormOpen(true);
    };

    const handleExport = () => {
        const title = monthFilter === 'Todos'
            ? `Relatório-${typeFilter}-${new Date().getFullYear()}`
            : `Relatório-${monthFilter}`;

        generateTransactionReport(filtered, title);
    };

    const handleDuplicate = (item: Transaction) => {
        // Create a copy without the ID to treat as new
        const copy = { ...item };
        delete (copy as any).id;
        setEditingItem(copy);
        setIsFormOpen(true);
    };

    const requestDelete = (id: string) => {
        setItemToDelete(id);
        setIsDeleteModalOpen(true);
    };

    const confirmDelete = async () => {
        if (itemToDelete) {
            await deleteTransaction(itemToDelete);
            setIsDeleteModalOpen(false);
            setItemToDelete(null);
        }
    };

    const toggleStatus = async (item: Transaction) => {
        if (!item.id) return;
        const newStatus = item.status === 'Pendente'
            ? (item.tipo === 'Receita' ? 'Recebido' : 'Pago')
            : 'Pendente';
        await updateTransaction(item.id, { status: newStatus });
    };

    const openNew = () => {
        setEditingItem(null);
        setIsFormOpen(true);
    };

    if (loading) return <div className="p-10 text-center">Carregando...</div>;

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 dark:text-white">Transações</h2>
                    <p className="text-slate-500 dark:text-slate-400">Gerencie suas receitas e despesas</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleExport}
                        className="bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 px-4 py-2.5 rounded-xl font-medium hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors flex items-center gap-2"
                        title="Exportar Relatório PDF"
                    >
                        <FileText size={20} />
                        <span className="hidden md:inline">Exportar</span>
                    </button>
                    <button
                        onClick={openNew}
                        className="bg-primary-600 text-white px-5 py-2.5 rounded-xl font-medium shadow-lg shadow-primary-200 hover:bg-primary-700 transition-colors flex items-center gap-2"
                    >
                        <Plus size={20} />
                        <span className="hidden md:inline">Nova Transação</span>
                    </button>
                </div>
            </div>

            {/* Filters Bar */}
            <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm flex flex-col md:flex-row gap-4 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 text-slate-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por descrição ou categoria..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 dark:text-white dark:placeholder-slate-400"
                    />
                </div>

                <div className="flex gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
                    <select
                        value={sortOrder}
                        onChange={(e) => setSortOrder(e.target.value as 'asc' | 'desc')}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="desc">Mais Recentes</option>
                        <option value="asc">Mais Antigas</option>
                    </select>

                    <select
                        value={monthFilter}
                        onChange={(e) => setMonthFilter(e.target.value)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="Todos">Todos os meses</option>
                        {months.map(m => <option key={m} value={m}>{m}</option>)}
                    </select>

                    <select
                        value={typeFilter}
                        onChange={(e) => setTypeFilter(e.target.value as any)}
                        className="px-4 py-2 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-primary-500"
                    >
                        <option value="Todos">Todos os tipos</option>
                        <option value="Receita">Receitas</option>
                        <option value="Despesa">Despesas</option>
                    </select>
                </div>
            </div>

            {/* List */}
            <div className="space-y-3">
                {filtered.length === 0 ? (
                    <div className="text-center py-10 text-slate-400">
                        Nenhuma transação encontrada.
                    </div>
                ) : (
                    filtered.map((item) => {
                        const isRec = item.tipo === 'Receita';
                        const dateObj = parseISO(item.data);
                        const isFinished = item.status === 'Pago' || item.status === 'Recebido';

                        return (
                            <div key={item.id} className="group bg-white dark:bg-slate-800 p-4 rounded-2xl border border-slate-100 dark:border-slate-700 hover:border-primary-100 dark:hover:border-primary-900 hover:shadow-md transition-all flex flex-col md:flex-row md:items-center gap-4">
                                {/* Date & Info */}
                                <div className="flex items-center gap-4 flex-1 w-full">
                                    {/* Date Box */}
                                    <div className="flex-shrink-0 w-14 h-14 bg-slate-50 dark:bg-slate-700 rounded-xl flex flex-col items-center justify-center text-slate-600 dark:text-slate-300 font-bold border border-slate-100 dark:border-slate-600">
                                        {!isNaN(dateObj.getTime()) ? (
                                            <>
                                                <span className="text-xs uppercase text-primary-500 font-bold">{format(dateObj, 'MMM', { locale: ptBR })}</span>
                                                <span className="text-lg leading-none text-slate-600 dark:text-slate-300">{format(dateObj, 'dd')}</span>
                                            </>
                                        ) : (
                                            <span className="text-xs text-red-500">Erro</span>
                                        )}
                                    </div>

                                    {/* Info */}
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-semibold text-slate-900 dark:text-white truncate">{item.descricao}</h4>
                                        <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                                            <span className={`flex items-center gap-1 ${isRec ? 'text-emerald-600' : 'text-slate-500'}`}>
                                                {isRec ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                                                {item.categoria}
                                            </span>
                                            <span className="hidden xs:inline">•</span>
                                            <span className={`px-2 py-0.5 rounded-full ${isFinished
                                                ? 'bg-emerald-100 text-emerald-700'
                                                : 'bg-amber-100 text-amber-700'
                                                }`}>
                                                {item.status}
                                            </span>
                                            {item.recorrente && <span className="text-primary-500 font-medium">↺ Recorrente</span>}
                                        </div>
                                    </div>
                                </div>

                                {/* Value & Actions */}
                                <div className="flex flex-row md:flex-col items-center md:items-end justify-between md:justify-center w-full md:w-auto gap-4 md:gap-2 border-t border-slate-100 dark:border-slate-700 md:border-none pt-3 md:pt-0 mt-1 md:mt-0">
                                    <div className={`font-bold text-lg md:text-base order-2 md:order-1 ${isRec ? 'text-emerald-600' : 'text-red-500'}`}>
                                        {isRec ? '+' : '-'} {formatCurrency(item.valor)}
                                    </div>
                                    <div className="flex gap-1 md:gap-2 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity order-1 md:order-2">
                                        <button
                                            onClick={() => toggleStatus(item)}
                                            title={isFinished ? "Marcar como Pendente" : "Marcar como Pago/Recebido"}
                                            className={`p-2 md:p-1.5 rounded-lg transition-colors ${isFinished
                                                ? 'text-emerald-500 bg-emerald-50 hover:bg-emerald-100'
                                                : 'text-slate-400 hover:text-emerald-500 hover:bg-emerald-50'
                                                }`}
                                        >
                                            <CheckCircle2 size={18} className={isFinished ? 'fill-current' : ''} />
                                        </button>
                                        <button
                                            onClick={() => handleDuplicate(item)}
                                            title="Duplicar"
                                            className="p-2 md:p-1.5 text-slate-400 hover:text-blue-500 hover:bg-blue-50 rounded-lg"
                                        >
                                            <Copy size={18} />
                                        </button>
                                        <button onClick={() => handleEdit(item)} className="p-2 md:p-1.5 text-slate-400 hover:text-primary-500 hover:bg-primary-50 rounded-lg">
                                            <Edit2 size={18} />
                                        </button>
                                        <button onClick={() => item.id && requestDelete(item.id)} className="p-2 md:p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                            <Trash2 size={18} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        );
                    })
                )}
            </div>

            {isFormOpen && currentUser && (
                <TransactionForm
                    initialData={editingItem}
                    userId={currentUser.uid}
                    onSave={handleSave}
                    onClose={() => setIsFormOpen(false)}
                />
            )}

            <ConfirmModal
                isOpen={isDeleteModalOpen}
                title="Excluir Transação"
                message="Tem certeza que deseja excluir esta transação? Esta ação não pode ser desfeita."
                onConfirm={confirmDelete}
                onCancel={() => setIsDeleteModalOpen(false)}
                confirmText="Excluir"
                cancelText="Cancelar"
            />
        </div>
    );
};
