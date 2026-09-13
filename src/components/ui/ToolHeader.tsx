import React from "react";
import { Calculator, LucideIcon } from "lucide-react";

interface ToolHeaderProps {
  category?: string;
  title: string;
  description: string;
  icon?: React.ReactNode;
}

export const ToolHeader: React.FC<ToolHeaderProps> = ({
  category = "კალკულატორი",
  title,
  description,
  icon,
}) => {
  return (
    <div 
      className="relative w-full bg-white dark:bg-neutral-900 rounded-2xl p-6 shadow-sm border border-gray-200/80 dark:border-neutral-800 border-t-4 border-t-amber-500 overflow-hidden mb-6"
      style={{
        backgroundImage: `
          linear-gradient(to right, rgba(0, 0, 0, 0.05) 1px, transparent 1px),
          linear-gradient(to bottom, rgba(0, 0, 0, 0.05) 1px, transparent 1px)
        `,
        backgroundSize: '16px 16px',
      }}
    >
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="p-2 bg-gray-100 dark:bg-neutral-800 border border-gray-200 dark:border-neutral-700 text-amber-600 dark:text-amber-400 rounded-xl shadow-xs">
            {icon}
          </div>
          <span className="text-xs font-bold text-amber-600 dark:text-amber-400 tracking-wide uppercase">
            {category}
          </span>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-white leading-tight tracking-tight">
          {title}
        </h1>

        <p className="text-sm text-gray-600 dark:text-neutral-400 mt-1.5 max-w-2xl leading-relaxed">
          {description}
        </p>
      </div>
    </div>
  );
};