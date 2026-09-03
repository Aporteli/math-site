// "use client";

// import { useRef, useState, useEffect, useCallback } from "react";
// import { getStroke } from "perfect-freehand";
// import { Eraser, Save, X, Undo, Maximize2, Minimize2, AlertTriangle } from "lucide-react";

// interface StudentWhiteboardProps {
//   problemId: string;
//   onSave: (file: File) => void;
//   onCancel: () => void;
// }

// interface NormalizedPoint {
//   nx: number;
//   ny: number;
//   pressure?: number;
// }

// export function StudentWhiteboard({ problemId, onSave, onCancel }: StudentWhiteboardProps) {
//   const containerRef = useRef<HTMLDivElement>(null);
//   const canvasRef = useRef<HTMLCanvasElement>(null);
//   const storageKey = `whiteboard_draft_${problemId}`;

//   const [lines, setLines] = useState<NormalizedPoint[][]>(() => {
//     if (typeof window === "undefined") return [];
//     try {
//       const saved = localStorage.getItem(storageKey);
//       return saved ? JSON.parse(saved) : [];
//     } catch {
//       return [];
//     }
//   });

//   const [currentLine, setCurrentLine] = useState<NormalizedPoint[] | null>(null);
//   const [strokeSize, setStrokeSize] = useState<number>(2.5);
//   const [isFullscreen, setIsFullscreen] = useState(false);
//   const [showClearConfirm, setShowClearConfirm] = useState(false);

//   useEffect(() => {
//     try {
//       if (lines.length > 0) {
//         localStorage.setItem(storageKey, JSON.stringify(lines));
//       } else {
//         localStorage.removeItem(storageKey);
//       }
//     } catch {}
//   }, [lines, storageKey]);

//   const syncCanvasSize = useCallback(() => {
//     const container = containerRef.current;
//     const canvas = canvasRef.current;
//     if (!container || !canvas) return;

//     const rect = container.getBoundingClientRect();
//     const dpr = window.devicePixelRatio || 1;

//     canvas.width = rect.width * dpr;
//     canvas.height = rect.height * dpr;

//     const ctx = canvas.getContext("2d");
//     if (ctx) {
//       ctx.scale(dpr, dpr);
//     }
//   }, []);

//   const renderCanvas = useCallback(() => {
//     const canvas = canvasRef.current;
//     const container = containerRef.current;
//     if (!canvas || !container) return;
//     const ctx = canvas.getContext("2d");
//     if (!ctx) return;

//     const rect = container.getBoundingClientRect();

//     ctx.fillStyle = "#ffffff";
//     ctx.fillRect(0, 0, rect.width, rect.height);
//     ctx.fillStyle = "#0f172a";

//     const allLines = currentLine ? [...lines, currentLine] : lines;

//     for (const line of allLines) {
//       if (line.length === 0) continue;

//       const absolutePoints = line.map((p) => [
//         p.nx * rect.width,
//         p.ny * rect.height,
//         p.pressure ?? 0.5,
//       ]);

//       const strokePoints = getStroke(absolutePoints, {
//         size: strokeSize,
//         thinning: 0.6,
//         smoothing: 0.5,
//         streamline: 0.5,
//       });

//       if (strokePoints.length < 3) continue;

//       ctx.beginPath();
//       ctx.moveTo(strokePoints[0][0], strokePoints[0][1]);
//       for (let i = 1; i < strokePoints.length; i++) {
//         ctx.lineTo(strokePoints[i][0], strokePoints[i][1]);
//       }
//       ctx.fill();
//     }
//   }, [lines, currentLine, strokeSize]);

//   useEffect(() => {
//     syncCanvasSize();
//     renderCanvas();

//     const container = containerRef.current;
//     if (!container) return;

//     const resizeObserver = new ResizeObserver(() => {
//       syncCanvasSize();
//       renderCanvas();
//     });

//     resizeObserver.observe(container);
//     return () => resizeObserver.disconnect();
//   }, [syncCanvasSize, renderCanvas, isFullscreen]);

