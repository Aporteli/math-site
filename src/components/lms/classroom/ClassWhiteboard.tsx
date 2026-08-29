"use client";

import "@excalidraw/excalidraw/index.css";
import { useEffect, useRef, useState, useCallback } from "react";
import dynamic from "next/dynamic";
import type { Room, RemoteParticipant } from "livekit-client";
import { ConnectionState, RoomEvent } from "livekit-client";
import { Loader2, ChevronLeft, ChevronRight, Plus, Send, UserCheck, X } from "lucide-react";
import geometryLibrary from "@/data/geometry.json";
import { sendProblemToStudentAction } from "@/lib/actions/students";

const Excalidraw = dynamic(
  () => import("@excalidraw/excalidraw").then((mod) => mod.Excalidraw),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-full w-full items-center justify-center bg-white">
        <Loader2 className="size-8 animate-spin text-slate-300" />
      </div>
    ),
  }
);

interface ClassWhiteboardProps {
  room: Room | null;
  courseId: string;
  courseTitle: string;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  isTeacher?: boolean;
}

function extractMimeType(dataUrl: string): string {
  const match = dataUrl.match(/^data:([^;,]+)/);
  return match ? match[1] : "image/jpeg";
}

async function compressImageBase64(dataUrl: string): Promise<{ dataURL: string; mimeType: string }> {
  if (!dataUrl || !dataUrl.startsWith("data:image/")) {
    return { dataURL: dataUrl, mimeType: extractMimeType(dataUrl || "") };
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      try {
        const maxDim = 900;
        let { width, height } = img;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve({ dataURL: dataUrl, mimeType: extractMimeType(dataUrl) });
          return;
        }

        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const compressedUrl = canvas.toDataURL("image/jpeg", 0.6);
        resolve({ dataURL: compressedUrl, mimeType: "image/jpeg" });
      } catch {
        resolve({ dataURL: dataUrl, mimeType: extractMimeType(dataUrl) });
      }
    };
    img.onerror = () => resolve({ dataURL: dataUrl, mimeType: extractMimeType(dataUrl) });
    img.src = dataUrl;
  });
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(blob);
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
  });
}

const CHUNK_PAYLOAD_BYTES = 16 * 1024;
const UNRELIABLE_MAX_BYTES = 15 * 1024;
const CHUNK_HEADER_BYTES = 13;
const MAGIC_CHUNK_START = 0x01;
const MAGIC_CHUNK_CONT = 0x02;
const MAGIC_CHUNK_END = 0x03;

function concatBytes(a: Uint8Array, b: Uint8Array): Uint8Array {
  const out = new Uint8Array(a.length + b.length);
  out.set(a, 0);
  out.set(b, a.length);
  return out;
}

function isChunkedPacket(bytes: Uint8Array): boolean {
  const first = bytes[0];
  return first === MAGIC_CHUNK_START || first === MAGIC_CHUNK_CONT || first === MAGIC_CHUNK_END;
}

function chunkPayload(bytes: Uint8Array): Uint8Array[] {
  if (bytes.length <= CHUNK_PAYLOAD_BYTES) return [bytes];

  const transferId = Math.floor(Math.random() * 0x7fffffff) >>> 0;
  const totalChunks = Math.ceil(bytes.length / CHUNK_PAYLOAD_BYTES);
  const chunks: Uint8Array[] = [];

  for (let i = 0; i < totalChunks; i++) {
    const start = i * CHUNK_PAYLOAD_BYTES;
    const end = Math.min(start + CHUNK_PAYLOAD_BYTES, bytes.length);
    const magic = i === 0 ? MAGIC_CHUNK_START : i === totalChunks - 1 ? MAGIC_CHUNK_END : MAGIC_CHUNK_CONT;

    const header = new Uint8Array(CHUNK_HEADER_BYTES);
    const view = new DataView(header.buffer);
    header[0] = magic;
    view.setUint32(1, transferId, false);
    view.setUint32(5, i, false);
    view.setUint32(9, totalChunks, false);

    chunks.push(concatBytes(header, bytes.subarray(start, end)));
  }

  return chunks;
}

class ChunkAssembler {
  private pending = new Map<
    number,
    { totalChunks: number; chunks: (Uint8Array | null)[]; received: number; createdAt: number }
  >();

