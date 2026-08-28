import { DOCUMENT } from '@angular/common';
import { BlockScrollStrategy, ScrollStrategyOptions } from '@angular/cdk/overlay';
import { ViewportRuler } from '@angular/cdk/scrolling';
import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { ModalPageScrollLockService } from './modal-page-scroll-lock.service';

describe('ModalPageScrollLockService', () => {
  let block: jest.Mock;
  let enable: jest.Mock;
  let disable: jest.Mock;

  beforeEach(() => {
    enable = jest.fn();
    disable = jest.fn();
    block = jest.fn(() => ({ attach: jest.fn(), enable, disable }));
    TestBed.configureTestingModule({
      providers: [{ provide: ScrollStrategyOptions, useValue: { block } }],
    });
  });

  it('keeps page scrolling blocked until the final modal releases it', () => {
    const service = TestBed.inject(ModalPageScrollLockService);

    const releaseFirst = service.acquire();
    const releaseSecond = service.acquire();

    expect(block).toHaveBeenCalledTimes(1);
    expect(enable).toHaveBeenCalledTimes(1);

    releaseFirst();
    expect(disable).not.toHaveBeenCalled();

    releaseSecond();
    expect(disable).toHaveBeenCalledTimes(1);
  });

  it('ignores repeated releases from the same modal', () => {
    const service = TestBed.inject(ModalPageScrollLockService);
    const release = service.acquire();

    release();
    release();

    expect(disable).toHaveBeenCalledTimes(1);
  });

  it('does not access the browser scroll strategy during server rendering', () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [
        { provide: PLATFORM_ID, useValue: 'server' },
        { provide: ScrollStrategyOptions, useValue: { block } },
      ],
    });

    const release = TestBed.inject(ModalPageScrollLockService).acquire();
    release();

    expect(block).not.toHaveBeenCalled();
    expect(enable).not.toHaveBeenCalled();
    expect(disable).not.toHaveBeenCalled();
  });
});

describe('ModalPageScrollLockService Angular CDK integration', () => {
  const originalScrollHeight = Object.getOwnPropertyDescriptor(
    document.documentElement,
    'scrollHeight',
  );

  beforeEach(() => {
    Object.defineProperty(document.documentElement, 'scrollHeight', {
      configurable: true,
      value: 200,
    });
    jest.spyOn(window, 'scroll').mockImplementation(() => undefined);
    TestBed.configureTestingModule({
      providers: [
        {
          provide: ViewportRuler,
          useValue: {
            getViewportScrollPosition: () => ({ left: 12, top: 34 }),
            getViewportSize: () => ({ height: 100, width: 100 }),
          },
        },
      ],
    });
  });

  afterEach(() => {
    document.documentElement.classList.remove('cdk-global-scrollblock');
    document.documentElement.style.removeProperty('left');
    document.documentElement.style.removeProperty('top');
    if (originalScrollHeight === undefined) {
      Reflect.deleteProperty(document.documentElement, 'scrollHeight');
    } else {
      Object.defineProperty(document.documentElement, 'scrollHeight', originalScrollHeight);
    }
    jest.restoreAllMocks();
  });

  it('uses the real CDK block strategy and restores page scrolling on release', () => {
    const documentToken = TestBed.inject(DOCUMENT);
    const service = TestBed.inject(ModalPageScrollLockService);

    const release = service.acquire();

    expect(documentToken.documentElement.classList).toContain('cdk-global-scrollblock');
    expect(documentToken.documentElement.style.left).toBe('-12px');
    expect(documentToken.documentElement.style.top).toBe('-34px');

    release();

    expect(documentToken.documentElement.classList).not.toContain('cdk-global-scrollblock');
    expect(window.scroll).toHaveBeenCalledWith(12, 34);
  });

  it('creates a CDK BlockScrollStrategy through the default ScrollStrategyOptions provider', () => {
    const strategy = TestBed.inject(ScrollStrategyOptions).block();

    expect(strategy).toBeInstanceOf(BlockScrollStrategy);
  });
});
