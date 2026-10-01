import { loadRoutePlanDraft, RoutePlanDraft, saveRoutePlanDraft } from './route-plan-draft-storage';

describe('route-plan-draft-storage', () => {
  const draft: RoutePlanDraft = {
    routeMode: 'direct',
    departureAt: '2026-08-01T10:00',
    speedMode: 'speed',
    averageSpeedKmh: 20,
    plannedDurationHours: null,
    sampleCount: 20,
    pointALatitude: 52.0,
    pointALongitude: 21.0,
    pointBLatitude: 52.5,
    pointBLongitude: 21.5
  };

  afterEach(() => localStorage.clear());

  it('returns null when nothing was saved yet', () => {
    expect(loadRoutePlanDraft()).toBeNull();
  });

  it('round-trips a saved draft', () => {
    saveRoutePlanDraft(draft);

    expect(loadRoutePlanDraft()).toEqual(draft);
  });

  it('returns null for corrupted JSON instead of throwing', () => {
    localStorage.setItem('weatherride.routePlanDraft', '{not json');

    expect(loadRoutePlanDraft()).toBeNull();
  });

  it('returns null when storage access throws (e.g. private browsing)', () => {
    spyOn(localStorage, 'getItem').and.throwError('denied');

    expect(loadRoutePlanDraft()).toBeNull();
  });

  it('swallows a write failure instead of throwing', () => {
    spyOn(localStorage, 'setItem').and.throwError('quota exceeded');

    expect(() => saveRoutePlanDraft(draft)).not.toThrow();
  });
});
