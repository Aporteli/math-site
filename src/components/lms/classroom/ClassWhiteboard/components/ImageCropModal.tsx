//CUT 

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { Check, Crop, Loader2, X } from 'lucide-react';

interface CropRect {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Props {
  src: string;
  onCancel: () => void;
  onConfirm: (croppedDataUrl: string) => void;
}

const MAX_WIDTH = 760;
const MAX_HEIGHT = 520;

const clamp = (v: number, lo: number, hi: number) => Math.min(Math.max(v, lo), hi);

export function ImageCropModal({ src, onCancel, onConfirm }: Props) {
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [display, setDisplay] = useState<{ w: number; h: number }>({ w: 0, h: 0 });
  const [crop, setCrop] = useState<CropRect>({ x: 0, y: 0, w: 0, h: 0 });

  const containerRef = useRef<HTMLDivElement>(null);
  const cropRef = useRef<CropRect>({ x: 0, y: 0, w: 0, h: 0 });
  const dragRef = useRef<{ startX: number; startY: number; moved: boolean } | null>(null);

  useEffect(() => {
    const img = new window.Image();
    img.onload = () => {
      const nw = img.naturalWidth || img.width;
      const nh = img.naturalHeight || img.height;
      setNatural({ w: nw, h: nh });

      const maxW = Math.max(240, Math.min(MAX_WIDTH, window.innerWidth - 48));
      const maxH = Math.max(160, Math.min(MAX_HEIGHT, window.innerHeight - 220));
      let w = nw;
      let h = nh;
      if (w > maxW || h > maxH) {
        const ratio = Math.min(maxW / w, maxH / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }
      setDisplay({ w, h });

      const full: CropRect = { x: 0, y: 0, w, h };
      setCrop(full);
      cropRef.current = full;
    };
    img.src = src;
  }, [src]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onCancel();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onCancel]);

  const getPos = useCallback(
    (clientX: number, clientY: number) => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return { x: 0, y: 0 };
      return {
        x: clamp(clientX - rect.left, 0, display.w),
        y: clamp(clientY - rect.top, 0, display.h),
      };
    },
    [display.w, display.h],
  );

  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    e.preventDefault();
    containerRef.current?.setPointerCapture(e.pointerId);
    const { x, y } = getPos(e.clientX, e.clientY);
    dragRef.current = { startX: x, startY: y, moved: false };
    const rect: CropRect = { x, y, w: 0, h: 0 };
    setCrop(rect);
    cropRef.current = rect;
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    const drag = dragRef.current;
    if (!drag) return;
    const { x, y } = getPos(e.clientX, e.clientY);
    if (Math.abs(x - drag.startX) > 2 || Math.abs(y - drag.startY) > 2) drag.moved = true;
    const rect: CropRect = {
      x: Math.min(drag.startX, x),
      y: Math.min(drag.startY, y),
      w: Math.abs(x - drag.startX),
      h: Math.abs(y - drag.startY),
    };
    setCrop(rect);
    cropRef.current = rect;
  };

  const handlePointerUp = () => {
    const drag = dragRef.current;
    if (!drag) return;
    const final: CropRect =
      !drag.moved || cropRef.current.w < 8 || cropRef.current.h < 8
        ? { x: 0, y: 0, w: display.w, h: display.h }
        : cropRef.current;
    setCrop(final);
    cropRef.current = final;
    dragRef.current = null;
  };

  const resetToFull = useCallback(() => {
    const full: CropRect = { x: 0, y: 0, w: display.w, h: display.h };
    setCrop(full);
    cropRef.current = full;
  }, [display.w, display.h]);

  const applyCrop = useCallback(() => {
    if (!natural || display.w === 0 || display.h === 0) return;
    const rect =
      cropRef.current.w > 0 && cropRef.current.h > 0
        ? cropRef.current
        : { x: 0, y: 0, w: display.w, h: display.h };

    const scaleX = natural.w / display.w;
    const scaleY = natural.h / display.h;
    const sx = clamp(Math.round(rect.x * scaleX), 0, natural.w - 1);
    const sy = clamp(Math.round(rect.y * scaleY), 0, natural.h - 1);
    const sw = clamp(Math.round(rect.w * scaleX), 1, natural.w - sx);
    const sh = clamp(Math.round(rect.h * scaleY), 1, natural.h - sy);

    const img = new window.Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = sw;
      canvas.height = sh;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        onConfirm(src);
        return;
      }
      ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);
      onConfirm(canvas.toDataURL('image/png'));
    };
    img.src = src;
  }, [natural, display, src, onConfirm]);

  const hasSelection = crop.w > 0 && crop.h > 0;
  const isFull =
    display.w > 0 &&
    Math.abs(crop.x) < 1 &&
    Math.abs(crop.y) < 1 &&
    Math.abs(crop.w - display.w) < 1 &&
    Math.abs(crop.h - display.h) < 1;

  const cropLabel =
    natural && display.w > 0
      ? isFull
        ? `${natural.w} × ${natural.h} px`
        : `${Math.round((crop.w * natural.w) / display.w)} × ${Math.round((crop.h * natural.h) / display.h)} px`
      : '';

  return (
    <div className="fixed inset-0 z-[1000002] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-xs animate-in fade-in duration-150">
      <button type="button" aria-label="დახურვა" className="absolute inset-0 cursor-default bg-transparent" onClick={onCancel} />

      <div className="relative z-10 flex w-full max-w-3xl flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-2xl animate-in zoom-in-95 duration-150 dark:border-slate-800 dark:bg-slate-900">
        <div className="mb-3 flex items-center justify-between border-b border-slate-100 pb-3 dark:border-slate-800">
          <div className="flex items-center gap-2">
            <div className="flex size-8 items-center justify-center rounded-lg bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              <Crop className="size-4" />
            </div>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">სურათის ამოჭრა</span>
          </div>
          <button type="button" onClick={onCancel} className="text-slate-400 transition-colors hover:text-slate-600 dark:hover:text-slate-200">
            <X className="size-4" />
          </button>
        </div>

        <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">
          გადაათრიეთ კურსორი სურათზე და მონიშნეთ ის ნაწილი, რომელიც დაფაზე უნდა განთავსდეს. დანარჩენი ნაწილი ავტომატურად მოიჭრება.
        </p>

        <div className="flex justify-center rounded-xl bg-slate-100/60 p-3 dark:bg-slate-950/40">
          {!natural ? (
            <div className="flex h-48 w-full items-center justify-center text-slate-400">
              <Loader2 className="size-6 animate-spin" />
            </div>
          ) : (
            <div
              ref={containerRef}
              className="relative touch-none select-none overflow-hidden"
              style={{ width: display.w, height: display.h }}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={src}
                alt="ამოსაჭრელი სურათი"
                draggable={false}
                className="pointer-events-none block h-full w-full object-fill"
              />

              {hasSelection && !isFull && (
                <div
                  className="pointer-events-none absolute"
                  style={{
                    left: crop.x,
                    top: crop.y,
                    width: crop.w,
                    height: crop.h,
                    boxShadow: '0 0 0 9999px rgba(2, 6, 23, 0.55)',
                    border: '1.5px dashed rgba(255, 255, 255, 0.95)',
                  }}
                >
                  <span className="absolute -top-px -left-px h-2 w-2 border-l-2 border-t-2 border-white" />
                  <span className="absolute -top-px -right-px h-2 w-2 border-r-2 border-t-2 border-white" />
                  <span className="absolute -bottom-px -left-px h-2 w-2 border-b-2 border-l-2 border-white" />
                  <span className="absolute -bottom-px -right-px h-2 w-2 border-b-2 border-r-2 border-white" />
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold text-slate-500 dark:text-slate-400">
              {cropLabel || (isFull ? 'მთლიანი სურათი' : '')}
            </span>
            {hasSelection && !isFull && (
              <button
                type="button"
                onClick={resetToFull}
                className="rounded-md px-2 py-1 text-[11px] font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/40"
              >
                გადატვირთვა
              </button>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
            >
              გაუქმება
            </button>
            <button
              type="button"
              disabled={!natural}
              onClick={applyCrop}
              className="flex items-center gap-1.5 rounded-xl bg-indigo-600 px-4 py-2 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700 active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Check className="size-3.5" />
              დაფაზე განთავსება
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

