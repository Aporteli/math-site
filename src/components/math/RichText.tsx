"use client";

import { useMemo } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

interface RichTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with inline math delimited by $...$
 * Example: "ჩავსვათ $y = 3 - \\frac{z}{3}$ განტოლებაში."
 */
export function RichText({ text, className }: RichTextProps) {
  const parts = useMemo(() => text.split(/(\$[^$]+\$)/g), [text]);

  return (
    <span className={className}>
      {parts.map((part, i) => {
        if (part.startsWith("$") && part.endsWith("$") && part.length > 2) {
          const math = part.slice(1, -1);
          let html: string;
          try {
            html = katex.renderToString(math, {
              throwOnError: false,
              errorColor: "#dc2626",
              displayMode: false,
              strict: false,
            });
          } catch {
            html = `<code>${math}</code>`;
          }
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                whiteSpace: "nowrap",
                maxWidth: "100%",
              }}
              dangerouslySetInnerHTML={{ __html: html }}
            />
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </span>
  );
}