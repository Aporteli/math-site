'use client';

import { useCallback, useState } from 'react';
import { useMaybeRoomContext } from '@livekit/components-react';
import { Track, LocalVideoTrack } from 'livekit-client';
import { BackgroundBlur } from '@livekit/track-processors';
import { DEFAULT_BLUR_RADIUS, type BlurLevel } from './constants';
import {
  SELFIE_SEGMENTER_MODEL,
  SELFIE_SEGMENTER_DELEGATE,
} from '@/lib/livekit/background';

type Processor = ReturnType<typeof BackgroundBlur>;

export function useBackgroundBlur() {
  const room = useMaybeRoomContext();
  const [isBlurred, setIsBlurred] = useState(false);
  const [blurRadius, setBlurRadius] = useState<BlurLevel>(DEFAULT_BLUR_RADIUS);
  const [isLoading, setIsLoading] = useState(false);
  const [processor, setProcessor] = useState<Processor | null>(null);

  const applyBlur = useCallback(
    async (radius: number, enable: boolean) => {
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
        try {
          await videoTrack.stopProcessor();
        } catch {
          /* no processor attached */
        }
        setProcessor(null);

        if (enable) {
          const blurProcessor = BackgroundBlur(radius, {
            delegate: SELFIE_SEGMENTER_DELEGATE,
            modelAssetPath: SELFIE_SEGMENTER_MODEL,
          });
          await videoTrack.setProcessor(blurProcessor);
          setProcessor(blurProcessor);
          setIsBlurred(true);
        } else {
          setIsBlurred(false);
        }
      } catch (error) {
        console.error('Failed to set blur processor:', error);
      } finally {
        setIsLoading(false);
      }
    },
    [room],
  );

  const selectLevel = useCallback(
    (level: BlurLevel) => {
      setBlurRadius(level);
      void applyBlur(level, true);
    },
    [applyBlur],
  );

  return {
    hasRoom: Boolean(room),
    isBlurred,
    blurRadius,
    isLoading,
    applyBlur,
    selectLevel,
  };
}