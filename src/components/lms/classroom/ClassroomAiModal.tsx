'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { Sparkles, X, Send, Image as ImageIcon, Loader2, Trash2, HelpCircle, BookOpen, Lightbulb } from 'lucide-react';
import { AI_MODELS, type AiModelId } from '@/lib/math/problems/ai-models';
import { askRawAiAction } from '@/lib/math/problems/ai-raw-action';
import { KatexPreview } from '@/components/math/katex-preview';
import { toKatexFriendlyTex } from '@/lib/math/problems/tex';

interface ClassroomAiModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const QUICK_PROMPTS = [
  {
    label: 'ამოხსენა ნაბიჯ-ნაბიჯ',
    icon: HelpCircle,
    prompt: 'გთხოვთ, ამოხსნათ ეს ამოცანა დეტალურად, ეტაპობრივად და გასაგებად.',
  },
  {
    label: 'მსგავსი ამოცანა',
    icon: Lightbulb,
    prompt: 'შექმენი ამ ამოცანის ანალოგიური, მსგავსი მათემატიკური ამოცანა.',
  },
  {
    label: 'რიცხვების შეცვლა',
    icon: BookOpen,
    prompt: 'შეცვალე მხოლოდ რიცხვები. მომეცი 10 ამოცანა/მაგალითი. ნუმერაციის გარეშე.',
  },
];

