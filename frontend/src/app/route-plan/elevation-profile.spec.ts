import { TrackPointDto } from './route-plan-api.model';
import { buildElevationProfile } from './elevation-profile';

function point(distanceFromStartKm: number, elevation: number | null): TrackPointDto {
  return { latitude: 0, longitude: 0, distanceFromStartKm, elevation };
}

describe('buildElevationProfile', () => {
  it('buildElevationProfile_NoPointsHaveElevation_ReturnsNull', () => {
    const track = [point(0, null), point(10, null)];

    expect(buildElevationProfile(track)).toBeNull();
  });

  it('buildElevationProfile_OnlyOnePointHasElevation_ReturnsNull', () => {
    const track = [point(0, 100), point(10, null)];

    expect(buildElevationProfile(track)).toBeNull();
  });

  it('buildElevationProfile_TwoPointsWithElevation_ReturnsMinMaxAndAscent', () => {
    const track = [point(0, 100), point(10, 150)];

    const profile = buildElevationProfile(track);

    expect(profile).not.toBeNull();
    expect(profile!.minElevationM).toBe(100);
    expect(profile!.maxElevationM).toBe(150);
    expect(profile!.totalAscentM).toBe(50);
  });

  it('buildElevationProfile_DescentOnly_TotalAscentIsZero', () => {
    const track = [point(0, 200), point(10, 100)];

    const profile = buildElevationProfile(track);

    expect(profile!.totalAscentM).toBe(0);
  });

  it('buildElevationProfile_UpDownUp_SumsOnlyPositiveDeltas', () => {
    const track = [point(0, 100), point(5, 150), point(10, 120), point(15, 180)];

    const profile = buildElevationProfile(track);

    // +50 (100->150), -30 ignored, +60 (120->180) = 110
    expect(profile!.totalAscentM).toBe(110);
  });

  it('buildElevationProfile_FlatProfile_DrawsMidlineWithoutDivideByZero', () => {
    const track = [point(0, 100), point(10, 100), point(20, 100)];

    const profile = buildElevationProfile(track);

    expect(profile!.points).toBe('0.00,20.00 50.00,20.00 100.00,20.00');
  });

  it('buildElevationProfile_SkipsPointsMissingElevationWhenNormalizing', () => {
    const track = [point(0, 100), point(5, null), point(10, 200)];

    const profile = buildElevationProfile(track);

    // Only the 2 points with elevation are plotted; x is normalized against their own span.
    expect(profile!.points).toBe('0.00,40.00 100.00,0.00');
  });
});
