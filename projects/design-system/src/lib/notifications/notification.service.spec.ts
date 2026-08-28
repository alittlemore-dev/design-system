import { DOCUMENT } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { NotificationService } from './notification.service';

interface ScheduledTimer {
  readonly callback: TimerHandler;
  readonly delay: number | undefined;
}

describe('NotificationService', () => {
  let service: NotificationService;
  let timers: Map<number, ScheduledTimer>;
  let timerWindow: Pick<Window, 'setTimeout' | 'clearTimeout'>;
  let nextTimerId: number;

  beforeEach(() => {
    timers = new Map<number, ScheduledTimer>();
    nextTimerId = 1;
    timerWindow = {
      setTimeout: jest.fn((callback: TimerHandler, delay?: number) => {
        const timerId = nextTimerId;
        nextTimerId += 1;
        timers.set(timerId, { callback, delay });
        return timerId;
      }),
      clearTimeout: jest.fn((timerId: number | undefined) => {
        if (timerId !== undefined) timers.delete(timerId);
      }),
    };

    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: { defaultView: timerWindow } as unknown as Document,
        },
      ],
    });
    service = TestBed.inject(NotificationService);
  });

  it('adds success and error notifications and schedules both for five seconds', () => {
    service.success('Saved');
    service.error('Failed');

    expect(service.notifications()).toEqual([
      { id: 1, type: 'success', message: 'Saved' },
      { id: 2, type: 'danger', message: 'Failed' },
    ]);
    expect(Array.from(timers.values(), ({ delay }) => delay)).toEqual([5000, 5000]);
  });

  it('marks a manually dismissed notification before removing it after the exit transition', () => {
    service.success('Saved');
    service.error('Failed');

    service.dismiss(1);

    expect(service.notifications()).toEqual([
      { id: 1, type: 'success', message: 'Saved', dismissing: true },
      { id: 2, type: 'danger', message: 'Failed' },
    ]);
    expect(Array.from(timers.values(), ({ delay }) => delay)).toEqual([5000, 200]);

    runTimer(3);

    expect(service.notifications()).toEqual([{ id: 2, type: 'danger', message: 'Failed' }]);
  });

  it('ignores missing and already dismissing notifications', () => {
    service.success('Saved');

    service.dismiss(99);
    service.dismiss(1);
    service.dismiss(1);

    expect(service.notifications()).toEqual([
      { id: 1, type: 'success', message: 'Saved', dismissing: true },
    ]);
    expect(Array.from(timers.values(), ({ delay }) => delay)).toEqual([200]);
  });

  it.each([
    ['success', 'Saved', 'success'],
    ['error', 'Failed', 'danger'],
  ] as const)(
    'automatically dismisses a %s notification after five seconds and its exit transition',
    (method, message, type) => {
      service[method](message);

      expect(service.notifications()).toEqual([{ id: 1, type, message }]);
      runTimer(1);
      expect(service.notifications()).toEqual([{ id: 1, type, message, dismissing: true }]);
      expect(Array.from(timers.values(), ({ delay }) => delay)).toEqual([200]);

      runTimer(2);

      expect(service.notifications()).toEqual([]);
    },
  );

  it('clears every pending browser timer when its injection context is destroyed', () => {
    service.success('Saved');
    service.error('Failed');
    service.dismiss(1);
    jest.mocked(timerWindow.clearTimeout).mockClear();

    TestBed.resetTestingModule();

    expect(timers).toEqual(new Map());
    expect(timerWindow.clearTimeout).toHaveBeenCalledTimes(2);
  });

  function runTimer(timerId: number): void {
    const timer = timers.get(timerId);
    if (timer === undefined) throw new Error(`Timer ${timerId} is not scheduled.`);
    timers.delete(timerId);
    if (typeof timer.callback === 'function') timer.callback();
  }
});

describe('NotificationService server execution', () => {
  it('ignores a server document window and dismisses synchronously without timers', () => {
    const serverTimerWindow = {
      setTimeout: jest.fn(() => 1),
      clearTimeout: jest.fn(),
    };
    TestBed.configureTestingModule({
      providers: [
        {
          provide: DOCUMENT,
          useValue: { defaultView: serverTimerWindow } as unknown as Document,
        },
        { provide: PLATFORM_ID, useValue: 'server' },
      ],
    });
    const service = TestBed.inject(NotificationService);

    expect(() => {
      service.success('Rendered on the server');
      service.error('Also rendered on the server');
    }).not.toThrow();
    expect(service.notifications()).toEqual([
      { id: 1, type: 'success', message: 'Rendered on the server' },
      { id: 2, type: 'danger', message: 'Also rendered on the server' },
    ]);
    expect(serverTimerWindow.setTimeout).not.toHaveBeenCalled();

    service.dismiss(1);

    expect(service.notifications()).toEqual([
      { id: 2, type: 'danger', message: 'Also rendered on the server' },
    ]);
    expect(serverTimerWindow.clearTimeout).not.toHaveBeenCalled();
  });
});
