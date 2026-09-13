/**
 * Snaps an angle (in degrees) to the nearest multiple of `step` when it is
 * within `threshold` degrees of one. Otherwise returns the angle unchanged.
 *
 * Used to make rotation "click" onto cardinal directions (0/90/180/270)
 * without preventing free rotation elsewhere.
 */
export function snapAngle(
    angleDeg: number,
    step = 90,
    threshold = 5,
  ): number {
    const normalized = ((angleDeg % 360) + 360) % 360;
    const nearest = Math.round(normalized / step) * step;
    const distance = Math.abs(normalized - nearest);
    // Also check the wrap-around case (e.g. 358° is 2° from 0°/360°).
    const wrappedDistance = Math.min(distance, 360 - distance);
    return wrappedDistance <= threshold ? nearest % 360 : angleDeg;
  }