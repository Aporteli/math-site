'use client';

import { MessageSquare } from 'lucide-react';

interface AssignCommentFieldProps {
  value: string;
  onChange: (value: string) => void;
}

export function AssignCommentField({ value, onChange }: AssignCommentFieldProps) {
  return (
    <div className="mt-3 pt-3 border-t border-hairline">
      <label className="mb-1.5 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-muted">
        <MessageSquare className="size-3.5" />
        შენიშვნა / ინსტრუქცია
      </label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder="ჩაწერეთ დამატებითი მითითება მოსწავლეებისთვის..."
        className="w-full resize-none rounded-box border border-hairline bg-inputs p-2.5 text-xs text-ink outline-none transition focus:border-navy focus:bg-white"
        rows={2}
      />
    </div>
  );
}
