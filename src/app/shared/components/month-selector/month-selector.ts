import { Component, input, output } from '@angular/core';

/**
 * Shared month selector used by Budget, Home and Reports. Renders a compact
 * surface (`bg-surface` token) with accessible previous/next controls and a
 * readable, tabular selected-month label. Behaviour (`change` emits a month
 * delta) and the `YYYY-MM` contract are owned by the host page.
 */
@Component({
  selector: 'app-month-selector',
  template: `
    <div class="month-selector">
      <button
        type="button"
        class="month-selector__btn"
        (click)="change.emit(-1)"
        [disabled]="disabled()"
        aria-label="Previous month"
      >
        <span aria-hidden="true">&#8249;</span>
      </button>
      <span class="month-selector__label tabular" aria-live="polite">{{ monthLabel() }}</span>
      <button
        type="button"
        class="month-selector__btn"
        (click)="change.emit(1)"
        [disabled]="disabled() || nextDisabled()"
        aria-label="Next month"
      >
        <span aria-hidden="true">&#8250;</span>
      </button>
    </div>
  `,
  styles: `
    :host {
      display: inline-block;
    }

    .month-selector {
      display: inline-flex;
      align-items: center;
      gap: var(--space-1);
      padding: var(--space-1);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-lg);
    }

    .month-selector__label {
      min-width: 8.5rem;
      text-align: center;
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
      white-space: nowrap;
    }

    .month-selector__btn {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: var(--control-h-md);
      height: var(--control-h-md);
      padding: 0;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      color: var(--text-secondary);
      font-size: 1.25rem;
      line-height: 1;
      cursor: pointer;
      transition: background-color var(--transition-fast), color var(--transition-fast);
    }

    .month-selector__btn:hover:not(:disabled) {
      background: var(--bg-elevated);
      color: var(--text-primary);
    }

    .month-selector__btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
    }

    @media (max-width: 380px) {
      .month-selector__label {
        min-width: 6.5rem;
      }
    }
  `,
})
export class MonthSelectorComponent {
  readonly monthLabel = input.required<string>();
  readonly disabled = input(false);
  readonly nextDisabled = input(false);
  readonly change = output<number>();
}