//   useEffect(() => {
//     renderCanvas();
//   }, [renderCanvas]);

//   useEffect(() => {
//     function handleKeyDown(e: KeyboardEvent) {
//       if (e.key === "Escape") {
//         if (showClearConfirm) {
//           setShowClearConfirm(false);
//         } else if (isFullscreen) {
//           setIsFullscreen(false);
//         }
//       }
//     }
//     window.addEventListener("keydown", handleKeyDown);
//     return () => window.removeEventListener("keydown", handleKeyDown);
//   }, [isFullscreen, showClearConfirm]);

//   function getPoint(e: React.PointerEvent<HTMLCanvasElement>): NormalizedPoint {
//     const canvas = canvasRef.current;
//     if (!canvas) return { nx: 0, ny: 0 };
//     const rect = canvas.getBoundingClientRect();

//     return {
//       nx: Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width)),
//       ny: Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height)),
//       pressure: e.pressure && e.pressure > 0 ? e.pressure : 0.5,
//     };
//   }

//   function handlePointerDown(e: React.PointerEvent<HTMLCanvasElement>) {
//     e.preventDefault();
//     (e.target as HTMLElement).setPointerCapture(e.pointerId);
//     setCurrentLine([getPoint(e)]);
//   }

//   function handlePointerMove(e: React.PointerEvent<HTMLCanvasElement>) {
//     if (!currentLine) return;
//     e.preventDefault();
//     setCurrentLine((prev) => (prev ? [...prev, getPoint(e)] : null));
//   }

//   function handlePointerUp() {
//     if (currentLine) {
//       setLines((prev) => [...prev, currentLine]);
//       setCurrentLine(null);
//     }
//   }

//   function handleUndo() {
//     setLines((prev) => prev.slice(0, -1));
//   }

//   function confirmClear() {
//     setLines([]);
//     setCurrentLine(null);
//     setShowClearConfirm(false);
//     try {
//       localStorage.removeItem(storageKey);
//     } catch {}
//   }

//   function handleSave() {
//     const canvas = canvasRef.current;
//     if (!canvas) return;

//     canvas.toBlob((blob) => {
//       if (!blob) return;
//       const file = new File([blob], `solution-${Date.now()}.png`, { type: "image/png" });
//       onSave(file);
//     }, "image/png");
//   }

//   return (
//     <div
//       className={
//         isFullscreen
//           ? "fixed inset-0 z-[200] flex flex-col gap-3 bg-white p-6 animate-in fade-in duration-150"
//           : "relative flex flex-col gap-3 rounded-2xl border border-hairline bg-paper/60 p-4"
//       }
//     >
//       {/* ხელსაწყოების პანელი */}
//       <div className="flex flex-wrap items-center justify-between gap-2">
//         <div className="flex items-center gap-3">
//           <p className="text-xs font-bold text-muted">დაფა</p>

//           <div className="flex items-center gap-1 rounded-xl border border-hairline bg-white p-1 shadow-2xs">
//             {[
//               { label: "თხელი", val: 2.5 },
//               { label: "საშუალო", val: 4 },
//               { label: "სქელი", val: 6.5 },
//             ].map((item) => (
//               <button
//                 key={item.val}
//                 type="button"
//                 onClick={() => setStrokeSize(item.val)}
//                 className={`rounded-lg px-2.5 py-1 text-[11px] font-bold transition-all ${
//                   strokeSize === item.val
//                     ? "bg-navy text-white shadow-xs"
//                     : "text-muted hover:text-ink"
//                 }`}
//               >
//                 {item.label}
//               </button>
//             ))}
//           </div>
//         </div>

//         <div className="flex items-center gap-2">
//           <button
//             type="button"
//             onClick={() => setIsFullscreen((prev) => !prev)}
//             title={isFullscreen ? "პატარა ზომა" : "სრული ეკრანი"}
//             className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-2.5 py-1.5 text-xs font-bold text-ink shadow-2xs hover:bg-paper transition-colors"
//           >
//             {isFullscreen ? (
//               <>
//                 <Minimize2 className="size-3.5" /> პატარა ზომა
//               </>
//             ) : (
//               <>
//                 <Maximize2 className="size-3.5" /> სრული ეკრანი
//               </>
//             )}
//           </button>

