"use client";

import { useEffect, useRef, useState } from "react";
import { Tldraw, Editor, createTLStore, defaultShapeUtils } from "@tldraw/tldraw";
import "@tldraw/tldraw/tldraw.css";
import { useRoomContext } from "@livekit/components-react";
import { ConnectionState, RoomEvent } from "livekit-client";
import { Maximize2, Minimize2 } from "lucide-react";

interface ClassWhiteboardProps {
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ClassWhiteboard({ isFullscreen, onToggleFullscreen }: ClassWhiteboardProps) {
  const room = useRoomContext();
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
  const [editor, setEditor] = useState<Editor | null>(null);
  const isSyncingRef = useRef(false);

  // tldraw-ს ცვლილებების გაგზავნა LiveKit DataChannel-ით
  useEffect(() => {
    if (!editor || !room) return;

    const cleanup = store.listen((entry) => {
      if (isSyncingRef.current) return;

      // ვამოწმებთ, რომ ოთახი ნამდვილად დაკავშირებულია მონაცემის გაგზავნამდე
      if (room.state !== ConnectionState.Connected) return;

      const message = JSON.stringify({
        type: "WHITEBOARD_DIFF",
        changes: entry.changes,
      });

      const encoder = new TextEncoder();
      const payload = encoder.encode(message);

      try {
        room.localParticipant?.publishData(payload, { reliable: true });
      } catch (err) {
        console.warn("Failed to publish whiteboard data:", err);
      }
    }, { scope: "document", source: "user" });

    return () => {
      cleanup();
    };
  }, [editor, room, store]);

  // სხვა მონაწილეებისგან მიღებული ცვლილებების ასახვა დაფაზე
  useEffect(() => {
    if (!room || !store) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const decoder = new TextDecoder();
        const str = decoder.decode(payload);
        const data = JSON.parse(str);

        if (data.type === "WHITEBOARD_DIFF" && data.changes) {
          isSyncingRef.current = true;
          store.mergeRemoteChanges(() => {
            const { added, updated, removed } = data.changes;
            if (added) {
              Object.values(added).forEach((record: any) => store.put([record]));
            }
            if (updated) {
              Object.values(updated).forEach(([_, record]: any) => store.put([record]));
            }
            if (removed) {
              Object.values(removed).forEach((record: any) => store.remove([record.id]));
            }
          });
          isSyncingRef.current = false;
        }
      } catch (err) {
        console.error("Failed to parse whiteboard sync data:", err);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);

    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
    };
  }, [room, store]);

  return (
    <div
      className={`relative flex flex-col bg-white overflow-hidden isolate ${
        isFullscreen
          ? "fixed inset-0 z-[100] h-screen w-screen"
          : "h-full w-full rounded-2xl border border-hairline shadow-sm"
      }`}
    >
      {/* ზედა მართვის პანელი */}
      <div className="absolute top-3 right-3 z-30 flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-hairline shadow-md pointer-events-auto">
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "დაპატარავება" : "მთელ ეკრანზე გაშლა"}
          className="flex size-8 items-center justify-center rounded-lg bg-paper hover:bg-paper-deep text-ink transition-colors"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {/* tldraw კონტეინერი CSS override-ით, რომელიც პანელების გაქრობას ბლოკავს */}
      <div className="relative flex-1 w-full h-full min-h-0 min-w-0 [&_.tlui-layout]:!opacity-100 [&_.tlui-layout]:!visible [&_.tlui-layout]:!pointer-events-auto [&_.tlui-toolbar]:!opacity-100 [&_.tlui-toolbar]:!visible [&_.tlui-style-panel]:!opacity-100 [&_.tlui-style-panel]:!visible [&_.tlui-menu__zone]:!opacity-100 [&_.tlui-menu__zone]:!visible">
        <Tldraw
          store={store}
          hideUi={false}
          autoFocus={false}
          onMount={(mountedEditor) => {
            setEditor(mountedEditor);
            // გამოვრთოთ Focus/Zen Mode-ის ავტომატური გააქტიურება
            try {
              mountedEditor.updateInstanceState({
                isFocusMode: false,
                isDebugMode: false,
              });
            } catch (e) {
              console.error(e);
            }
          }}
        />
      </div>
    </div>
  );
}