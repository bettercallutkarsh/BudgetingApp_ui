import { Component } from '@angular/core';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header';

@Component({
  selector: 'app-design-preview',
  imports: [PageHeaderComponent],
  template: `
    <app-page-header
      title="Design System Preview"
      subtitle="Internal page for inspecting the UI foundation"
    />

    <div class="preview-section">
      <h2 class="preview-heading">Brand colours</h2>
      <div class="swatch-grid">
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--bg-base); border: 1px solid var(--border-subtle)"></div>
          <div class="swatch__name">bg-base</div>
          <div class="swatch__value">Page background</div>
        </div>
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--bg-surface)"></div>
          <div class="swatch__name">bg-surface</div>
          <div class="swatch__value">Cards, panels</div>
        </div>
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--bg-elevated)"></div>
          <div class="swatch__name">bg-elevated</div>
          <div class="swatch__value">Menus, popovers</div>
        </div>
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--bg-input)"></div>
          <div class="swatch__name">bg-input</div>
          <div class="swatch__value">Form controls</div>
        </div>
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--brand)"></div>
          <div class="swatch__name">brand</div>
          <div class="swatch__value">Primary accent</div>
        </div>
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--brand-soft)"></div>
          <div class="swatch__name">brand-soft</div>
          <div class="swatch__value">Selected surface</div>
        </div>
        <div class="swatch">
          <div class="swatch__chip" style="background: var(--border-subtle)"></div>
          <div class="swatch__name">border-subtle</div>
          <div class="swatch__value">Soft borders</div>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Typography</h2>
      <div class="type-demo">
        <div class="type-row">
          <span class="type-label">Page heading — 24px / 600</span>
          <span style="font-size: 1.5rem; font-weight: 600; color: var(--text-primary)">Monthly Overview</span>
        </div>
        <div class="type-row">
          <span class="type-label">Section — 20px / 600</span>
          <span style="font-size: 1.25rem; font-weight: 600; color: var(--text-primary)">Bucket Allocation</span>
        </div>
        <div class="type-row">
          <span class="type-label">Body — 16px / 400</span>
          <span style="font-size: 1rem; color: var(--text-primary)">Your monthly spending summary is shown below.</span>
        </div>
        <div class="type-row">
          <span class="type-label">Secondary — 14px / 400</span>
          <span style="font-size: 0.875rem; color: var(--text-secondary)">Last updated 18 Oct 2026, 2:30 PM</span>
        </div>
        <div class="type-row">
          <span class="type-label">Muted — 12px / 400</span>
          <span style="font-size: 0.75rem; color: var(--text-muted)">Category: Groceries</span>
        </div>
        <div class="type-row">
          <span class="type-label">Financial amount</span>
          <span style="font-size: 1.75rem; font-weight: 600; color: var(--text-primary)" class="tabular">₹1,24,500.00</span>
        </div>
        <div class="type-row">
          <span class="type-label">Small amount (tabular)</span>
          <span style="font-size: 0.875rem; color: var(--text-secondary)" class="tabular">₹3,250.50</span>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Buttons</h2>
      <div class="btn-row">
        <button type="button" class="btn btn-primary">Primary</button>
        <button type="button" class="btn btn-secondary">Secondary</button>
        <button type="button" class="btn btn-ghost">Ghost</button>
        <button type="button" class="btn btn-destructive">Destructive</button>
        <button type="button" class="btn btn-primary" disabled>Disabled</button>
      </div>
      <div class="btn-row mt-3">
        <button type="button" class="btn btn-primary btn-sm">Small</button>
        <button type="button" class="btn btn-primary">Default</button>
        <button type="button" class="btn btn-primary btn-lg">Large</button>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Form controls</h2>
      <div class="form-demo">
        <div class="form-group">
          <label class="label" for="demo-text">Text field</label>
          <input id="demo-text" class="input" type="text" placeholder="Enter text" />
        </div>
        <div class="form-group">
          <label class="label" for="demo-email">Email field</label>
          <input id="demo-email" class="input" type="email" placeholder="you@example.com" />
        </div>
        <div class="form-group">
          <label class="label" for="demo-password">Password field</label>
          <input id="demo-password" class="input" type="password" placeholder="Password" />
        </div>
        <div class="form-group">
          <label class="label" for="demo-amount">Amount field</label>
          <input id="demo-amount" class="input tabular" type="text" placeholder="₹0.00" />
          <p class="hint">Enter amount in Indian Rupees</p>
        </div>
        <div class="form-group">
          <label class="label" for="demo-select">Select field</label>
          <select id="demo-select" class="select">
            <option>Essentials</option>
            <option>Emergency Fund</option>
            <option>Investments</option>
          </select>
        </div>
        <div class="form-group">
          <label class="label" for="demo-invalid">Invalid field</label>
          <input id="demo-invalid" class="input input-invalid" type="text" value="-500" />
          <p class="error-text">Amount must be greater than ₹0</p>
        </div>
        <div class="form-group">
          <label class="label" for="demo-disabled">Disabled field</label>
          <input id="demo-disabled" class="input" type="text" value="Read only" disabled />
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Cards</h2>
      <div class="card-demo">
        <div class="card p-5">
          <div class="text-sm text-text-secondary mb-1">Standard card</div>
          <div class="text-lg font-semibold text-text-primary tabular">₹45,000.00</div>
        </div>
        <div class="card-elevated p-5">
          <div class="text-sm text-text-secondary mb-1">Elevated card</div>
          <div class="text-lg font-semibold text-text-primary tabular">₹45,000.00</div>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Budget bucket colours</h2>
      <div class="bucket-demo">
        <div class="bucket-card">
          <div class="flex items-center gap-2 mb-2">
            <span class="bucket-dot" style="background: var(--bucket-essentials)"></span>
            <span class="text-sm font-medium text-text-primary">Essentials</span>
          </div>
          <div class="text-xl font-semibold tabular text-text-primary">₹27,500.00</div>
          <div class="text-xs text-text-secondary mt-1">55% of income</div>
          <div class="mt-3 progress-track">
            <div class="progress-fill" style="width: 65%; background: var(--bucket-essentials)"></div>
          </div>
          <div class="text-xs text-text-muted mt-2">₹18,000 spent · ₹9,500 remaining</div>
        </div>
        <div class="bucket-card">
          <div class="flex items-center gap-2 mb-2">
            <span class="bucket-dot" style="background: var(--bucket-safety)"></span>
            <span class="text-sm font-medium text-text-primary">Emergency Fund</span>
          </div>
          <div class="text-xl font-semibold tabular text-text-primary">₹5,000.00</div>
          <div class="text-xs text-text-secondary mt-1">10% of income</div>
          <div class="mt-3 progress-track">
            <div class="progress-fill" style="width: 40%; background: var(--bucket-safety)"></div>
          </div>
          <div class="text-xs text-text-muted mt-2">₹2,000 saved · ₹3,000 remaining</div>
        </div>
        <div class="bucket-card">
          <div class="flex items-center gap-2 mb-2">
            <span class="bucket-dot" style="background: var(--bucket-investments)"></span>
            <span class="text-sm font-medium text-text-primary">Investments</span>
          </div>
          <div class="text-xl font-semibold tabular text-text-primary">₹17,500.00</div>
          <div class="text-xs text-text-secondary mt-1">35% of income</div>
          <div class="mt-3 progress-track">
            <div class="progress-fill" style="width: 30%; background: var(--bucket-investments)"></div>
          </div>
          <div class="text-xs text-text-muted mt-2">₹5,250 contributed · ₹12,250 remaining</div>
        </div>
      </div>
      <p class="hint mt-3">All amounts above are illustrative sample data for design inspection only.</p>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Status pills</h2>
      <div class="pill-row">
        <span class="pill pill-success">Within allocation</span>
        <span class="pill pill-warning">Approaching limit</span>
        <span class="pill pill-danger">Over allocation</span>
        <span class="pill pill-info">Info</span>
        <span class="pill pill-neutral">Neutral</span>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Alerts &amp; messages</h2>
      <div class="alert-stack">
        <div class="alert alert-success">
          <span>Budget saved successfully for October 2026.</span>
        </div>
        <div class="alert alert-warning">
          <span>You are approaching your Essentials allocation limit.</span>
        </div>
        <div class="alert alert-danger">
          <span>You have exceeded this bucket's monthly allocation by ₹1,200.</span>
        </div>
        <div class="alert alert-info">
          <span>The app does not verify bank credits. Budget uses your entered amount.</span>
        </div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Loading states</h2>
      <div class="card p-5">
        <div class="skeleton" style="height: 14px; width: 40%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 28px; width: 60%; margin-bottom: 12px;"></div>
        <div class="skeleton" style="height: 10px; width: 80%;"></div>
      </div>
      <div class="mt-3 flex items-center gap-2">
        <div class="spinner"></div>
        <span class="text-sm text-text-secondary">Loading your data...</span>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Empty state</h2>
      <div class="card p-8 text-center">
        <h3 class="text-base font-semibold text-text-primary mb-1">No entries yet</h3>
        <p class="text-sm text-text-secondary mb-4">Start by adding your first entry.</p>
        <button type="button" class="btn btn-primary">Add entry</button>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Over-allocation state</h2>
      <div class="bucket-card" style="border-color: var(--state-danger)">
        <div class="flex items-center gap-2 mb-2">
          <span class="bucket-dot" style="background: var(--bucket-essentials)"></span>
          <span class="text-sm font-medium text-text-primary">Essentials</span>
          <span class="pill pill-danger">Over</span>
        </div>
        <div class="text-xl font-semibold tabular text-text-primary">₹27,500.00</div>
        <div class="text-xs text-text-secondary mt-1">55% of income</div>
        <div class="mt-3 progress-track">
          <div class="progress-fill" style="width: 100%; background: var(--state-danger)"></div>
        </div>
        <div class="text-xs mt-2" style="color: var(--state-danger)">Exceeded by ₹1,200.00</div>
      </div>
    </div>

    <div class="preview-section">
      <h2 class="preview-heading">Border, radius &amp; shadow treatment</h2>
      <div class="surface-demo">
        <div class="surface-box" style="background: var(--bg-base); border: 1px solid var(--border-subtle)">
          <span class="text-xs text-text-muted">bg-base + border</span>
        </div>
        <div class="surface-box" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-lg)">
          <span class="text-xs text-text-muted">surface + radius-md</span>
        </div>
        <div class="surface-box" style="background: var(--bg-surface); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-card)">
          <span class="text-xs text-text-muted">surface + radius-xl + shadow</span>
        </div>
        <div class="surface-box" style="background: var(--bg-elevated); border: 1px solid var(--border-subtle); border-radius: var(--radius-xl); box-shadow: var(--shadow-elevated)">
          <span class="text-xs text-text-muted">elevated + radius-xl + elevated shadow</span>
        </div>
      </div>
    </div>
  `,
  styles: `
    .preview-section {
      margin-bottom: var(--space-6);
    }

    .preview-heading {
      font-size: 0.875rem;
      font-weight: 600;
      color: var(--text-secondary);
      text-transform: uppercase;
      letter-spacing: 0.05em;
      margin-bottom: var(--space-3);
      padding-bottom: var(--space-2);
      border-bottom: 1px solid var(--border-subtle);
    }

    .swatch-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
      gap: var(--space-3);
    }

    .swatch__chip {
      width: 100%;
      height: 48px;
      border-radius: var(--radius-md);
      margin-bottom: var(--space-2);
    }

    .swatch__name {
      font-size: 0.75rem;
      font-weight: 500;
      color: var(--text-primary);
      font-family: ui-monospace, monospace;
    }

    .swatch__value {
      font-size: 0.6875rem;
      color: var(--text-muted);
    }

    .type-demo {
      display: flex;
      flex-direction: column;
      gap: var(--space-3);
    }

    .type-row {
      display: flex;
      align-items: baseline;
      gap: var(--space-4);
      flex-wrap: wrap;
    }

    .type-label {
      font-size: 0.6875rem;
      color: var(--text-muted);
      font-family: ui-monospace, monospace;
      min-width: 180px;
    }

    .btn-row {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: var(--space-2);
    }

    .btn-sm {
      height: var(--control-h-sm);
      font-size: 0.75rem;
      padding: 0 var(--space-3);
    }

    .btn-lg {
      height: var(--control-h-lg);
      font-size: 1rem;
      padding: 0 var(--space-5);
    }

    .form-demo {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
      max-width: 400px;
    }

    .form-group {
      /* spacing handled by grid */
    }

    .card-demo {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    @media (min-width: 640px) {
      .card-demo {
        grid-template-columns: 1fr 1fr;
      }
    }

    .bucket-demo {
      display: grid;
      grid-template-columns: 1fr;
      gap: var(--space-4);
    }

    @media (min-width: 640px) {
      .bucket-demo {
        grid-template-columns: repeat(3, 1fr);
      }
    }

    .bucket-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-subtle);
      border-radius: var(--radius-xl);
      padding: var(--space-4);
    }

    .bucket-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      flex-shrink: 0;
    }

    .pill-row {
      display: flex;
      flex-wrap: wrap;
      gap: var(--space-2);
    }

    .alert-stack {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
    }

    .surface-demo {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
      gap: var(--space-4);
    }

    .surface-box {
      padding: var(--space-5);
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 80px;
    }

    .spinner {
      width: 16px;
      height: 16px;
      border: 2px solid var(--border-subtle);
      border-top-color: var(--brand);
      border-radius: 50%;
      animation: spin 0.6s linear infinite;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .mt-3 { margin-top: var(--space-3); }
  `,
})
export class DesignPreviewPageComponent {}
