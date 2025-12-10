'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';

interface CategoryCardProps {
  id: string;
  name: string;
  icon: React.ReactNode;
  selected: boolean;
  onToggle: (id: string) => void;
}

export default function CategoryCard({ id, name, icon, selected, onToggle }: CategoryCardProps) {
  return (
    <motion.button
      onClick={() => onToggle(id)}
      className={`
        relative p-6 rounded-xl border-2 transition-all
        ${
          selected
            ? 'border-espresso bg-offwhite'
            : 'border-gray-200 bg-white hover:border-gray-300'
        }
      `}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {selected && (
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className="absolute top-3 right-3 w-6 h-6 bg-espresso rounded-full flex items-center justify-center"
        >
          <Check className="w-4 h-4 text-white" />
        </motion.div>
      )}

      <div className="flex flex-col items-center gap-3">
        <div className={`text-3xl ${selected ? 'text-espresso' : 'text-gray-600'}`}>
          {icon}
        </div>
        <span className={`font-medium ${selected ? 'text-espresso' : 'text-gray-700'}`}>
          {name}
        </span>
      </div>
    </motion.button>
  );
}
