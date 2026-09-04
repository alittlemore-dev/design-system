import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SiteSelectComponent, type SiteSelectOption } from '@alittlemore.dev/design-system';
import {
  chooseSiteSelectOption,
  siteSelectOptionLabels,
  siteSelectOptionValues,
  siteSelectTrigger,
  siteSelectValue,
} from '@alittlemore.dev/design-system/testing';

const OPTIONS = [
  { value: 'alpha', label: 'Alpha workspace' },
  { value: 'beta', label: 'Beta workspace' },
] as const satisfies readonly SiteSelectOption[];

@Component({
  standalone: true,
  imports: [SiteSelectComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ds-site-select
      inputId="testing-site-select"
      [options]="options"
      [value]="value()"
      controlSize="default"
      appearance="default"
      [required]="false"
      [invalid]="false"
      [controlDisabled]="false"
      (valueChange)="value.set($event)"
    />
  `,
})
class SiteSelectTestingHostComponent {
  readonly options = OPTIONS;
  readonly value = signal('alpha');
}

describe('site select testing public contract', () => {
  let fixture: ComponentFixture<SiteSelectTestingHostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SiteSelectTestingHostComponent],
    }).compileComponents();
    fixture = TestBed.createComponent(SiteSelectTestingHostComponent);
    fixture.detectChanges();
    installPopoverMethods(fixture.nativeElement.querySelector('[role="listbox"]'));
  });

  it('reads options and chooses a value through the public testing entry point', () => {
    expect(siteSelectOptionValues(fixture, '#testing-site-select')).toEqual(['alpha', 'beta']);
    expect(siteSelectOptionLabels(fixture, '#testing-site-select')).toEqual([
      'Alpha workspace',
      'Beta workspace',
    ]);
    expect(siteSelectValue(fixture, '#testing-site-select')).toBe('alpha');

    chooseSiteSelectOption(fixture, '#testing-site-select', 'beta');

    expect(fixture.componentInstance.value()).toBe('beta');
    expect(siteSelectValue(fixture, '#testing-site-select')).toBe('beta');
  });

  it('reports missing triggers and option values with consumer-facing context', () => {
    expect(() => siteSelectTrigger(fixture, '#missing-select')).toThrow(
      'Site select trigger not found for selector "#missing-select"',
    );
    expect(() => chooseSiteSelectOption(fixture, '#testing-site-select', 'missing')).toThrow(
      'Site select option "missing" not found for selector "#testing-site-select"',
    );
  });
});

function installPopoverMethods(popover: HTMLElement): void {
  Object.defineProperty(popover, 'showPopover', {
    configurable: true,
    value: (): void => {
      const event = new Event('toggle');
      Object.defineProperty(event, 'newState', { value: 'open' });
      popover.dispatchEvent(event);
    },
  });
  Object.defineProperty(popover, 'hidePopover', {
    configurable: true,
    value: (): void => {
      const event = new Event('toggle');
      Object.defineProperty(event, 'newState', { value: 'closed' });
      popover.dispatchEvent(event);
    },
  });
}
