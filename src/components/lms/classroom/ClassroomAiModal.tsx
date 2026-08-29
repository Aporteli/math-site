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
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs">
      {/* 👈 გარეთ დაკლიკების ფონური ღილაკი */}
      <button
        type="button"
        aria-label="დახურვა"
        onClick={onClose}
        className="absolute inset-0 h-full w-full cursor-default bg-transparent"
      />

      <div className="relative z-10 flex h-[88vh] w-full max-w-3xl flex-col rounded-2xl border border-white/10 bg-slate-900 text-white shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex h-14 shrink-0 items-center justify-between border-b border-white/10 px-4 bg-slate-950/60">
          <div className="flex items-center gap-2 text-indigo-400">
            <Sparkles className="size-5" />
            <span className="font-bold text-sm sm:text-base text-white">AI გაკვეთილის ასისტენტი</span>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={selectedModel}
              onChange={(e) => setSelectedModel(e.target.value as AiModelId)}
              className="rounded-lg bg-slate-800 border border-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 outline-none focus:border-indigo-500">
              {AI_MODELS.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id} ({m.provider})
                </option>
              ))}
            </select>

            <button
              type="button"
              onClick={onClose}
              className="flex size-8 items-center justify-center rounded-lg bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-400 transition-colors">
              <X className="size-4" />
            </button>
          </div>
        </div>

        {/* 3 სწრაფი პრომპტის ღილაკი */}
        <div className="flex flex-wrap items-center gap-2 border-b border-white/5 bg-slate-950/30 p-2.5">
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
                className="flex items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-500/10 px-2.5 py-1 text-xs font-medium text-indigo-300 hover:bg-indigo-500/20 hover:border-indigo-500/40 disabled:opacity-50 transition-all">
                <Icon className="size-3.5 text-indigo-400" />
                <span>{qp.label}</span>
              </button>
            );
          })}
        </div>

        {/* პასუხის არეალი */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {error && (
            <div className="rounded-xl border border-rose-500/20 bg-rose-500/10 p-3 text-xs text-rose-400">{error}</div>
          )}

          {response ? (
            <div className="rounded-xl border border-white/5 bg-slate-800/60 p-4 text-sm leading-relaxed text-slate-200 select-text">
              <KatexPreview
                tex={toKatexFriendlyTex(response.replaceAll('**', ''))}
                className="block break-words whitespace-pre-wrap text-slate-200 [&_.katex-display]:my-3 [&_.katex]:text-[1rem] [&_.katex]:text-white"
              />
            </div>
          ) : !loading ? (
            <div className="flex h-full flex-col items-center justify-center text-center text-slate-500">
              <Sparkles className="size-8 text-slate-600 mb-2 stroke-1" />
              <p className="text-xs">დასვით კითხვა, ჩასვით (Ctrl+V) სურათი ან აირჩიეთ სწრაფი მოქმედება</p>
            </div>
          ) : null}

          {loading && (
            <div className="flex flex-col items-center justify-center py-8 gap-2 text-indigo-400">
              <Loader2 className="size-6 animate-spin" />
              <span className="text-xs text-slate-400">AI ამუშავებს პასუხს...</span>
            </div>
          )}
        </div>

        {/* Input და სურათის მიმაგრება */}
        <div className="shrink-0 border-t border-white/10 bg-slate-950/80 p-3 space-y-2">
          {image && (
            <div className="relative inline-flex items-center gap-2 rounded-lg border border-white/10 bg-slate-800 p-1.5 pr-3">
              <img
                src={image.preview}
                alt="Upload preview"
                className="h-10 w-10 rounded object-cover border border-white/5"
              />
              <span className="text-xs text-slate-300 max-w-[200px] truncate">
                {image.file.name || 'დაკოპირებული სურათი'}
              </span>
              <button type="button" onClick={handleRemoveImage} className="ml-auto text-slate-400 hover:text-rose-400">
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
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-slate-800 border border-white/10 text-slate-300 hover:bg-slate-700 transition-colors">
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
              className="flex-1 rounded-xl bg-slate-800 border border-white/10 px-3.5 py-2 text-xs text-white placeholder:text-slate-500 outline-none focus:border-indigo-500"
            />

            <button
              type="button"
              disabled={loading || (!prompt.trim() && !image)}
              onClick={() => executeAiRequest(prompt)}
              className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white hover:bg-indigo-500 disabled:opacity-40 transition-colors">
              {loading ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
