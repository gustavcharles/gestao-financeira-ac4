import React, { useState, useRef, useEffect } from 'react';
import type { CategoryItem } from '../../services/settings';
import { getIconComponent } from '../../utils/categoryIcons';
import { ChevronDown, Check } from 'lucide-react';

interface CategorySelectProps {
    categories: CategoryItem[];
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
    disabled?: boolean;
}

export const CategorySelect: React.FC<CategorySelectProps> = ({
    categories,
    value,
    onChange,
    placeholder = "Selecione uma categoria",
    disabled = false
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement>(null);

    const selectedCategory = categories.find(c => c.name === value);
    const Icon = selectedCategory ? getIconComponent(selectedCategory.icon) : null;

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false);
            }
        };

        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const handleSelect = (categoryName: string) => {
        onChange(categoryName);
        setIsOpen(false);
    };

    return (
        <div className="relative" ref={containerRef}>
            <button
                type="button"
                onClick={() => !disabled && setIsOpen(!isOpen)}
                className={`
                    w-full flex items-center justify-between px-3 py-2 text-left bg-white dark:bg-slate-800 border rounded-lg shadow-sm focus:outline-none focus:ring-2 focus:ring-primary-500
                    ${disabled ? 'opacity-50 cursor-not-allowed bg-slate-100 dark:bg-slate-900' : 'cursor-pointer hover:border-slate-300 dark:hover:border-slate-600'}
                    ${isOpen ? 'border-primary-500 ring-2 ring-primary-500' : 'border-slate-300 dark:border-slate-600'}
                `}
                disabled={disabled}
            >
                <div className="flex items-center gap-2 truncate">
                    {selectedCategory ? (
                        <>
                            <div
                                className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0"
                                style={{ backgroundColor: selectedCategory.color }}
                            >
                                {Icon && <Icon size={14} />}
                            </div>
                            <span className="block truncate text-slate-700 dark:text-slate-200">
                                {selectedCategory.name}
                            </span>
                        </>
                    ) : (
                        <span className="text-slate-400">{placeholder}</span>
                    )}
                </div>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            {isOpen && (
                <div className="absolute z-50 w-full mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-auto animate-in fade-in zoom-in-95 duration-100">
                    {categories.map((cat) => {
                        const ItemIcon = getIconComponent(cat.icon);
                        const isSelected = cat.name === value;
                        return (
                            <button
                                key={cat.name}
                                type="button"
                                onClick={() => handleSelect(cat.name)}
                                className={`
                                    w-full flex items-center justify-between px-3 py-2 text-sm text-left hover:bg-slate-50 dark:hover:bg-slate-700 transition-colors
                                    ${isSelected ? 'bg-primary-50 dark:bg-slate-700/50' : ''}
                                `}
                            >
                                <div className="flex items-center gap-2">
                                    <div
                                        className="w-6 h-6 rounded flex items-center justify-center text-white shrink-0"
                                        style={{ backgroundColor: cat.color }}
                                    >
                                        <ItemIcon size={14} />
                                    </div>
                                    <span className={`truncate ${isSelected ? 'font-medium text-primary-700 dark:text-primary-300' : 'text-slate-700 dark:text-slate-200'}`}>
                                        {cat.name}
                                    </span>
                                </div>
                                {isSelected && <Check size={16} className="text-primary-600" />}
                            </button>
                        );
                    })}
                    {categories.length === 0 && (
                        <div className="p-3 text-center text-sm text-slate-400">
                            Nenhuma categoria disponível
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};
