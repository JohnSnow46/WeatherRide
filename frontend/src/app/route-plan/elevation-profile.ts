import { TrackPointDto } from './route-plan-api.model';

export interface ElevationProfile {
  /** SVG polyline `points` attribute value, normalized to a 0..100 x, 0..40 y viewBox
   * (y=0 is the highest elevation, y=40 the lowest — SVG y grows downward). */
  points: string;
  minElevationM: number;
  maxElevationM: number;
  /** Sum of positive elevation deltas between consecutive points — total climbing. */
  totalAscentM: number;
}

const VIEWBOX_WIDTH = 100;
const VIEWBOX_HEIGHT = 40;

/**
 * Builds a normalized elevation-vs-distance profile from the route's full-resolution
 * track. Returns null when fewer than 2 points carry elevation (GPX had no <ele>, or the
 * route came from plan-direct's A-B mode, which never has elevation) — nothing sensible
 * to plot.
 */
export function buildElevationProfile(track: TrackPointDto[]): ElevationProfile | null {
  const withElevation = track.filter(
    (p): p is TrackPointDto & { elevation: number } => p.elevation !== null
  );

  if (withElevation.length < 2) {
    return null;
  }

  const elevations = withElevation.map(p => p.elevation);
  const minElevationM = Math.min(...elevations);
  const maxElevationM = Math.max(...elevations);
  const elevationRangeM = maxElevationM - minElevationM;

  const totalDistanceKm = withElevation[withElevation.length - 1].distanceFromStartKm;

  const points = withElevation
    .map(p => {
      const x = totalDistanceKm <= 0 ? 0 : (p.distanceFromStartKm / totalDistanceKm) * VIEWBOX_WIDTH;
      // Flat profile (elevationRangeM === 0) draws a straight line through the middle
      // rather than dividing by zero.
      const y = elevationRangeM <= 0
        ? VIEWBOX_HEIGHT / 2
        : VIEWBOX_HEIGHT - ((p.elevation - minElevationM) / elevationRangeM) * VIEWBOX_HEIGHT;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  const totalAscentM = withElevation.reduce((sum, p, i) => {
    if (i === 0) {
      return sum;
    }
    const delta = p.elevation - withElevation[i - 1].elevation;
    return delta > 0 ? sum + delta : sum;
  }, 0);

  return { points, minElevationM, maxElevationM, totalAscentM };
}
