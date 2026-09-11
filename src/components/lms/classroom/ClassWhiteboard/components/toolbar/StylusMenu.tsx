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
    <div className="flex shrink-0 items-center gap-0.5 border-r border-slate-200 pr-1.5 dark:border-slate-800">
      <div ref={menuRef} className="relative flex shrink-0 items-center gap-0.5">
        <button
          type="button"
          onClick={onToggleStylusOnly}
          title={stylusOnly ? 'მხოლოდ სტილუსი (ჩართული)' : 'მხოლოდ სტილუსი (გამორთული)'}
          className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
            stylusOnly
              ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
          <PenTool className="size-3.5 sm:size-4" />
        </button>

        <button
          type="button"
          onClick={() => { setIsOpen(!isOpen); closeOtherMenus(); }}
          title="სტილუსის ღილაკების პარამეტრები"
          className={`flex size-7 sm:size-8 shrink-0 items-center justify-center rounded-xl transition-colors ${
            isOpen
              ? 'bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100'
              : 'hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300'
          }`}>
          <Settings2 className="size-3.5 sm:size-4" />
        </button>

        {isOpen && (
          <div className="absolute top-full mt-2 right-0 z-[120] w-64 rounded-2xl bg-white dark:bg-slate-900 p-3 shadow-2xl border border-slate-200 dark:border-slate-800 animate-in fade-in zoom-in-95 duration-150">
            <p className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3">სტილუსის ღილაკები</p>

            <label htmlFor="stylus-primary-action" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              სტილუსის ღილაკი 1 (ქვედა)
            </label>
            <select
              id="stylus-primary-action"
              value={stylusPrimaryAction}
              onChange={(e) => setStylusPrimaryAction(e.target.value as StylusButtonAction)}
              className="mb-3 w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40">
              {STYLUS_BUTTON_ACTIONS.map((action) => (
                <option key={action} value={action}>{STYLUS_ACTION_LABELS[action]}</option>
              ))}
            </select>

            <label htmlFor="stylus-secondary-action" className="block text-[11px] font-medium text-slate-500 dark:text-slate-400 mb-1">
              სტილუსის ღილაკი 2 (ზედა)
            </label>
            <select
              id="stylus-secondary-action"
              value={stylusSecondaryAction}
              onChange={(e) => setStylusSecondaryAction(e.target.value as StylusButtonAction)}
              className="w-full h-8 rounded-lg border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 text-xs text-slate-700 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500/40">
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