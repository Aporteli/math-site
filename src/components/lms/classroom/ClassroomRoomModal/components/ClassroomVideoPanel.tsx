// //DEADCODE

// 'use client';

// import { useState, useRef, useEffect } from 'react';
// import {
//   LiveKitRoom,
//   RoomAudioRenderer,
//   useLocalParticipant,
//   useMediaDeviceSelect,
// } from '@livekit/components-react';
// import type { Room } from 'livekit-client';
// import {
//   MessageSquare, Mic, MicOff, Video, VideoOff,
//   MonitorUp, MoreVertical, ChevronUp,
// } from 'lucide-react';
// import { BlurToggleButton } from '@/components/ui/BlurToggleButton';
// import { ConnectionStatusBadge } from './ConnectionStatusBadge';
// import { MyVideoGrid } from './video-grid/MyVideoGrid';
// import { RoomInstanceBridge } from './RoomInstanceBridge';
// import { BreakoutControls } from './BreakoutControls';
// import { AudioIsolationListener } from './AudioIsolationListener';
// import '@livekit/components-styles';
// import { CustomChat } from './CustomChat';
// import { ChatBackgroundListener } from './ChatBackgroundListener';

// interface ClassroomVideoPanelProps {
//   token: string;
//   courseId: string;
//   isTeacher: boolean;
//   onClose: () => void;
//   onRoom: (room: Room) => void;
// }

// type MenuId = 'mic' | 'cam' | 'more';

// /* ─────────── Shared mic / camera toggle + picker ─────────── */

// function MediaControl({
//   kind, menuId, nounNom, nounGen, fallbackPrefix,
//   activeMenu, setActiveMenu,
// }: {
//   kind: 'audioinput' | 'videoinput';
//   menuId: 'mic' | 'cam';
//   nounNom: string;
//   nounGen: string;
//   fallbackPrefix: string;
//   activeMenu: MenuId | null;
//   setActiveMenu: (m: MenuId | null) => void;
// }) {
//   const { localParticipant } = useLocalParticipant();
//   const { devices, activeDeviceId, setActiveMediaDevice } = useMediaDeviceSelect({ kind });

//   const isMic = kind === 'audioinput';
//   const muted = isMic
//     ? !localParticipant.isMicrophoneEnabled
//     : !localParticipant.isCameraEnabled;
//   const Icon = isMic ? (muted ? MicOff : Mic) : muted ? VideoOff : Video;

//   return (
//     <div className="relative flex items-center rounded-xl border border-white/10 bg-white/5 p-0.5">
//       <button
//         type="button"
//         onClick={() =>
//           isMic
//             ? localParticipant.setMicrophoneEnabled(muted)
//             : localParticipant.setCameraEnabled(muted)
//         }
//         title={`${nounGen} ${muted ? 'ჩართვა' : 'გათიშვა'}`}
//         className={`flex h-8 items-center justify-center rounded-lg px-2 transition-all ${
//           muted
//             ? 'bg-red-500/20 text-red-400'
//             : 'text-white/80 hover:bg-white/10 hover:text-white'
//         }`}
//       >
//         <Icon className="size-4" />
//       </button>
//       <button
//         type="button"
//         onClick={() => setActiveMenu(activeMenu === menuId ? null : menuId)}
//         title={`${nounGen} არჩევა`}
//         className="flex h-8 items-center justify-center rounded-lg px-1 text-white/50 hover:bg-white/10 hover:text-white"
//       >
//         <ChevronUp className="size-3" />
//       </button>

//       {activeMenu === menuId && (
//         <div className="absolute bottom-11 left-0 z-50 w-52 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
//           <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">
//             აირჩიეთ {nounNom}
//           </div>
//           {devices.map((d) => (
//             <button
//               key={d.deviceId}
//               type="button"
//               onClick={() => {
//                 if (activeDeviceId !== d.deviceId) setActiveMediaDevice(d.deviceId);
//                 setActiveMenu(null);
//               }}
//               className={`w-full truncate rounded-lg px-2.5 py-1.5 text-left text-xs transition ${
//                 activeDeviceId === d.deviceId
//                   ? 'bg-emerald-500/20 text-emerald-400 font-medium'
//                   : 'text-white/80 hover:bg-white/10'
//               }`}
//             >
//               {d.label || `${fallbackPrefix} ${d.deviceId.slice(0, 5)}`}
//             </button>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// /* ───────────────────── Control bar ───────────────────── */

// function CustomCompactControlBar({
//   isChatOpen, onToggleChat, isTeacher, courseId,
// }: {
//   isChatOpen: boolean;
//   onToggleChat: () => void;
//   isTeacher: boolean;
//   courseId: string;
// }) {
//   const { localParticipant } = useLocalParticipant();
//   const [activeMenu, setActiveMenu] = useState<MenuId | null>(null);
//   const navRef = useRef<HTMLDivElement>(null);

