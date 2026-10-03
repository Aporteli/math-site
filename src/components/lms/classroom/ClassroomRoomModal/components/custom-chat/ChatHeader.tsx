'use client';

import { Loader2, Trash2 } from 'lucide-react';

interface ChatHeaderProps {
  isUploading: boolean;
  canClear: boolean;
  onClear: () => void;
}

export function ChatHeader({ isUploading, canClear, onClear }: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between border-b border-hairline bg-sectionHeader p-3 text-sm font-bold text-mainText">
      <span>ოთახის ჩატი</span>
      <div className="flex items-center gap-2">
        {isUploading && (
          <span className="flex animate-pulse items-center gap-1.5 text-xs font-medium text-navy">
            <Loader2 className="size-3 animate-spin" /> სურათი იტვირთება...
          </span>
        )}
        {canClear && (
          <button
            type="button"
            onClick={onClear}
            title="ისტორიის გასუფთავება"
            className="cursor-pointer rounded-box p-1 text-muted transition-colors duration-200 hover:bg-loss-tint hover:text-loss"
          >
            <Trash2 className="size-4" />
          </button>
        )}
      </div>
    </div>
  );
}