export function ClassroomAiModal({ isOpen, onClose }: ClassroomAiModalProps) {
  const [selectedModel, setSelectedModel] = useState<AiModelId>('gemini-flash-lite');
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<{ file: File; preview: string; mimeType: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const processImageFile = useCallback((file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      setImage({
        file,
        preview: event.target?.result as string,
        mimeType: file.type || 'image/jpeg',
      });
    };
    reader.readAsDataURL(file);
  }, []);

  const handlePaste = useCallback(
    (e: ClipboardEvent | React.ClipboardEvent) => {
      const items = e.clipboardData?.items;
      if (!items) return;

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (item.type.startsWith('image/')) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processImageFile(file);
            break;
          }
        }
      }
    },
    [processImageFile],
  );

  useEffect(() => {
    if (!isOpen) return;

    const onWindowPaste = (e: ClipboardEvent) => handlePaste(e);
    window.addEventListener('paste', onWindowPaste);

    return () => {
      window.removeEventListener('paste', onWindowPaste);
    };
  }, [isOpen, handlePaste]);

  if (!isOpen) return null;

  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processImageFile(file);
  };

  const handleRemoveImage = () => {
    setImage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const executeAiRequest = async (textToSend: string) => {
    if (!textToSend.trim() && !image) return;

    setLoading(true);
    setError(null);
    setResponse(null);

    try {
      const res = await askRawAiAction({
        modelId: selectedModel,
        prompt: textToSend.trim() || 'გთხოვთ გააანალიზოთ ეს სურათი/ამოცანა.',
        image: image
          ? {
              mimeType: image.mimeType,
              base64Data: image.preview,
            }
          : undefined,
      });

      if (!res.ok) {
        setError(res.error);
      } else {
        setResponse(res.text);
      }
    } catch (err: any) {
      setError(err.message || 'მოთხოვნის დამუშავება ვერ მოხერხდა');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-sm">
      {/* 👈 გარეთ დაკლიკების ფონური ღილაკი */}
      <button
        type="button"
        aria-label="დახურვა"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />

      <div className="relative z-10 flex h-[88vh] w-full max-w-3xl animate-in flex-col overflow-hidden rounded-box border border-hairline bg-paper text-ink shadow-2xl fade-in zoom-in-95 duration-150">
        <div className="h-1 shrink-0 bg-brass" aria-hidden="true" />
        <div className="flex h-14 shrink-0 items-center border-b border-hairline bg-sectionHeader px-4">
          <div className="flex w-full items-center justify-between gap-3">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as AiModelId)}
              className="rounded-box border border-hairline bg-searchInput px-2.5 py-1.5 text-xs font-bold text-searchInputText outline-none focus:border-navy">
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.provider})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 cursor-pointer items-center justify-center  text-muted transition-colors  hover:text-loss">
              <X className="size-7" strokeWidth={2} />
            </button>
          </div>
        </div>

        {/* 3 სწრაფი პრომპტის ღილაკი */}
        <div className="flex flex-wrap items-center gap-2 border-b border-hairline bg-sectionHeader p-2.5">
          {QUICK_PROMPTS.map((qp, idx) => {
            const Icon = qp.icon;
            return (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => {
                  setPrompt(qp.prompt);
                  void executeAiRequest(qp.prompt);
                }}
                className="flex cursor-pointer items-center gap-1.5 rounded-box border border-hairline bg-main px-2.5 py-1 text-xs font-bold text-ink transition-colors hover:bg-mainButtonHover disabled:cursor-not-allowed disabled:opacity-45">
                <Icon className="size-3.5 text-brass-strong" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* პასუხის არეალი */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="rounded-box border border-rose-500/30 bg-rose-500/15 p-3 text-xs text-rose-500">{error}</div>
          )}

          {response ? (
            <div className="select-text rounded-box border border-hairline bg-main p-4 text-sm leading-relaxed text-ink">
              <KatexPreview
                tex={toKatexFriendlyTex(response.replaceAll('**', ''))}
                className="block whitespace-pre-wrap break-words text-ink [&_.katex]:text-[1rem] [&_.katex]:text-ink [&_.katex-display]:my-3"
              />
            </div>
          ) : !loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-muted">
              <Sparkles className="mb-2 size-8 stroke-1 text-brass-strong" />
              <p className="text-xs">დასვით კითხვა, ჩასვით (Ctrl+V) სურათი ან აირჩიეთ სწრაფი მოქმედება</p>
            </div>
          ) : null}

          {loading && (
            <div className="flex flex-col items-center justify-center gap-2 py-8 text-navy">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs text-muted">AI ამუშავებს პასუხს...</span>
            </div>
          )}
        </div>

        {/* Input და სურათის მიმაგრება */}
        <div className="shrink-0 space-y-2 border-t border-hairline bg-sectionHeader p-3">
          {image && (
            <div className="relative inline-flex items-center gap-2 rounded-box border border-hairline bg-main p-1.5 pr-3">
              <img
                src={image.preview}
                alt="Upload preview"
                className="h-10 w-10 rounded-box border border-hairline object-cover"
              />
              <span className="max-w-[200px] truncate text-xs text-ink">
                {image.file.name || 'დაკოპირებული სურათი'}
              </span>
              <button type="button" onClick={handleRemoveImage} className="ml-auto cursor-pointer text-muted hover:text-rose-500">
                <Trash2 className="size-3.5" />
              </button>
            </div>
          )}

          <div className="flex items-center gap-2">
            <input type="file" ref={fileInputRef} onChange={handleImageSelect} accept="image/*" className="hidden" />

            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              title="სურათის მიმაგრება"
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box border border-hairline bg-main text-icons transition-colors hover:bg-mainButtonHover hover:text-mainText">
              <ImageIcon className="size-4" />
            </button>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void executeAiRequest(prompt);
                }
              }}
              placeholder="დაწერეთ კითხვა ან ჩასვით სურათი (Ctrl+V)..."
              className="flex-1 rounded-box border border-hairline bg-searchInput px-3.5 py-2 text-xs font-medium text-searchInputText outline-none placeholder:text-muted focus:border-navy"
            />

            <button
              type="button"
              disabled={loading || (!prompt.trim() && !image)}
              onClick={() => executeAiRequest(prompt)}
              className="flex size-9 shrink-0 cursor-pointer items-center justify-center rounded-box bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)] transition-all duration-200 hover:bg-[#526C85] active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-45 disabled:shadow-none">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
