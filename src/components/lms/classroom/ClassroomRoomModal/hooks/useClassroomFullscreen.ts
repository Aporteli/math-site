"use client";

import { useEffect, useState, RefObject } from "react";

export function useClassroomFullscreen(ref: RefObject<HTMLDivElement | null>) {
  const [isBoardFullscreen, setIsBoardFullscreen] = useState(false);
  const [isChromeOpen, setIsChromeOpen] = useState(false);

  const toggleClassroomFullscreen = async () => {
    const node = ref.current;
    if (!node) return;
    try {
      if (!document.fullscreenElement) {
        await node.requestFullscreen();
        setIsBoardFullscreen(true);
        setIsChromeOpen(false);
      } else {
        await document.exitFullscreen();
        setIsBoardFullscreen(false);
        setIsChromeOpen(false);
      }
    } catch {
      setIsBoardFullscreen((prev) => !prev);
      setIsChromeOpen(false);
    }
  };

  useEffect(() => {
    const onFullscreenChange = () => {
      const active = document.fullscreenElement === ref.current;
      setIsBoardFullscreen(active);
      if (!active) setIsChromeOpen(false);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () =>
      document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, [ref]);

  return {
    isBoardFullscreen,
    isChromeOpen,
    setIsChromeOpen,
    setIsBoardFullscreen,
    toggleClassroomFullscreen,
  };
}