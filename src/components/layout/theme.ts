export const THEME_STORAGE_KEY = 'theme';

export type Theme = 'light' | 'dark';

const THEME_EVENT = 'themechange';

/**
 * Runs in <head> during HTML parse, before the first paint.
 * Keep this in lockstep with resolveTheme(): stored "theme", then prefers-color-scheme.
 * classList.toggle leaves the Georgian font classes in place.
 */
export const themeInitScript = `(function(){try{var stored=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});if(stored==="light"||stored==="dark"){document.documentElement.classList.toggle("dark",stored==="dark");return;}}catch(e){}try{document.documentElement.classList.toggle("dark",window.matchMedia("(prefers-color-scheme: dark)").matches);}catch(e){}})();`;

export function resolveTheme(): Theme {
  if (typeof window === 'undefined') return 'light';
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark') return stored;
  } catch {
    // Ignore storage errors (private mode, disabled storage).
  }
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  } catch {
    return 'light';
  }
}

export function getAppliedTheme(): Theme {
  return document.documentElement.classList.contains('dark') ? 'dark' : 'light';
}

export function applyTheme(theme: Theme) {
  document.documentElement.classList.toggle('dark', theme === 'dark');
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {
    // Ignore storage errors.
  }
  window.dispatchEvent(new Event(THEME_EVENT));
}

export function subscribeTheme(listener: () => void) {
  window.addEventListener(THEME_EVENT, listener);
  return () => window.removeEventListener(THEME_EVENT, listener);
}
