import { DOCUMENT } from '@angular/common';
import { Injectable, inject, signal } from '@angular/core';

export type ThemeName = 'light' | 'dark';

const STORAGE_KEY = 'chosenTheme';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  private readonly document = inject(DOCUMENT);
  readonly theme = signal<ThemeName>(this.readInitialTheme());

  constructor() {
    this.applyTheme(this.theme());
  }

  setTheme(theme: ThemeName): void {
    this.storeTheme(theme);
    this.theme.set(theme);
    this.applyTheme(theme);
  }

  toggleTheme(): void {
    this.setTheme(this.theme() === 'light' ? 'dark' : 'light');
  }

  private readInitialTheme(): ThemeName {
    const storedTheme = this.readStoredTheme();
    if (storedTheme === 'dark' || storedTheme === 'light') return storedTheme;

    const renderedTheme = this.document.documentElement.getAttribute?.('data-bs-theme');
    return renderedTheme === 'dark' || renderedTheme === 'light' ? renderedTheme : 'light';
  }

  private applyTheme(theme: ThemeName): void {
    this.document.documentElement.setAttribute('data-bs-theme', theme);
  }

  private storage(): Storage | null {
    return this.document.defaultView?.localStorage ?? null;
  }

  private readStoredTheme(): string | null {
    try {
      return this.storage()?.getItem(STORAGE_KEY) ?? null;
    } catch {
      return null;
    }
  }

  private storeTheme(theme: ThemeName): void {
    try {
      this.storage()?.setItem(STORAGE_KEY, theme);
    } catch {
      // Applying the theme does not depend on persistent browser storage.
    }
  }
}