  push(bytes: Uint8Array): Uint8Array | null {
    if (!isChunkedPacket(bytes)) return bytes;
    if (bytes.length < CHUNK_HEADER_BYTES) return null;

    const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    const magic = view.getUint8(0);
    const transferId = view.getUint32(1, false);
    const chunkIndex = view.getUint32(5, false);
    const totalChunks = view.getUint32(9, false);
    const data = bytes.subarray(CHUNK_HEADER_BYTES);

    if (magic === MAGIC_CHUNK_START) {
      const entry = {
        totalChunks,
        chunks: new Array<Uint8Array | null>(totalChunks).fill(null),
        received: 0,
        createdAt: Date.now(),
      };
      if (chunkIndex < totalChunks) {
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
      }
      this.pending.set(transferId, entry);
    } else {
      const entry = this.pending.get(transferId);
      if (!entry) return null;
      if (chunkIndex < entry.totalChunks && !entry.chunks[chunkIndex]) {
        entry.chunks[chunkIndex] = data;
        entry.received += 1;
      }
    }

    const entry = this.pending.get(transferId);
    if (!entry || entry.received < entry.totalChunks) {
      this.cleanup();
      return null;
    }

    this.pending.delete(transferId);

    let totalLength = 0;
    for (const chunk of entry.chunks) {
      if (chunk) totalLength += chunk.length;
    }

    const out = new Uint8Array(totalLength);
    let offset = 0;
    for (const chunk of entry.chunks) {
      if (chunk) {
        out.set(chunk, offset);
        offset += chunk.length;
      }
    }
    return out;
  }

  private cleanup() {
    const now = Date.now();
    for (const [id, entry] of this.pending) {
      if (now - entry.createdAt > 10_000) this.pending.delete(id);
    }
  }
}

function collectFileIds(elements: any[]): string[] {
  const ids = new Set<string>();
  for (const element of elements) {
    if (element && typeof element.fileId === "string" && element.fileId) {
      ids.add(element.fileId);
    }
  }
  return Array.from(ids);
}

