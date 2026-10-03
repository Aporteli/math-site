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
          className="cursor-pointer rounded-box border border-rose-500/30 bg-rose-500/15 px-1.5 py-1 text-rose-500 transition-colors hover:bg-rose-500/25"
          title="ფონის გამორთვა"
        >
          <X className="size-3.5" />
        </button>
      )}

      <button
        type="button"
        onClick={() => fileInputRef.current?.click()}
        disabled={isLoading}
        className={`flex cursor-pointer items-center gap-1.5 rounded-box px-2.5 py-1 text-xs transition-all duration-200 ${
          isActive
            ? 'bg-[#465D73] font-bold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] hover:bg-[#526C85]'
            : 'border border-hairline bg-paper font-medium text-mainText hover:bg-sectionHeader'
        } ${isLoading ? 'cursor-wait opacity-45' : ''}`}
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