import { Component, input } from '@angular/core';

@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div class="page-header__title-group">
        <h1 class="page-header__title">{{ title() }}</h1>
        @if (subtitle()) {
          <p class="page-header__subtitle">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions">
        <ng-content />
      </div>
    </header>
  `,
  styles: `
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: var(--space-4);
      margin-bottom: var(--space-5);
      flex-wrap: wrap;
    }

    .page-header__title {
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      line-height: 1.3;
      margin: 0;
    }

    .page-header__subtitle {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-top: var(--space-1);
      margin-bottom: 0;
    }

    .page-header__actions {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }
  `,
})
export class PageHeaderComponent {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
