import { Component, InputSignal, WritableSignal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import {
  ModalPageScrollLockService,
  ModalScrollDirective,
  ThemeService,
  type ThemeName,
} from '@alittlemoron/design-system';

type Equal<A, B> =
  (<T>() => T extends A ? 1 : 2) extends <T>() => T extends B ? 1 : 2 ? true : false;
type Expect<T extends true> = T;

type ThemeNameContract = Expect<Equal<ThemeName, 'light' | 'dark'>>;
type ThemeSignalContract = Expect<Equal<ThemeService['theme'], WritableSignal<ThemeName>>>;
type ThemeSetContract = Expect<Equal<ThemeService['setTheme'], (theme: ThemeName) => void>>;
type ThemeToggleContract = Expect<Equal<ThemeService['toggleTheme'], () => void>>;
type ThemePublicKeysContract = Expect<
  Equal<keyof ThemeService, 'theme' | 'setTheme' | 'toggleTheme'>
>;
type PageLockAcquireContract = Expect<
  Equal<ModalPageScrollLockService['acquire'], () => () => void>
>;
type PageLockPublicKeysContract = Expect<Equal<keyof ModalPageScrollLockService, 'acquire'>>;
type ModalScrollInputContract = Expect<
  Equal<ModalScrollDirective['dsModalScroll'], InputSignal<HTMLElement>>
>;
type ModalScrollPublicKeysContract = Expect<Equal<keyof ModalScrollDirective, 'dsModalScroll'>>;

type SharedUiInfrastructurePublicContractAssertions = readonly [
  ThemeNameContract,
  ThemeSignalContract,
  ThemeSetContract,
  ThemeToggleContract,
  ThemePublicKeysContract,
  PageLockAcquireContract,
  PageLockPublicKeysContract,
  ModalScrollInputContract,
  ModalScrollPublicKeysContract,
];

@Component({
  selector: 'ds-public-modal-scroll-host',
  standalone: true,
  imports: [ModalScrollDirective],
  template: `
    <section [dsModalScroll]="scrollArea">
      <div #scrollArea>Public modal scroll area</div>
    </section>
  `,
})
class PublicModalScrollHostComponent {}

describe('shared UI infrastructure public contract', () => {
  it('exposes only the theme and modal contracts owned by the primary entry point', () => {
    const contracts: SharedUiInfrastructurePublicContractAssertions = [
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
    const theme = 'dark' satisfies ThemeName;

    expect(contracts).toHaveLength(9);
    expect(theme).toBe('dark');
  });

  it('renders the modal directive through the public entry point', async () => {
    const release = jest.fn();
    const acquire = jest.fn(() => release);
    await TestBed.configureTestingModule({
      imports: [PublicModalScrollHostComponent],
      providers: [{ provide: ModalPageScrollLockService, useValue: { acquire } }],
    }).compileComponents();
    const fixture = TestBed.createComponent(PublicModalScrollHostComponent);

    fixture.detectChanges();
    expect(acquire).toHaveBeenCalledTimes(1);

    fixture.destroy();
    expect(release).toHaveBeenCalledTimes(1);
  });
});
