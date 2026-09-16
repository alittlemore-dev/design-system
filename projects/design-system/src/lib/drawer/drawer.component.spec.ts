import { PLATFORM_ID } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DrawerComponent } from './drawer.component';

describe('DrawerComponent', () => {
  it('does not let a delayed native close event dismiss a newly reopened drawer', () => {
    const fixture = TestBed.createComponent(DrawerComponent);
    fixture.componentRef.setInput('label', 'Navigation');
    fixture.componentRef.setInput('closeLabel', 'Close navigation');
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => {
      dialog.open = true;
    };
    dialog.close = () => {
      dialog.open = false;
    };
    fixture.componentInstance.open();
    fixture.componentInstance.close();
    fixture.componentInstance.open();
    dialog.dispatchEvent(new Event('close'));
    expect(fixture.componentInstance.isOpen()).toBe(true);
    expect(dialog.open).toBe(true);
  });

  it('keeps SSR closed without invoking browser dialog methods', () => {
    TestBed.configureTestingModule({ providers: [{ provide: PLATFORM_ID, useValue: 'server' }] });
    const fixture = TestBed.createComponent(DrawerComponent);
    fixture.componentRef.setInput('label', 'Navigation');
    fixture.componentRef.setInput('closeLabel', 'Close navigation');
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => {
      throw new Error('browser API');
    };
    fixture.componentInstance.open();
    expect(dialog.open).toBe(false);
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });

  it('opens a native modal and releases page lock when dismissed', () => {
    const fixture = TestBed.createComponent(DrawerComponent);
    fixture.componentRef.setInput('label', 'Navigation');
    fixture.componentRef.setInput('closeLabel', 'Close navigation');
    fixture.detectChanges();
    const dialog = fixture.nativeElement.querySelector('dialog') as HTMLDialogElement;
    dialog.showModal = () => {
      dialog.open = true;
    };
    dialog.close = () => {
      dialog.open = false;
      dialog.dispatchEvent(new Event('close'));
    };
    fixture.componentInstance.open();
    fixture.detectChanges();
    expect(dialog.open).toBe(true);
    expect(fixture.componentInstance.isOpen()).toBe(true);
    const event = new Event('cancel', { cancelable: true });
    dialog.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(true);
    expect(dialog.open).toBe(false);
    expect(fixture.componentInstance.isOpen()).toBe(false);
  });
});
