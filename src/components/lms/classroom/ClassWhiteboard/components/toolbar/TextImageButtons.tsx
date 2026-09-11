//CUT დასაჭერელია

'use client';

import type { RefObject } from 'react';
import { ChevronDown, Clipboard, Crop, ImageIcon, Type } from 'lucide-react';

interface Props {
  activeTool: any;
  setActiveTool: (t: any) => void;
  onFileInputClick: () => void;
  onPasteImage: () => void;
  onCropImage: () => void;
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  closeOtherMenus: () => void;
}

export function TextImageButtons({
  activeTool,
  setActiveTool,
  onFileInputClick,
  onPasteImage,
  onCropImage,
  menuRef,
  isOpen,
  setIsOpen,
  closeOtherMenus,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      <button
        type="button"
        title="ტექსტი"
        onClick={() => {
          setActiveTool('text');
          setIsOpen(false);
          closeOtherMenus();
        }}
        className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
          activeTool === 'text'
            ? 'bg-indigo-600 text-white shadow-xs'
            : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
        }`}>
        <Type className="size-3.5 sm:size-4" />
      </button>

      <div ref={menuRef} className="relative flex shrink-0 items-center">
        <div className="flex items-center h-7 sm:h-8 rounded-xl transition-colors text-slate-600 dark:text-slate-300">
          <button
            type="button"
            title="სურათის ატვირთვა"
            onClick={() => {
              onFileInputClick();
              setIsOpen(false);
            }}
            className="flex items-center justify-center size-7 sm:size-8 rounded-l-xl focus:outline-none hover:bg-slate-100 dark:hover:bg-slate-800">
            <ImageIcon className="size-3.5 sm:size-4" />
          </button>

          <button
            type="button"
            title="სურათის მენიუ"
            onClick={() => {
              setIsOpen(!isOpen);
              closeOtherMenus();
            }}
            className={`flex items-center justify-center px-1 h-full rounded-r-xl transition-colors border-l ${
              isOpen
                ? 'border-indigo-500/40 bg-indigo-600 text-white'
                : 'border-slate-200 dark:border-slate-700 hover:bg-slate-200 dark:hover:bg-slate-700'
            }`}>
            <ChevronDown
              className={`size-2.5 sm:size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full mt-2 left-0 z-[120] w-52 rounded-2xl bg-white dark:bg-slate-900 p-1.5 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                onFileInputClick();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
              <ImageIcon className="size-4" />
              <span>სურათის ატვირთვა</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPasteImage();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
              <Clipboard className="size-4" />
              <span>ჩასმა (Paste)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCropImage();
                setIsOpen(false);
              }}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-semibold hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300 rounded-lg transition-colors">
              <Crop className="size-4" />
              <span>ამოჭრა (Crop)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
