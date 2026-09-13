'use client';

import { Loader2, Trash2 } from 'lucide-react';

interface ChatHeaderProps {
  isUploading: boolean;
  canClear: boolean;
  onClear: () => void;
}

export function ChatHeader({ isUploading, canClear, onClear }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-white/10 p-3 text-sm font-semibold text-white/80">
      <span>ოთახის ჩატი</span>
      <div className="flex items-center gap-2">
        {isUploading && (
          <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-normal animate-pulse">
            <Loader2 className="size-3 animate-spin" /> სურათი იტვირთება...
          </span>
        )}
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            title="ისტორიის გასუფთავება"
            className="text-white/40 hover:text-red-400 transition p-1 rounded-lg hover:bg-white/5"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}