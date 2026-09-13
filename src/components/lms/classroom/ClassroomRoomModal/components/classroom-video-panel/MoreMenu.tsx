//DEADCODE

// 'use client';

// import { BlurToggleButton } from '@/components/ui/BlurToggleButton';
// import { useRemoteParticipants } from '@livekit/components-react';
// import type { RemoteParticipant } from 'livekit-client';
// import { useState, useEffect, useRef } from 'react';
// import { createPortal } from 'react-dom';
// import { Shield, ShieldAlert } from 'lucide-react';

// interface MoreMenuProps {
//   courseId: string;
//   isTeacher: boolean;
//   isolatedIdentities: string[];
//   onIsolationChange: (isolatedIdentities: string[]) => void;
// }

// function StudentModal({
//   open,
//   onClose,
//   position,
//   student,
//   isTeacher,
//   isIsolated,
//   onToggleIsolation,
// }: {
//   open: boolean;
//   onClose: () => void;
//   position: { x: number; y: number };
//   student: RemoteParticipant | null;
//   isTeacher: boolean;
//   isIsolated: boolean;
//   onToggleIsolation: (identity: string) => void;
// }) {
//   const [mounted, setMounted] = useState(false);
//   const modalRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     setMounted(true);
//   }, []);

//   // გარეთ დაჭერისას დახურვის ლოგიკა.
//   // ასევე ვაჩერებთ native bubbling-ს, რომ ControlBar-ის document-level
//   // outside-click handler-მა არ დახუროს More menu მოდალზე კლიკისას.
//   useEffect(() => {
//     if (!open || !mounted) return;

//     const el = modalRef.current;
//     if (!el) return;

//     const stop = (e: Event) => e.stopPropagation();
//     el.addEventListener('mousedown', stop);
//     el.addEventListener('pointerdown', stop);

//     const handlePointerDown = (event: PointerEvent) => {
//       if (el.contains(event.target as Node)) return;
//       onClose();
//     };
//     document.addEventListener('pointerdown', handlePointerDown);

//     return () => {
//       el.removeEventListener('mousedown', stop);
//       el.removeEventListener('pointerdown', stop);
//       document.removeEventListener('pointerdown', handlePointerDown);
//     };
//   }, [open, mounted, onClose]);

//   if (!open || !mounted || !student) return null;

//   return createPortal(
//     <div
//       ref={modalRef}
//       style={{
//         position: 'fixed',
//         left: position.x,
//         top: position.y,
//       }}
//       className="z-[99999] min-w-[180px] rounded-xl border border-white/10 bg-slate-800 p-3 shadow-2xl text-xs text-white pointer-events-auto"
//       onPointerDown={(e) => e.stopPropagation()}
//       onClick={(e) => e.stopPropagation()}
//     >
//       <p className="font-semibold text-emerald-400">
//         {student.name || student.identity}
//       </p>
//       <p className="text-[10px] text-white/50 mb-2 truncate">ID: {student.identity}</p>

//       <div className="flex flex-col gap-1.5 border-t border-white/10 pt-2">
//         {isTeacher && (
//           <button
//             type="button"
//             onPointerDown={(e) => e.stopPropagation()}
//             onClick={(e) => {
//               e.stopPropagation();
//               e.preventDefault();
//               onToggleIsolation(student.identity);
//             }}
//             className={`flex items-center justify-between w-full rounded-lg px-2 py-1.5 transition text-left font-medium ${
//               isIsolated
//                 ? 'bg-red-500/20 text-red-300 border border-red-500/30 hover:bg-red-500/30'
//                 : 'bg-white/5 text-white/80 hover:bg-white/10'
//             }`}
//           >
//             <span>{isIsolated ? 'იზოლაციის მოხსნა' : 'იზოლირება'}</span>
//             {isIsolated ? (
//               <ShieldAlert className="size-3.5 text-red-400" />
//             ) : (
//               <Shield className="size-3.5 text-white/40" />
//             )}
//           </button>
//         )}

//         <button
//           type="button"
//           onPointerDown={(e) => e.stopPropagation()}
//           onClick={(e) => {
//             e.stopPropagation();
//             alert(`მოქმედება სტუდენტზე: ${student.identity}`);
//             onClose();
//           }}
//           className="w-full rounded-lg bg-white/5 px-2 py-1.5 text-left text-white/80 hover:bg-white/10 transition"
//         >
//           პროფილის ნახვა
//         </button>
//       </div>
//     </div>,
//     document.body
//   );
// }

