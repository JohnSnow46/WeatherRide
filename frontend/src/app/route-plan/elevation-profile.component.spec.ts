import { TestBed } from '@angular/core/testing';

import { ElevationProfileComponent } from './elevation-profile.component';
import { TrackPointDto } from './route-plan-api.model';

function point(distanceFromStartKm: number, elevation: number | null): TrackPointDto {
  return { latitude: 0, longitude: 0, distanceFromStartKm, elevation };
}

describe('ElevationProfileComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ElevationProfileComponent]
    }).compileComponents();
  });

  it('renders no chart or download button when the track has no elevation data', () => {
    const fixture = TestBed.createComponent(ElevationProfileComponent);
    fixture.componentRef.setInput('track', [point(0, null), point(10, null)]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg')).toBeNull();
    expect(fixture.nativeElement.querySelector('button')).toBeNull();
  });

  it('renders the chart and a download button once the track has elevation data', () => {
    const fixture = TestBed.createComponent(ElevationProfileComponent);
    fixture.componentRef.setInput('track', [point(0, 100), point(10, 150)]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('svg')).not.toBeNull();
    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(button.textContent?.trim()).toBe('Download as image');
  });

  it('clicking the download button does not throw', () => {
    const fixture = TestBed.createComponent(ElevationProfileComponent);
    fixture.componentRef.setInput('track', [point(0, 100), point(10, 150)]);
    fixture.detectChanges();

    const button: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(() => button.click()).not.toThrow();
  });
});
