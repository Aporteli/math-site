'use client';

import { useRef, useState } from 'react';

type SendFn = (message: string) => Promise<unknown>;

/** Handles file-input upload, clipboard paste, and /api/upload round-trip. */
export function useChatImageUpload(send: SendFn) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processAndSendImage = async (file: File) => {
    if (!file.type.startsWith('image/')) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append('file', file);

      const response = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (data.url) {
        await send(`[IMAGE:${data.url}]`);
      }
    } catch (error) {
      console.error('სურათის ატვირთვა ვერ მოხერხდა:', error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndSendImage(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processAndSendImage(file);
          break;
        }
      }
    }
  };

  return { isUploading, fileInputRef, handleImageUpload, handlePaste };
}