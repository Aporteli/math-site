'use client';

import { Check, Copy } from 'lucide-react';
import { useState } from 'react';

interface CopyPromptButtonProps {
  text: string;
  copyLabel: string;
  copiedLabel: string;
}

export function CopyPromptButton({ text, copyLabel, copiedLabel }: CopyPromptButtonProps) {
  const [copied, setCopied] = useState(false);

  async function copyText() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void copyText()}
      aria-label={copied ? copiedLabel : copyLabel}
      className="absolute top-2 right-2 inline-flex size-9 items-center justify-center rounded-lg border border-hairline bg-white text-muted opacity-100 shadow-sm transition-opacity hover:border-navy/30 hover:text-navy focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-navy/15 sm:size-8 sm:opacity-0 sm:group-hover:opacity-100 sm:group-focus-within:opacity-100 sm:focus-visible:opacity-100">
      {copied ? (
        <Check className="size-3.5 text-navy" aria-hidden="true" />
      ) : (
        <Copy className="size-3.5" aria-hidden="true" />
      )}
    </button>
  );
}
