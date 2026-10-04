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
    <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
      <button
        type="button"
        data-toolbar-key="text"
        title="ტექსტი"
        onClick={() => {
          setActiveTool('text');
          setIsOpen(false);
          closeOtherMenus();
        }}
        className="flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box text-mainText transition-all duration-200 hover:bg-mainButtonHover hover:text-mainText active:scale-[0.98] sm:size-8">
        <Type className="size-3.5 sm:size-4" />
      </button>

      <div ref={menuRef} data-toolbar-key="image" className="relative flex shrink-0 items-center">
        <div className="flex h-7 items-center rounded-box text-mainText transition-colors sm:h-8">
          <button
            type="button"
            title="სურათის ატვირთვა"
            onClick={() => {
              onFileInputClick();
              setIsOpen(false);
            }}
            className="flex size-7 cursor-pointer items-center justify-center rounded-box hover:bg-mainButtonHover hover:text-mainText focus:outline-none sm:size-8">
            <ImageIcon className="size-3.5 sm:size-4" />
          </button>

          <button
            type="button"
            title="სურათის მენიუ"
            onClick={() => {
              setIsOpen(!isOpen);
              closeOtherMenus();
            }}
            className="flex h-full cursor-pointer items-center justify-center rounded-box border-l border-hairline px-1 text-mainText transition-colors duration-200 hover:bg-mainButtonHover hover:text-mainText">
            <ChevronDown
              className={`size-3 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
            />
          </button>
        </div>

        {isOpen && (
          <div className="absolute top-full left-0 z-[120] mt-2 w-52 animate-in rounded-box border border-hairline bg-main p-1.5 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150">
            <button
              type="button"
              onClick={() => {
                onFileInputClick();
                setIsOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-bold text-mainText transition-colors hover:bg-sectionHeader">
              <ImageIcon className="size-3.5" />
              <span>სურათის ატვირთვა</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onPasteImage();
                setIsOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-bold text-mainText transition-colors hover:bg-sectionHeader">
              <Clipboard className="size-3.5" />
              <span>ჩასმა (Paste)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCropImage();
                setIsOpen(false);
              }}
              className="flex w-full cursor-pointer items-center gap-2 rounded-box px-2.5 py-1.5 text-xs font-bold text-mainText transition-colors hover:bg-sectionHeader">
              <Crop className="size-3.5" />
              <span>ამოჭრა (Crop)</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}