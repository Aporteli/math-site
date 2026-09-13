'use client';

import { useEffect, useState, useSyncExternalStore } from 'react';
import { createPortal } from 'react-dom';
import { Sliders, RotateCcw, Copy, Check, X } from 'lucide-react';
import {
  temporalBackgroundSettings,
  saveTemporalBackgroundSettings,
  loadTemporalBackgroundSettings,
  resetTemporalBackgroundSettings,
  DEFAULT_TEMPORAL_BG_SETTINGS,
  type TemporalBackgroundSettings,
} from '@/lib/livekit/temporal-background-processor';

/* -------------------------------------------------------------------------- */
/* Module-level state: survives MoreMenu unmounting / re-rendering.           */
/* -------------------------------------------------------------------------- */

let panelOpen = false;
const panelListeners = new Set<() => void>();

function setPanelOpen(v: boolean) {
  if (panelOpen === v) return;
  panelOpen = v;
  panelListeners.forEach((l) => l());
}
function subscribePanel(cb: () => void) {
  panelListeners.add(cb);
  return () => {
    panelListeners.delete(cb);
  };
}
function getPanelSnapshot() {
  return panelOpen;
}

/* -------------------------------------------------------------------------- */
/* Button — render INSIDE MoreMenu                                            */
/* -------------------------------------------------------------------------- */

