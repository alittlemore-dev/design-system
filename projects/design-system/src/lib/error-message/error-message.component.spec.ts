import { TestBed } from '@angular/core/testing';

import {
  ErrorDisplay,
  ErrorMessageComponent,
  errorDisplayMessages,
  flattenNestedErrorMessages,
  formatErrorMessage,
} from './error-message.component';

describe('ErrorMessageComponent', () => {
  it('returns the top-level message when there are no nested errors', () => {
    const error: ErrorDisplay = { message: 'Import failed.' };

    expect(errorDisplayMessages(error)).toEqual(['Import failed.']);
  });

  it('renders the parent message when there are no nested errors', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ErrorMessageComponent);
    fixture.componentRef.setInput('retryLabel', 'Try again');
    fixture.componentRef.setInput('error', { message: 'Request failed.' });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Request failed.');
    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  it('renders the parent message with readable attribute context', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ErrorMessageComponent);
    fixture.componentRef.setInput('retryLabel', 'Try again');
    fixture.componentRef.setInput('error', {
      message: 'Title is required.',
      attr: 'payload.title',
    });
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('payload / title: Title is required.');
    expect(fixture.nativeElement.querySelector('ul')).toBeNull();
  });

  it('uses location context when an attribute is not available', () => {
    expect(
      formatErrorMessage({ message: 'Payload is invalid.', location: 'body', attr: null }),
    ).toBe('body: Payload is invalid.');
  });

  it('flattens nested messages depth first', () => {
    const error: ErrorDisplay = {
      message: 'Import failed.',
      nested_errors: [
        {
          message: 'Row is invalid.',
          nested_errors: [{ message: 'Cell is blank.', attr: 'file.row.2' }],
        },
        { message: 'File type is not supported.' },
      ],
    };

    expect(flattenNestedErrorMessages(error)).toEqual([
      'Row is invalid.',
      'file / row 2: Cell is blank.',
      'File type is not supported.',
    ]);
  });

  it('renders nested errors after replacing its OnPush input', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ErrorMessageComponent);
    fixture.componentRef.setInput('retryLabel', 'Try again');
    fixture.componentRef.setInput('error', { message: 'Import failed.' });
    fixture.detectChanges();

    const renderedItems = (): string[] =>
      Array.from(fixture.nativeElement.querySelectorAll('li'), (item: Element) =>
        item.textContent?.trim(),
      );

    const error: ErrorDisplay = {
      message: 'Import failed.',
      nested_errors: [{ message: 'Cell is blank.', attr: 'file.row.2' }],
    };
    fixture.componentRef.setInput('error', error);
    fixture.detectChanges();

    expect(renderedItems()).toEqual(['file / row 2: Cell is blank.']);
  });

  it('emits retry when its native button is clicked', async () => {
    await TestBed.configureTestingModule({
      imports: [ErrorMessageComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(ErrorMessageComponent);
    fixture.componentRef.setInput('retryLabel', 'Try again');
    fixture.componentRef.setInput('error', { message: 'Import failed.' });
    const retry = jest.fn();
    fixture.componentInstance.retry.subscribe(retry);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector(
      'button[type="button"]',
    ) as HTMLButtonElement;
    expect(fixture.nativeElement.querySelector('[role="alert"]')).not.toBeNull();
    expect(button.textContent?.trim()).toBe('Try again');

    button.click();

    expect(retry).toHaveBeenCalledTimes(1);
  });
});
