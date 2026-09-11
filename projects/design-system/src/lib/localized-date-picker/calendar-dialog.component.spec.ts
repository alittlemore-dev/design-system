import { PLATFORM_ID } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarDialogComponent, CalendarDialogLabels } from './calendar-dialog.component';

const LABELS: CalendarDialogLabels = {
  dialog: 'Choose date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  close: 'Close',
  keyboardHelp: 'Use arrow keys to choose a date.',
};

describe('CalendarDialogComponent', () => {
  let fixture: ComponentFixture<CalendarDialogComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDialogComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(CalendarDialogComponent);
    setRequiredInputs(fixture);
    fixture.componentRef.setInput('selectedDate', '2026-02-05');
    fixture.detectChanges();
    installDialogMethods(dialog());
  });

  afterEach(() => fixture.destroy());

  it('emits a selected date without deciding whether the owning picker closes', () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    trigger.focus();
    const dateSelected = jest.fn();
    const closed = jest.fn();
    fixture.componentInstance.dateSelected.subscribe(dateSelected);
    fixture.componentInstance.closed.subscribe(closed);

    expect(fixture.componentInstance.open(trigger, '2026-02-05')).toBe(true);
    dayButton('2026-02-06').click();

    expect(dateSelected).toHaveBeenCalledWith('2026-02-06');
    expect(dialog().open).toBe(true);
    expect(dayGrid().getAttribute('aria-multiselectable')).toBeNull();
    expect(dayButton('2026-02-06').getAttribute('aria-selected')).toBe('false');

    fixture.componentInstance.close();

    expect(dialog().open).toBe(false);
    expect(document.activeElement).toBe(trigger);
    expect(closed).toHaveBeenCalledTimes(1);
    trigger.remove();
  });

  it('renders single, range-boundary, and in-range selection state with live guidance', () => {
    fixture.componentRef.setInput('selectedDate', '');
    fixture.componentRef.setInput('rangeStart', '2026-02-05');
    fixture.componentRef.setInput('rangeEnd', '2026-02-08');
    fixture.componentRef.setInput('activeBoundary', 'end');
    fixture.componentRef.setInput('activeBoundaryLabel', 'Choose the end date');
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-08');

    expect(dayButton('2026-02-05').classList).toContain('localized-date-picker-range-start');
    expect(dayButton('2026-02-06').classList).toContain('localized-date-picker-in-range');
    expect(dayButton('2026-02-08').classList).toContain('localized-date-picker-range-end');
    expect(dayButton('2026-02-06').getAttribute('aria-selected')).toBe('true');
    expect(dayButton('2026-02-09').getAttribute('aria-selected')).toBe('false');
    expect(dayGrid().getAttribute('aria-multiselectable')).toBe('true');
    expect(
      dialog().querySelector('[data-testid="date-picker-active-boundary"]')?.textContent,
    ).toContain('Choose the end date');
  });

  it('rejects range-end candidates whose inclusive interval crosses a disabled date', () => {
    const dateSelected = jest.fn();
    fixture.componentInstance.dateSelected.subscribe(dateSelected);
    fixture.componentRef.setInput('selectedDate', '');
    fixture.componentRef.setInput('rangeStart', '2026-02-05');
    fixture.componentRef.setInput('activeBoundary', 'end');
    fixture.componentRef.setInput('disabledDates', ['2026-02-07']);
    fixture.detectChanges();
    fixture.componentInstance.open(document.createElement('button'), '2026-02-05');

    expect(dayButton('2026-02-06').disabled).toBe(false);
    expect(dayButton('2026-02-07').disabled).toBe(true);
    expect(dayButton('2026-02-08').disabled).toBe(true);
    expect(dayButton('2026-02-04').disabled).toBe(false);
    dayButton('2026-02-08').click();
    expect(dateSelected).not.toHaveBeenCalled();
  });

  function dialog(): HTMLDialogElement {
    return fixture.nativeElement.querySelector(
      '[data-testid="date-picker-calendar"]',
    ) as HTMLDialogElement;
  }

  function dayButton(iso: string): HTMLButtonElement {
    const button = dialog().querySelector(`[data-date="${iso}"]`) as HTMLButtonElement;
    expect(button).not.toBeNull();
    return button;
  }

  function dayGrid(): HTMLElement {
    return dialog().querySelector('.localized-date-picker-date-grid') as HTMLElement;
  }
});

describe('CalendarDialogComponent server platform', () => {
  it('does not invoke dialog or focus APIs outside the browser', async () => {
    await TestBed.configureTestingModule({
      imports: [CalendarDialogComponent],
      providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
    }).compileComponents();
    const fixture = TestBed.createComponent(CalendarDialogComponent);
    setRequiredInputs(fixture);
    fixture.componentRef.setInput('selectedDate', '2026-02-05');
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector(
      '[data-testid="date-picker-calendar"]',
    ) as HTMLDialogElement;
    const showModal = jest.fn();
    Object.defineProperty(dialog, 'showModal', { configurable: true, value: showModal });
    const trigger = document.createElement('button');
    const focus = jest.spyOn(trigger, 'focus');

    expect(fixture.componentInstance.open(trigger, '2026-02-05')).toBe(false);
    expect(showModal).not.toHaveBeenCalled();
    expect(focus).not.toHaveBeenCalled();
    fixture.destroy();
  });
});

function setRequiredInputs(fixture: ComponentFixture<CalendarDialogComponent>): void {
  fixture.componentRef.setInput('dialogId', 'calendar-core-test');
  fixture.componentRef.setInput('dateLocale', 'en-GB');
  fixture.componentRef.setInput('labels', LABELS);
  fixture.componentRef.setInput('required', false);
  fixture.componentRef.setInput('canClear', true);
  fixture.componentRef.setInput('disabled', false);
  fixture.componentRef.setInput('readonly', false);
}

function installDialogMethods(dialog: HTMLDialogElement): void {
  Object.defineProperty(dialog, 'showModal', {
    configurable: true,
    value: (): void => dialog.setAttribute('open', ''),
  });
  Object.defineProperty(dialog, 'close', {
    configurable: true,
    value: (): void => {
      dialog.removeAttribute('open');
      dialog.dispatchEvent(new Event('close'));
    },
  });
}
