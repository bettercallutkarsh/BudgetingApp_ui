import { Component } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { BrandMarkComponent } from '../brand-mark/brand-mark';

@Component({
  selector: 'app-auth-layout',
  imports: [RouterLink, RouterOutlet, BrandMarkComponent],
  template: `
    <div class="auth-layout">
      <header class="auth-layout__header">
        <a routerLink="/" class="auth-layout__brand" aria-label="Monthly Budgeting Money Planner — home">
          <app-brand-mark [size]="26" />
          <span class="auth-layout__brand-name">Money Planner</span>
        </a>
      </header>

      <main class="auth-layout__main">
        <router-outlet />
      </main>

      <footer class="auth-layout__footer">
        <span class="auth-layout__footer-text">Monthly Budgeting Money Planner</span>
      </footer>
    </div>
  `,
  styles: `
    :host {
      display: block;
      min-height: 100vh;
      min-height: 100dvh;
    }

    .auth-layout {
      display: flex;
      flex-direction: column;
      min-height: 100vh;
      min-height: 100dvh;
      background: var(--bg-base);
    }

    .auth-layout__header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: var(--space-4);
      border-bottom: 1px solid var(--border-subtle);
    }

    .auth-layout__brand {
      display: inline-flex;
      align-items: center;
      gap: var(--space-2);
      text-decoration: none;
      border-radius: var(--radius-lg);
      padding: var(--space-1) var(--space-2);
      margin: calc(-1 * var(--space-1)) calc(-1 * var(--space-2));
    }

    .auth-layout__brand-name {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      letter-spacing: -0.01em;
    }

    .auth-layout__main {
      flex: 1;
      display: flex;
      flex-direction: column;
      justify-content: center;
      width: 100%;
      margin: 0 auto;
      padding: var(--space-6) var(--space-4);
    }

    .auth-layout__footer {
      display: flex;
      justify-content: center;
      padding: var(--space-4);
      border-top: 1px solid var(--border-subtle);
    }

    .auth-layout__footer-text {
      font-size: 0.75rem;
      color: var(--text-muted);
    }

    @media (min-width: 768px) {
      .auth-layout__header,
      .auth-layout__footer {
        padding: var(--space-5) var(--space-6);
      }

      .auth-layout__main {
        padding: var(--space-7) var(--space-5);
      }
    }
  `,
})
export class AuthLayoutComponent {}
