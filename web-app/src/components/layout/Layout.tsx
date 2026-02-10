import { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    TrendingUp,
    TrendingDown,
    Settings,
    PlusCircle,
    LogOut,
    Menu,
    X,
    Shield,
    Bell,
    Calendar // Added for Scales
} from 'lucide-react';
import { auth } from '../../services/firebase';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../contexts/AuthContext';
import { checkDueBills, requestNotificationPermission, sendSystemNotification } from '../../services/alertService';
import type { DueBill } from '../../services/alertService';
import { Toast } from '../ui/Toast';
import { NotificationList } from '../ui/NotificationList';

export const Layout = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { settings } = useSettings();
    const { userProfile, currentUser } = useAuth();

    // Notification Logic
    const [toast, setToast] = useState<{ message: string, isVisible: boolean }>({ message: '', isVisible: false });
    const [alerts, setAlerts] = useState<DueBill[]>([]);
    const [isNotifOpen, setIsNotifOpen] = useState(false);

    // Apply Theme & Dark Mode
    useEffect(() => {
        const theme = settings.theme || 'blue';
        const isDark = settings.darkMode;

        // Theme colors
        document.body.classList.remove('theme-blue', 'theme-green', 'theme-purple');
        document.body.classList.add(`theme-${theme}`);

        // Dark Mode
        if (isDark) {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }, [settings.theme, settings.darkMode]);

    // Check Due Bills on Mount
    useEffect(() => {
        const checkBills = async () => {
            if (!currentUser) return;

            // 1. Request Permission
            await requestNotificationPermission();

            // 2. Check Bills
            const dueBills = await checkDueBills(currentUser.uid);
            setAlerts(dueBills);

            if (dueBills.length > 0) {
                const message = `Você tem ${dueBills.length} conta(s) vencendo hoje ou atrasada(s)!`;

                // Show In-App Toast
                setToast({ message, isVisible: true });

                // Show System Notification
                sendSystemNotification('Contas à Vencer', message);
            }
        };

        checkBills();
    }, [currentUser]);

    const handleLogout = () => {
        auth.signOut();
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Receitas', path: '/receitas', icon: TrendingUp },
        { name: 'Despesas', path: '/despesas', icon: TrendingDown },
        { name: 'Novo +', path: '/novo', icon: PlusCircle },
        { name: 'Escalas', path: '/escalas', icon: Calendar },
        { name: 'Config', path: '/config', icon: Settings },
    ];

    if (userProfile?.role === 'admin') {
        navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Components */}
            <Toast
                message={toast.message}
                isVisible={toast.isVisible}
                onClose={() => setToast(prev => ({ ...prev, isVisible: false }))}
                type="warning"
            />

            <NotificationList
                alerts={alerts}
                isOpen={isNotifOpen}
                onClose={() => setIsNotifOpen(false)}
            />

            {/* Top Bar for Mobile Menu & Notifications */}
            <div className="fixed top-0 left-0 right-0 h-16 bg-white dark:bg-slate-800 z-30 flex items-center justify-between px-4 md:hidden border-b border-slate-100 dark:border-slate-700 shadow-sm">
                <button
                    className="p-2 -ml-2 text-slate-600 dark:text-slate-300"
                    onClick={() => setIsOpen(!isOpen)}
                >
                    {isOpen ? <X size={24} /> : <Menu size={24} />}
                </button>

                <h1 className="font-bold text-slate-800 dark:text-white">Gestão AC-4 Pro</h1>

                <button
                    className="p-2 relative text-slate-600 dark:text-slate-300"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                >
                    <Bell size={24} />
                    {alerts.length > 0 && (
                        <span className="absolute top-1 right-1 w-4 h-4 bg-red-500 border-2 border-white dark:border-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                            {alerts.length > 9 ? '9+' : alerts.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Desktop Notification Bell (Fixed Top Right) */}
            <div className="hidden md:block fixed top-6 right-6 z-30">
                <button
                    className="p-3 bg-white dark:bg-slate-800 rounded-full shadow-lg border border-slate-100 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-primary-600 dark:hover:text-primary-400 transition-colors relative"
                    onClick={() => setIsNotifOpen(!isNotifOpen)}
                    title="Notificações"
                >
                    <Bell size={20} />
                    {alerts.length > 0 && (
                        <span className="absolute top-0 right-0 w-4 h-4 bg-red-500 ring-2 ring-white dark:ring-slate-800 rounded-full flex items-center justify-center text-[10px] font-bold text-white">
                            {alerts.length > 9 ? '9+' : alerts.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
        top-16 md:top-0 h-[calc(100vh-64px)] md:h-screen
      `}>
                <div className="flex flex-col h-full">
                    {/* Logo Area - Hidden on Mobile since we have Top Bar */}
                    <div className="hidden md:block p-6 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Gestão AC-4 Pro</h1>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                        {navItems.map((item) => {
                            const isActive = location.pathname === item.path;
                            const Icon = item.icon;
                            return (
                                <Link
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setIsOpen(false)}
                                    className={`
                    flex items-center gap-3 px-4 py-3 rounded-xl transition-colors font-medium
                    ${isActive
                                            ? 'bg-primary-600 text-white shadow-md shadow-primary-200'
                                            : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 hover:text-slate-900 dark:hover:text-slate-200'}
                  `}
                                >
                                    <Icon size={20} />
                                    <span>{item.name}</span>
                                </Link>
                            );
                        })}
                    </nav>

                    <div className="p-4 border-t border-slate-100 dark:border-slate-700">
                        <button
                            onClick={handleLogout}
                            className="flex items-center w-full gap-3 px-4 py-3 text-slate-600 dark:text-slate-400 transition-colors rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-600 dark:hover:text-red-400"
                        >
                            <LogOut size={20} />
                            <span>Sair</span>
                        </button>
                        <div className="mt-4 px-4 text-xs text-slate-400 text-center">
                            v1.0.5 (PWA Fix)
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:ml-64 w-full">
                <div className="container p-4 pt-20 mx-auto md:p-8 md:pt-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile menu */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
