import type { ClipboardEvent } from "react";
import {
  formatMathForReading,
  toKatexFriendlyTex,
  toSuperscriptChars,
} from "@/lib/math/problems/tex";

const MATH_LETTER_STYLES = [
  0x1d400, 0x1d434, 0x1d468, 0x1d4d0, 0x1d504, 0x1d538, 0x1d56c, 0x1d5a0,
  0x1d5d4, 0x1d608, 0x1d63c, 0x1d670,
] as const;

const MATH_DIGIT_STYLES = [
  0x1d7ce, 0x1d7d8, 0x1d7e2, 0x1d7ec, 0x1d7f6,
] as const;

export type PlainTextPasteMode = "reading" | "katex";

function mathAlphanumericToAscii(codePoint: number) {
  for (const base of MATH_LETTER_STYLES) {
    const offset = codePoint - base;
    if (offset >= 0 && offset < 52) {
      return offset < 26
        ? String.fromCharCode(65 + offset)
        : String.fromCharCode(97 + offset - 26);
    }
  }

  for (const base of MATH_DIGIT_STYLES) {
    const offset = codePoint - base;
    if (offset >= 0 && offset < 10) {
      return String.fromCharCode(48 + offset);
    }
  }

  return null;
}

/** Convert 𝑎, 𝐴, etc. from copied math pages back to ordinary ASCII letters. */
export function demathUnicode(text: string) {
  let out = "";
  for (const char of text) {
    const codePoint = char.codePointAt(0);
    if (codePoint === undefined) continue;
    out += mathAlphanumericToAscii(codePoint) ?? char;
  }
  return out;
}

const SUBSCRIPT_CHARS: Record<string, string> = {
  "0": "₀",
  "1": "₁",
  "2": "₂",
  "3": "₃",
  "4": "₄",
  "5": "₅",
  "6": "₆",
  "7": "₇",
  "8": "₈",
  "9": "₉",
  "+": "₊",
  "-": "₋",
  "=": "₌",
  "(": "₍",
  ")": "₎",
};

function toSubscriptChars(value: string) {
  return [...value].map((char) => SUBSCRIPT_CHARS[char] ?? char).join("");
}

function serializeHtmlNode(node: Node, mode: PlainTextPasteMode): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent ?? "";
  if (node.nodeType !== Node.ELEMENT_NODE) return "";

  const element = node as Element;
  const tag = element.tagName.toLowerCase();
  if (tag === "br") return "\n";

  const inner = Array.from(element.childNodes)
    .map((child) => serializeHtmlNode(child, mode))
    .join("");

  if (tag === "sup") {
    return mode === "katex" ? `^{${inner}}` : toSuperscriptChars(inner);
  }
  if (tag === "sub") {
    return mode === "katex" ? `_{${inner}}` : toSubscriptChars(inner);
  }

  return inner;
}

function htmlToPlainText(html: string, mode: PlainTextPasteMode) {
  if (typeof document === "undefined") return "";
  const doc = new DOMParser().parseFromString(html, "text/html");
  doc.querySelectorAll("script, style, noscript").forEach((node) => node.remove());
  return serializeHtmlNode(doc.body, mode);
}

function readClipboardPlainText(data: DataTransfer, mode: PlainTextPasteMode) {
  const plain = data.getData("text/plain");
  const html = data.getData("text/html");

  // Prefer plain when it already carries LaTeX delimiters from MathJax/KaTeX sites.
  if (mode === "katex" && /\$|\\\(|\\\[|\\frac/.test(plain)) {
    return plain;
  }

  if (html.trim()) {
    const fromHtml = htmlToPlainText(html, mode);
    if (fromHtml.trim()) return fromHtml;
  }

  return plain;
}

function cleanClipboardText(text: string) {
  return demathUnicode(text.normalize("NFKC"))
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u00a0/g, " ")
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\u2212/g, "-")
    .replace(/[\u2010-\u2015\u2212\uFE58\uFE63\uFF0D]/g, "-");
}

/** Strip HTML/unicode math fonts; optionally keep KaTeX-friendly markup. */
export function normalizePastedPlainText(
  text: string,
  mode: PlainTextPasteMode = "reading",
) {
  const cleaned = cleanClipboardText(text);
  if (mode === "katex") return toKatexFriendlyTex(cleaned);
  return formatMathForReading(cleaned, { trim: false });
}

export function insertPlainTextAtCursor(
  current: string,
  pasted: string,
  start: number,
  end: number,
  maxLength?: number,
  mode: PlainTextPasteMode = "reading",
) {
  const normalized = normalizePastedPlainText(pasted, mode);
  const next = current.slice(0, start) + normalized + current.slice(end);
  return maxLength !== undefined ? next.slice(0, maxLength) : next;
}

/** Force clipboard paste into a textarea as plain / KaTeX-friendly text. */
export function handlePlainTextPaste(
  event: ClipboardEvent<HTMLTextAreaElement>,
  current: string,
  setValue: (value: string) => void,
  maxLength?: number,
  mode: PlainTextPasteMode = "reading",
) {
  event.preventDefault();
  event.stopPropagation();

  const pasted = readClipboardPlainText(event.clipboardData, mode);
  if (!pasted) return;

  const field = event.currentTarget;
  const start = field.selectionStart ?? current.length;
  const end = field.selectionEnd ?? current.length;
  const normalized = normalizePastedPlainText(pasted, mode);
  const next = insertPlainTextAtCursor(
    current,
    pasted,
    start,
    end,
    maxLength,
    mode,
  );
  setValue(next);

  const cursor = Math.min(start + normalized.length, next.length);
  requestAnimationFrame(() => {
    field.setSelectionRange(cursor, cursor);
  });
}
