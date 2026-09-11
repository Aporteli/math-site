//CUT

"use client";

import { useState, useRef, useEffect } from "react";
import { useChat } from "@livekit/components-react";
import { Send, ImagePlus, Loader2, Trash2 } from "lucide-react";

interface CustomChatProps {
  courseId: string; // თითოეულ ოთახს ექნება თავისი ისტორია
  isAdmin?: boolean;
}

export function CustomChat({ courseId, isAdmin = true }: CustomChatProps) {
  const { chatMessages, send, isSending } = useChat();
  const [draft, setDraft] = useState("");
  const [isUploading, setIsUploading] = useState(false);
  
  // LocalStorage-ის ქეი თითოეული ოთახისთვის
  const storageKey = `chat_history_${courseId}`;

  // 1. ისტორიის ინიციალიზაცია LocalStorage-დან
  const [savedMessages, setSavedMessages] = useState<typeof chatMessages>(() => {
    if (typeof window !== "undefined") {
      const localData = localStorage.getItem(storageKey);
      if (localData) {
        try {
          return JSON.parse(localData);
        } catch (e) {
          console.error("LocalStorage-ის წაკითხვის შეცდომა:", e);
        }
      }
    }
    return [];
  });

  const fileInputRef = useRef<HTMLInputElement>(null);
  const chatBottomRef = useRef<HTMLDivElement>(null);

  // 2. LiveKit-ით ახალი მოსული შეტყობინების დამატება LocalStorage-ში
  useEffect(() => {
    if (chatMessages.length === 0) return;

    setSavedMessages((prev) => {
      // დუპლიკატების თავიდან აცილება timestamp-ის მიხედვით
      const combined = [...prev];
      chatMessages.forEach((msg) => {
        if (!combined.some((m) => m.timestamp === msg.timestamp)) {
          combined.push(msg);
        }
      });

      // შენახვა LocalStorage-ში
      localStorage.setItem(storageKey, JSON.stringify(combined));
      return combined;
    });
  }, [chatMessages, storageKey]);

  // ავტომატური სქროლი ბოლო შეტყობინებაზე
  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [savedMessages]);

  // სურათის ატვირთვა
  const processAndSendImage = async (file: File) => {
    if (!file.type.startsWith("image/")) return;

    try {
      setIsUploading(true);

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();

      if (data.url) {
        await send(`[IMAGE:${data.url}]`);
      }
    } catch (error) {
      console.error("სურათის ატვირთვა ვერ მოხერხდა:", error);
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;

    await send(draft);
    setDraft("");
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) processAndSendImage(file);
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    const items = e.clipboardData?.items;
    if (!items) return;

    for (const item of items) {
      if (item.type.startsWith("image/")) {
        const file = item.getAsFile();
        if (file) {
          e.preventDefault();
          processAndSendImage(file);
          break;
        }
      }
    }
  };

  // 3. მთლიანი ისტორიის წაშლა LocalStorage-დან
  const handleClearHistory = () => {
    if (confirm("ნამდვილად გსურთ ჩატის ისტორიის წაშლა?")) {
      localStorage.removeItem(storageKey);
      setSavedMessages([]);
    }
  };

  return (
    <div
      onPaste={handlePaste}
      className="flex h-full w-full flex-col rounded-2xl border border-white/10 bg-slate-900 overflow-hidden outline-none focus:border-emerald-500/50"
      tabIndex={0}
    >
      {/* სათაური და ისტორიის წაშლა */}
      <div className="flex items-center justify-between border-b border-white/10 p-3 text-sm font-semibold text-white/80">
        <span>ოთახის ჩატი</span>
        <div className="flex items-center gap-2">
          {isUploading && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-400 font-normal animate-pulse">
              <Loader2 className="size-3 animate-spin" /> სურათი იტვირთება...
            </span>
          )}
          {isAdmin && savedMessages.length > 0 && (
            <button
              type="button"
              onClick={handleClearHistory}
              title="ისტორიის გასუფთავება"
              className="text-white/40 hover:text-red-400 transition p-1 rounded-lg hover:bg-white/5"
            >
              <Trash2 className="size-4" />
            </button>
          )}
        </div>
      </div>

      {/* შეტყობინებების სია */}
      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {savedMessages.length === 0 ? (
          <div className="flex h-full items-center justify-center text-xs text-white/30">
            ჩატის ისტორია ცარიელია
          </div>
        ) : (
          savedMessages.map((msg, index) => {
            const isImage = msg.message.startsWith("[IMAGE:") && msg.message.endsWith("]");
            const imageUrl = isImage ? msg.message.slice(7, -1) : null;

            return (
              <div key={msg.timestamp || index} className="flex flex-col text-xs">
                <div className="mb-1 flex items-center gap-2">
                  <span className="font-medium text-emerald-400">
                    {msg.from?.identity || "ანონიმი"}
                  </span>
                  <span className="text-[10px] text-white/40">
                    {new Date(msg.timestamp).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>

                {isImage && imageUrl ? (
                  <div className="max-w-[80%] overflow-hidden rounded-xl border border-white/10 bg-white/5 p-1">
                    <img
                      src={imageUrl}
                      alt="ჩატის სურათი"
                      className="max-h-60 w-full rounded-lg object-cover"
                    />
                  </div>
                ) : (
                  <p className="w-fit max-w-[85%] break-words rounded-lg border border-white/5 bg-white/5 p-2 text-white/90">
                    {msg.message}
                  </p>
                )}
              </div>
            );
          })
        )}
        <div ref={chatBottomRef} />
      </div>

      {/* დაფარული Input */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageUpload}
        accept="image/*"
        className="hidden"
      />

      {/* ფორმა */}
      <form onSubmit={handleSend} className="flex gap-2 border-t border-white/10 p-2">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isUploading}
          title="სურათის მიმაგრება"
          className="flex size-8 items-center justify-center rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition disabled:opacity-50"
        >
          {isUploading ? (
            <Loader2 className="size-4 animate-spin text-emerald-400" />
          ) : (
            <ImagePlus className="size-4" />
          )}
        </button>

        <input
          type="text"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="ჩაწერეთ ტექსტი ან ჩააკოპირეთ სურათი (Ctrl+V)..."
          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:border-emerald-500 focus:outline-none transition"
        />

        <button
          type="submit"
          disabled={isSending || !draft.trim()}
          className="flex size-8 items-center justify-center rounded-xl bg-emerald-500 text-white hover:bg-emerald-600 transition disabled:opacity-50"
        >
          <Send className="size-3.5" />
        </button>
      </form>
    </div>
  );
}