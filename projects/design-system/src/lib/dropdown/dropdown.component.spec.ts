import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { DropdownComponent } from './dropdown.component';

@Component({
  imports: [DropdownComponent],
  template: `<ds-dropdown id="actions" label="Actions" (openChange)="opened = $event"
    ><span dsDropdownTrigger>Choose</span><button type="button">First action</button></ds-dropdown
  >`,
})
class Host {
  opened = false;
}

describe('DropdownComponent', () => {
  it('exposes the native popover association and projects trigger separately from actions', () => {
    const fixture = TestBed.createComponent(Host);
    fixture.detectChanges();
    const trigger = fixture.nativeElement.querySelector(
      'button[popovertarget]',
    ) as HTMLButtonElement;
    const panel = fixture.nativeElement.querySelector('[popover]') as HTMLElement;
    expect(trigger.textContent).toContain('Choose');
    expect(trigger.textContent).not.toContain('First action');
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
    expect(trigger.getAttribute('popovertarget')).toBe(panel.id);
    expect(fixture.nativeElement.querySelectorAll(`[id="${panel.id}"]`)).toHaveLength(1);
    panel.dispatchEvent(
      Object.assign(new Event('toggle'), { newState: 'open', oldState: 'closed' }),
    );
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.componentInstance.opened).toBe(true);
    panel.dispatchEvent(
      Object.assign(new Event('toggle'), { newState: 'closed', oldState: 'open' }),
    );
    fixture.detectChanges();
    expect(trigger.getAttribute('aria-expanded')).toBe('false');
  });
  it('supports keyboard focus and explicit dismissal with native popover APIs', () => {
    const fixture = TestBed.createComponent(DropdownComponent);
    fixture.componentRef.setInput('id', 'keyboard');
    fixture.componentRef.setInput('label', 'Options');
    fixture.detectChanges();
    const panel = fixture.nativeElement.querySelector('[popover]') as HTMLElement;
    const trigger = fixture.nativeElement.querySelector('button') as HTMLButtonElement;
    const action = document.createElement('button');
    panel.appendChild(action);
    panel.showPopover = jest.fn();
    panel.hidePopover = jest.fn();
    const focus = jest.spyOn(action, 'focus');
    trigger.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }));
    expect(panel.showPopover).toHaveBeenCalled();
    expect(focus).toHaveBeenCalled();
    fixture.componentInstance.close();
    expect(panel.hidePopover).toHaveBeenCalled();
    fixture.componentRef.setInput('disabled', true);
    fixture.detectChanges();
    expect(trigger.disabled).toBe(true);
  });
});
