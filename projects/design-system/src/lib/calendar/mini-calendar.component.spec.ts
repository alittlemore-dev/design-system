import { TestBed } from '@angular/core/testing';
import { MiniCalendarComponent } from './mini-calendar.component';
import type { MiniCalendarLabels } from './calendar.models';
const labels: MiniCalendarLabels = {
  calendar: 'Choose a date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  keyboardHelp: 'Arrows navigate. Enter selects.',
};

describe('Mini calendar', () => {
  function setup(date = '2026-09-30', locale = 'en-US') {
    const fixture = TestBed.createComponent(MiniCalendarComponent);
    for (const [key, value] of Object.entries({
      id: 'mini',
      date,
      today: '2026-09-29',
      dateLocale: locale,
      labels,
    }))
      fixture.componentRef.setInput(key, value);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    const day = (iso: string) => el.querySelector<HTMLButtonElement>(`button[data-date="${iso}"]`)!;
    const select = jest.fn();
    fixture.componentInstance.dateChange.subscribe(select);
    return { fixture, el, day, select };
  }
  it('distinguishes selection from today and exposes one keyboard tab stop', () => {
    const { el, day } = setup();
    expect(day('2026-09-29').getAttribute('aria-current')).toBe('date');
    expect(day('2026-09-30').closest('td')!.getAttribute('aria-selected')).toBe('true');
    expect(el.querySelectorAll('tbody button[tabindex="0"]')).toHaveLength(1);
  });
  it('moves focus across the month boundary without selecting, then selects by click', () => {
    const { fixture, el, day, select } = setup();
    day('2026-09-30').focus();
    day('2026-09-30').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(document.activeElement).toBe(day('2026-10-01'));
    expect(select).not.toHaveBeenCalled();
    expect(el.querySelector('strong')!.textContent).toMatch(/October/);
    day('2026-10-01').click();
    expect(select).toHaveBeenCalledWith('2026-10-01');
  });
  it('supports locale week boundaries and month paging at the end of a month', () => {
    const { fixture, day } = setup('2024-01-31', 'ru-RU');
    day('2024-01-31').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'PageDown', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(document.activeElement).toBe(day('2024-02-29'));
    day('2024-02-29').dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Home', bubbles: true, cancelable: true }),
    );
    fixture.detectChanges();
    expect(document.activeElement).toBe(day('2024-02-26'));
  });
  it('browses months without committing a date and follows consumer date changes', () => {
    const { fixture, el, day, select } = setup();
    el.querySelector<HTMLButtonElement>('button[aria-label="Next month"]')!.click();
    fixture.detectChanges();
    expect(el.querySelector('strong')!.textContent).toMatch(/October/);
    expect(select).not.toHaveBeenCalled();
    fixture.componentRef.setInput('date', '2026-12-15');
    fixture.detectChanges();
    expect(el.querySelector('strong')!.textContent).toMatch(/December/);
    expect(day('2026-12-15').getAttribute('tabindex')).toBe('0');
  });
});
