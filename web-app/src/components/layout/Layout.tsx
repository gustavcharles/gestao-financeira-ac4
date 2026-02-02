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
    Shield
} from 'lucide-react';
import { auth } from '../../services/firebase';
import { useSettings } from '../../hooks/useSettings';
import { useAuth } from '../../contexts/AuthContext';

export const Layout = () => {
    const [isOpen, setIsOpen] = useState(false);
    const location = useLocation();
    const { settings } = useSettings();
    const { userProfile } = useAuth();

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

    const handleLogout = () => {
        auth.signOut();
    };

    const navItems = [
        { name: 'Dashboard', path: '/', icon: LayoutDashboard },
        { name: 'Receitas', path: '/receitas', icon: TrendingUp },
        { name: 'Despesas', path: '/despesas', icon: TrendingDown },
        { name: 'Novo +', path: '/novo', icon: PlusCircle },
        { name: 'Config', path: '/config', icon: Settings },
    ];

    // Conditionally Add Admin Link
    if (userProfile?.role === 'admin') {
        navItems.push({ name: 'Admin', path: '/admin', icon: Shield });
    }

    return (
        <div className="flex h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-200">
            {/* Mobile Menu Button */}
            <button
                className="fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md md:hidden"
                onClick={() => setIsOpen(!isOpen)}
            >
                {isOpen ? <X size={24} /> : <Menu size={24} />}
            </button>

            {/* Sidebar */}
            <aside className={`
        fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-slate-800 border-r border-slate-200 dark:border-slate-700 transform transition-transform duration-200 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
                <div className="flex flex-col h-full">
                    <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center gap-3">
                            <img src="/logo.png" alt="Logo" className="w-10 h-10 object-contain" />
                            <h1 className="text-xl font-bold text-slate-800 dark:text-white">Gestão AC-4</h1>
                        </div>
                    </div>

                    <nav className="flex-1 p-4 space-y-1">
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
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <main className="flex-1 overflow-auto md:ml-64">
                <div className="container p-4 mx-auto md:p-8 max-w-7xl">
                    <Outlet />
                </div>
            </main>

            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 z-30 bg-black/20 md:hidden"
                    onClick={() => setIsOpen(false)}
                />
            )}
        </div>
    );
};
