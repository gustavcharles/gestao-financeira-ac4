import React, { useState } from 'react';
import { Star, X, Send, CheckCircle2, Loader2 } from 'lucide-react';
import { saveFeedback } from '../../services/feedbackService';
import { useAuth } from '../../contexts/AuthContext';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export const FeedbackModal: React.FC<FeedbackModalProps> = ({ isOpen, onClose }) => {
    const { currentUser } = useAuth();
    const [rating, setRating] = useState<number>(0);
    const [hover, setHover] = useState<number>(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (rating === 0 || !currentUser) return;

        setIsSubmitting(true);
        try {
            await saveFeedback({
                rating,
                comment,
                userId: currentUser.uid,
                userEmail: currentUser.email || 'anonymous',
                platform: 'web-pwa'
            });
            setIsSuccess(true);
            setTimeout(() => {
                handleClose();
            }, 3000);
        } catch (error) {
            console.error('Feedback submission failed:', error);
            alert('Erro ao enviar feedback. Tente novamente.');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleClose = () => {
        setRating(0);
        setComment('');
        setIsSuccess(false);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="bg-white dark:bg-slate-800 w-full max-w-md rounded-2xl shadow-2xl border border-slate-100 dark:border-slate-700 overflow-hidden animate-in zoom-in-95 duration-300">
                {/* Header */}
                <div className="p-6 border-b border-slate-100 dark:border-slate-700 flex justify-between items-center">
                    <h3 className="text-xl font-bold text-slate-800 dark:text-white">Classificar App</h3>
                    <button
                        onClick={handleClose}
                        className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="p-8">
                    {isSuccess ? (
                        <div className="text-center py-8 space-y-4 animate-in zoom-in duration-500">
                            <div className="flex justify-center">
                                <div className="w-20 h-20 bg-emerald-100 dark:bg-emerald-900/30 rounded-full flex items-center justify-center text-emerald-600">
                                    <CheckCircle2 size={48} />
                                </div>
                            </div>
                            <h4 className="text-2xl font-bold text-slate-800 dark:text-white">Obrigado!</h4>
                            <p className="text-slate-500 dark:text-slate-400">
                                Sua avaliação é muito importante para nós.
                            </p>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-8">
                            <div className="text-center space-y-4">
                                <p className="text-slate-600 dark:text-slate-300 font-medium">
                                    Como você avalia sua experiência com o AC-4 Pro?
                                </p>

                                {/* Star Rating */}
                                <div className="flex justify-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            type="button"
                                            onClick={() => setRating(star)}
                                            onMouseEnter={() => setHover(star)}
                                            onMouseLeave={() => setHover(0)}
                                            className="focus:outline-none transition-transform hover:scale-125"
                                        >
                                            <Star
                                                size={40}
                                                className={`transition-colors duration-200 ${(hover || rating) >= star
                                                        ? 'fill-amber-400 text-amber-400'
                                                        : 'text-slate-300 dark:text-slate-600'
                                                    }`}
                                            />
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="block text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    Comentário (opcional)
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder="Diga-nos o que podemos melhorar..."
                                    rows={4}
                                    className="w-full px-4 py-3 border border-slate-200 dark:border-slate-600 rounded-xl focus:ring-2 focus:ring-primary-500 outline-none bg-white dark:bg-slate-800 text-slate-800 dark:text-white resize-none transition-shadow hover:shadow-sm"
                                />
                            </div>

                            <button
                                type="submit"
                                disabled={rating === 0 || isSubmitting}
                                className={`
                                    w-full py-4 rounded-xl font-bold flex items-center justify-center gap-3 transition-all
                                    ${rating === 0 || isSubmitting
                                        ? 'bg-slate-100 dark:bg-slate-700 text-slate-400 cursor-not-allowed'
                                        : 'bg-primary-600 hover:bg-primary-700 text-white shadow-lg shadow-primary-500/25 hover:-translate-y-0.5 active:translate-y-0'}
                                `}
                            >
                                {isSubmitting ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    <>
                                        <Send size={20} />
                                        Enviar Feedback
                                    </>
                                )}
                            </button>
                        </form>
                    )}
                </div>
            </div>
        </div>
    );
};
