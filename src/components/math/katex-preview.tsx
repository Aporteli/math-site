"use client";

import { useEffect, useRef } from "react";
import katex from "katex";
import "katex/dist/katex.min.css";

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

    try {
      katex.render(tex, node, { throwOnError: false, displayMode });
    } catch {
      node.textContent = tex;
    }
  }, [tex, displayMode]);

  return <span ref={ref} className={className} />;
}
