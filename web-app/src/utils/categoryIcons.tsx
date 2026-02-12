import React from 'react';
import {
    Home,
    ShoppingCart,
    Utensils,
    Car,
    Briefcase,
    Heart,
    Gamepad2,
    GraduationCap,
    Zap,
    Wifi,
    Smartphone,
    Gift,
    Plane,
    Wrench,
    Baby,
    Dog,
    PiggyBank,
    Landmark,
    DollarSign,
    CreditCard,
    TrendingUp,
    MoreHorizontal,
    Music,
    Video,
    BookOpen,
    Coffee,
    Shirt,
    Smile
} from 'lucide-react';

export const CATEGORY_ICONS: Record<string, React.ElementType> = {
    'home': Home,
    'shopping-cart': ShoppingCart,
    'utensils': Utensils,
    'car': Car,
    'briefcase': Briefcase,
    'heart': Heart,
    'gamepad-2': Gamepad2,
    'graduation-cap': GraduationCap,
    'zap': Zap,
    'wifi': Wifi,
    'smartphone': Smartphone,
    'gift': Gift,
    'plane': Plane,
    'wrench': Wrench,
    'baby': Baby,
    'dog': Dog,
    'piggy-bank': PiggyBank,
    'landmark': Landmark,
    'dollar-sign': DollarSign,
    'credit-card': CreditCard,
    'trending-up': TrendingUp,
    'music': Music,
    'video': Video,
    'book-open': BookOpen,
    'coffee': Coffee,
    'shirt': Shirt,
    'smile': Smile,
    'more-horizontal': MoreHorizontal
};

export const CATEGORY_COLORS = [
    '#EF4444', // Red
    '#F97316', // Orange
    '#F59E0B', // Amber
    '#10B981', // Emerald
    '#06B6D4', // Cyan
    '#3B82F6', // Blue
    '#6366F1', // Indigo
    '#8B5CF6', // Violet
    '#EC4899', // Pink
    '#64748B', // Slate
];

export const getIconComponent = (iconName: string) => {
    return CATEGORY_ICONS[iconName] || MoreHorizontal;
};

// Helper to guess icon/color for migration based on name
export const guessCategoryStyle = (name: string): { icon: string, color: string } => {
    const lower = name.toLowerCase();

    if (lower.includes('casa') || lower.includes('moradia') || lower.includes('aluguel')) return { icon: 'home', color: '#3B82F6' };
    if (lower.includes('mercado') || lower.includes('compras')) return { icon: 'shopping-cart', color: '#F97316' };
    if (lower.includes('comida') || lower.includes('restaurante')) return { icon: 'utensils', color: '#EF4444' };
    if (lower.includes('carro') || lower.includes('transporte') || lower.includes('combustivel')) return { icon: 'car', color: '#64748B' };
    if (lower.includes('trabalho') || lower.includes('salário') || lower.includes('renda')) return { icon: 'briefcase', color: '#10B981' };
    if (lower.includes('saúde') || lower.includes('médico') || lower.includes('farmácia')) return { icon: 'heart', color: '#EF4444' };
    if (lower.includes('lazer') || lower.includes('jogos')) return { icon: 'gamepad-2', color: '#8B5CF6' };
    if (lower.includes('estudo') || lower.includes('curso') || lower.includes('escola')) return { icon: 'graduation-cap', color: '#6366F1' };
    if (lower.includes('energia') || lower.includes('luz')) return { icon: 'zap', color: '#F59E0B' };
    if (lower.includes('internet') || lower.includes('wifi')) return { icon: 'wifi', color: '#06B6D4' };

    // Defaults
    return { icon: 'more-horizontal', color: '#64748B' };

}
