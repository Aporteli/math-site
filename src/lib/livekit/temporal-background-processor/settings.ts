export interface TemporalBackgroundSettings {
  /** Pixels below this person-ness are dropped to background. */
  personLow: number;
  /** Pixels above this are full person. Must be > personLow. */
  personHigh: number;
  /** EMA weight applied on top of the multi-frame average (0–1). */
  smoothing: number;
  /** Number of previous frames to average (2–5 recommended). */
  historyLength: number;
  /** Spatial blur radius in mask pixels (0 = off, 1–2 is usually enough). */
  blurRadius: number;
}

export const DEFAULT_TEMPORAL_BG_SETTINGS: TemporalBackgroundSettings = {
  personLow: 0.42,
  personHigh: 0.75,
  smoothing: 0.45,
  historyLength: 3,
  blurRadius: 1.5,
};

/**
 * Mutable, module-level settings. The compositor reads these every frame, so
 * changing them from a UI takes effect on the next rendered frame without
 * recreating the processor.
 */
export const temporalBackgroundSettings: TemporalBackgroundSettings = {
  ...DEFAULT_TEMPORAL_BG_SETTINGS,
};

const LS_KEY = 'temporal-bg-settings-v1';

function clamp01(v: number): number {
  return v < 0 ? 0 : v > 1 ? 1 : v;
}

export function loadTemporalBackgroundSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    const raw = window.localStorage.getItem(LS_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw) as Partial<TemporalBackgroundSettings>;
    if (typeof parsed.personLow === 'number') {
      temporalBackgroundSettings.personLow = clamp01(parsed.personLow);
    }
    if (typeof parsed.personHigh === 'number') {
      temporalBackgroundSettings.personHigh = clamp01(parsed.personHigh);
    }
    if (typeof parsed.smoothing === 'number') {
      temporalBackgroundSettings.smoothing = clamp01(parsed.smoothing);
    }
    if (typeof parsed.historyLength === 'number') {
      temporalBackgroundSettings.historyLength = Math.max(
        1,
        Math.min(5, Math.round(parsed.historyLength)),
      );
    }
    if (typeof parsed.blurRadius === 'number') {
      temporalBackgroundSettings.blurRadius = Math.max(0, parsed.blurRadius);
    }
  } catch {
    /* ignore */
  }
}

export function saveTemporalBackgroundSettings(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(
      LS_KEY,
      JSON.stringify(temporalBackgroundSettings),
    );
  } catch {
    /* ignore */
  }
}

export function resetTemporalBackgroundSettings(): void {
  Object.assign(temporalBackgroundSettings, DEFAULT_TEMPORAL_BG_SETTINGS);
  saveTemporalBackgroundSettings();
}
