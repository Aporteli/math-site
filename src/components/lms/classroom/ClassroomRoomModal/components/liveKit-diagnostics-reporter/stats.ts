import type { Room } from 'livekit-client';
import type { StatsReportLike } from '@/lib/livekit/diagnostics/metrics';

export function asStatsReport(report: RTCStatsReport): StatsReportLike {
  return {
    forEach(callback) {
      report.forEach((stat) => {
        const entry: { id: string; type: string; [key: string]: unknown } = {
          id: stat.id,
          type: stat.type,
        };
        for (const [key, value] of Object.entries(stat)) entry[key] = value;
        callback(entry);
      });
    },
  };
}

export async function readStats(room: Room): Promise<StatsReportLike[]> {
  const manager = room.engine.pcManager;
  if (!manager) return [];
  const reports: StatsReportLike[] = [];
  try {
    const publisher = manager.publisher.getStats();
    const subscriber = manager.subscriber?.getStats();
    if (publisher) reports.push(asStatsReport(await publisher));
    if (subscriber) reports.push(asStatsReport(await subscriber));
  } catch {
    return reports;
  }
  return reports;
}
