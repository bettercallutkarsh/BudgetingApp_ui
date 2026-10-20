import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { BrandMarkComponent } from '../../shared/components/brand-mark/brand-mark';

interface FeatureCard {
  icon: string;
  title: string;
  description: string;
}

@Component({
  selector: 'app-welcome',
  imports: [RouterLink, TablerIconComponent, BrandMarkComponent],
  template: `
    <section class="welcome" aria-labelledby="welcome-title">
      <div class="welcome__hero">
        <div class="welcome__mark" aria-hidden="true">
          <app-brand-mark [size]="44" />
        </div>
        <p class="welcome__eyebrow">Monthly Budgeting Money Planner</p>
        <h1 class="welcome__title" id="welcome-title">Plan your month. Keep your money on track.</h1>
        <p class="welcome__lede">
          Set a monthly budget, split it across essentials, safety and investments,
          and follow every entry from one clean, calm place.
        </p>
        <div class="welcome__actions">
          <a routerLink="/register" class="btn btn-primary welcome__cta">Create free account</a>
          <a routerLink="/login" class="btn btn-secondary welcome__cta">Sign in</a>
        </div>
      </div>

      <ul class="welcome__features">
        @for (feature of features; track feature.title) {
          <li class="feature-card">
            <span class="feature-card__icon" aria-hidden="true">
              <tabler-icon [icon]="feature.icon" [size]="20" [stroke]="1.75" />
            </span>
            <div>
              <h2 class="feature-card__title">{{ feature.title }}</h2>
              <p class="feature-card__description">{{ feature.description }}</p>
            </div>
          </li>
        }
      </ul>

      <p class="welcome__note">
        Every plan lives behind your own account — sign in required to view or edit your money.
      </p>
    </section>
  `,
  styles: `
    .welcome {
      width: 100%;
      max-width: 960px;
      margin: 0 auto;
    }

    .welcome__hero {
      text-align: center;
      max-width: 640px;
      margin: 0 auto var(--space-7);
    }

    .welcome__mark {
      display: inline-flex;
      padding: var(--space-3);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      background: var(--bg-surface);
      margin-bottom: var(--space-5);
    }

    .welcome__eyebrow {
      font-size: 0.8125rem;
      font-weight: 600;
      color: var(--brand);
      margin-bottom: var(--space-3);
    }

    .welcome__title {
      font-size: clamp(1.75rem, 4vw, 2.5rem);
      font-weight: 600;
      line-height: 1.15;
      letter-spacing: -0.02em;
      color: var(--text-primary);
      margin: 0 0 var(--space-4);
    }

    .welcome__lede {
      font-size: 1rem;
      line-height: 1.6;
      color: var(--text-secondary);
      margin: 0 0 var(--space-6);
    }

    .welcome__actions {
      display: flex;
      flex-wrap: wrap;
      justify-content: center;
      gap: var(--space-3);
    }

    .welcome__cta {
      min-height: var(--control-h-lg);
      padding: 0 var(--space-5);
      font-size: 0.9375rem;
    }

    .welcome__features {
      list-style: none;
      margin: 0 0 var(--space-6);
      padding: 0;
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-3);
    }

    .feature-card {
      display: flex;
      gap: var(--space-3);
      padding: var(--space-4);
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
    }

    .feature-card__icon {
      display: inline-flex;
      align-items: center;
      justify-content: center;
      width: 40px;
      height: 40px;
      flex-shrink: 0;
      border-radius: var(--radius-lg);
      background: var(--brand-soft);
      color: var(--brand);
    }

    .feature-card__title {
      font-size: 0.9375rem;
      font-weight: 600;
      color: var(--text-primary);
      margin: 0 0 2px;
    }

    .feature-card__description {
      font-size: 0.8125rem;
      line-height: 1.5;
      color: var(--text-secondary);
      margin: 0;
    }

    .welcome__note {
      text-align: center;
      font-size: 0.8125rem;
      color: var(--text-muted);
      max-width: 520px;
      margin: 0 auto;
    }

    @media (min-width: 768px) {
      .welcome__features {
        grid-template-columns: repeat(3, 1fr);
      }
    }
  `,
})
export class WelcomePageComponent {
  protected readonly features: FeatureCard[] = [
    {
      icon: 'wallet',
      title: 'Monthly budget',
      description:
        'Set your income and choose how it splits across Essentials, Safety and Investments.',
    },
    {
      icon: 'receipt',
      title: 'Everyday entries',
      description:
        'Record expenses, savings, investments and card payments as they happen.',
    },
    {
      icon: 'chart-bar',
      title: 'Clear reports',
      description:
        'See where your money went across days, months and years, grouped the way you choose.',
    },
  ];
}
