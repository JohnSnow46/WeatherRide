import { PlanRouteResponse } from './route-plan-api.model';
import {
  clearRoutePlanResult,
  loadRoutePlanResult,
  RoutePlanResultSnapshot,
  saveRoutePlanResult
} from './route-plan-result-storage';

describe('route-plan-result-storage', () => {
  const result: PlanRouteResponse = {
    totalDistanceKm: 30,
    samples: [
      { latitude: 52.0, longitude: 21.0, distanceFromStartKm: 0, etaAt: '2026-08-01T10:00:00', weather: null, windRelativeDirection: null }
    ],
    track: []
  };

  const snapshot: RoutePlanResultSnapshot = {
    result,
    lastDepartureAtIso: '2026-08-01T10:00:00',
    lastAverageSpeedKmh: 20,
    lastPlannedDurationHours: null,
    departureShiftHours: 1
  };

  afterEach(() => localStorage.clear());

  it('returns null when nothing was saved yet', () => {
    expect(loadRoutePlanResult()).toBeNull();
  });

  it('round-trips a saved snapshot', () => {
    saveRoutePlanResult(snapshot);

    expect(loadRoutePlanResult()).toEqual(snapshot);
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    localStorage.setItem('weatherride.routePlanResult', '{not json');

    expect(loadRoutePlanResult()).toBeNull();
  });

  it('returns null when storage access throws (e.g. private browsing)', () => {
    spyOn(localStorage, 'getItem').and.throwError('denied');

    expect(loadRoutePlanResult()).toBeNull();
  });

  it('swallows a write failure instead of throwing', () => {
    spyOn(localStorage, 'setItem').and.throwError('quota exceeded');

    expect(() => saveRoutePlanResult(snapshot)).not.toThrow();
  });

  it('clears a saved snapshot', () => {
    saveRoutePlanResult(snapshot);

    clearRoutePlanResult();

    expect(loadRoutePlanResult()).toBeNull();
  });

  it('swallows a clear failure instead of throwing', () => {
    spyOn(localStorage, 'removeItem').and.throwError('denied');

    expect(() => clearRoutePlanResult()).not.toThrow();
  });
});
