'use client';

import { useCallback, useState } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import { Track, LocalVideoTrack } from 'livekit-client';
import { TemporalBackgroundProcessor } from '@/lib/livekit/temporal-background-processor';

type Processor = TemporalBackgroundProcessor;

export function useVirtualBackground() {
  const room = useMaybeRoomContext();
  const [isActive, setIsActive] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [processor, setProcessor] = useState<Processor | null>(null);

  const applyVirtualBackground = useCallback(
    async (imagePath: string, enable: boolean) => {
      if (!room) return;

      const publication = room.localParticipant.getTrackPublication(
        Track.Source.Camera,
      );
      if (!publication || !publication.track) {
        alert('კამერა ჩართული არ არის!');
        return;
      }

      const videoTrack = publication.track as LocalVideoTrack;
      setIsLoading(true);

      try {
        if (enable) {
          if (processor) {
            await processor.updateBackground(imagePath);
          } else {
            try {
              await videoTrack.stopProcessor();
            } catch {
              /* no processor attached */
            }

            const newProcessor = new TemporalBackgroundProcessor({ imagePath });
            await videoTrack.setProcessor(newProcessor);
            setProcessor(newProcessor);
          }
          setIsActive(true);
        } else {
          try {
            await videoTrack.stopProcessor();
          } catch {
            /* already stopped */
          }
          setProcessor(null);
          setIsActive(false);
        }
      } catch (error) {
        console.error('Failed to set virtual background:', error);
        alert(
          'ფონის სურათის დაყენება ვერ მოხერხდა: ' +
            (error instanceof Error ? error.message : String(error)),
        );
      } finally {
        setIsLoading(false);
      }
    },
    [room, processor],
  );

  return {
    hasRoom: Boolean(room),
    isActive,
    isLoading,
    applyVirtualBackground,
  };
}