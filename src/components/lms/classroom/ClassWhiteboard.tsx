"use client";

import { useEffect, useRef, useState } from "react";
import { Tldraw, Editor, createTLStore, defaultShapeUtils } from "@tldraw/tldraw";
// ამოღებულია: import "@tldraw/tldraw/tldraw.css";
import type { Room } from "livekit-client";
import { ConnectionState, RoomEvent } from "livekit-client";
import { Maximize2, Minimize2 } from "lucide-react";

interface ClassWhiteboardProps {
  room: Room | null;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
}

export function ClassWhiteboard({ room, isFullscreen, onToggleFullscreen }: ClassWhiteboardProps) {
  const [store] = useState(() => createTLStore({ shapeUtils: defaultShapeUtils }));
  const [editor, setEditor] = useState<Editor | null>(null);
  const isSyncingRef = useRef(false);

  // tldraw მონაცემების გაგზავნა
  useEffect(() => {
    if (!editor || !room) return;

    const cleanup = store.listen(
      (entry) => {
        if (isSyncingRef.current) return;
        if (room.state !== ConnectionState.Connected) return;

        const message = JSON.stringify({
          type: "WHITEBOARD_DIFF",
          changes: entry.changes,
        });

        const payload = new TextEncoder().encode(message);

        try {
          room.localParticipant?.publishData(payload, { reliable: true });
        } catch (err) {
          console.warn("Failed to publish whiteboard data:", err);
        }
      },
      { scope: "document", source: "user" }
    );

    return () => {
      cleanup();
    };
  }, [editor, room, store]);

  // მონაცემების მიღება
  useEffect(() => {
    if (!room || !store) return;

    const handleDataReceived = (payload: Uint8Array) => {
      try {
        const str = new TextDecoder().decode(payload);
        const data = JSON.parse(str);

        if (data.type === "WHITEBOARD_DIFF" && data.changes) {
          isSyncingRef.current = true;
          store.mergeRemoteChanges(() => {
            const { added, updated, removed } = data.changes;
            if (added) Object.values(added).forEach((record: any) => store.put([record]));
            if (updated) Object.values(updated).forEach(([_, record]: any) => store.put([record]));
            if (removed) Object.values(removed).forEach((record: any) => store.remove([record.id]));
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
      className={`relative w-full h-full bg-white overflow-hidden isolate ${
        isFullscreen
          ? "fixed inset-0 z-[9999] h-screen w-screen"
          : "rounded-2xl border border-white/10 shadow-sm"
      }`}
    >
      {/* ზედა მართვის ღილაკი */}
      <div className="absolute top-3 right-3 z-[100] flex items-center gap-2 bg-white/95 backdrop-blur-md p-1.5 rounded-xl border border-slate-200 shadow-md">
        <button
          type="button"
          onClick={onToggleFullscreen}
          title={isFullscreen ? "დაპატარავება" : "მთელ ეკრანზე გაშლა"}
          className="flex size-8 items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-800 transition-colors pointer-events-auto"
        >
          {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {/* მკაცრად ფიქსირებული კონტეინერი CSS Override-ებით, რაც მენიუს გაქრობას კრძალავს */}
      <div className="absolute inset-0 h-full w-full [&_.tlui-layout]:!opacity-100 [&_.tlui-layout]:!visible [&_.tlui-layout]:!pointer-events-auto [&_.tlui-toolbar]:!opacity-100 [&_.tlui-toolbar]:!visible [&_.tlui-toolbar]:!pointer-events-auto [&_.tlui-style-panel]:!opacity-100 [&_.tlui-style-panel]:!visible [&_.tlui-style-panel]:!pointer-events-auto [&_.tlui-menu__zone]:!opacity-100 [&_.tlui-menu__zone]:!visible">
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