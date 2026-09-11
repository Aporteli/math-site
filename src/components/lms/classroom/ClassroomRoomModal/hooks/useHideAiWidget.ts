"use client";

import { useEffect } from "react";

export function useHideAiWidget() {
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("hide-ai-widget"));
    return () => {
      window.dispatchEvent(new CustomEvent("show-ai-widget"));
    };
  }, []);
}