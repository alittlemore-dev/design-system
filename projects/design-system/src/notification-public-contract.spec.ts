import { InputSignal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  AppNotification,
  NotificationAreaComponent,
  NotificationService,
} from '@alittlemoron/design-system';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type NotificationModelContract = Expect<
  Equal<
    AppNotification,
    {
      id: number;
      type: 'success' | 'danger';
      message: string;
      dismissing?: boolean;
    }
  >
>;
type NotificationSignalContract = Expect<
  Equal<NotificationService['notifications'], WritableSignal<AppNotification[]>>
>;
type NotificationSuccessContract = Expect<
  Equal<NotificationService['success'], (message: string) => void>
>;
type NotificationErrorContract = Expect<
  Equal<NotificationService['error'], (message: string) => void>
>;
type NotificationDismissContract = Expect<
  Equal<NotificationService['dismiss'], (id: number) => void>
>;
type NotificationServicePublicKeysContract = Expect<
  Equal<keyof NotificationService, 'notifications' | 'success' | 'error' | 'dismiss'>
>;
type NotificationCloseLabelContract = Expect<
  Equal<NotificationAreaComponent['closeLabel'], InputSignal<string>>
>;
type NotificationAreaPublicKeysContract = Expect<
  Equal<keyof NotificationAreaComponent, 'closeLabel'>
>;

type NotificationPublicContractAssertions = readonly [
  NotificationModelContract,
  NotificationSignalContract,
  NotificationSuccessContract,
  NotificationErrorContract,
  NotificationDismissContract,
  NotificationServicePublicKeysContract,
  NotificationCloseLabelContract,
  NotificationAreaPublicKeysContract,
];

describe('notification public contract', () => {
  it('exposes only the neutral notification model, service methods, and close-label input', () => {
    const contracts: NotificationPublicContractAssertions = [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ];
    const notification: AppNotification = {
      id: 1,
      type: 'success',
      message: 'Saved',
    };

    expect(contracts).toHaveLength(8);
    expect(notification).toEqual({ id: 1, type: 'success', message: 'Saved' });
  });

  it('renders the public component with the public service', async () => {
    await TestBed.configureTestingModule({
      imports: [NotificationAreaComponent],
    }).compileComponents();
    const service = TestBed.inject(NotificationService);
    const fixture = TestBed.createComponent(NotificationAreaComponent);
    fixture.componentRef.setInput('closeLabel', 'Close notification');

    service.success('Saved through the public entry point');
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('[role="alert"]').textContent).toContain(
      'Saved through the public entry point',
    );
    expect(fixture.nativeElement.querySelector('button').getAttribute('aria-label')).toBe(
      'Close notification',
    );
  });
});