export function TemporalBackgroundTunerButton() {
  const open = useSyncExternalStore(
    subscribePanel,
    getPanelSnapshot,
    () => false,
  );

  const stop = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseUp: (e: React.MouseEvent) => e.stopPropagation(),
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchEnd: (e: React.TouchEvent) => e.stopPropagation(),
  };

  return (
    <button
      type="button"
      {...stop}
      onClick={(e) => {
        e.stopPropagation();
        setPanelOpen(!open);
      }}
      className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
        open
          ? 'bg-emerald-500 font-semibold text-slate-950 hover:bg-emerald-400'
          : 'bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white'
      }`}
      title="მასკის დახვეწა"
    >
      <Sliders className="size-3.5" />
      <span>დახვეწა</span>
    </button>
  );
}

/* -------------------------------------------------------------------------- */
/* Panel — render ONCE, OUTSIDE the MoreMenu React tree                        */
/* -------------------------------------------------------------------------- */

export function TemporalBackgroundTunerPanel() {
  const open = useSyncExternalStore(
    subscribePanel,
    getPanelSnapshot,
    () => false,
  );
  const [mounted, setMounted] = useState(false);
  const [copied, setCopied] = useState(false);
  const [values, setValues] = useState<TemporalBackgroundSettings>({
    ...temporalBackgroundSettings,
  });

  useEffect(() => {
    setMounted(true);
    loadTemporalBackgroundSettings();
    setValues({ ...temporalBackgroundSettings });
  }, []);

  // Kill ONLY the "start" events a global outside-click detector listens for
  // (mousedown / pointerdown / touchstart). We deliberately do NOT kill
  // `click` — React's synthetic onClick is dispatched from the native click
  // event, and stopping it in the capture phase would prevent every button
  // inside the panel (✕, reset, copy) from firing.
  useEffect(() => {
    if (!open) return;
    const panelEl = document.getElementById('temporal-bg-tuner-panel');
    if (!panelEl) return;

    const kill = (e: Event) => {
      const target = e.target as Node | null;
      if (target && panelEl.contains(target)) {
        e.stopPropagation();
        if (e.cancelable) e.stopImmediatePropagation();
      }
    };

    const types = ['mousedown', 'pointerdown', 'touchstart'];
    types.forEach((t) =>
      document.addEventListener(t, kill, { capture: true }),
    );
    return () => {
      types.forEach((t) =>
        document.removeEventListener(t, kill, { capture: true }),
      );
    };
  }, [open]);

  if (!mounted || !open) return null;

  const update = <K extends keyof TemporalBackgroundSettings>(
    key: K,
    value: number,
  ) => {
    const next = { ...values, [key]: value };
    const MIN_GAP = 0.01;
    if (key === 'personLow' && next.personLow >= next.personHigh - MIN_GAP) {
      next.personHigh = Math.min(1, next.personLow + MIN_GAP);
    }
    if (key === 'personHigh' && next.personHigh <= next.personLow + MIN_GAP) {
      next.personLow = Math.max(0, next.personHigh - MIN_GAP);
    }
    Object.assign(temporalBackgroundSettings, next);
    saveTemporalBackgroundSettings();
    setValues(next);
  };

  const reset = () => {
    resetTemporalBackgroundSettings();
    setValues({ ...temporalBackgroundSettings });
  };

  const copy = async () => {
    const text = `const DEFAULT_TEMPORAL_BG_SETTINGS: TemporalBackgroundSettings = {
  personLow: ${values.personLow.toFixed(2)},
  personHigh: ${values.personHigh.toFixed(2)},
  smoothing: ${values.smoothing.toFixed(2)},
  historyLength: ${values.historyLength},
  blurRadius: ${values.blurRadius.toFixed(2)},
};`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* ignore */
    }
  };

  const stop = {
    onClick: (e: React.MouseEvent) => e.stopPropagation(),
    onPointerDown: (e: React.PointerEvent) => e.stopPropagation(),
    onPointerUp: (e: React.PointerEvent) => e.stopPropagation(),
    onMouseDown: (e: React.MouseEvent) => e.stopPropagation(),
    onMouseUp: (e: React.MouseEvent) => e.stopPropagation(),
    onDoubleClick: (e: React.MouseEvent) => e.stopPropagation(),
    onTouchStart: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchEnd: (e: React.TouchEvent) => e.stopPropagation(),
    onTouchMove: (e: React.TouchEvent) => e.stopPropagation(),
  };

  return createPortal(
    <div
      id="temporal-bg-tuner-panel"
      {...stop}
      className="fixed bottom-24 left-4 z-[9999] w-80 rounded-2xl border border-white/10 bg-slate-900/95 p-4 shadow-2xl backdrop-blur-xl"
    >
      <div className="mb-3 flex items-center justify-between">
        <div className="text-xs font-semibold text-white/80">
          ფონის მასკის დახვეწა
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              reset();
            }}
            className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="ნაგულისხმევზე დაბრუნება"
          >
            <RotateCcw className="size-3.5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              setPanelOpen(false);
            }}
            className="rounded p-1 text-white/50 transition-colors hover:bg-white/10 hover:text-white"
            title="დახურვა"
          >
            <X className="size-3.5" />
          </button>
        </div>
      </div>

      <SectionLabel>მასკის ფორმა</SectionLabel>
      <Slider
        label="Person Low"
        hint="უფრო მაღალი = აგრესიულად შლის ფონს"
        min={0}
        max={1}
        step={0.01}
        value={values.personLow}
        defaultValue={DEFAULT_TEMPORAL_BG_SETTINGS.personLow}
        onChange={(v) => update('personLow', v)}
      />
      <Slider
        label="Person High"
        hint="უფრო დაბალი = უფრო რბილი, ფართო კიდე"
        min={0}
        max={1}
        step={0.01}
        value={values.personHigh}
        defaultValue={DEFAULT_TEMPORAL_BG_SETTINGS.personHigh}
        onChange={(v) => update('personHigh', v)}
      />

      <SectionLabel>დროითი სტაბილიზაცია</SectionLabel>
      <Slider
        label="Smoothing"
        hint="დაბალი = ნაკლები ციმციმი, მეტი შტრიხი სწრაფ მოძრაობაზე"
        min={0}
        max={1}
        step={0.01}
        value={values.smoothing}
        defaultValue={DEFAULT_TEMPORAL_BG_SETTINGS.smoothing}
        onChange={(v) => update('smoothing', v)}
      />
      <Slider
        label="History Length"
        hint="მეტი = უფრო გლუვი, მაგრამ ნელი რეაქცია (1–5)"
        min={1}
        max={5}
        step={1}
        value={values.historyLength}
        defaultValue={DEFAULT_TEMPORAL_BG_SETTINGS.historyLength}
        onChange={(v) => update('historyLength', Math.round(v))}
        formatValue={(v) => String(Math.round(v))}
      />

      <SectionLabel>სივრცული დამუშავება</SectionLabel>
      <Slider
        label="Blur Radius"
        hint="რბილებს კიდეს. 0 = გამორთული (0–3)"
        min={0}
        max={3}
        step={0.1}
        value={values.blurRadius}
        defaultValue={DEFAULT_TEMPORAL_BG_SETTINGS.blurRadius}
        onChange={(v) => update('blurRadius', v)}
      />

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          void copy();
        }}
        className="mt-3 flex w-full items-center justify-center gap-1.5 rounded-lg bg-white/5 px-2 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white"
      >
        {copied ? (
          <>
            <Check className="size-3.5" /> დაკოპირდა
          </>
        ) : (
          <>
            <Copy className="size-3.5" /> დააკოპირე კოდისთვის
          </>
        )}
      </button>

      <div className="mt-2 text-[10px] leading-tight text-white/40">
        ცვლილებები მყისიერად მოქმედებს. შენახვა ავტომატურია.
      </div>
    </div>,
    document.body,
  );
}

/* -------------------------------------------------------------------------- */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div className="mt-1 mb-2 text-[10px] font-semibold tracking-wider text-white/30 uppercase">
      {children}
    </div>
  );
}

function Slider({
  label,
  hint,
  min,
  max,
  step,
  value,
  defaultValue,
  onChange,
  formatValue,
}: {
  label: string;
  hint: string;
  min: number;
  max: number;
  step: number;
  value: number;
  defaultValue: number;
  onChange: (v: number) => void;
  formatValue?: (v: number) => string;
}) {
  const isDefault = Math.abs(value - defaultValue) < 0.005;
  const display = formatValue ? formatValue(value) : value.toFixed(2);
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="mb-3">
      <div className="mb-1 flex items-baseline justify-between">
        <span className="text-[11px] font-medium text-white/80">{label}</span>
        <span
          className={`font-mono text-[11px] ${
            isDefault ? 'text-white/40' : 'text-emerald-300'
          }`}
        >
          {display}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        onClick={stop}
        onPointerDown={stop}
        onPointerUp={stop}
        onMouseDown={stop}
        onMouseUp={stop}
        onTouchStart={stop}
        onTouchEnd={stop}
        className="h-1.5 w-full cursor-pointer appearance-none rounded-full bg-white/10 accent-emerald-400"
      />
      <div className="mt-0.5 text-[10px] leading-tight text-white/40">
        {hint}
      </div>
    </div>
  );
}