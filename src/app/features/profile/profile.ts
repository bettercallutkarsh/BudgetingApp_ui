import { Component, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { TablerIconComponent } from '@tabler/icons-angular';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { AuthService } from '../../core/auth/auth.service';
import {
  EMPLOYMENT_TYPE_LABELS,
  UserProfile,
  serverErrorMessage,
} from '../../core/auth/auth.models';

function initialsOf(fullName: string): string {
  return fullName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]!.toUpperCase())
    .join('');
}

function formatPhone(phoneNumber: string): string {
  const match = /^\+91(\d{10})$/.exec(phoneNumber);
  if (!match) {
    return phoneNumber;
  }
  return `+91 ${match[1].slice(0, 5)} ${match[1].slice(5)}`;
}

function formatDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

@Component({
  selector: 'app-profile',
  imports: [PageHeaderComponent, TablerIconComponent],
  template: `
    <app-page-header title="Profile" subtitle="Your account and settings" />

    @if (user(); as profile) {
      <div class="card p-6">
        <div class="profile-head">
          <div class="profile-avatar" aria-hidden="true">{{ initials(profile.fullName) }}</div>
          <div class="profile-head__text">
            <div class="profile-name">{{ profile.fullName }}</div>
            <div class="profile-email">{{ profile.email }}</div>
            <span
              class="pill"
              [class.pill-success]="profile.accountStatus === 'ACTIVE'"
              [class.pill-warning]="profile.accountStatus !== 'ACTIVE'"
            >
              {{ profile.accountStatus === 'ACTIVE' ? 'Active' : 'Deactivated' }}
            </span>
          </div>
        </div>

        <div class="divider"></div>

        <dl class="profile-rows">
          <div class="profile-row">
            <dt>Mobile</dt>
            <dd class="tabular">{{ formatPhone(profile.phoneNumber) }}</dd>
          </div>
          <div class="profile-row">
            <dt>Employment</dt>
            <dd>{{ employmentLabel(profile) }}</dd>
          </div>
          <div class="profile-row">
            <dt>Member since</dt>
            <dd>{{ formatDate(profile.createdAtUtc) }}</dd>
          </div>
        </dl>

        <div class="divider"></div>

        @if (signOutError()) {
          <div class="alert alert-danger signout-alert" role="alert">{{ signOutError() }}</div>
        }

        <div class="signout-row">
          <div>
            <div class="signout-label">Sign out</div>
            <div class="signout-hint">Ends this session on this device.</div>
          </div>
          <button
            type="button"
            class="btn btn-secondary"
            (click)="signOut()"
            [disabled]="signingOut()"
            [attr.aria-busy]="signingOut()"
          >
            @if (signingOut()) {
              <span class="spinner" aria-hidden="true"></span>
              Signing out…
            } @else {
              <tabler-icon icon="logout" [size]="16" [stroke]="1.75" />
              Sign out
            }
          </button>
        </div>
      </div>
    } @else {
      <div class="card p-6">
        <p class="hint">Loading your profile…</p>
      </div>
    }
  `,
  styles: `
    .profile-head {
      display: flex;
      align-items: center;
      gap: var(--space-4);
    }

    .profile-avatar {
      width: 56px;
      height: 56px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      border-radius: var(--radius-full);
      background: var(--brand-soft);
      color: var(--brand);
      font-size: 1.125rem;
      font-weight: 600;
      letter-spacing: 0.02em;
    }

    .profile-head__text {
      min-width: 0;
    }

    .profile-name {
      font-size: 1.0625rem;
      font-weight: 600;
      color: var(--text-primary);
    }

    .profile-email {
      font-size: 0.875rem;
      color: var(--text-secondary);
      margin-bottom: var(--space-2);
      word-break: break-all;
    }

    .divider {
      height: 1px;
      background: var(--border-subtle);
      margin: var(--space-4) 0;
    }

    .profile-rows {
      margin: 0;
    }

    .profile-row {
      display: flex;
      align-items: baseline;
      justify-content: space-between;
      gap: var(--space-4);
      padding: var(--space-2) 0;
    }

    .profile-row dt {
      font-size: 0.875rem;
      color: var(--text-secondary);
    }

    .profile-row dd {
      margin: 0;
      font-size: 0.875rem;
      color: var(--text-primary);
      text-align: right;
      word-break: break-word;
    }

    .signout-alert {
      margin-bottom: var(--space-4);
    }

    .signout-row {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .signout-label {
      font-size: 0.875rem;
      font-weight: 500;
      color: var(--text-primary);
    }

    .signout-hint {
      font-size: 0.75rem;
      color: var(--text-muted);
      margin-top: 2px;
    }
  `,
})
export class ProfilePageComponent {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly user = this.auth.user;
  protected readonly signingOut = signal(false);
  protected readonly signOutError = signal<string | null>(null);

  protected initials(fullName: string): string {
    return initialsOf(fullName);
  }

  protected formatPhone(phoneNumber: string): string {
    return formatPhone(phoneNumber);
  }

  protected formatDate(iso: string): string {
    return formatDate(iso);
  }

  protected employmentLabel(profile: UserProfile): string {
    return EMPLOYMENT_TYPE_LABELS[profile.employmentType] ?? profile.employmentType;
  }

  protected signOut(): void {
    if (this.signingOut()) {
      return;
    }
    this.signOutError.set(null);
    this.signingOut.set(true);
    this.auth
      .logout()
      .then(() => {
        void this.router.navigateByUrl('/');
      })
      .catch((error: unknown) => {
        this.signOutError.set(serverErrorMessage(error));
      })
      .finally(() => {
        this.signingOut.set(false);
      });
  }
}