// function StudentsList({
//   participants,
//   isTeacher,
//   isolatedIdentities,
//   onIsolationChange,
// }: {
//   participants: RemoteParticipant[];
//   isTeacher: boolean;
//   isolatedIdentities: string[];
//   onIsolationChange: (isolatedIdentities: string[]) => void;
// }) {
//   const [modalOpen, setModalOpen] = useState(false);
//   const [modalPos, setModalPos] = useState({ x: 0, y: 0 });
//   const [selectedStudent, setSelectedStudent] = useState<RemoteParticipant | null>(null);

//   const handleStudentClick = (e: React.MouseEvent, participant: RemoteParticipant) => {
//     e.stopPropagation();

//     if (modalOpen && selectedStudent?.identity === participant.identity) {
//       setModalOpen(false);
//       return;
//     }

//     const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();

//     const modalWidth = 190;
//     const modalHeight = 120;

//     let xPos = rect.right + 10;
//     if (xPos + modalWidth > window.innerWidth) {
//       xPos = rect.left - modalWidth;
//     }

//     let yPos = rect.top;
//     if (yPos + modalHeight > window.innerHeight) {
//       yPos = window.innerHeight - modalHeight - 10;
//     }

//     setModalPos({ x: Math.max(10, xPos), y: Math.max(10, yPos) });
//     setSelectedStudent(participant);
//     setModalOpen(true);
//   };

//   const handleToggleIsolation = (identity: string) => {
//     const updatedIdentities = isolatedIdentities.includes(identity)
//       ? isolatedIdentities.filter((id) => id !== identity)
//       : [...isolatedIdentities, identity];

//     onIsolationChange(updatedIdentities);
//   };

//   return (
//     <div className="rounded-xl bg-white/5 p-2 text-xs text-white/90 mt-1">
//       <span className="font-semibold">სტუდენტები:</span>
//       <ul className="mt-1 space-y-1 max-h-40 overflow-y-auto">
//         {participants.length === 0 ? (
//           <li className="text-white/40">სტუდენტები ვერ მოიძებნა</li>
//         ) : (
//           participants.map((participant: RemoteParticipant) => {
//             const isIsolated = isolatedIdentities.includes(participant.identity);

//             return (
//               <li
//                 key={participant.identity}
//                 className="flex items-center justify-between pl-2 cursor-pointer hover:text-emerald-400 transition py-0.5"
//                 title={participant.name || participant.identity}
//                 onClick={(e) => handleStudentClick(e, participant)}
//               >
//                 <span className="before:content-['•_'] before:text-white/40 truncate">
//                   {participant.name ? participant.name : participant.identity}
//                 </span>

//                 {isIsolated && (
//                   <span className="text-[9px] bg-red-500/20 text-red-400 border border-red-500/30 px-1 rounded ml-1 shrink-0">
//                     იზოლირებული
//                   </span>
//                 )}
//               </li>
//             );
//           })
//         )}
//       </ul>

//       <StudentModal
//         open={modalOpen}
//         onClose={() => setModalOpen(false)}
//         position={modalPos}
//         student={selectedStudent}
//         isTeacher={isTeacher}
//         isIsolated={
//           selectedStudent ? isolatedIdentities.includes(selectedStudent.identity) : false
//         }
//         onToggleIsolation={handleToggleIsolation}
//       />
//     </div>
//   );
// }

// export function MoreMenu({
//   courseId,
//   isTeacher,
//   isolatedIdentities,
//   onIsolationChange,
// }: MoreMenuProps) {
//   const participants = useRemoteParticipants();

//   return (
//     <div
//       className="absolute bottom-11 right-0 z-50 flex w-48 flex-col gap-1.5 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl"
//       onClick={(e) => e.stopPropagation()}
//       onPointerDown={(e) => e.stopPropagation()}
//     >
//       <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">
//         პარამეტრები
//       </div>

//       <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
//         <span>ფონის ბლური</span>
//         <BlurToggleButton />
//       </div>

//       <StudentsList
//         participants={participants}
//         isTeacher={isTeacher}
//         isolatedIdentities={isolatedIdentities}
//         onIsolationChange={onIsolationChange}
//       />
//     </div>
//   );
// }
