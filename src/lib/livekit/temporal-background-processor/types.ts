import type { ProcessorOptions, Track } from 'livekit-client';

export interface TemporalBackgroundOptions {
  imagePath: string;
  /** Deprecated: kept for API compatibility; runtime settings take priority. */
  smoothingFactor?: number;
}

export type VideoOpts = ProcessorOptions<Track.Kind.Video>;
