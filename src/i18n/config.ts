export const locales = ["ka", "en", "ru"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ka";

export const localeCookie = "NEXT_LOCALE";

export const localeNames: Record<Locale, { label: string; short: string }> = {
  ka: { label: "ქართული", short: "KA" },
  en: { label: "English", short: "EN" },
  ru: { label: "Русский", short: "RU" },
};

export function isLocale(value: string): value is Locale {
  return locales.includes(value as Locale);
}

/** Prefixes an app-relative path with the active locale: `/tools` -> `/en/tools`. */
export function localePath(locale: Locale, path: string) {
  return path === "/" ? `/${locale}` : `/${locale}${path}`;
}
