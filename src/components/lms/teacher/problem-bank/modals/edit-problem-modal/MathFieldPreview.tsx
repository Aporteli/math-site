'use client';

import { KatexPreview } from '@/components/math/katex-preview';
import { toKatexFriendlyTex } from '@/lib/math/problems/tex';

export function MathFieldPreview({ label, tex }: { label: string; tex: string }) {
  if (!tex.trim()) return null;
  return (
    <div className="min-w-0 overflow-x-auto rounded-box border border-hairline-soft bg-paper px-3 py-3">
      <p className="mb-2 text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <KatexPreview
        tex={toKatexFriendlyTex(tex)}
        className="block min-w-0 whitespace-pre-wrap break-words text-sm leading-relaxed text-ink [&_.katex-display]:my-2 [&_.katex]:text-[1.05rem]"
      />
    </div>
  );
}
