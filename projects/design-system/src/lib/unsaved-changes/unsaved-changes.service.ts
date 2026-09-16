import { DOCUMENT } from '@angular/common';
import {
  DestroyRef,
  Injectable,
  Signal,
  WritableSignal,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';

export type UnsavedValue = unknown;

export interface UnsavedChangesSource {
  readonly hasChanges: Signal<boolean>;
  commit(): void;
  unregister(): void;
}

class RegisteredUnsavedChangesSource implements UnsavedChangesSource {
  private readonly baseline: WritableSignal<string>;
  private readonly registered = signal(true);

  readonly hasChanges: Signal<boolean>;

  constructor(
    private readonly current: Signal<UnsavedValue>,
    private readonly active: Signal<boolean>,
    private readonly remove: (source: RegisteredUnsavedChangesSource) => void,
  ) {
    this.baseline = signal(fingerprint(this.current()));
    this.hasChanges = computed(
      () => this.registered() && this.active() && fingerprint(this.current()) !== this.baseline(),
    );
  }

  commit(): void {
    this.baseline.set(fingerprint(this.current()));
  }

  unregister(): void {
    if (!this.registered()) return;
    this.registered.set(false);
    this.remove(this);
  }
}

export class UnsavedChangesScope {
  private readonly sources = signal<readonly RegisteredUnsavedChangesSource[]>([]);
  private disposed = false;

  readonly hasChanges = computed(() => this.sources().some((source) => source.hasChanges()));

  constructor(
    private readonly confirmChanges: () => boolean,
    private readonly removeScope: (scope: UnsavedChangesScope) => void,
  ) {}

  registerSource(current: Signal<UnsavedValue>, active: Signal<boolean>): UnsavedChangesSource {
    const source = new RegisteredUnsavedChangesSource(current, active, (registeredSource) => {
      this.sources.update((sources) => sources.filter((item) => item !== registeredSource));
    });
    this.sources.update((sources) => [...sources, source]);
    return source;
  }

  commit(): void {
    for (const source of this.sources()) source.commit();
  }

  confirmDiscard(): boolean {
    return !this.hasChanges() || this.confirmChanges();
  }

  confirmDiscardExcept(preservedSources: readonly UnsavedChangesSource[]): boolean {
    const hasDiscardedChanges = this.sources().some(
      (source) => !preservedSources.includes(source) && source.hasChanges(),
    );
    return !hasDiscardedChanges || this.confirmChanges();
  }

  dispose(): void {
    if (this.disposed) return;
    this.disposed = true;
    for (const source of this.sources()) source.unregister();
    this.removeScope(this);
  }
}

@Injectable({ providedIn: 'root' })
export class UnsavedChangesService {
  private readonly document = inject(DOCUMENT);
  private readonly scopes = signal<readonly UnsavedChangesScope[]>([]);
  private readonly beforeUnload = (event: BeforeUnloadEvent): void => {
    event.preventDefault();
    event.returnValue = true;
  };

  readonly hasChanges = computed(() => this.scopes().some((scope) => scope.hasChanges()));

  constructor() {
    effect((onCleanup) => {
      const browserWindow = this.document.defaultView;
      if (!browserWindow || !this.hasChanges()) return;
      browserWindow.addEventListener('beforeunload', this.beforeUnload);
      onCleanup(() => browserWindow.removeEventListener('beforeunload', this.beforeUnload));
    });
  }

  createScope(destroyRef: DestroyRef, confirm: () => boolean): UnsavedChangesScope {
    const scope = new UnsavedChangesScope(confirm, (disposedScope) =>
      this.removeScope(disposedScope),
    );
    this.scopes.update((scopes) => [...scopes, scope]);
    destroyRef.onDestroy(() => scope.dispose());
    return scope;
  }

  confirmDiscard(confirm: () => boolean): boolean {
    return !this.hasChanges() || confirm();
  }

  discardChanges(): void {
    for (const scope of this.scopes()) scope.commit();
  }

  private removeScope(scope: UnsavedChangesScope): void {
    this.scopes.update((scopes) => scopes.filter((item) => item !== scope));
  }
}

function fingerprint(value: unknown): string {
  return fingerprintNested(value, new Set<object>());
}

function fingerprintNested(value: unknown, ancestors: Set<object>): string {
  if (value === null) return 'null';

  switch (typeof value) {
    case 'undefined':
      return 'undefined';
    case 'boolean':
      return `boolean:${String(value)}`;
    case 'number':
      return `number:${numberFingerprint(value)}`;
    case 'bigint':
      return `bigint:${value.toString()}`;
    case 'string':
      return `string:${JSON.stringify(value)}`;
    case 'symbol':
      return `symbol:${String(value.description)}`;
    case 'function':
      return `function:${value.name}`;
    case 'object':
      return objectFingerprint(value, ancestors);
  }
  throw new Error('Unsupported unsaved-change value');
}

function objectFingerprint(value: object, ancestors: Set<object>): string {
  if (ancestors.has(value)) return 'circular';
  if (value instanceof Date) return `date:${numberFingerprint(value.getTime())}`;
  if (isFile(value)) {
    return `file:${JSON.stringify([value.name, value.size, value.type, value.lastModified])}`;
  }

  ancestors.add(value);
  const result = collectionFingerprint(value, ancestors);
  ancestors.delete(value);
  return result;
}

function collectionFingerprint(value: object, ancestors: Set<object>): string {
  if (Array.isArray(value)) {
    return `array:[${value.map((item) => fingerprintNested(item, ancestors)).join(',')}]`;
  }
  if (value instanceof Set) {
    const entries = [...value].map((item) => fingerprintNested(item, ancestors)).sort();
    return `set:{${entries.join(',')}}`;
  }

  const record = value as Record<string, unknown>;
  const entries = Object.keys(record)
    .sort()
    .map((key) => `${JSON.stringify(key)}:${fingerprintNested(record[key], ancestors)}`);
  return `object:{${entries.join(',')}}`;
}

function isFile(value: object): value is File {
  return Object.prototype.toString.call(value) === '[object File]';
}

function numberFingerprint(value: number): string {
  if (Number.isNaN(value)) return 'NaN';
  if (value === Number.POSITIVE_INFINITY) return 'Infinity';
  if (value === Number.NEGATIVE_INFINITY) return '-Infinity';
  if (Object.is(value, -0)) return '-0';
  return String(value);
}
