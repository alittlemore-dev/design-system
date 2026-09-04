import { PLATFORM_ID, Component, InputSignal, OutputEmitterRef, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  EmptyStateComponent,
  ErrorMessageComponent,
  FoldableTreeComponent,
  LoadingSpinnerComponent,
  LocalizedDatePickerComponent,
  SiteSelectComponent,
  errorDisplayMessages,
  flattenNestedErrorMessages,
  formatErrorMessage,
} from '@alittlemore.dev/design-system';
import type {
  ErrorDisplay,
  FoldableTreeItem,
  FoldableTreeSection,
  LocalizedDatePickerControlSize,
  LocalizedDatePickerLabels,
  SiteSelectAppearance,
  SiteSelectControlSize,
  SiteSelectOption,
} from '@alittlemore.dev/design-system';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type EmptyMessageContract = Expect<Equal<EmptyStateComponent['message'], InputSignal<string>>>;
type LoadingAriaLabelContract = Expect<
  Equal<LoadingSpinnerComponent['ariaLabel'], InputSignal<string>>
>;
type ErrorValueContract = Expect<Equal<ErrorMessageComponent['error'], InputSignal<ErrorDisplay>>>;
type ErrorRetryLabelContract = Expect<
  Equal<ErrorMessageComponent['retryLabel'], InputSignal<string>>
>;
type ErrorRetryOutputContract = Expect<
  Equal<ErrorMessageComponent['retry'], OutputEmitterRef<void>>
>;
type TreeRootItemsContract = Expect<
  Equal<FoldableTreeComponent['rootItems'], InputSignal<readonly FoldableTreeItem[]>>
>;
type TreeSectionsContract = Expect<
  Equal<FoldableTreeComponent['sections'], InputSignal<readonly FoldableTreeSection[]>>
>;
type TreeEmptyMessageContract = Expect<
  Equal<FoldableTreeComponent['emptyMessage'], InputSignal<string>>
>;
type TreeSelectedItemKeyContract = Expect<
  Equal<FoldableTreeComponent['selectedItemKey'], InputSignal<string | null>>
>;
type TreeDefaultExpandedSectionKeysContract = Expect<
  Equal<FoldableTreeComponent['defaultExpandedSectionKeys'], InputSignal<readonly string[]>>
>;
type TreeSectionTestIdContract = Expect<
  Equal<FoldableTreeComponent['sectionTestId'], InputSignal<string>>
>;
type TreeItemTestIdContract = Expect<
  Equal<FoldableTreeComponent['itemTestId'], InputSignal<string>>
>;
type TreeItemSelectedOutputContract = Expect<
  Equal<FoldableTreeComponent['itemSelected'], OutputEmitterRef<string>>
>;
type DateInputIdContract = Expect<
  Equal<LocalizedDatePickerComponent['inputId'], InputSignal<string>>
>;
type DateValueContract = Expect<
  Equal<LocalizedDatePickerComponent['value'], InputSignal<string | undefined>>
>;
type DateControlSizeContract = Expect<
  Equal<LocalizedDatePickerComponent['controlSize'], InputSignal<LocalizedDatePickerControlSize>>
>;
type DateLocaleContract = Expect<
  Equal<LocalizedDatePickerComponent['dateLocale'], InputSignal<string>>
>;
type DateLabelsContract = Expect<
  Equal<LocalizedDatePickerComponent['labels'], InputSignal<LocalizedDatePickerLabels>>
>;
type DateRequiredContract = Expect<
  Equal<LocalizedDatePickerComponent['required'], InputSignal<boolean>>
>;
type DateInvalidContract = Expect<
  Equal<LocalizedDatePickerComponent['invalid'], InputSignal<boolean>>
>;
type DateControlDisabledContract = Expect<
  Equal<LocalizedDatePickerComponent['controlDisabled'], InputSignal<boolean>>
>;
type DateReadonlyContract = Expect<
  Equal<LocalizedDatePickerComponent['readonly'], InputSignal<boolean>>
