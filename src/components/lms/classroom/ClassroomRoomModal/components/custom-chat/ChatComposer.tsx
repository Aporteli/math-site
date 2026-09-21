'use client';

import { ImagePlus, Loader2, Send } from 'lucide-react';

interface ChatComposerProps {
  draft: string;
  setDraft: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  isSending: boolean;
  isUploading: boolean;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  onImageUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export function ChatComposer({
  draft,
  setDraft,
  onSubmit,
  isSending,
  isUploading,
  fileInputRef,
  onImageUpload,
}: ChatComposerProps) {
  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={onImageUpload}
        accept="image/*"
        className="hidden"
      />

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="სურათის მიმაგრება"
          className="flex size-8 items-center justify-center rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-emerald-400" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </button>

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ჩაწერეთ ტექსტი ან ჩააკოპირეთ სურათი (Ctrl+V)..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none transition"
        />

        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </>
  );
}