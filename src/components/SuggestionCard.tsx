import React from 'react';
import { IconBadge } from './IconBadge';

interface SuggestionCardProps {
  title: string;
  icon: React.ReactNode;
  items: string[];
  variant: 'success' | 'warning' | 'info' | 'secondary';
}

export const SuggestionCard: React.FC<SuggestionCardProps> = ({ title, icon, items, variant }) => {
  const getVariantStyles = (variant: string) => {
    switch (variant) {
      case 'success':
        return 'border-green-200 bg-green-50';
      case 'warning':
        return 'border-red-200 bg-red-50';
      case 'info':
        return 'border-v-turquoise/30 bg-white';
      case 'secondary':
        return 'border-v-turquoise/20 bg-white';
      default:
        return 'border-slate-200 bg-white';
    }
  };

  const list = Array.isArray(items) ? items : [];
  return (
    <div className={`export-block border rounded-xl p-6 ${getVariantStyles(variant)} hover:shadow-lg transition-shadow duration-300`}>
      <div className="flex items-center space-x-3 mb-6">
        <IconBadge size={40}>{icon}</IconBadge>
        <h3 className="text-xl font-bold text-slate-800">{title}</h3>
      </div>
      
      {list.length > 0 ? (
        <ul className="space-y-4">
          {list.map((item, index) => (
            <li key={index} className="flex items-start space-x-3">
              <div className="w-2 h-2 bg-slate-400 rounded-full mt-2 flex-shrink-0"></div>
              <span className="text-slate-700 leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-slate-600">No suggestions found for this section.</p>
      )}
    </div>
  );
};