>;
type DateMinContract = Expect<
  Equal<LocalizedDatePickerComponent['min'], InputSignal<string | undefined>>
>;
type DateMaxContract = Expect<
  Equal<LocalizedDatePickerComponent['max'], InputSignal<string | undefined>>
>;
type DateDisabledDatesContract = Expect<
  Equal<LocalizedDatePickerComponent['disabledDates'], InputSignal<readonly string[] | undefined>>
>;
type DateValueChangeOutputContract = Expect<
  Equal<LocalizedDatePickerComponent['valueChange'], OutputEmitterRef<string>>
>;
type DateValidityChangeOutputContract = Expect<
  Equal<LocalizedDatePickerComponent['validityChange'], OutputEmitterRef<boolean>>
>;
type SiteInputIdContract = Expect<Equal<SiteSelectComponent['inputId'], InputSignal<string>>>;
type SiteOptionsContract = Expect<
  Equal<SiteSelectComponent['options'], InputSignal<readonly SiteSelectOption[]>>
>;
type SiteValueContract = Expect<
  Equal<SiteSelectComponent['value'], InputSignal<string | undefined>>
>;
type SiteControlSizeContract = Expect<
  Equal<SiteSelectComponent['controlSize'], InputSignal<SiteSelectControlSize>>
>;
type SiteAppearanceContract = Expect<
  Equal<SiteSelectComponent['appearance'], InputSignal<SiteSelectAppearance>>
>;
type SiteRequiredContract = Expect<Equal<SiteSelectComponent['required'], InputSignal<boolean>>>;
type SiteInvalidContract = Expect<Equal<SiteSelectComponent['invalid'], InputSignal<boolean>>>;
type SiteControlDisabledContract = Expect<
  Equal<SiteSelectComponent['controlDisabled'], InputSignal<boolean>>
>;
type SiteTestIdContract = Expect<
  Equal<SiteSelectComponent['testId'], InputSignal<string | undefined>>
>;
type SiteAriaDescribedByContract = Expect<
  Equal<SiteSelectComponent['ariaDescribedBy'], InputSignal<string | undefined>>
>;
type SiteValueOutputContract = Expect<
  Equal<SiteSelectComponent['valueChange'], OutputEmitterRef<string>>
>;
type EmptyPublicKeysContract = Expect<Equal<keyof EmptyStateComponent, 'message'>>;
type LoadingPublicKeysContract = Expect<Equal<keyof LoadingSpinnerComponent, 'ariaLabel'>>;
type ErrorPublicKeysContract = Expect<
  Equal<keyof ErrorMessageComponent, 'error' | 'retryLabel' | 'retry'>
>;
type FoldableTreePublicKeysContract = Expect<
  Equal<
    keyof FoldableTreeComponent,
    | 'rootItems'
    | 'sections'
    | 'emptyMessage'
    | 'selectedItemKey'
    | 'defaultExpandedSectionKeys'
    | 'sectionTestId'
    | 'itemTestId'
    | 'itemSelected'
  >
>;
type LocalizedDatePickerPublicKeysContract = Expect<
  Equal<
    keyof LocalizedDatePickerComponent,
    | 'inputId'
    | 'value'
    | 'controlSize'
    | 'dateLocale'
    | 'labels'
    | 'required'
    | 'invalid'
    | 'controlDisabled'
    | 'readonly'
    | 'min'
    | 'max'
    | 'disabledDates'
    | 'valueChange'
    | 'validityChange'
    | 'writeValue'
    | 'ngOnChanges'
    | 'registerOnChange'
    | 'registerOnTouched'
    | 'validate'
    | 'registerOnValidatorChange'
    | 'setDisabledState'
  >
>;
type SiteSelectPublicKeysContract = Expect<
  Equal<
    keyof SiteSelectComponent,
    | 'inputId'
    | 'options'
    | 'value'
    | 'controlSize'
    | 'appearance'
    | 'required'
    | 'invalid'
    | 'controlDisabled'
    | 'testId'
    | 'ariaDescribedBy'
    | 'valueChange'
    | 'writeValue'
    | 'focus'
    | 'scrollIntoView'
    | 'registerOnChange'
    | 'registerOnTouched'
    | 'setDisabledState'
    | 'validate'
    | 'registerOnValidatorChange'
    | 'ngOnChanges'
  >
