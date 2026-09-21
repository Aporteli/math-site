import type { Locale } from "@/i18n/config";
import type { Dictionary } from "@/i18n/types";

// ./types.ts
export interface VectorFunctionProps {
  locale: "ka" | "en" | "ru";
  title: string;
  description: string;
  copy: {
    meta: { title: string; description: string };
    back: string;
    eyebrow: string;
    badge: string;
    inputTitle: string;
    xComponent: string;
    yComponent: string;
    zComponent: string;
    syntax: string[];
    [key: string]: any; // დანარჩენი 34 ველის დასაშვებად
  };
}