import en from "./messages/en.json";
import ka from "./messages/ka.json";
import ru from "./messages/ru.json";
import { defaultLocale, type Locale } from "./config";
import type { Dictionary } from "./types";

const dictionaries: Record<Locale, Dictionary> = { ka, en, ru };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale] ?? dictionaries[defaultLocale];
}
