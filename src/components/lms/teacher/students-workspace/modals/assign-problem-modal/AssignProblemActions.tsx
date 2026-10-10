'use client';

import { Loader2, Send } from 'lucide-react';

export function AssignProblemActions({
  isSendDisabled,
  assigning,
  onSend,
  onClose,
}: {
  isSendDisabled: boolean;
  assigning: boolean;
  onSend: () => void;
  onClose: () => void;
}) {
  return (
    <div className="pt-4 flex flex-col gap-2">
      <button
        type="button"
        disabled={isSendDisabled || assigning}
        onClick={onSend}
        className="w-full inline-flex items-center justify-center gap-2 rounded-box bg-navy py-2.5 px-4 text-xs font-bold text-white shadow-xs hover:bg-navy-strong disabled:opacity-40 transition-all active:scale-98 cursor-pointer hover:rounded-box">
        {assigning ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-3.5" />}
        <span>გაგზავნა დავალებებში</span>
      </button>
      <button
        type="button"
        disabled={assigning}
        onClick={onClose}
        className=" py-1.5 text-center text-xs font-semibold text-muted hover:text-ink transition-colors cursor-pointer hover:bg-navy/10 hover:border-white hover:border-white/40 transition-colors hover:rounded-box">
        გაუქმება
      </button>
    </div>
  );
}
