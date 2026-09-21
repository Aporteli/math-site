"use client";

import { useEffect } from "react";
import { useChat } from "@livekit/components-react";

export function ChatBackgroundListener({ courseId }: { courseId: string }) {
  const { chatMessages } = useChat();
  const storageKey = `chat_history_${courseId}`;

  useEffect(() => {
    if (chatMessages.length === 0) return;

    // LocalStorage-ის განახლება მიღებული შეტყობინებებით
    const localData = localStorage.getItem(storageKey);
    let existingMessages = [];
    
    if (localData) {
      try {
        existingMessages = JSON.parse(localData);
      } catch (e) {
        console.error("Storage error", e);
      }
    }

    const combined = [...existingMessages];
    chatMessages.forEach((msg) => {
      if (!combined.some((m) => m.timestamp === msg.timestamp)) {
        combined.push(msg);
      }
    });

    localStorage.setItem(storageKey, JSON.stringify(combined));
  }, [chatMessages, storageKey]);

  return null; // ვიზუალურად არაფერს არ რენდერავს
}