export function ClassWhiteboard({
  room,
  courseId,
  courseTitle,
  isFullscreen,
  isTeacher = false,
}: ClassWhiteboardProps) {
  const [excalidrawAPI, setExcalidrawAPI] = useState<any>(null);

  const storageKeyPages = `whiteboard_pages_${courseId}`;
  const storageKeyFiles = `whiteboard_files_${courseId}`;

  const [pages, setPages] = useState<any[][]>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem(storageKeyPages);
        if (saved) {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed) && parsed.length > 0) return parsed;
        }
      } catch (e) {
        console.error("Failed to load whiteboard pages:", e);
      }
    }
    return [[]];
  });

  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);
  const filesRef = useRef<Record<string, any>>({});
  const syncedFileIds = useRef<Set<string>>(new Set());
  const chunkAssemblerRef = useRef<ChunkAssembler | null>(null);

  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [students, setStudents] = useState<RemoteParticipant[]>([]);
  const [assignedStatus, setAssignedStatus] = useState<string | null>(null);
  const [assignTitle, setAssignTitle] = useState<string>("");
  const [assignPending, setAssignPending] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  const pagesRef = useRef<any[][]>(pages);
  const currentPageIndexRef = useRef<number>(0);
  const isRemoteUpdateRef = useRef(false);

  // სურათების ფაილების აღდგენა
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const savedFiles = localStorage.getItem(storageKeyFiles);
        if (savedFiles) {
          const parsed = JSON.parse(savedFiles);
          filesRef.current = parsed;
          Object.keys(parsed).forEach((id) => syncedFileIds.current.add(id));
        }
      } catch (e) {
        console.error("Failed to load whiteboard files:", e);
      }
    }
  }, [storageKeyFiles]);

  // შენახვა
  useEffect(() => {
    pagesRef.current = pages;
    currentPageIndexRef.current = currentPageIndex;
    if (isTeacher && typeof window !== "undefined") {
      try {
        localStorage.setItem(storageKeyPages, JSON.stringify(pages));
        localStorage.setItem(storageKeyFiles, JSON.stringify(filesRef.current));
      } catch (err) {
        console.warn("Whiteboard localStorage quota warning:", err);
      }
    }
  }, [pages, currentPageIndex, isTeacher, storageKeyPages, storageKeyFiles]);

  const lastSceneVersion = useRef<number>(0);
  const getSceneVersionRef = useRef<any>(null);
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    import("@excalidraw/excalidraw").then((mod) => {
      getSceneVersionRef.current = mod.getSceneVersion;
    });
  }, []);

  const updateParticipantList = useCallback(() => {
    if (!room) return;
    const list = Array.from(room.remoteParticipants.values());
    setStudents(list);
  }, [room]);

  useEffect(() => {
    if (!room) return;
    updateParticipantList();
    const interval = setInterval(updateParticipantList, 1500);

    room.on(RoomEvent.ParticipantConnected, updateParticipantList);
    room.on(RoomEvent.ParticipantDisconnected, updateParticipantList);
    room.on(RoomEvent.Connected, updateParticipantList);
    room.on(RoomEvent.Reconnected, updateParticipantList);

    return () => {
      clearInterval(interval);
      room.off(RoomEvent.ParticipantConnected, updateParticipantList);
      room.off(RoomEvent.ParticipantDisconnected, updateParticipantList);
      room.off(RoomEvent.Connected, updateParticipantList);
      room.off(RoomEvent.Reconnected, updateParticipantList);
    };
  }, [room, updateParticipantList]);

  const sendBytesReliable = useCallback(
    async (bytes: Uint8Array, destinationIdentities?: string[]) => {
      const participant = room?.localParticipant;
      if (!participant || !room || room.state !== ConnectionState.Connected) return;

      const chunks = chunkPayload(bytes);
      for (let i = 0; i < chunks.length; i++) {
        await participant.publishData(chunks[i] as any, {
          reliable: true,
          destinationIdentities,
        });
        if (chunks.length > 1 && i < chunks.length - 1) {
          await new Promise((resolve) => setTimeout(resolve, 10));
        }
      }
    },
    [room]
  );

  const publishReliable = useCallback(
    async (message: unknown, destinationIdentities?: string[]) => {
      if (!room || room.state !== ConnectionState.Connected) return;
      const bytes = new TextEncoder().encode(JSON.stringify(message));
      await sendBytesReliable(bytes, destinationIdentities);
    },
    [room, sendBytesReliable]
  );

  const publishLiveSync = useCallback(
    async (message: unknown) => {
      const participant = room?.localParticipant;
      if (!participant || !room || room.state !== ConnectionState.Connected) return;

      const bytes = new TextEncoder().encode(JSON.stringify(message));
      if (bytes.length <= UNRELIABLE_MAX_BYTES) {
        await participant.publishData(bytes as any, { reliable: false });
      } else {
        await sendBytesReliable(bytes);
      }
    },
    [room, sendBytesReliable]
  );

  const sendBoardMeta = useCallback(
    async (targetIdentity?: string) => {
      await publishReliable(
        {
          type: "EXCALIDRAW_META",
          pagesLength: pagesRef.current.length,
          currentPageIndex: currentPageIndexRef.current,
        },
        targetIdentity ? [targetIdentity] : undefined
      );
    },
    [publishReliable]
  );

  const sendPage = useCallback(
    async (pageIndex: number, targetIdentity?: string) => {
      await publishReliable(
        {
          type: "EXCALIDRAW_PAGE_RESPONSE",
          pageIndex,
          elements: pagesRef.current[pageIndex] ?? [],
        },
        targetIdentity ? [targetIdentity] : undefined
      );
    },
    [publishReliable]
  );

  const sendFiles = useCallback(
    async (fileIds: string[], targetIdentity?: string) => {
      const filesToSend: Record<string, any> = {};
      for (const id of fileIds) {
        if (filesRef.current[id]) filesToSend[id] = filesRef.current[id];
      }
      if (Object.keys(filesToSend).length === 0) return;
      await publishReliable(
        { type: "EXCALIDRAW_FILES_UPDATE", files: filesToSend },
        targetIdentity ? [targetIdentity] : undefined
      );
    },
    [publishReliable]
  );

  // Reconnection მართვა (ინტერნეტის გათიშვის შემდეგ ავტომატური აღდგენა)
  useEffect(() => {
    if (!room) return;

    const handleReconnect = () => {
      lastSceneVersion.current = 0; // ვერსიის განულება, რათა შემოსული ხაზები არ დაიბლოკოს
      if (isTeacher) {
        void sendBoardMeta();
      } else {
        void publishReliable({ type: "EXCALIDRAW_REQUEST_BOARD" });
      }
    };

    room.on(RoomEvent.Connected, handleReconnect);
    room.on(RoomEvent.Reconnected, handleReconnect);

    if (room.state === ConnectionState.Connected) {
      handleReconnect();
    }

    return () => {
      room.off(RoomEvent.Connected, handleReconnect);
      room.off(RoomEvent.Reconnected, handleReconnect);
    };
  }, [room, isTeacher, sendBoardMeta, publishReliable]);

  // Excalidraw-ს ჩატვირთვისას ლოკალური ფაილების აღდგენა
  useEffect(() => {
    if (!room || !excalidrawAPI) return;

    if (Object.keys(filesRef.current).length > 0) {
      try {
        excalidrawAPI.addFiles(Object.values(filesRef.current));
      } catch (err) {
        console.error("Failed to restore cached files:", err);
      }
    }

    const cachedElements = pagesRef.current[currentPageIndexRef.current];
    if (cachedElements && cachedElements.length > 0) {
      try {
        excalidrawAPI.updateScene({ elements: cachedElements });
      } catch (err) {
        console.error("Failed to restore cached page:", err);
      }
    }
  }, [room, excalidrawAPI]);

  const handleEditorChange = async (elements: readonly any[], appState: any, files: any) => {
    if (assignError) setAssignError(null);
    if (isRemoteUpdateRef.current) return;

    if (files && Object.keys(files).length > 0) {
      for (const fileId of Object.keys(files)) {
        if (syncedFileIds.current.has(fileId)) continue;
        syncedFileIds.current.add(fileId);

        const rawFile = files[fileId];
        try {
          const optimized = rawFile?.dataURL
            ? await compressImageBase64(rawFile.dataURL)
            : { dataURL: rawFile?.dataURL, mimeType: rawFile?.mimeType };
          const optimizedFile = { ...rawFile, dataURL: optimized.dataURL, mimeType: optimized.mimeType };
          filesRef.current[fileId] = optimizedFile;

          if (isTeacher && typeof window !== "undefined") {
            try {
              localStorage.setItem(storageKeyFiles, JSON.stringify(filesRef.current));
            } catch (e) {
              console.warn("Storage quota warning:", e);
            }
          }

          if (room && room.state === ConnectionState.Connected) {
            await publishReliable({
              type: "EXCALIDRAW_FILES_UPDATE",
              files: { [fileId]: optimizedFile },
            });
          }
        } catch (e) {
          console.error("Image file sync error:", e);
          filesRef.current[fileId] = rawFile;
        }
      }
    }

    if (!room || !getSceneVersionRef.current) return;

    const currentVersion = getSceneVersionRef.current(elements);
    if (currentVersion > lastSceneVersion.current) {
      lastSceneVersion.current = currentVersion;

      const cleanElements = elements.filter((el: any) => !el.isDeleted);
      const newPages = [...pagesRef.current];
      newPages[currentPageIndexRef.current] = cleanElements;

      pagesRef.current = newPages;
      setPages(newPages);

      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      const pageIndex = currentPageIndexRef.current;
      const pagesLength = newPages.length;
      syncTimeoutRef.current = setTimeout(() => {
        void publishLiveSync({
          type: "EXCALIDRAW_SYNC",
          pageIndex,
          pagesLength,
          elements: cleanElements,
        });
      }, 50);
    }
  };

  const handleAddNewPage = () => {
    if (!excalidrawAPI) return;

    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    const newPages = [...pagesRef.current];
    newPages[currentPageIndexRef.current] = currentElements;
    newPages.push([]);

    const newIndex = newPages.length - 1;
    pagesRef.current = newPages;
    currentPageIndexRef.current = newIndex;
    setPages(newPages);
    setCurrentPageIndex(newIndex);

    excalidrawAPI.updateScene({ elements: [] });

    if (isTeacher) {
      void sendBoardMeta();
    }
  };

  const handleSwitchPage = (newIndex: number) => {
    if (newIndex < 0 || newIndex >= pagesRef.current.length || !excalidrawAPI || newIndex === currentPageIndexRef.current) return;

    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    const updatedPages = [...pagesRef.current];
    updatedPages[currentPageIndexRef.current] = currentElements;

    pagesRef.current = updatedPages;
    currentPageIndexRef.current = newIndex;
    setPages(updatedPages);
    setCurrentPageIndex(newIndex);

    const targetElements = updatedPages[newIndex] || [];
    excalidrawAPI.updateScene({ elements: targetElements });

    if (isTeacher) {
      void sendBoardMeta();
      void publishLiveSync({
        type: "EXCALIDRAW_SYNC",
        pageIndex: newIndex,
        pagesLength: updatedPages.length,
        elements: targetElements,
      });
    } else if (targetElements.length === 0) {
      void publishReliable({ type: "EXCALIDRAW_REQUEST_PAGE", pageIndex: newIndex });
    } else {
      const missingFileIds = collectFileIds(targetElements).filter((id) => !filesRef.current[id]);
      if (missingFileIds.length > 0) {
        void publishReliable({ type: "EXCALIDRAW_REQUEST_FILES", fileIds: missingFileIds });
      }
    }
  };

  const handleAssignPageToStudent = async (student: RemoteParticipant) => {
    if (!excalidrawAPI || !isTeacher) return;

    const currentElements = excalidrawAPI.getSceneElements().filter((el: any) => !el.isDeleted);
    if (currentElements.length === 0) {
      setAssignError("დაფა ცარიელია");
      setTimeout(() => setAssignError(null), 2500);
      return;
    }

    setAssignPending(true);
    setAssignError(null);

    const title = assignTitle.trim() || `${courseTitle || "დაფის ამოცანა"} — გვერდი ${currentPageIndex + 1}`;

    try {
      const { exportToBlob } = await import("@excalidraw/excalidraw");
      const appState = excalidrawAPI.getAppState();
      const blob = await exportToBlob({
        elements: currentElements,
        appState: {
          ...appState,
          exportWithDarkMode: false,
          exportBackground: true,
          viewBackgroundColor: "#ffffff",
        },
        files: excalidrawAPI.getFiles(),
        mimeType: "image/png",
        quality: 0.85,
      });

      const imageBase64 = await blobToBase64(blob);

      const res = await sendProblemToStudentAction({
        studentId: student.identity,
        instructions: undefined,
        attachmentUrl: imageBase64,
        problem: {
          id: `whiteboard-${Date.now()}`,
          topic: title,
          difficulty: "medium",
          promptTex: "",
          solutionTex: "",
        },
      });

      if (!res.success) {
        throw new Error(res.error || "დავალების გაგზავნა ვერ მოხერხდა");
      }

      setAssignedStatus(`წარმატებით გაეგზავნა: ${student.name || student.identity}`);
      setTimeout(() => {
        setAssignedStatus(null);
        setIsAssignModalOpen(false);
        setAssignTitle("");
      }, 1500);
    } catch (err: any) {
      console.error("Failed to assign page to student:", err);
      setAssignError(err.message || "გაგზავნა ვერ მოხერხდა");
    } finally {
      setAssignPending(false);
    }
  };

  useEffect(() => {
    if (!room || !excalidrawAPI) return;

    const applyRemoteScene = (pageIndex: number, elements: any[], pagesLength?: number) => {
      isRemoteUpdateRef.current = true;

      const newPages = [...pagesRef.current];
      const targetLength = Math.max(newPages.length, pageIndex + 1, Number(pagesLength) || 0);
      while (newPages.length < targetLength) newPages.push([]);
      newPages[pageIndex] = elements;

      pagesRef.current = newPages;
      currentPageIndexRef.current = pageIndex;
      setPages(newPages);
      setCurrentPageIndex(pageIndex);

      const knownFileIds = collectFileIds(elements).filter((id) => filesRef.current[id]);
      if (knownFileIds.length > 0) {
        try {
          excalidrawAPI.addFiles(knownFileIds.map((id) => filesRef.current[id]));
        } catch (err) {
          console.error("Failed to add files before scene update:", err);
        }
      }

      try {
        excalidrawAPI.updateScene({ elements });
      } catch (err) {
        console.error("Failed to apply remote scene:", err);
      }

      setTimeout(() => {
        isRemoteUpdateRef.current = false;
      }, 50);
    };

    const ensureFilesPresent = (elements: any[]) => {
      const missingFileIds = collectFileIds(elements).filter((id) => !filesRef.current[id]);
      if (missingFileIds.length > 0) {
        void publishReliable({ type: "EXCALIDRAW_REQUEST_FILES", fileIds: missingFileIds });
      }
    };

    const handleDataReceived = (payload: Uint8Array, participant?: RemoteParticipant) => {
      if (!chunkAssemblerRef.current) chunkAssemblerRef.current = new ChunkAssembler();

      let fullPayload: Uint8Array | null;
      try {
        fullPayload = chunkAssemblerRef.current.push(payload);
      } catch (err) {
        console.error("Chunk reassembly error:", err);
        return;
      }
      if (!fullPayload) return;

      let data: any;
      try {
        data = JSON.parse(new TextDecoder().decode(fullPayload));
      } catch (err) {
        console.error("Failed to parse whiteboard packet:", err);
        return;
      }

      // 1. სურათების მიღება და ტილოს მომენტალური გადახატვა
      if (data.type === "EXCALIDRAW_FILES_UPDATE" && data.files) {
        const filesArray = Object.values(data.files);
        if (filesArray.length > 0) {
          isRemoteUpdateRef.current = true;
          const incoming: Record<string, any> = {};
          for (const file of filesArray as any[]) {
            if (file && typeof file.id === "string") {
              filesRef.current[file.id] = file;
              syncedFileIds.current.add(file.id);
              incoming[file.id] = file;
            }
          }
          if (Object.keys(incoming).length > 0) {
            try {
              excalidrawAPI.addFiles(Object.values(incoming));
              // ტილოს გადახატვა, რომ ნაცრისფერი ჩარჩოები სურათად იქცეს
              const currentElems = pagesRef.current[currentPageIndexRef.current] || [];
              excalidrawAPI.updateScene({ elements: currentElems });
            } catch (err) {
              console.error("Failed to add received files:", err);
            }
          }
          setTimeout(() => {
            isRemoteUpdateRef.current = false;
          }, 50);
        }
        return;
      }

      // 2. მეტამონაცემების მიღება -> გვერდის მოთხოვნა
      if (data.type === "EXCALIDRAW_META") {
        const pagesLength = Number.isInteger(data.pagesLength) ? Math.max(1, data.pagesLength) : pagesRef.current.length;
        const newPages = [...pagesRef.current];
        while (newPages.length < pagesLength) newPages.push([]);
        pagesRef.current = newPages;
        setPages(newPages);

        const activeIndex =
          Number.isInteger(data.currentPageIndex) && data.currentPageIndex < pagesLength
            ? data.currentPageIndex
            : 0;
        void publishReliable({ type: "EXCALIDRAW_REQUEST_PAGE", pageIndex: activeIndex });
        return;
      }

      // 3. მოთხოვნებზე პასუხი (მხოლოდ მასწავლებელი)
      if (data.type === "EXCALIDRAW_REQUEST_BOARD") {
        if (isTeacher && participant) {
          void sendBoardMeta(participant.identity);
        }
        return;
      }

      if (data.type === "EXCALIDRAW_REQUEST_PAGE" && Number.isInteger(data.pageIndex)) {
        if (isTeacher && participant) {
          const idx = data.pageIndex;
          if (idx >= 0 && idx < pagesRef.current.length) {
            void sendPage(idx, participant.identity);
          }
        }
        return;
      }

      if (data.type === "EXCALIDRAW_REQUEST_FILES" && Array.isArray(data.fileIds)) {
        if (isTeacher && participant) {
          void sendFiles(data.fileIds, participant.identity);
        }
        return;
      }

      // 4. გვერდის პასუხის მიღება
      if (data.type === "EXCALIDRAW_PAGE_RESPONSE" && Number.isInteger(data.pageIndex) && Array.isArray(data.elements)) {
        applyRemoteScene(data.pageIndex, data.elements);
        ensureFilesPresent(data.elements);
        return;
      }

      // 5. ლაივ ხატვა
      if (data.type === "EXCALIDRAW_SYNC" && Number.isInteger(data.pageIndex) && Array.isArray(data.elements)) {
        applyRemoteScene(data.pageIndex, data.elements, data.pagesLength);
        ensureFilesPresent(data.elements);
      }
    };

    room.on(RoomEvent.DataReceived, handleDataReceived);
    return () => {
      room.off(RoomEvent.DataReceived, handleDataReceived);
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
    };
  }, [room, excalidrawAPI, isTeacher, publishReliable, sendBoardMeta, sendPage, sendFiles]);

  const initialLibraryItems = Array.isArray(geometryLibrary)
    ? geometryLibrary
    : (geometryLibrary as any)?.libraryItems || (geometryLibrary as any)?.library || [];

  return (
    <div
      className={`relative w-full h-full bg-slate-100 overflow-hidden ${
        isFullscreen
          ? "fixed inset-0 z-[9999] h-screen w-screen"
          : "rounded-2xl border border-slate-200 shadow-sm"
      }`}
    >
      {isTeacher && isAssignModalOpen && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 z-[110] w-80 rounded-2xl bg-white p-3.5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
          <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-100">
            <span className="text-xs font-bold text-slate-800">დაფის გაგზავნა დავალებად</span>
            <button
              type="button"
              onClick={() => {
                setIsAssignModalOpen(false);
                setAssignError(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="size-4" />
            </button>
          </div>

          <input
            value={assignTitle}
            onChange={(e) => setAssignTitle(e.target.value)}
            placeholder={`${courseTitle || "დაფის ამოცანა"} — გვერდი ${currentPageIndex + 1}`}
            className="mb-2 w-full rounded-xl border border-slate-200 px-2.5 py-1.5 text-xs text-slate-800 outline-none focus:border-indigo-400"
          />

          {assignedStatus ? (
            <div className="flex items-center justify-center gap-2 py-3 text-xs font-medium text-emerald-600">
              <UserCheck className="size-4" />
              <span>{assignedStatus}</span>
            </div>
          ) : assignError ? (
            <div className="flex flex-col items-center justify-center gap-1.5 py-3 text-xs font-medium text-rose-600 text-center animate-in fade-in">
              <span>{assignError}</span>
              <p className="text-[10px] text-slate-400">დახატეთ დაფაზე რაიმე გასაგზავნად</p>
            </div>
          ) : students.length === 0 ? (
            <p className="text-center text-xs text-slate-500 py-3">ქოლში სხვა მოსწავლეები არ არიან</p>
          ) : (
            <div className="flex flex-col gap-1.5 max-h-48 overflow-y-auto">
              {students.map((student) => (
                <button
                  key={student.identity}
                  type="button"
                  onClick={() => handleAssignPageToStudent(student)}
                  disabled={assignPending}
                  className="flex items-center justify-between p-2 rounded-xl text-left text-xs bg-slate-50 hover:bg-indigo-50 hover:text-indigo-600 disabled:opacity-50 transition-colors"
                >
                  <span className="font-medium truncate max-w-[170px]">
                    {student.name || student.identity}
                  </span>
                  {assignPending ? (
                    <Loader2 className="size-3 animate-spin text-indigo-600" />
                  ) : (
                    <Send className="size-3 text-slate-400" />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-2xl border border-slate-200 shadow-lg select-none">
        <button
          type="button"
          onClick={() => handleSwitchPage(currentPageIndex - 1)}
          disabled={currentPageIndex === 0}
          title="წინა გვერდი"
          className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <ChevronLeft className="size-4" />
        </button>

        <span className="text-xs font-semibold text-slate-700 px-2 min-w-[70px] text-center">
          {currentPageIndex + 1} / {pages.length}
        </span>

        <button
          type="button"
          onClick={() => handleSwitchPage(currentPageIndex + 1)}
          disabled={currentPageIndex === pages.length - 1}
          title="შემდეგი გვერდი"
          className="flex size-8 items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-slate-100 text-slate-700 transition-colors"
        >
          <ChevronRight className="size-4" />
        </button>

        <div className="h-4 w-[1px] bg-slate-200 mx-1" />

        <button
          type="button"
          onClick={handleAddNewPage}
          title="ახალი გვერდის დამატება"
          className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-medium transition-colors"
        >
          <Plus className="size-3.5" />
          <span>ახალი გვერდი</span>
        </button>

        {isTeacher && (
          <button
            type="button"
            onClick={() => {
              setAssignError(null);
              setIsAssignModalOpen((prev) => !prev);
              updateParticipantList();
            }}
            title="ამ დაფის სურათის გაგზავნა მოსწავლესთან დავალებად"
            className="flex items-center gap-1.5 h-8 px-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-medium transition-colors shadow-sm"
          >
            <Send className="size-3.5" />
            <span>გაგზავნა დავალებად</span>
          </button>
        )}
      </div>

      <div className="absolute inset-0 h-full w-full">
        <Excalidraw
          excalidrawAPI={(api: any) => setExcalidrawAPI(api)}
          onChange={handleEditorChange}
          initialData={{
            elements: pages[currentPageIndex] || [],
            libraryItems: initialLibraryItems,
          }}
          UIOptions={{
            canvasActions: {
              loadScene: false,
              export: false,
              saveToActiveFile: false,
            },
          }}
        />
      </div>
    </div>
  );
}