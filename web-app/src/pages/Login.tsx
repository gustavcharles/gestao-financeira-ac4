import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { doc, setDoc, serverTimestamp, query, collection, where, getDocs } from 'firebase/firestore';
import { auth, db } from '../services/firebase';
import { Shield, Lock, Mail, ArrowRight } from 'lucide-react';

export const Login = () => {
    const [isRegister, setIsRegister] = useState(false);
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPass, setConfirmPass] = useState('');
    const [error, setError] = useState('');
    const [resetMessage, setResetMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setResetMessage('');
        setLoading(true);

        try {
            if (isRegister) {
                if (password !== confirmPass) {
                    throw new Error("As senhas não conferem.");
                }

                // 🚫 ANTI-ABUSE: Verificar se o email já foi usado antes
                const emailQuery = query(
                    collection(db, 'users'),
                    where('email', '==', email.toLowerCase())
                );
                const existingUsers = await getDocs(emailQuery);

                if (!existingUsers.empty) {
                    // Email já foi usado - verificar se foi expirado
                    const existingUser = existingUsers.docs[0].data();
                    if (existingUser.status === 'expired') {
                        throw new Error('Este email já foi usado em um período de teste. Para continuar usando o sistema, assine um plano.');
                    } else {
                        throw new Error('Este email já está cadastrado. Faça login.');
                    }
                }

                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Create User Profile in Firestore
                const isAdmin = email === 'gustav.charles@gmail.com';
                const now = new Date();
                const trialEnds = new Date(now.getTime() + 15 * 24 * 60 * 60 * 1000); // +15 dias

                // Force status to 'trial' for new users (except specific admin email)
                const userStatus = isAdmin ? 'active' : 'trial';
                const userPlan = isAdmin ? 'annual' : 'trial';

                await setDoc(doc(db, 'users', user.uid), {
                    email: user.email,
                    role: isAdmin ? 'admin' : 'user',
                    status: userStatus,
                    plan: userPlan,
                    trialEndsAt: isAdmin ? serverTimestamp() : trialEnds,
                    subscriptionEndsAt: null,
                    paymentId: null,
                    lastSyncAt: null,
                    notificationsSent: {},
                    createdAt: serverTimestamp()
                });
            } else {
                const userCredential = await signInWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Auto-fix for Admin if account already existed
                if (user.email === 'gustav.charles@gmail.com') {
                    await setDoc(doc(db, 'users', user.uid), {
                        email: user.email,
                        role: 'admin',
                        status: 'active',
                        plan: 'annual',
                        subscriptionEndsAt: null,
                        updatedAt: serverTimestamp()
                    }, { merge: true });
                }
            }
            navigate('/');
        } catch (err: any) {
            setError(err.message.replace('Firebase: ', ''));
        } finally {
            setLoading(false);
        }
    };

    const handleForgotPassword = async () => {
        setError('');
        setResetMessage('');
        
        if (!email) {
            setError('Por favor, informe seu e-mail no campo acima para recuperar a senha.');
            return;
        }

        setLoading(true);
        try {
            await sendPasswordResetEmail(auth, email);
            setResetMessage('E-mail de recuperação de senha enviado! Verifique sua caixa (e o spam).');
        } catch (err: any) {
            setError(err.message.replace('Firebase: ', 'Erro ao enviar e-mail de recuperação: '));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-screen bg-slate-50 dark:bg-slate-900 p-4 transition-colors duration-200">
            <div className="w-full max-w-md bg-white dark:bg-slate-800 rounded-3xl shadow-xl overflow-hidden">
                <div className="p-8 text-center">
                    <div className="flex justify-between items-center mb-6">
                        <Shield className="text-primary-600" size={24} />
                        <span className="text-xs font-bold text-slate-400 tracking-widest">SECURE ACCESS</span>
                    </div>

                    <div className="mx-auto w-16 h-16 bg-primary-50 rounded-full flex items-center justify-center mb-4 text-primary-600">
                        <Shield size={32} />
                    </div>

                    <h1 className="text-2xl font-bold text-slate-800 dark:text-white mb-2">Gestão AC-4 Pro</h1>
                    <p className="text-slate-500 dark:text-slate-400 mb-8 text-sm">
                        {isRegister ? "Crie sua conta para começar" : "Acesse suas finanças com segurança"}
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4 text-left">
                        {error && (
                            <div className="p-3 text-sm text-red-600 bg-red-50 rounded-xl">
                                {error}
                            </div>
                        )}
                        {resetMessage && (
                            <div className="p-3 text-sm text-emerald-600 bg-emerald-50 rounded-xl">
                                {resetMessage}
                            </div>
                        )}

                        <div className="space-y-4">
                            <div className="relative">
                                <Mail className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                <input
                                    type="email"
                                    placeholder="Seu e-mail"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:text-white"
                                    required
                                />
                            </div>

                            <div className="relative">
                                <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                <input
                                    type="password"
                                    placeholder="Sua senha"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:text-white"
                                    required
                                />
                            </div>

                            {isRegister && (
                                <div className="relative">
                                    <Lock className="absolute left-3 top-3.5 text-slate-400" size={20} />
                                    <input
                                        type="password"
                                        placeholder="Confirme a senha"
                                        value={confirmPass}
                                        onChange={(e) => setConfirmPass(e.target.value)}
                                        className="w-full pl-10 pr-4 py-3 bg-slate-50 dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all dark:text-white"
                                        required
                                    />
                                </div>
                            )}

                            {!isRegister && (
                                <div className="flex justify-end pt-1">
                                    <button
                                        type="button"
                                        onClick={handleForgotPassword}
                                        className="text-sm font-medium text-primary-600 dark:text-primary-400 hover:text-primary-700 transition-colors"
                                    >
                                        Esqueceu a senha?
                                    </button>
                                </div>
                            )}
                        </div>

                        <button
                            type="submit"
                            disabled={loading}
                            className="w-full py-3.5 bg-primary-600 text-white font-semibold rounded-xl hover:bg-primary-700 transition-colors shadow-lg shadow-primary-200 flex items-center justify-center gap-2 group"
                        >
                            {loading ? (
                                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    {isRegister ? "Criar Conta" : "Entrar"}
                                    <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                                </>
                            )}
                        </button>
                    </form>

                    <div className="mt-8 pt-6 border-t border-slate-100">
                        <button
                            onClick={() => setIsRegister(!isRegister)}
                            className="text-sm text-slate-500 dark:text-slate-400 hover:text-primary-600 dark:hover:text-primary-400 font-medium transition-colors"
                        >
                            {isRegister ? "Já tem conta? Fazer Login" : "Não tem acesso? Criar conta"}
                        </button>
                    </div>
                </div>

                <div className="bg-slate-50 dark:bg-slate-900 p-4 text-center">
                    <p className="text-xs text-slate-400 font-semibold tracking-widest uppercase">
                        🛡️ Criptografia de Ponta a Ponta
                    </p>
                </div>
            </div>
        </div>
    );
};