>;
type SiteSelectFocusContract = Expect<
  Equal<SiteSelectComponent['focus'], (options: FocusOptions) => void>
>;
type SiteSelectScrollIntoViewContract = Expect<
  Equal<SiteSelectComponent['scrollIntoView'], (options: ScrollIntoViewOptions) => void>
>;

type PublicContractAssertions = readonly [
  EmptyMessageContract,
  LoadingAriaLabelContract,
  ErrorValueContract,
  ErrorRetryLabelContract,
  ErrorRetryOutputContract,
  TreeRootItemsContract,
  TreeSectionsContract,
  TreeEmptyMessageContract,
  TreeSelectedItemKeyContract,
  TreeDefaultExpandedSectionKeysContract,
  TreeSectionTestIdContract,
  TreeItemTestIdContract,
  TreeItemSelectedOutputContract,
  DateInputIdContract,
  DateValueContract,
  DateControlSizeContract,
  DateLocaleContract,
  DateLabelsContract,
  DateRequiredContract,
  DateInvalidContract,
  DateControlDisabledContract,
  DateReadonlyContract,
  DateMinContract,
  DateMaxContract,
  DateDisabledDatesContract,
  DateValueChangeOutputContract,
  DateValidityChangeOutputContract,
  SiteInputIdContract,
  SiteOptionsContract,
  SiteValueContract,
  SiteControlSizeContract,
  SiteAppearanceContract,
  SiteRequiredContract,
  SiteInvalidContract,
  SiteControlDisabledContract,
  SiteTestIdContract,
  SiteAriaDescribedByContract,
  SiteValueOutputContract,
  EmptyPublicKeysContract,
  LoadingPublicKeysContract,
  ErrorPublicKeysContract,
  FoldableTreePublicKeysContract,
  LocalizedDatePickerPublicKeysContract,
  SiteSelectPublicKeysContract,
  SiteSelectFocusContract,
  SiteSelectScrollIntoViewContract,
];

const ERROR_DISPLAY = {
  message: 'Request failed',
  nested_errors: [{ message: 'Required', attr: 'items.0.name' }],
} as const satisfies ErrorDisplay;

const ROOT_ITEMS = [
  { key: 'overview', label: 'Overview', badgeText: null },
] as const satisfies readonly FoldableTreeItem[];

const TREE_SECTIONS = [
  {
    key: 'guides',
    label: 'Guides',
    trailingText: '1',
    items: [{ key: 'start', label: 'Getting started', badgeText: 'New' }],
  },
] as const satisfies readonly FoldableTreeSection[];

const DATE_LABELS = {
  placeholder: 'DD.MM.YYYY',
  openCalendar: 'Open calendar',
  changeCalendar: 'Change date',
  dialog: 'Choose date',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  openMonthYearPicker: 'Choose month and year',
  previousYear: 'Previous year',
  nextYear: 'Next year',
  clear: 'Clear',
  close: 'Close',
  formatHint: 'Use DD.MM.YYYY',
  invalidDate: 'Enter a valid date',
  requiredDate: 'Date is required',
  keyboardHelp: 'Use arrow keys to choose a date',
} as const satisfies LocalizedDatePickerLabels;

const SITE_OPTIONS = [
  { value: 'alpha', label: 'Alpha site' },
] as const satisfies readonly SiteSelectOption[];

const DATE_CONTROL_SIZE = 'default' satisfies LocalizedDatePickerControlSize;
const SITE_CONTROL_SIZE = 'default' satisfies SiteSelectControlSize;
const SITE_APPEARANCE = 'default' satisfies SiteSelectAppearance;

