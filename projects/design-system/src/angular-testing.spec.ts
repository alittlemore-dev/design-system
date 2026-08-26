import { ChangeDetectionStrategy, Component, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';

@Component({
  selector: 'ds-angular-testing-fixture',
  template: '<output>{{ status() }}</output>',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
})
class AngularTestingFixtureComponent {
  readonly status = signal('ready');
}

describe('Angular Jest support', () => {
  it('renders and updates a standalone OnPush component through TestBed', async () => {
    await TestBed.configureTestingModule({
      imports: [AngularTestingFixtureComponent],
    }).compileComponents();

    const fixture = TestBed.createComponent(AngularTestingFixtureComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('ready');

    fixture.componentInstance.status.set('updated');
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('updated');
  });
});
