'use client';

import { useEffect, useState } from 'react';
import type { ReceivedChatMessage } from '@livekit/components-react';

/**
 * Persists chat messages to localStorage per course and merges incoming
 * LiveKit messages without duplicating by timestamp.
 */
export function useChatHistory(
  courseId: string,
  chatMessages: ReceivedChatMessage[],
) {
  const storageKey = `chat_history_${courseId}`;

  const [savedMessages, setSavedMessages] = useState<ReceivedChatMessage[]>(() => {
    if (typeof window !== 'undefined') {
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        try {
          return JSON.parse(localData);
        } catch (e) {
          console.error('LocalStorage-ის წაკითხვის შეცდომა:', e);
        }
      }
    }
    return [];
  });

  useEffect(() => {
    if (chatMessages.length === 0) return;

    setSavedMessages((prev) => {
      const combined = [...prev];
      chatMessages.forEach((msg) => {
        if (!combined.some((m) => m.timestamp === msg.timestamp)) {
          combined.push(msg);
        }
      });
      localStorage.setItem(storageKey, JSON.stringify(combined));
      return combined;
    });
  }, [chatMessages, storageKey]);

  const clearHistory = () => {
    if (confirm('ნამდვილად გსურთ ჩატის ისტორიის წაშლა?')) {
      localStorage.removeItem(storageKey);
      setSavedMessages([]);
    }
  };

  return { savedMessages, clearHistory };
}