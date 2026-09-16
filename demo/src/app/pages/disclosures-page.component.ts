import { ChangeDetectionStrategy, Component, DestroyRef, inject, signal } from '@angular/core';
import {
  ModalDialogDirective,
  DrawerComponent,
  DropdownComponent,
  FoldableSectionComponent,
  UnsavedChangesService,
} from '@alittlemore.dev/design-system';
import { DemoPageComponent } from '../shared/demo-page.component';

@Component({
  selector: 'demo-disclosures-page',
  standalone: true,
  imports: [
    DemoPageComponent,
    ModalDialogDirective,
    DrawerComponent,
    DropdownComponent,
    FoldableSectionComponent,
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  styles: `
    .demo-native-modal {
      color: var(--text-primary);
      background: var(--surface-1);
      border: 1px solid var(--border-color-solid);
      border-radius: 0.5rem;
      width: min(28rem, calc(100vw - 2rem));
      padding: 1rem;
    }
    .demo-native-modal::backdrop {
      background: rgb(0 0 0 / 55%);
    }
  `,
  template: `
    <demo-page
      title="Disclosures and drafts"
      description="Native anchored popovers, a modal drawer, controlled sections, and scoped unsaved changes."
      [showControls]="false"
    >
      <div demo-preview>
        <ds-dropdown
          #dropdown
          id="demo-actions"
          label="Open actions"
          (openChange)="opened.set($event)"
        >
          <span dsDropdownTrigger>Actions</span>
          <button
            class="dropdown-item"
            type="button"
            (click)="selected.set('Chosen'); dropdown.close()"
          >
            Choose action
          </button>
          <label class="dropdown-item"><input type="checkbox" /> Keep open option</label>
        </ds-dropdown>
        <p data-demo-dropdown-state>{{ opened() ? 'Open' : 'Closed' }} · {{ selected() }}</p>
        <button type="button" class="btn btn-secondary" (click)="drawer.open()">Open drawer</button>
        <ds-drawer #drawer label="Example navigation" closeLabel="Close drawer">
          <button type="button" class="btn btn-link" (click)="drawer.close()">Destination</button>
          <p>Application-owned links and controls belong here.</p>
        </ds-drawer>
        <button type="button" class="btn btn-secondary" (click)="modal.open()">
          Open required modal
        </button>
        <dialog
          dsModalDialog
          #modal="dsModalDialog"
          aria-label="Required example"
          [dismissible]="modalDismissible()"
          (dismissed)="dismissed.set(true)"
          class="demo-native-modal"
        >
          <p>This modal shares the drawer lifecycle.</p>
          <p data-demo-modal-policy>{{ modalDismissible() ? 'Dismissible' : 'Required' }}</p>
          <label
            ><input
              type="checkbox"
              [checked]="modalDismissible()"
              (change)="modalDismissible.set($any($event.target).checked)"
            />
            Allow modal dismissal</label
          >
          <button type="button" class="btn btn-secondary" (click)="modal.close()">
            Close required modal
          </button>
        </dialog>
        <p data-demo-modal-dismissed>{{ dismissed() ? 'Dismissed' : 'Not dismissed' }}</p>
        <ds-foldable-section
          sectionKey="demo-details"
          title="Draft details"
          summary="Content stays mounted"
          [expanded]="expanded()"
          (expandedChange)="expanded.set($event)"
        >
          <label
            >Draft title
            <input data-demo-draft [value]="draft()" (input)="draft.set($any($event.target).value)"
          /></label>
        </ds-foldable-section>
        <p data-demo-dirty>{{ scope.hasChanges() ? 'Unsaved' : 'Saved' }}</p>
        <button type="button" class="btn btn-primary" (click)="scope.commit()">Commit draft</button>
        <button type="button" class="btn btn-secondary" (click)="discard()">Discard draft</button>
        <label
          ><input
            type="checkbox"
            [checked]="allowDiscard()"
            (change)="allowDiscard.set($any($event.target).checked)"
          />
          Allow discard</label
        >
        <p data-demo-confirmation>{{ confirmation() }}</p>
      </div>
    </demo-page>
  `,
})
export class DisclosuresPageComponent {
  private readonly changes = inject(UnsavedChangesService);
  protected readonly draft = signal('Initial title');
  protected readonly modalDismissible = signal(false);
  protected readonly dismissed = signal(false);
  protected readonly expanded = signal(true);
  protected readonly opened = signal(false);
  protected readonly selected = signal('None');
  protected readonly allowDiscard = signal(false);
  protected readonly confirmation = signal('Not requested');
  protected readonly scope = this.changes.createScope(inject(DestroyRef), () =>
    this.allowDiscard(),
  );
  constructor() {
    this.scope.registerSource(this.draft, signal(true));
  }
  protected discard(): void {
    if (this.scope.confirmDiscard()) {
      this.changes.discardChanges();
      this.confirmation.set('Accepted');
    } else this.confirmation.set('Declined');
  }
}