const PUBLIC_HOST_TEMPLATE = `
  <ds-empty-state [message]="emptyMessage()" />
  <ds-loading-spinner [ariaLabel]="loadingAriaLabel()" />
  <ds-error-message [error]="error()" [retryLabel]="retryLabel()" />
  <ds-foldable-tree
    [rootItems]="rootItems()"
    [sections]="sections()"
    [emptyMessage]="treeEmptyMessage()"
    [selectedItemKey]="selectedTreeItemKey()"
    [defaultExpandedSectionKeys]="expandedSectionKeys()"
    sectionTestId="public-tree-section"
    itemTestId="public-tree-item"
  />
  <ds-localized-date-picker
    inputId="public-date"
    [value]="dateValue()"
    [controlSize]="dateControlSize"
    dateLocale="en-GB"
    [labels]="dateLabels()"
    [required]="false"
    [invalid]="false"
    [controlDisabled]="false"
    [readonly]="false"
    min="2026-01-01"
    max="2026-12-31"
    [disabledDates]="[]"
  />
  <ds-site-select
    inputId="public-site"
    [options]="siteOptions()"
    value="alpha"
    [controlSize]="siteControlSize"
    [appearance]="siteAppearance"
    [required]="false"
    [invalid]="false"
    [controlDisabled]="false"
    testId="public-site-select"
    ariaDescribedBy="public-site-description"
  />
`;

abstract class PublicHostInputs {
  readonly emptyMessage = signal('No data');
  readonly loadingAriaLabel = signal('Loading data');
  readonly error = signal<ErrorDisplay>(ERROR_DISPLAY);
  readonly retryLabel = signal('Try again');
  readonly rootItems = signal<readonly FoldableTreeItem[]>(ROOT_ITEMS);
  readonly sections = signal<readonly FoldableTreeSection[]>(TREE_SECTIONS);
  readonly treeEmptyMessage = signal('No tree items');
  readonly selectedTreeItemKey = signal<string | null>(null);
  readonly expandedSectionKeys = signal<readonly string[]>([]);
  readonly dateValue = signal('2026-02-05');
  readonly dateControlSize = DATE_CONTROL_SIZE;
  readonly dateLabels = signal<LocalizedDatePickerLabels>(DATE_LABELS);
  readonly siteOptions = signal<readonly SiteSelectOption[]>(SITE_OPTIONS);
  readonly siteControlSize = SITE_CONTROL_SIZE;
  readonly siteAppearance = SITE_APPEARANCE;
}

@Component({
  standalone: true,
  imports: [
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    FoldableTreeComponent,
    LocalizedDatePickerComponent,
    SiteSelectComponent,
  ],
  template: PUBLIC_HOST_TEMPLATE,
})
class PublicImportHostComponent extends PublicHostInputs {}

@Component({
  standalone: true,
  imports: [
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorMessageComponent,
    FoldableTreeComponent,
    LocalizedDatePickerComponent,
    SiteSelectComponent,
  ],
  template: PUBLIC_HOST_TEMPLATE,
})
class ServerPublicImportHostComponent extends PublicHostInputs {}

