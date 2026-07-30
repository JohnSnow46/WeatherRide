import { provideHttpClient } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';

import { RoutePlanFormComponent } from './route-plan-form.component';

describe('RoutePlanFormComponent', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RoutePlanFormComponent],
      providers: [provideHttpClient()]
    }).compileComponents();
  });

  it('disables the submit button when no GPX file is selected', () => {
    const fixture = TestBed.createComponent(RoutePlanFormComponent);
    fixture.componentInstance.form.patchValue({
      departureAt: '2026-08-01T10:00',
      averageSpeedKmh: 20
    });
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
    expect(button.disabled).toBeTrue();
  });
});
