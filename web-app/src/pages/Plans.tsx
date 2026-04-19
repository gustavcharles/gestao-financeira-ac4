import React from 'react';
import { Shield, Check, Gift, ArrowRight, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { differenceInDays } from 'date-fns';

export const Plans: React.FC = () => {
    const { userProfile } = useAuth();
    
    // Calcula dias restantes se estiver em trial
    let diasRestantes = 0;
    if (userProfile?.status === 'trial' && userProfile?.trialEndsAt) {
        const trialEnd = userProfile.trialEndsAt.toDate ? userProfile.trialEndsAt.toDate() : new Date(userProfile.trialEndsAt);
        diasRestantes = differenceInDays(trialEnd, new Date());
    }

    return (
        <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500 pb-12">
            <div className="text-center space-y-4 pt-4">
                <h1 className="text-3xl md:text-5xl font-bold text-slate-800 dark:text-white mt-10">
                    Escolha seu Plano
                </h1>
                <p className="text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto">
                    O investimento que se paga sozinho logo no primeiro plantão extra.
                </p>
                
                {userProfile?.status === 'trial' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 rounded-full text-sm font-medium animate-pulse">
                        <Shield size={16} />
                        Você tem {diasRestantes} dias de teste restantes
                    </div>
                )}
                {userProfile?.status === 'active' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300 rounded-full text-sm font-medium">
                        <Check size={16} />
                        Seu plano {
                            userProfile.plan === 'annual' ? 'Anual' : 
                            userProfile.plan === 'monthly' ? 'Mensal Pro' : 
                            userProfile.plan === 'basic' ? 'Basic' : 'Ativo'
                        } está ativo
                    </div>
                )}
                {userProfile?.status === 'expired' && (
                    <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300 rounded-full text-sm font-medium">
                        Seu período de testes expirou. Assine agora para voltar a acessar.
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-7xl mx-auto pt-8 pl-4 pr-4">
                {/* Plano Basic */}
                <div className="flex-1 rounded-[2rem] bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden relative flex flex-col hover:border-slate-400 transition-colors duration-300">
                    <div className="p-8 flex-1 flex flex-col">
                        <div className="mb-6 mx-auto bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-400 font-bold px-4 py-1.5 rounded-full text-sm w-max">
                            Plano Basic
                        </div>

                        <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-xl font-bold text-slate-500 dark:text-slate-400">R$</span>
                            <span className="text-5xl font-black text-slate-700 dark:text-slate-200">9,90</span>
                            <span className="text-slate-500 dark:text-slate-400">/mês</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">
                            Leve no bolso, forte na organização
                        </p>

                        <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {[
                                "Cálculo automático de AC-4",
                                "Calendário de escalas ilimitado",
                                "Transações ilimitadas",
                                "Relatórios exportáveis",
                                "Atualizações gratuitas",
                                "Sem fidelidade",
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mt-0.5">
                                        <Check size={12} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                            <li className="flex items-start gap-3 opacity-50">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 flex items-center justify-center mt-0.5">
                                    <X size={12} className="text-slate-400" />
                                </div>
                                <span className="line-through">Recursos de WhatsApp</span>
                            </li>
                        </ul>

                        <div className="mt-auto">
                            <a 
                                href="https://www.asaas.com/c/04t3cyxseol379cp" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 px-6 bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-white font-bold rounded-xl transition-all flex items-center justify-center gap-2 group block"
                            >
                                Assinar Basic
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </a>
                            <p className="text-center text-[10px] text-slate-500 mt-2 font-medium">(Boleto, Pix ou Cartão)</p>
                        </div>
                    </div>
                </div>

                {/* Plano Mensal Pro */}
                <div className="flex-1 rounded-[2rem] bg-white dark:bg-slate-800 border-2 border-emerald-500/20 dark:border-emerald-500/10 shadow-xl overflow-hidden relative flex flex-col hover:border-emerald-500/50 transition-colors duration-300">
                    <div className="p-8 flex-1 flex flex-col">
                        <div className="mb-6 mx-auto bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 font-bold px-4 py-1.5 rounded-full text-sm w-max">
                            Mensal Pro
                        </div>

                        <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-xl font-bold text-slate-500 dark:text-slate-400">R$</span>
                            <span className="text-5xl font-black text-emerald-600 dark:text-emerald-400">15,90</span>
                            <span className="text-slate-500 dark:text-slate-400">/mês</span>
                        </div>
                        <p className="text-slate-500 dark:text-slate-400 text-center mb-8 text-sm">
                            A experiência completa com WhatsApp
                        </p>

                        <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-slate-700 dark:text-slate-300">
                            {[
                                "Acesso completo às funções",
                                "Cálculo automático de AC-4",
                                "Calendário de escalas ilimitado",
                                "Transações ilimitadas",
                                "Relatórios exportáveis",
                                "Suporte por WhatsApp",
                                "Atualizações gratuitas"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center mt-0.5">
                                        <Check size={12} className="text-emerald-600 dark:text-emerald-400 stroke-[3]" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                        </ul>

                        <div className="mt-auto">
                            <a 
                                href="https://www.asaas.com/c/g4u6zhnfpofrqrgj" 
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 px-6 bg-slate-800 dark:bg-slate-900 hover:bg-slate-700 dark:hover:bg-slate-950 text-white font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-2 group block"
                            >
                                Assinar Mensal
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </a>
                            <p className="text-center text-[10px] text-slate-500 mt-2 font-medium">(Cartão de Crédito)</p>
                            <p className="text-center text-xs text-slate-500 dark:text-slate-400 mt-4">
                                Cancele quando quiser • Sem fidelidade
                            </p>
                        </div>
                    </div>
                </div>

                {/* Plano Anual - Destaque */}
                <div className="flex-1 max-w-sm rounded-[2rem] bg-slate-900 border border-emerald-500 shadow-[0_0_40px_-10px_rgba(16,185,129,0.3)] overflow-hidden relative flex flex-col transform md:-translate-y-4 z-10 transition-transform hover:-translate-y-6 duration-300">
                    <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                    
                    {/* Badge Destaque */}
                    <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-amber-400 to-amber-500 text-slate-900 font-bold px-6 py-1.5 rounded-full text-xs uppercase tracking-wider flex items-center gap-1 shadow-lg mt-4 z-20">
                        ⚡ MELHOR VALOR
                    </div>

                    <div className="p-8 pb-10 flex-1 flex flex-col pt-10">
                        <div className="mb-6 mx-auto bg-emerald-500/20 text-emerald-400 font-bold px-4 py-1.5 rounded-full text-sm w-max">
                            Plano Anual
                        </div>

                        <div className="flex items-baseline justify-center gap-1 mb-2">
                            <span className="text-xl font-bold text-slate-400">R$</span>
                            <span className="text-6xl font-black text-emerald-400">149,90</span>
                            <span className="text-slate-400">/ano</span>
                        </div>
                        <p className="text-slate-400 text-center mb-8 text-sm">
                            Equivale a apenas R$ 12,49 por mês
                        </p>

                        <div className="bg-slate-800/80 rounded-xl p-4 border border-slate-700 mb-8">
                            <div className="flex items-start gap-3">
                                <div className="text-amber-500 mt-0.5">
                                    <Shield size={20} className="fill-amber-500" />
                                </div>
                                <div>
                                    <h4 className="font-bold text-emerald-400">15 Dias de Garantia</h4>
                                    <p className="text-xs text-slate-400 leading-tight mt-0.5">
                                        Não gostou? Devolvemos seu dinheiro
                                    </p>
                                </div>
                            </div>
                        </div>

                        <ul className="space-y-4 mb-8 flex-1 text-sm font-medium text-slate-300">
                            {[
                                "Acesso completo às funções",
                                "Cálculo automático de AC-4",
                                "Calendário de escalas ilimitado",
                                "Transações ilimitadas",
                                "Relatórios exportáveis",
                                "Suporte por WhatsApp",
                                "Atualizações gratuitas"
                            ].map((feature, i) => (
                                <li key={i} className="flex items-start gap-3 opacity-90">
                                    <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                                        <Check size={12} className="text-emerald-400 stroke-[3]" />
                                    </div>
                                    {feature}
                                </li>
                            ))}
                            
                            {/* Bônus */}
                            <li className="flex items-start gap-3 pt-2">
                                <div className="flex-shrink-0 w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center mt-0.5">
                                    <Check size={12} className="text-emerald-400 stroke-[3]" />
                                </div>
                                <span className="text-emerald-400 font-bold flex items-center gap-1">
                                    <Gift size={16} className="text-amber-400 fill-amber-400/20" /> 
                                    BÔNUS: Relatório de fechamento anual
                                </span>
                            </li>
                        </ul>

                        <div className="mt-auto pt-4">
                            <a 
                                href="https://www.asaas.com/c/83f4e2mfuicyr6k9"
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-full py-4 px-6 bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-400 hover:to-emerald-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-emerald-500/25 flex items-center justify-center gap-2 group block"
                            >
                                Quero Garantir o Anual
                                <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
                            </a>
                            <p className="text-center text-[10px] text-emerald-300/70 mt-2 font-medium">(Escolha a melhor forma de pagamento)</p>
                            <p className="text-center text-xs text-slate-400 mt-4">
                                Mais economia para o seu bolso
                            </p>
                        </div>
                    </div>
                </div>
            </div>
            
        </div>
    );
};