describe('primary design-system entry point', () => {
  it('keeps all public input and output type contracts', () => {
    const contracts: PublicContractAssertions = [
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
      true,
    ];

    expect(contracts).toHaveLength(46);
  });

  it('exposes error-display utilities through the public package import', () => {
    expect(formatErrorMessage(ERROR_DISPLAY)).toBe('Request failed');
    expect(flattenNestedErrorMessages(ERROR_DISPLAY)).toEqual(['items 0 / name: Required']);
    expect(errorDisplayMessages(ERROR_DISPLAY)).toEqual(['items 0 / name: Required']);
  });

  it('renders all public selectors and propagates OnPush input changes', async () => {
    await TestBed.configureTestingModule({
      imports: [PublicImportHostComponent],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicImportHostComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ds-empty-state').textContent).toContain('No data');
    expect(
      fixture.nativeElement
        .querySelector('ds-loading-spinner [role="status"]')
        .getAttribute('aria-label'),
    ).toBe('Loading data');
    expect(fixture.nativeElement.querySelector('ds-error-message').textContent).toContain(
      'items 0 / name: Required',
    );
    expect(fixture.nativeElement.querySelector('ds-foldable-tree').textContent).toContain(
      'Overview',
    );
    expect(
      fixture.nativeElement
        .querySelector('ds-localized-date-picker input')
        .getAttribute('placeholder'),
    ).toBe('DD.MM.YYYY');
    expect(fixture.nativeElement.querySelector('#public-site').textContent).toContain('Alpha site');

    fixture.componentInstance.emptyMessage.set('Nothing available');
    fixture.componentInstance.loadingAriaLabel.set('Refreshing data');
    fixture.componentInstance.error.set({ message: 'Updated failure' });
    fixture.componentInstance.rootItems.set([
      { key: 'activity', label: 'Recent activity', badgeText: null },
    ]);
    fixture.componentInstance.dateLabels.set({
      ...DATE_LABELS,
      placeholder: 'Date, please',
    });
    fixture.componentInstance.siteOptions.set([{ value: 'alpha', label: 'Updated site' }]);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('ds-empty-state').textContent).toContain(
      'Nothing available',
    );
    expect(
      fixture.nativeElement
        .querySelector('ds-loading-spinner [role="status"]')
        .getAttribute('aria-label'),
    ).toBe('Refreshing data');
    expect(fixture.nativeElement.querySelector('ds-error-message').textContent).toContain(
      'Updated failure',
    );
    expect(fixture.nativeElement.querySelector('ds-foldable-tree').textContent).toContain(
      'Recent activity',
    );
    expect(
      fixture.nativeElement
        .querySelector('ds-localized-date-picker input')
        .getAttribute('placeholder'),
    ).toBe('Date, please');
    expect(fixture.nativeElement.querySelector('#public-site').textContent).toContain(
      'Updated site',
    );
  });

  it('uses the server-platform browser guard fixture without browser-only calls or runtime styles', async () => {
    const guardedMethods = [
      installMethodSpy(HTMLDialogElement.prototype, 'showModal'),
      installMethodSpy(HTMLDialogElement.prototype, 'close'),
      installMethodSpy(HTMLElement.prototype, 'showPopover'),
      installMethodSpy(HTMLElement.prototype, 'hidePopover'),
      installMethodSpy(HTMLElement.prototype, 'focus'),
      installMethodSpy(HTMLElement.prototype, 'scrollIntoView'),
      installMethodSpy(HTMLInputElement.prototype, 'setCustomValidity'),
      installMethodSpy(HTMLInputElement.prototype, 'checkValidity'),
      installMethodSpy(HTMLInputElement.prototype, 'reportValidity'),
    ];

    try {
      await TestBed.configureTestingModule({
        imports: [ServerPublicImportHostComponent],
        providers: [{ provide: PLATFORM_ID, useValue: 'server' }],
      }).compileComponents();
      const fixture = TestBed.createComponent(ServerPublicImportHostComponent);
      fixture.detectChanges();

      expect(fixture.nativeElement.querySelectorAll('ds-empty-state')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('ds-loading-spinner')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('ds-error-message')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('ds-foldable-tree')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('ds-localized-date-picker')).toHaveLength(1);
      expect(fixture.nativeElement.querySelectorAll('ds-site-select')).toHaveLength(1);
      expect(fixture.nativeElement.querySelector('[style]')).toBeNull();
      for (const method of guardedMethods) expect(method.spy).not.toHaveBeenCalled();

      fixture.destroy();
    } finally {
      for (const method of guardedMethods.reverse()) method.restore();
    }
  });
});

function installMethodSpy(
  prototype: object,
  methodName: string,
): { readonly spy: jest.Mock; restore(): void } {
  const originalDescriptor = Object.getOwnPropertyDescriptor(prototype, methodName);
  const spy = jest.fn();
  Object.defineProperty(prototype, methodName, {
    configurable: true,
    writable: true,
    value: spy,
  });

  return {
    spy,
    restore: (): void => {
      if (originalDescriptor === undefined) {
        Reflect.deleteProperty(prototype, methodName);
      } else {
        Object.defineProperty(prototype, methodName, originalDescriptor);
      }
    },
  };
}
