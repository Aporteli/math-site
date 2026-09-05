"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";
import { polishStudentTex } from "@/lib/math/problems/tex";

type Segment =
  | { type: "text"; value: string }
  | { type: "math"; value: string; display: boolean };

function splitMathSegments(input: string): Segment[] {
  const segments: Segment[] = [];
  const pattern =
    /\$\$([\s\S]+?)\$\$|\$([^$\n]+)\$|\\\(([\s\S]+?)\\\)|\\\[([\s\S]+?)\\\]/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = pattern.exec(input))) {
    if (match.index > last) {
      segments.push({ type: "text", value: input.slice(last, match.index) });
    }
    if (match[1] !== undefined) {
      segments.push({ type: "math", value: match[1], display: true });
    } else if (match[2] !== undefined) {
      segments.push({ type: "math", value: match[2], display: false });
    } else if (match[3] !== undefined) {
      segments.push({ type: "math", value: match[3], display: false });
    } else if (match[4] !== undefined) {
      segments.push({ type: "math", value: match[4], display: true });
    }
    last = match.index + match[0].length;
  }

  if (last < input.length) {
    segments.push({ type: "text", value: input.slice(last) });
  }

  return segments.length > 0 ? segments : [{ type: "text", value: input }];
}

/** `$b = 8\, ხოლო კუთხე$` — keep the formula, restore the words. */
function peelProseFromMath(segment: Segment): Segment[] {
  if (segment.type !== "math") return [segment];
  const leak = /(?<!\\)[\p{L}]{3,}(?:\s+[\p{L}]{2,})+/u.exec(segment.value);
  if (!leak) return [segment];
  const mathPart = segment.value.slice(0, leak.index).trimEnd();
  const textPart = segment.value.slice(leak.index);
  const parts: Segment[] = [];
  if (mathPart) {
    parts.push({ type: "math", value: mathPart, display: segment.display });
  }
  if (textPart) parts.push({ type: "text", value: textPart });
  return parts.length > 0 ? parts : [segment];
}

function looksLikeProse(tex: string) {
  if (/\$|\\\(|\\\[/.test(tex)) return true;
  // Non-ASCII letters (Georgian/Cyrillic/…) must stay outside math mode —
  // KaTeX drops spaces between words if the whole string is one formula.
  if (/[^\u0000-\u007f]/u.test(tex) && /\p{L}/u.test(tex)) return true;
  // Long mixed chat/AI blobs must never be fed to KaTeX as one formula.
  if (tex.length > 400 && /[\p{L}]{3,}/u.test(tex)) return true;
  if (/[A-Za-z]{2,}\s+[A-Za-z]{2,}/.test(tex)) return true;
  if (/\\[a-zA-Z]+/.test(tex) || /[_^]\{/.test(tex)) return false;
  return /[\p{L}]{2,}\s+[\p{L}]{2,}/u.test(tex);
}

function renderKatex(tex: string, node: HTMLElement, displayMode: boolean) {
  try {
    katex.render(tex, node, {
      throwOnError: false,
      displayMode,
      errorColor: "currentColor",
    });
  } catch {
    node.textContent = tex;
  }
}

export function KatexPreview({
  tex,
  className = "",
  displayMode = false,
}: {
  tex: string;
  className?: string;
  displayMode?: boolean;
}) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.replaceChildren();
    const prepared = polishStudentTex(tex).replace(/\\text\{([^{}]*)\}/g, '$1')
    .replace(/\\mathrm\{([^{}]*)\}/g, '$1');
    

    if (!looksLikeProse(prepared)) {
      renderKatex(prepared, node, displayMode);
      return;
    }

    const segments = splitMathSegments(prepared).flatMap(peelProseFromMath);
    const onlyMath =
      segments.length === 1 && segments[0]?.type === "math" ? segments[0] : null;
    if (onlyMath) {
      renderKatex(onlyMath.value, node, displayMode || onlyMath.display);
      return;
    }

    for (const segment of segments) {
      if (segment.type === "text") {
        const text = document.createElement("span");
        text.className = "whitespace-pre-wrap";
        text.textContent = segment.value;
        node.appendChild(text);
        continue;
      }

      const math = document.createElement("span");
      math.className = segment.display
        ? "block my-2 overflow-x-auto hide-scrollbar"
        : "inline";
      renderKatex(segment.value, math, segment.display);
      node.appendChild(math);
    }
  }, [tex, displayMode]);

  return <span ref={ref} className={className} />;
}
