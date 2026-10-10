'use client';

import { Calendar as CalendarIcon, TrendingUp } from 'lucide-react';
import { ModeButton } from './ModeButton';
import type { ReportsMode } from './reports.types';

export function ModeToggle({ mode, onModeChange }: { mode: ReportsMode; onModeChange: (mode: ReportsMode) => void }) {
  return (
    <div className="grid grid-cols-2 gap-1 bg-main p-1">
      <ModeButton active={mode === 'monthly'} onClick={() => onModeChange('monthly')} icon={CalendarIcon} label="თვიური" />
      <ModeButton active={mode === 'yearly'} onClick={() => onModeChange('yearly')} icon={TrendingUp} label="წლიური" />
    </div>
  );
}
