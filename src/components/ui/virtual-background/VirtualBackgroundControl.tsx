'use client';

import { useRef } from 'react';
import type { ChangeEvent } from 'react';
import { ImagePlus, X } from 'lucide-react';
import { useVirtualBackground } from './useVirtualBackground';

export function VirtualBackgroundControl() {
  const { hasRoom, isActive, isLoading, applyVirtualBackground } =
    useVirtualBackground();
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!hasRoom) return null;

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;

    const objectUrl = URL.createObjectURL(file);
    applyVirtualBackground(objectUrl, true)
      .catch((err) => console.error('virtual background failed', err))
      .finally(() => URL.revokeObjectURL(objectUrl));
  };

  return (
    <div className="flex items-center gap-1">
      {isActive && (
        <button
          type="button"
          onClick={() => void applyVirtualBackground('', false)}
          disabled={isLoading}
          className="rounded-lg px-1.5 py-1 text-rose-300 transition-all hover:bg-rose-500/10 hover:text-rose-200"
          title="ფონის გამორთვა"
        >
          <X className="size-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
          isActive
            ? 'bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400'
            : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
        } ${isLoading ? 'cursor-wait opacity-60' : ''}`}
        title="აირჩიე ფონის სურათი"
      >
        <ImagePlus className="size-3.5" />
        <span>{isLoading ? '...' : isActive ? 'შეცვლა' : 'ატვირთე'}</span>
      </button>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
}