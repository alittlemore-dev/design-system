import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NotificationAreaComponent } from './notification-area.component';
import { NotificationService } from './notification.service';

describe('NotificationAreaComponent', () => {
  let fixture: ComponentFixture<NotificationAreaComponent>;
  let service: NotificationService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationAreaComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(NotificationAreaComponent);
    fixture.componentRef.setInput('closeLabel', 'Close notification');
    service = TestBed.inject(NotificationService);
    fixture.detectChanges();
  });

  it('omits its polite live region until a notification exists', () => {
    expect(fixture.nativeElement.querySelector('[aria-live]')).toBeNull();

    service.success('Saved');
    fixture.detectChanges();

    const liveRegion = fixture.nativeElement.querySelector('section');
    expect(liveRegion?.getAttribute('aria-live')).toBe('polite');
  });

  it('renders success and error messages as alerts with an application-owned close label', () => {
    service.success('Saved');
    service.error('Failed');
    fixture.detectChanges();

    const alerts = Array.from(
      fixture.nativeElement.querySelectorAll('[role="alert"]'),
    ) as HTMLElement[];
    const closeButtons = Array.from(
      fixture.nativeElement.querySelectorAll('button[type="button"]'),
    ) as HTMLButtonElement[];

    expect(alerts).toHaveLength(2);
    expect(alerts[0].textContent).toContain('Saved');
    expect(alerts[0].classList).toContain('alert-success');
    expect(alerts[0].getAttribute('aria-live')).toBe('polite');
    expect(alerts[1].textContent).toContain('Failed');
    expect(alerts[1].classList).toContain('alert-danger');
    expect(alerts[1].getAttribute('aria-live')).toBe('polite');
    expect(closeButtons.map((button) => button.getAttribute('aria-label'))).toEqual([
      'Close notification',
      'Close notification',
    ]);
  });

  it('updates the close label through its OnPush input contract', () => {
    service.success('Saved');
    fixture.detectChanges();

    fixture.componentRef.setInput('closeLabel', 'Dismiss message');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
      'Dismiss message',
    );
  });

  it('manually dismisses the selected alert and exposes its exit-animation state', () => {
    service.success('Saved');
    service.error('Failed');
    fixture.detectChanges();

    const buttons = fixture.nativeElement.querySelectorAll(
      'button',
    ) as NodeListOf<HTMLButtonElement>;
    buttons[1].click();
    fixture.detectChanges();

    expect(service.notifications()).toEqual([
      { id: 1, type: 'success', message: 'Saved' },
      { id: 2, type: 'danger', message: 'Failed', dismissing: true },
    ]);
    const alerts = fixture.nativeElement.querySelectorAll('[role="alert"]');
    expect(alerts[0].classList).not.toContain('notification-alert-dismissing');
    expect(alerts[1].classList).toContain('notification-alert-dismissing');
  });

  it('retains the responsive fixed placement and transition presentation', () => {
    service.success('Saved');
    fixture.detectChanges();

    const liveRegion = fixture.nativeElement.querySelector('section') as HTMLElement;
    const alert = fixture.nativeElement.querySelector('[role="alert"]') as HTMLElement;

    expect(Array.from(liveRegion.classList)).toEqual(['alerts-section', 'position-fixed', 'end-0']);
    expect(alert.classList).toContain('notification-alert');

    service.dismiss(1);
    fixture.detectChanges();

    expect(alert.classList).toContain('notification-alert-dismissing');
  });
});

describe('NotificationAreaComponent server execution', () => {
  it('renders alerts against a document without a browser window', async () => {
    const serverDocument = document.implementation.createHTMLDocument('server');
    expect(serverDocument.defaultView).toBeNull();

    await TestBed.configureTestingModule({
      imports: [NotificationAreaComponent],
      providers: [
        { provide: DOCUMENT, useValue: serverDocument },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    }).compileComponents();
    const service = TestBed.inject(NotificationService);
    service.success('Rendered on the server');
    const fixture = TestBed.createComponent(NotificationAreaComponent);
    fixture.componentRef.setInput('closeLabel', 'Close server notification');

    expect(() => fixture.detectChanges()).not.toThrow();
    expect(fixture.nativeElement.querySelector('[aria-live="polite"]')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Rendered on the server',
    );
  });
});