//           <button
//             type="button"
//             onClick={handleUndo}
//             disabled={lines.length === 0}
//             className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-2.5 py-1.5 text-xs font-bold text-ink shadow-2xs hover:bg-paper disabled:opacity-40 transition-colors"
//           >
//             <Undo className="size-3.5" /> უკან
//           </button>
          
//           <button
//             type="button"
//             disabled={lines.length === 0}
//             onClick={() => setShowClearConfirm(true)}
//             className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-2.5 py-1.5 text-xs font-bold text-ink shadow-2xs hover:text-rose-600 disabled:opacity-40 transition-colors"
//           >
//             <Eraser className="size-3.5" /> გასუფთავება
//           </button>

//           <button
//             type="button"
//             onClick={onCancel}
//             className="flex items-center gap-1.5 rounded-xl border border-hairline bg-white px-2.5 py-1.5 text-xs font-bold text-muted shadow-2xs hover:text-ink transition-colors"
//           >
//             <X className="size-3.5" /> გაუქმება
//           </button>
//         </div>
//       </div>

//       {/* Canvas */}
//       <div
//         ref={containerRef}
//         className={
//           isFullscreen
//             ? "relative flex-1 w-full overflow-hidden rounded-2xl border-2 border-hairline bg-white shadow-inner"
//             : "relative h-[420px] w-full overflow-hidden rounded-2xl border border-hairline bg-white shadow-inner"
//         }
//       >
//         <canvas
//           ref={canvasRef}
//           onPointerDown={handlePointerDown}
//           onPointerMove={handlePointerMove}
//           onPointerUp={handlePointerUp}
//           onPointerCancel={handlePointerUp}
//           className="h-full w-full cursor-crosshair touch-none select-none block"
//         />
//       </div>

//       <button
//         type="button"
//         onClick={handleSave}
//         className="flex w-full items-center justify-center gap-2 rounded-xl bg-navy px-4 py-2.5 text-sm font-bold text-white shadow-sm hover:bg-navy-strong transition-colors"
//       >
//         <Save className="size-4" /> ამოხსნის დამახსოვრება
//       </button>

//       {/* გასუფთავების დადასტურების მოდალი */}
//       {showClearConfirm && (
//         <div 
//           className="fixed inset-0 z-[250] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-xs animate-in fade-in duration-150"
//           onClick={() => setShowClearConfirm(false)}
//         >
//           <div 
//             className="w-full max-w-xs rounded-2xl border border-hairline bg-white p-5 shadow-2xl animate-in zoom-in-95 duration-150"
//             onClick={(e) => e.stopPropagation()}
//           >
//             <div className="flex items-center gap-3">
//               <div className="flex size-9 shrink-0 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
//                 <AlertTriangle className="size-5" />
//               </div>
//               <h4 className="text-sm font-bold text-ink">დაფის გასუფთავება</h4>
//             </div>

//             <p className="mt-2.5 text-xs leading-relaxed text-muted">
//               დარწმუნებული ხართ, რომ გსურთ დაფის გასუფთავება? ყველა ჩანაწერი წაიშლება.
//             </p>

//             <div className="mt-5 flex items-center justify-end gap-2">
//               <button
//                 type="button"
//                 onClick={() => setShowClearConfirm(false)}
//                 className="rounded-xl bg-paper px-3 py-1.5 text-xs font-bold text-ink hover:bg-paper-deep transition-colors"
//               >
//                 გაუქმება
//               </button>
//               <button
//                 type="button"
//                 onClick={confirmClear}
//                 className="rounded-xl bg-rose-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-rose-700 transition-colors"
//               >
//                 დიახ
//               </button>
//             </div>
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }