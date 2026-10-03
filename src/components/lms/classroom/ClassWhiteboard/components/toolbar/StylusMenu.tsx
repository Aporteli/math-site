'use client';

import type { RefObject } from 'react';
import { PenTool, Settings2 } from 'lucide-react';
import { STYLUS_ACTION_LABELS, STYLUS_BUTTON_ACTIONS, type StylusButtonAction } from '../../constants/stylus';

interface Props {
  menuRef: RefObject<HTMLDivElement | null>;
  isOpen: boolean;
  setIsOpen: (v: boolean) => void;
  stylusOnly: boolean;
  onToggleStylusOnly: () => void;
  stylusPrimaryAction: StylusButtonAction;
  setStylusPrimaryAction: (a: StylusButtonAction) => void;
  stylusSecondaryAction: StylusButtonAction;
  setStylusSecondaryAction: (a: StylusButtonAction) => void;
  closeOtherMenus: () => void;
}

export function StylusMenu({
  menuRef, isOpen, setIsOpen, stylusOnly, onToggleStylusOnly,
  stylusPrimaryAction, setStylusPrimaryAction,
  stylusSecondaryAction, setStylusSecondaryAction, closeOtherMenus,
}: Props) {
  return (
    <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
      <div ref={menuRef} className="relative flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          data-toolbar-key="stylus"
          onClick={onToggleStylusOnly}
          title={stylusOnly ? 'მხოლოდ სტილუსი (ჩართული)' : 'მხოლოდ სტილუსი (გამორთული)'}
          className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box transition-all duration-200 active:scale-[0.98] sm:size-8 ${
            stylusOnly
              ? 'bg-[#A66A32] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.14),0_2px_5px_rgba(166,106,50,0.22)]'
              : 'text-icons hover:bg-mainButtonHover hover:text-mainText'
          }`}>
          <PenTool className="size-3.5 sm:size-4" />
        </button>

        <button
          type="button"
          onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
          title="სტილუსის ღილაკების პარამეტრები"
          className={`flex size-7 shrink-0 cursor-pointer items-center justify-center rounded-box transition-all duration-200 active:scale-[0.98] sm:size-8 ${
            isOpen
              ? 'bg-mainButton text-mainText shadow-[inset_0_1px_0_rgba(255,255,255,0.45),inset_0_-1px_0_rgba(0,0,0,0.08)]'
              : 'text-icons hover:bg-mainButtonHover hover:text-mainText'
          }`}>
          <Settings2 className="size-3.5 sm:size-4" />
        </button>

        {isOpen && (
          <div className="absolute top-full right-0 z-[120] mt-2 w-64 animate-in rounded-box border border-hairline bg-main p-3 shadow-[0_8px_24px_rgba(0,0,0,0.12)] fade-in zoom-in-95 duration-150">
            <p className="mb-3 text-xs font-bold text-mainText">სტილუსის ღილაკები</p>

            <label htmlFor="stylus-primary-action" className="mb-1 block text-xs font-bold text-muted">
              სტილუსის ღილაკი 1 (ქვედა)
            </label>
            <select
              id="stylus-primary-action"
              value={stylusPrimaryAction}
              onChange={(e) => setStylusPrimaryAction(e.target.value as StylusButtonAction)}
              className="mb-3 h-8 w-full rounded-box border border-hairline bg-searchInput px-2 text-xs font-medium text-searchInputText outline-none focus:border-navy">
              {STYLUS_BUTTON_ACTIONS.map((action) => (
                <option key={action} value={action}>{STYLUS_ACTION_LABELS[action]}</option>
              ))}
            </select>

            <label htmlFor="stylus-secondary-action" className="mb-1 block text-xs font-bold text-muted">
              სტილუსის ღილაკი 2 (ზედა)
            </label>
            <select
              id="stylus-secondary-action"
              value={stylusSecondaryAction}
              onChange={(e) => setStylusSecondaryAction(e.target.value as StylusButtonAction)}
              className="h-8 w-full rounded-box border border-hairline bg-searchInput px-2 text-xs font-medium text-searchInputText outline-none focus:border-navy">
              {STYLUS_BUTTON_ACTIONS.map((action) => (
                <option key={action} value={action}>{STYLUS_ACTION_LABELS[action]}</option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}