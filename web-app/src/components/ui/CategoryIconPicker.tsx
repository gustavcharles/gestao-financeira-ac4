import React from 'react';
import { CATEGORY_ICONS, CATEGORY_COLORS, getIconComponent } from '../../utils/categoryIcons';
import { Check } from 'lucide-react';

interface CategoryIconPickerProps {
    selectedIcon: string;
    onSelectIcon: (icon: string) => void;
    selectedColor: string;
    onSelectColor: (color: string) => void;
}

export const CategoryIconPicker: React.FC<CategoryIconPickerProps> = ({
    selectedIcon,
    onSelectIcon,
    selectedColor,
    onSelectColor
}) => {
    return (
        <div className="space-y-4 p-4 bg-slate-50 dark:bg-slate-700/50 rounded-xl border border-slate-100 dark:border-slate-700">
            <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Escolha um Ícone
                </label>
                <div className="grid grid-cols-7 sm:grid-cols-9 gap-2">
                    {Object.keys(CATEGORY_ICONS).map((iconKey) => {
                        const Icon = getIconComponent(iconKey);
                        const isSelected = selectedIcon === iconKey;
                        return (
                            <button
                                key={iconKey}
                                type="button"
                                onClick={() => onSelectIcon(iconKey)}
                                className={`
                                    p-2 rounded-lg flex items-center justify-center transition-all
                                    ${isSelected
                                        ? 'bg-white dark:bg-slate-600 shadow-md ring-2 ring-primary-500 text-primary-600 dark:text-primary-400'
                                        : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-white dark:hover:bg-slate-600'}
                                `}
                            >
                                <Icon size={20} />
                            </button>
                        );
                    })}
                </div>
            </div>

            <div>
                <label className="block text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">
                    Escolha uma Cor
                </label>
                <div className="flex flex-wrap gap-3">
                    {CATEGORY_COLORS.map((color) => (
                        <button
                            key={color}
                            type="button"
                            onClick={() => onSelectColor(color)}
                            className={`
                                w-8 h-8 rounded-full transition-transform hover:scale-110 flex items-center justify-center
                                ${selectedColor === color ? 'ring-2 ring-offset-2 ring-slate-400 dark:ring-offset-slate-800' : ''}
                            `}
                            style={{ backgroundColor: color }}
                        >
                            {selectedColor === color && <Check size={14} className="text-white" />}
                        </button>
                    ))}
                </div>
            </div>
        </div>
    );
};
