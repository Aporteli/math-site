'use client';

import { Check, Loader2, Send } from 'lucide-react';

interface SendStatusButtonProps {
  sent: boolean;
  sending: boolean;
  idleLabel: string;
  onClick: () => void;
}

export function SendStatusButton({ sent, sending, idleLabel, onClick }: SendStatusButtonProps) {
  return (
    <button
      type="button"
      disabled={sent || sending}
      onClick={onClick}
      className={[
        'inline-flex items-center gap-1.5 rounded-box px-3 py-1.5 text-xs font-bold transition shadow-xs',
        sent
          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
          : sending
            ? 'bg-paper text-muted border border-hairline'
            : 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] hover:bg-[#526C85]',
      ].join(' ')}>
      {sending ? (
        <Loader2 className="size-3 animate-spin" />
      ) : sent ? (
        <Check className="size-3 text-emerald-600" />
      ) : (
        <Send className="size-3" />
      )}
      <span>{sent ? 'გაგზავნილია' : idleLabel}</span>
    </button>
  );
}
