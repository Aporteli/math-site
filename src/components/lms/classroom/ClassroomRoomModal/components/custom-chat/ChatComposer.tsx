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

      <form onSubmit={onSubmit} className="flex gap-2 border-t border-hairline bg-sectionHeader p-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="სურათის მიმაგრება"
          className="flex size-8 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText disabled:cursor-not-allowed disabled:opacity-45"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-navy" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </button>

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ჩაწერეთ ტექსტი ან ჩააკოპირეთ სურათი (Ctrl+V)..."
          className="flex-1 rounded-box border border-hairline bg-searchInput px-3 py-1.5 text-xs font-medium text-searchInputText outline-none transition placeholder:text-muted focus:border-navy"
        />

        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="flex size-8 cursor-pointer items-center justify-center rounded-box bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none"
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </>
  );
}