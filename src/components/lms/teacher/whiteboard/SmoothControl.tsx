'use client';

import { ChevronDown, Spline } from 'lucide-react';
import type { TeacherWhiteboardModel } from './useTeacherWhiteboard';

export function SmoothControl({ model }: { model: TeacherWhiteboardModel }) {
  const {
    isSmoothMenuOpen,
    penSmoothEnabled,
    penSmoothIntensity,
    savePreferencesImmediately,
    setIsColorMenuOpen,
    setIsEraserMenuOpen,
    setIsPenMenuOpen,
    setIsShapesMenuOpen,
    setIsSmoothMenuOpen,
    setIsStylusMenuOpen,
    setPenSmoothEnabled,
    setPenSmoothIntensity,
    smoothMenuRef,
  } = model;
  return (
            <div ref={smoothMenuRef} className="relative flex shrink-0 items-center">
              <div
                className={`flex items-center h-8 rounded-box transition-all shadow-xs ${
                  penSmoothEnabled
                    ? 'bg-[#465D73] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12),0_2px_5px_rgba(70,93,115,0.2)]'
                    : 'border border-hairline bg-main text-mainText hover:bg-mainButtonHover'
                }`}>
                <button
                  type="button"
                  title={penSmoothEnabled ? 'ხელწერის გასწორება ჩართულია' : 'ხელწერის გასწორება'}
                  onClick={() => {
                    const next = !penSmoothEnabled;
                    setPenSmoothEnabled(next);
                    savePreferencesImmediately({ penSmoothEnabled: next });
                  }}
                  className="flex items-center justify-center size-8 rounded-box">
                  <Spline className="size-4" />
                </button>
                <button
                  type="button"
                  title="ინტენსივობა"
                  onClick={() => {
                    setIsSmoothMenuOpen((prev) => !prev);
                    setIsPenMenuOpen(false);
                    setIsShapesMenuOpen(false);
                    setIsColorMenuOpen(false);
                    setIsStylusMenuOpen(false);
                    setIsEraserMenuOpen(false);
                  }}
                  className={`flex items-center justify-center px-1.5 h-full rounded-box border-l ${
                    penSmoothEnabled ? 'border-white/20 hover:bg-[#526C85]' : 'border-hairline hover:bg-paper'
                  }`}>
                  <ChevronDown className={`size-3 transition-transform ${isSmoothMenuOpen ? 'rotate-180' : ''}`} />
                </button>
              </div>
              {isSmoothMenuOpen && (
                <div className="absolute top-full mt-2 left-0 z-[120] w-56 rounded-box border border-hairline bg-main shadow-[0_8px_24px_rgba(0,0,0,0.12)] p-3">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-hairline">
                    <span className="text-xs font-semibold text-ink">გასწორების ინტენსივობა</span>
                    <span className="text-xs font-mono font-bold text-navy">
                      {Math.round(penSmoothIntensity * 100)}%
                    </span>
                  </div>
                  <input
                    type="range"
                    min={0.001}
                    max={1}
                    step={0.005}
                    value={penSmoothIntensity}
                    onChange={(e) => {
                      const next = parseFloat(e.target.value);
                      setPenSmoothIntensity(next);
                      savePreferencesImmediately({ penSmoothIntensity: next });
                    }}
                    className="w-full h-1.5 bg-paper-deep rounded-box appearance-none cursor-pointer accent-[#465D73]"
                  />
                </div>
              )}
            </div>
  );
}
