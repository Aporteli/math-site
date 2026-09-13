// //DEADCODE

// 'use client';

// import { useEffect, useRef, useState } from 'react';
// import { Lock, LockOpen, Users, X } from 'lucide-react';
// import type { Student } from '../utils/types';

// interface Props {
//   students: Student[];
//   lockedStudentIds: Set<string>;
//   onToggleLock: (identity: string) => void;
//   isDark: boolean;
// }

// /**
//  * Teacher-only floating control that lets the teacher lock/sync the board view
//  * of individual students currently connected to the class.
//  */
// export function StudentBoardControlPanel({ students, lockedStudentIds, onToggleLock, isDark }: Props) {
//   const [open, setOpen] = useState(false);
//   const rootRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     if (!open) return;
//     const onPointerDown = (e: MouseEvent | TouchEvent) => {
//       if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
//         setOpen(false);
//       }
//     };
//     document.addEventListener('mousedown', onPointerDown);
//     document.addEventListener('touchstart', onPointerDown);
//     return () => {
//       document.removeEventListener('mousedown', onPointerDown);
//       document.removeEventListener('touchstart', onPointerDown);
//     };
//   }, [open]);

//   const lockedCount = students.filter((s) => lockedStudentIds.has(s.identity)).length;

//   return (
//     <div ref={rootRef} className="absolute top-2 right-2 z-[110] flex flex-col items-end">
//       <button
//         type="button"
//         onClick={() => setOpen((v) => !v)}
//         title="დაფის მართვა მოსწავლეებისთვის"
//         className={`relative flex items-center gap-1.5 h-9 px-2.5 rounded-xl border text-xs font-bold shadow-lg backdrop-blur-md transition-colors active:scale-95 ${
//           isDark
//             ? 'border-white/10 bg-slate-900/95 text-slate-100 hover:bg-slate-800'
//             : 'border-slate-200 bg-white/95 text-slate-700 hover:bg-slate-100'
//         }`}
//       >
//         <Users className="size-4" />
//         <span className="hidden sm:inline">დაფის მართვა</span>
//         {lockedCount > 0 && (
//           <span className="flex size-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
//             {lockedCount}
//           </span>
//         )}
//       </button>

//       {open && (
//         <div
//           className={`mt-1.5 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-2xl border shadow-2xl backdrop-blur-md ${
//             isDark
//               ? 'border-white/10 bg-slate-900/95'
//               : 'border-slate-200 bg-white/95'
//           }`}
//         >
//           <div
//             className={`flex items-center justify-between px-3 py-2 text-xs font-bold border-b ${
//               isDark ? 'border-white/10 text-slate-200' : 'border-slate-100 text-slate-600'
//             }`}
//           >
//             <span>მოსწავლეები კლასში ({students.length})</span>
//             <button
//               type="button"
//               onClick={() => setOpen(false)}
//               className="rounded-lg p-1 hover:bg-slate-500/10"
//               aria-label="დახურვა"
//             >
//               <X className="size-4" />
//             </button>
//           </div>

//           <div className="max-h-72 overflow-y-auto thin-scrollbar p-1.5">
//             {students.length === 0 ? (
//               <p className={`px-2 py-4 text-center text-xs ${isDark ? 'text-slate-400' : 'text-slate-500'}`}>
//                 ამჟამად კლასში მოსწავლეები არ არიან დაკავშირებული.
//               </p>
//             ) : (
//               <ul className="flex flex-col gap-0.5">
//                 {students.map((s) => {
//                   const locked = lockedStudentIds.has(s.identity);
//                   return (
//                     <li
//                       key={s.identity}
//                       className={`flex items-center justify-between gap-2 rounded-xl px-2 py-1.5 ${
//                         isDark ? 'hover:bg-white/5' : 'hover:bg-slate-50'
//                       }`}
//                     >
//                       <span className={`truncate text-sm font-medium ${isDark ? 'text-slate-200' : 'text-slate-700'}`}>
//                         {s.name}
//                       </span>
//                       <button
//                         type="button"
//                         onClick={() => onToggleLock(s.identity)}
//                         aria-pressed={locked}
//                         title={locked ? 'მართვის გამორთვა' : 'დაფის მიბმა მასწავლებლის ხედვასთან'}
//                         className={`flex items-center gap-1.5 h-7 px-2.5 rounded-lg text-xs font-bold transition-colors active:scale-95 ${
//                           locked
//                             ? 'bg-indigo-600 text-white hover:bg-indigo-700'
//                             : isDark
//                               ? 'bg-white/10 text-slate-200 hover:bg-white/20'
//                               : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
//                         }`}
//                       >
//                         {locked ? <Lock className="size-3.5" /> : <LockOpen className="size-3.5" />}
//                         <span>{locked ? 'მართვა ჩართულია' : 'მართვა'}</span>
//                       </button>
//                     </li>
//                   );
//                 })}
//               </ul>
//             )}
//           </div>
//         </div>
//       )}
//     </div>
//   );
// }
