'use client';

import type { StudentSection } from './types';

interface StudentSectionToggleProps {
  studentSection: StudentSection;
  onChange: (section: StudentSection) => void;
}

export function StudentSectionToggle({ studentSection, onChange }: StudentSectionToggleProps) {
  return (
    <div className="grid grid-cols-2 gap-1 bg-main p-1">
      {(
        [
          ['pricing', 'ფასი'],
          ['schedule', 'განრიგი'],
        ] as const
      ).map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`group relative inline-flex cursor-pointer items-center justify-center overflow-hidden rounded-box px-3 py-2 text-xs font-bold transition-all duration-200 ${
            studentSection === key ? 'text-mainText' : 'text-mainText/50 hover:text-mainText'
          }`}>
          <span className="relative z-10">{label}</span>
          <span
            className={`absolute bottom-0 left-1/2 h-px -translate-x-1/2 transition-all duration-300 ease-out ${
              studentSection === key ? 'w-[calc(100%-16px)] bg-mainText' : 'w-0 bg-mainText/50 group-hover:w-1/2'
            }`}
          />
        </button>
      ))}
    </div>
  );
}
