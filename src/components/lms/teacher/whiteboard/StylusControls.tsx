'use client';

import { PenTool, Settings2 } from 'lucide-react';
import { STYLUS_BUTTON_ACTIONS } from './stylusKeys';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';
import type { StylusButtonAction, WhiteboardCopy } from './types';

export function StylusControls({ model, copy }: { model: TeacherWhiteboardModel; copy: WhiteboardCopy }) {
  const {
    isStylusMenuOpen,
    savePreferencesImmediately,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsShapesMenuOpen,
    setIsStylusMenuOpen,
    setStylusOnly,
    setStylusPrimaryAction,
    setStylusSecondaryAction,
    stylusMenuRef,
    stylusOnly,
    stylusPrimaryAction,
    stylusSecondaryAction,
  } = model;
  return (
          <div className="flex shrink-0 items-center gap-0.5 border-r border-hairline pr-1.5">
            <div ref={stylusMenuRef} className="relative flex shrink-0 items-center gap-0.5">
              <button
                type="button"
                onClick={() => {
                  const next = !stylusOnly;
                  setStylusOnly(next);
                  savePreferencesImmediately({ stylusOnly: next });
                }}
                title={stylusOnly ? copy.stylusOnlyOn : copy.stylusOnlyOff}
                aria-label={stylusOnly ? copy.stylusOnlyOn : copy.stylusOnlyOff}
                aria-pressed={stylusOnly}
                className={`flex size-8 shrink-0 items-center justify-center rounded-box transition-colors ${
                  stylusOnly
                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-600/30'
                    : 'text-body hover:bg-paper hover:text-navy'
                }`}>
                <PenTool className="size-4" />
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsStylusMenuOpen((prev) => !prev);
                  setIsPenMenuOpen(false);
                  setIsShapesMenuOpen(false);
                  setIsColorMenuOpen(false);
                  setIsEraserMenuOpen(false);
                }}
                title={copy.stylusSettings}
                aria-label={copy.stylusSettings}
                aria-expanded={isStylusMenuOpen}
                className={`flex size-8 shrink-0 items-center justify-center rounded-box transition-colors ${
                  isStylusMenuOpen ? 'bg-paper-deep text-navy' : 'text-body hover:bg-paper hover:text-navy'
                }`}>
                <Settings2 className="size-4" />
              </button>
              {isStylusMenuOpen && (
                <div className="absolute top-full mt-2 right-0 z-[120] w-64 rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3 animate-in fade-in zoom-in-95 duration-150">
                  <p className="text-xs font-semibold text-ink mb-3">{copy.stylusButtons}</p>
                  <label
                    htmlFor="teacher-stylus-primary-action"
                    className="block text-[11px] font-medium text-muted mb-1">
                    {copy.stylusButton1}
                  </label>
                  <select
                    id="teacher-stylus-primary-action"
                    value={stylusPrimaryAction}
                    onChange={(e) => {
                      const next = e.target.value as StylusButtonAction;
                      setStylusPrimaryAction(next);
                      savePreferencesImmediately({ stylusPrimaryAction: next });
                    }}
                    className="mb-3 h-8 w-full rounded-box border border-hairline bg-searchInput px-2 text-xs text-searchInputText outline-none focus:border-navy">
                    {STYLUS_BUTTON_ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {copy.stylusActions[action]}
                      </option>
                    ))}
                  </select>
                  <label
                    htmlFor="teacher-stylus-secondary-action"
                    className="block text-[11px] font-medium text-muted mb-1">
                    {copy.stylusButton2}
                  </label>
                  <select
                    id="teacher-stylus-secondary-action"
                    value={stylusSecondaryAction}
                    onChange={(e) => {
                      const next = e.target.value as StylusButtonAction;
                      setStylusSecondaryAction(next);
                      savePreferencesImmediately({ stylusSecondaryAction: next });
                    }}
                    className="h-8 w-full rounded-box border border-hairline bg-searchInput px-2 text-xs text-searchInputText outline-none focus:border-navy">
                    {STYLUS_BUTTON_ACTIONS.map((action) => (
                      <option key={action} value={action}>
                        {copy.stylusActions[action]}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </div>
  );
}