//   useEffect(() => {
//     const handler = (e: MouseEvent) => {
//       if (navRef.current && !navRef.current.contains(e.target as Node)) setActiveMenu(null);
//     };
//     document.addEventListener('mousedown', handler);
//     return () => document.removeEventListener('mousedown', handler);
//   }, []);

//   const sharing = localParticipant.isScreenShareEnabled;
//   const idle = 'border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white';

//   return (
//     <div
//       ref={navRef}
//       className="shrink-0 flex items-center justify-between px-3 py-2 bg-slate-950/90 border-t border-white/10 relative backdrop-blur-md"
//     >
//       <div className="flex items-center gap-2">
//         <MediaControl
//           kind="audioinput" menuId="mic"
//           nounNom="მიკროფონი" nounGen="მიკროფონის" fallbackPrefix="Microphone"
//           activeMenu={activeMenu} setActiveMenu={setActiveMenu}
//         />
//         <MediaControl
//           kind="videoinput" menuId="cam"
//           nounNom="კამერა" nounGen="კამერის" fallbackPrefix="Camera"
//           activeMenu={activeMenu} setActiveMenu={setActiveMenu}
//         />
//         <button
//           type="button"
//           onClick={() => localParticipant.setScreenShareEnabled(!sharing)}
//           title="ეკრანის გაზიარება"
//           className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
//             sharing ? 'border-blue-500 bg-blue-600 text-white' : idle
//           }`}
//         >
//           <MonitorUp className="size-4" />
//         </button>
//       </div>

//       <div className="flex items-center gap-1.5">
//         <button
//           type="button"
//           onClick={onToggleChat}
//           title="ჩატი"
//           className={`flex size-9 items-center justify-center rounded-xl border transition-all ${
//             isChatOpen ? 'border-emerald-500 bg-emerald-500 text-white' : idle
//           }`}
//         >
//           <MessageSquare className="size-4" />
//         </button>

//         <div className="relative">
//           <button
//             type="button"
//             onClick={() => setActiveMenu(activeMenu === 'more' ? null : 'more')}
//             title="პარამეტრები"
//             className={`flex size-9 items-center justify-center rounded-xl border border-white/10 bg-white/5 text-white/80 hover:bg-white/15 hover:text-white transition-all ${
//               activeMenu === 'more' ? 'bg-white/20 text-white' : ''
//             }`}
//           >
//             <MoreVertical className="size-4" />
//           </button>

//           {activeMenu === 'more' && (
//             <div className="absolute bottom-11 right-0 z-50 flex w-48 flex-col gap-1.5 rounded-2xl border border-white/10 bg-slate-900/95 p-2 shadow-2xl backdrop-blur-xl">
//               <div className="px-2 py-1 text-[10px] font-semibold text-white/40 uppercase">
//                 პარამეტრები
//               </div>
//               <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
//                 <span>ფონის ბლური</span>
//                 <BlurToggleButton />
//               </div>
//               {isTeacher && (
//                 <div className="flex items-center justify-between rounded-xl bg-white/5 p-2 text-xs text-white/90">
//                   <span>Breakout</span>
//                   <BreakoutControls courseId={courseId} />
//                 </div>
//               )}
//             </div>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }

// /* ─────────────────────── Panel ─────────────────────── */

// export function ClassroomVideoPanel({
//   token, courseId, isTeacher, onClose, onRoom,
// }: ClassroomVideoPanelProps) {
//   const [isChatOpen, setIsChatOpen] = useState(false);

//   return (
//     <LiveKitRoom
//       video
//       audio
//       token={token}
//       serverUrl={process.env.NEXT_PUBLIC_LIVEKIT_URL}
//       options={{ videoCaptureDefaults: { resolution: { width: 1280, height: 720 } } }}
//       data-lk-theme="default"
//       className="flex h-full w-full min-h-0 flex-1 flex-col overflow-hidden"
//       onDisconnected={onClose}
//     >
//       <RoomInstanceBridge onRoom={onRoom} />
//       <AudioIsolationListener isTeacher={isTeacher} />
//       <ChatBackgroundListener courseId={courseId} />

//       <div className="absolute top-2 left-2 z-10">
//         <ConnectionStatusBadge />
//       </div>

//       {isChatOpen ? (
//         <div className="relative flex-1 min-h-0 w-full overflow-hidden p-2">
//           <CustomChat courseId={courseId} />
//         </div>
//       ) : (
//         <MyVideoGrid />
//       )}

//       <CustomCompactControlBar
//         isChatOpen={isChatOpen}
//         onToggleChat={() => setIsChatOpen((p) => !p)}
//         isTeacher={isTeacher}
//         courseId={courseId}
//       />

//       <RoomAudioRenderer />
//     </LiveKitRoom>
//   );
// }