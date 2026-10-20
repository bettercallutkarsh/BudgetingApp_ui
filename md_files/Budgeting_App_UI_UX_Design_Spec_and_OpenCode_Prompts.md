# Monthly Budgeting Money Planner — UI/UX Design Specification & OpenCode Prompt Pack

**Version:** 1.0  
**Status:** Proposed design direction; implement in small reviewed phases  
**Frontend repo:** `D:\Budgeting_App\Budgenting_ui`  
**Backend repo:** `D:\Budgeting_App\Budgenting_backend`  
**Stack:** Existing Angular 22 project, TypeScript, Tailwind CSS v4, Tabler Icons for Angular  
**Brand direction:** Dark-first fintech, deep charcoal surfaces, restrained lime accent, clear financial information  

---

## 1. How to use this prompt pack

1. Copy this file into the frontend repository at `D:\Budgeting_App\Budgenting_ui\md_files\UI_UX_DESIGN_SPEC_AND_OPENCODE_PROMPTS.md`.
2. OpenCode should read this specification and the existing `md_files/UI_REQUIREMENTS_FINAL.md` before implementation.
3. Run **one phase prompt at a time**. Review its report and UI in the browser before proceeding to the next phase.
4. Never ask OpenCode to implement the entire frontend in one pass. Do not let one phase quietly expand into the next.
5. Preserve existing Git work. Do not stage, commit, push, restore or delete unrelated files unless explicitly asked.

The design examples are a proposed visual direction—not a finished brand identity. The working product name is **Monthly Budgeting Money Planner** until a final public-facing brand name is selected. Do not invent a final brand name or logo wordmark yet.

## 2. Product and repository context

### Product goal

Create a clean, trustworthy personal-finance web app that helps an individual understand monthly income allocation, record expenses/savings/investment contributions, track estimated credit-card outstanding, and review financial reports. The product must feel polished and modern without visual clutter or manipulative financial messaging.

### Workspace safety

- Workspace root: `D:\Budgeting_App`
- Frontend working repository: `D:\Budgeting_App\Budgenting_ui`
- Backend repository: `D:\Budgeting_App\Budgenting_backend`
- Do not initialize another Git repository at the workspace root.
- Work on frontend files only during these phases unless an explicit follow-up requests a backend change.
- Inspect `git status` before and after each phase. Preserve existing modified, deleted and untracked files. Never stage, commit, push or restore unrelated changes.

### Existing environment noted in project context

- Angular CLI/app: 22.2.3
- Node.js: 24.22.0
- npm: 11.19.1
- IntelliJ IDEA for backend; frontend repo is already initialized.
- Verify actual current `package.json`, Angular configuration, route structure, assets directory, and build command before changing anything. Do not blindly upgrade Angular or replace the existing build setup.

### Existing backend

Spring Boot 4.1.1 REST API; API prefix `/api/v1`. Existing backend features reported implemented include session-based authentication, CSRF protection, budget APIs, money-entry APIs, categories, reports, and credit-card summary/opening-baseline APIs. Always inspect the backend controller and DTO source for the **exact** field names and response shapes before writing frontend interfaces; this document is not a replacement for actual DTO contracts.

Authentication is **server-side HTTP session based; no JWT**:

- `GET /api/v1/auth/csrf`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`
- `GET /api/v1/me`

Business APIs (verify exact contracts against backend source):

- `GET /api/v1/budgets/{yyyy-MM}`
- `PUT /api/v1/budgets/{yyyy-MM}`
- `POST /api/v1/money-entries`
- `GET /api/v1/money-entries` (filtering and pagination)
- `GET /api/v1/money-entries/{id}`
- `POST /api/v1/money-entries/{id}/void`
- `GET /api/v1/reference-data/categories`
- `GET /api/v1/reports/monthly-summary?month=YYYY-MM`
- `GET /api/v1/reports/summary?fromDate=&toDate=&groupBy=`
- `GET /api/v1/credit-card/summary`
- `PUT /api/v1/credit-card/opening-outstanding`

Important backend rules include IST (`Asia/Kolkata`) business calendar semantics, UTC instants on API timestamps, `BigDecimal`-based money, no client-trusted `userId`, and consistent structured API errors. Do not reimplement server-side business calculations in Angular.

### Source-of-truth documents

Read these when available:

- `md_files/UI_REQUIREMENTS_FINAL.md` in the frontend repo
- `md_files/SERVICE_REQUIREMENTS_FINAL.md` in the backend repo
- `md_files/Budgeting_App_OpenCode_Project_Context_Prompt.md` in the backend repo
- Actual controllers and request/response DTOs in the backend repo

If the docs disagree with implementation or leave a detail unclear, do not silently invent a financial rule. Report the gap and prefer the existing backend contract until it is resolved.

---

## 3. Brand and visual direction

### Design intent

**Dark-first modern fintech / premium personal-finance SaaS.** The user-provided references favour deep charcoal backgrounds, lime-green emphasis, minimal outlined icons, focused authentication screens, clean cards, generous spacing and strong readable headings.

The app should feel:

- Calm, trustworthy, focused and precise.
- Premium through alignment, spacing, hierarchy and consistency—not through many effects.
- Friendly and practical for daily money management.
- Dense enough to show useful financial information, but not cramped.

Avoid:

- A generic admin-template look.
- Neon glow on every card, loud gradients, glassmorphism everywhere, glossy skeuomorphic controls, thick separators, rainbow charts, decorative badges, and excessive motion.
- Fake urgency, shame-based overspending language, fake onboarding progress, or misleading financial claims.
- Hardcoded financial totals outside clearly labelled demo/sample states.

### Initial color concept

Use deep neutral charcoal surfaces, a lime primary action color and reserved semantic/category colors. The initial palette below is a **proposal to validate**, not an assertion that contrast is already perfect in every possible pairing. Implement semantic tokens and verify text/control contrast before calling the theme done.

| Token | Proposed HEX preview | Proposed OKLCH token | Primary role |
|---|---|---|---|
| `--bg-base` | `#111312` | `oklch(0.184 0.004 164.6)` | App/page background |
| `--bg-surface` | `#1C201D` | `oklch(0.238 0.008 153.3)` | Cards and navigation surfaces |
| `--bg-elevated` | `#252A26` | `oklch(0.279 0.010 151.4)` | Menus, popovers, elevated cards |
| `--bg-input` | `#171A18` | `oklch(0.214 0.006 156.7)` | Form-control backgrounds |
| `--border-subtle` | `#303731` | `oklch(0.328 0.014 149.4)` | Soft borders/dividers |
| `--text-primary` | `#F3F5F3` | `oklch(0.968 0.003 145.6)` | Main copy/headings |
| `--text-secondary` | `#B4BDB5` | `oklch(0.789 0.015 148.7)` | Supporting text |
| `--text-muted` | `#879188` | `oklch(0.646 0.018 148.3)` | Secondary metadata; verify contrast before use for essential text |
| `--brand` | `#A3E635` | `oklch(0.849 0.207 128.8)` | Main CTA, active navigation, focused emphasis |
| `--brand-hover` | `#B5F05A` | `oklch(0.886 0.188 128.1)` | Hover state |
| `--brand-pressed` | `#86C92B` | `oklch(0.763 0.192 130.7)` | Pressed state |
| `--brand-soft` | `#29391A` | `oklch(0.322 0.055 131.3)` | Subtle selected/brand surface |
| `--bucket-essentials` | `#60A5FA` | `oklch(0.714 0.143 254.6)` | Essentials data series |
| `--bucket-safety` | `#FBBF24` | `oklch(0.837 0.164 84.4)` | Safety data series |
| `--bucket-investments` | `#A78BFA` | `oklch(0.709 0.159 293.5)` | Investment data series |
| `--state-success` | `#34D399` | `oklch(0.773 0.153 163.2)` | Successful actions/positive status |
| `--state-warning` | `#FBBF24` | `oklch(0.837 0.164 84.4)` | Warning/approaching limit |
| `--state-danger` | `#F87171` | `oklch(0.711 0.166 22.2)` | Errors/over-allocation/overspending |
| `--state-info` | `#60A5FA` | `oklch(0.714 0.143 254.6)` | Neutral information |

### Color rules

- Prefer `oklch()` for authored color tokens and central CSS variables for semantic roles. Tailwind CSS v4 supports theme variables and uses OKLCH colors in its documented theme examples.
- HEX previews above help humans compare the palette; they do not mean the implementation should scatter HEX values throughout templates.
- Keep surfaces mostly neutral. Lime is an accent, not a background for entire screens.
- On lime primary buttons, use a very dark foreground only after contrast verification.
- Never communicate budget bucket, success, warning or error by color alone; add labels, values, icons or patterns as appropriate.
- The three bucket colors must remain consistent on cards, legends, charts, badges and transaction details.
- Do not use muted text for small essential content if its contrast is too low.
- Shadows should use alpha transparency and be subtle. On dark surfaces, layered surface values and soft borders should do more of the work than big shadows.
- Gradients, if used, should be low-contrast variations of the same hue and limited to a small number of intentional surfaces.
- A future light theme may be added by redefining the semantic tokens; do not simply invert every colour. Initial implementation should prioritize the dark theme shown in references, unless the source requirements demand theme switching.

### Example CSS / Tailwind v4 token shape

Adapt to the actual existing global stylesheet. Do not blindly overwrite it.

```css
@import "tailwindcss";

:root {
  color-scheme: dark;
  --bg-base: oklch(0.184 0.004 164.6);
  --bg-surface: oklch(0.238 0.008 153.3);
  --bg-elevated: oklch(0.279 0.010 151.4);
  --bg-input: oklch(0.214 0.006 156.7);
  --border-subtle: oklch(0.328 0.014 149.4);
  --text-primary: oklch(0.968 0.003 145.6);
  --text-secondary: oklch(0.789 0.015 148.7);
  --text-muted: oklch(0.646 0.018 148.3);
  --brand: oklch(0.849 0.207 128.8);
  --brand-hover: oklch(0.886 0.188 128.1);
  --brand-pressed: oklch(0.763 0.192 130.7);
  --brand-soft: oklch(0.322 0.055 131.3);
  --bucket-essentials: oklch(0.714 0.143 254.6);
  --bucket-safety: oklch(0.837 0.164 84.4);
  --bucket-investments: oklch(0.709 0.159 293.5);
  --state-success: oklch(0.773 0.153 163.2);
  --state-warning: oklch(0.837 0.164 84.4);
  --state-danger: oklch(0.711 0.166 22.2);
  --state-info: oklch(0.714 0.143 254.6);
  --shadow-soft: 0 1px 2px oklch(0 0 0 / 0.28), 0 8px 24px oklch(0 0 0 / 0.18);
}

@theme inline {
  --color-bg-base: var(--bg-base);
  --color-bg-surface: var(--bg-surface);
  --color-bg-elevated: var(--bg-elevated);
  --color-bg-input: var(--bg-input);
  --color-border-subtle: var(--border-subtle);
  --color-text-primary: var(--text-primary);
  --color-text-secondary: var(--text-secondary);
  --color-text-muted: var(--text-muted);
  --color-brand: var(--brand);
  --color-brand-hover: var(--brand-hover);
  --color-brand-pressed: var(--brand-pressed);
  --color-brand-soft: var(--brand-soft);
  --color-bucket-essentials: var(--bucket-essentials);
  --color-bucket-safety: var(--bucket-safety);
  --color-bucket-investments: var(--bucket-investments);
  --color-state-success: var(--state-success);
  --color-state-warning: var(--state-warning);
  --color-state-danger: var(--state-danger);
  --color-state-info: var(--state-info);
}
```

If global variables are needed for theme switching, keep semantic variables as the source of truth and map Tailwind utilities to them. Verify the installed Tailwind major version before applying setup syntax.

---

## 4. Design-system standards

### Layout and spacing

- Use an 8-point grid as the default rhythm, with 4px as a fine-adjustment step.
- Preferred spacing scale: `4, 8, 12, 16, 24, 32, 40, 48, 64` px. Use 12px only where 8px feels too tight and 16px too large; avoid arbitrary values without a documented need.
- Keep card padding consistent by component size; standard cards generally use 16–24px.
- Align page headings, cards, forms and tables to a consistent content grid.
- Desktop layout should have comfortable content width and not stretch financial tables across excessively wide screens.
- Mobile layout should keep critical actions visible, use single-column forms, and avoid horizontally overflowing cards/tables.
- Use 44×44 CSS px as the minimum preferred interactive target size where practical; do not shrink tap targets to make navigation fit.
- Respect bottom safe areas for mobile navigation using `env(safe-area-inset-bottom)` where necessary.

### Typography

- Primary font direction: Inter with system fallbacks. Verify licensing and bundle strategy before introducing a font package; do not require a third-party runtime font request unnecessarily.
- Use a disciplined scale: approximately 12px metadata, 14px secondary UI text, 16px primary body/control text, 20–24px section/page headings, and 28–32px hero/primary financial values. Not every scale step must appear on every screen.
- Keep main UI weights to regular and semibold; medium may be used sparingly for form labels or navigation.
- Use tabular numerals for monetary values and align amounts by their numeric edge where helpful.
- Indian currency is shown with `₹`, sensible Indian grouping and two decimals where precision matters. Don't add redundant text like “Price:” when the context makes the amount clear.
- Avoid all-caps primary CTAs and excessive letter spacing.
- Text line-height should remain comfortable and scannable.

### Components

Define reusable variants and consistent tokens for:

- Primary, secondary, ghost, destructive and icon buttons
- Text, email, phone, password, amount, date/month and select controls
- Form labels, hints, inline validation errors and server errors
- Cards, stat summaries, table/list rows and section headers
- Status pills (only when the status matters), tooltips, dropdowns and dialogs
- Loading indicators/skeletons, empty states, success feedback and error states
- Chart legends, progress bars and category rows

Use consistent radius tiers rather than arbitrary per-component radii: e.g. 8px for small controls, 12px for buttons/inputs, 16px for major cards and rounded-full only for pills/avatars/progress tracks where appropriate.

### Iconography

- Use **Tabler Icons** consistently; prefer outline icons by default. Use a filled active variant only when the same icon has a matching filled version and the filled state materially improves navigation clarity.
- Official Angular package candidate: `@tabler/icons-angular`; verify the package exists and is compatible with the existing Angular version before installing, because the upstream repository has had documentation naming inconsistencies. Use only the icons required by the UI so the bundle remains tree-shakable.
- Keep a consistent visual size system (usually 18px/20px/24px), stroke weight and alignment.
- Decorative icons should be hidden from assistive technology; icon-only buttons need accessible names. If an icon isn't immediately recognizable, pair it with a visible text label or tooltip.
- Do not mix unrelated icon sets, emoji, filled material icons and outline Tabler icons in the same UI.

### Motion and interaction feedback

- Motion must explain a state change or help orient the user; avoid decorative animation for its own sake.
- Typical transitions should be short and subtle. Respect `prefers-reduced-motion` by removing/reducing non-essential movement.
- On submits, prevent duplicate actions, show a pending/loading state, then show success or actionable error feedback.
- For save/update operations, tell the user whether data was saved. Avoid showing success before the server confirms it.
- Empty states should explain what is missing and show the next meaningful action.
- Don't fake progress. Only count completed onboarding steps.
- Financial warnings must be factual and non-shaming; no manipulative loss-aversion prompts.

### Charts and financial content

- Accuracy and legibility matter more than visual novelty.
- Label chart series and axes clearly; use correct proportional scales; don't rely on colour alone.
- Use consistent bucket colours: Essentials blue, Safety amber, Investments violet.
- Show income, allocation limit, actual used amount and remaining/over-limit amount as distinct concepts. Do not label a derived estimate as a live bank/card figure.
- Preserve backend business semantics and decimal precision. Do not treat frontend numbers/calculations as the source of financial truth; use backend response values for authoritative totals.
- Do not include hardcoded sample totals in an authenticated user's real dashboard. Any pre-sign-up sample/dashboard must be explicitly marked “Sample data” and must not be persisted as real user data.

### Responsive navigation

- Desktop: left sidebar with clear active state, app mark/name, primary destinations and profile/logout in a secondary area.
- Mobile: use 3–5 primary bottom tabs. Initial proposal: Home, Budget, Entries, Reports, Profile; a prominent “Add entry” action may be a separate contextual/FAB/button, but do not create a sixth crowded tab.
- Keep hit targets at least 44×44px where practical, provide text labels, differentiate active state by colour plus shape/weight, separate navigation subtly from content, and respect safe-area padding.
- Keep route names and concepts consistent across desktop and mobile. Secondary items such as Help, Legal and Logout should not occupy primary bottom-navigation slots.

### Accessibility and forms

- Use semantic HTML, associated labels, keyboard-accessible interactions, visible focus indicators, and useful ARIA attributes only where needed.
- Form errors should be announced and associated with their controls; don't rely on colour alone.
- Use Angular Reactive Forms for registration, login, budget forms and transaction forms where their complexity and validation benefit from explicit testable form models.
- Use native elements when possible. Add Angular CDK/Aria only where it solves a real accessibility/interaction problem. Do not add Angular Material or another component framework on top of Tailwind by default.
- Verify text and interactive-state contrast. Do not treat the palette table as a substitute for contrast testing.

---

## 5. UX psychology rules adapted for a finance app

1. **Smart defaults:** offer a visible, editable Balanced preset where appropriate. Defaults must be transparent and must never silently override a manual choice.
2. **Goal gradient:** show actual onboarding completion; never display fake percentage progress.
3. **Reciprocity:** consider a clearly labelled sample/demo view before signup. Do not store sample values as a user's real finances.
4. **IKEA effect:** allow personal allocation and preferences within the existing backend rules; don't add needless setup steps just to create ownership.
5. **Loss aversion:** explain factual overspending and remaining amounts without scare tactics, guilt or manipulative upgrade prompts.
6. **Contrast effect:** compare the three allocation presets fairly, showing the real percentages and calculated values rather than nudging users deceptively.
7. Reduce decision fatigue with concise copy, meaningful defaults, limited options and clear next steps.
8. Apply e-commerce UI advice only where relevant: put the primary action close to its inputs, clarify totals, and remove redundant labels. Do not blindly add product-image cards, reviews or quantity pickers to finance screens.

---

## 6. Proposed screen and route plan

Use existing route conventions if already defined; otherwise propose simple routes and document them before implementing.

### Public/authentication area

- Welcome/intro page: concise product value proposition, login/register actions, optional demo preview only if clearly labelled.
- Login page: email, password, show/hide password, submit loading state, generic auth error.
- Registration page: full name, email, Indian phone number in `+91` + 10-digit format, employment type, password 12–128 characters. Match exact backend enums and validation.
- Do not display “forgot password” unless a real backend flow exists.

### Authenticated area

- **Home/Dashboard:** selected month, monthly income and allocation snapshot, budget used/remaining, latest entries, concise shortcuts.
- **Budget:** set monthly income, choose Conservative/Balanced/Aggressive or Manual allocation, show both percentage and rupee amounts, preserve backend validation and historical-month rules.
- **Entries:** add expense/safety saving/investment/card payment; list/history with filters and pagination; entry detail; void with confirmation and clear irreversible-history explanation.
- **Reports:** date range, grouping options `DAY`, `MONTH`, `QUARTER`, `HALF_YEAR`, `YEAR`, readable chart + data table/list alternative, recorded-income explanation and loading/empty/error cases.
- **Credit card:** clearly label estimated/manual outstanding; opening baseline form and summary; no claim that it is issuer-live data.
- **Profile:** current-user identity, logout, secondary settings placeholder only if needed; don't invent unavailable backend features.

Don't implement all of these at once. The prompts below intentionally sequence them.

---

# 7. OpenCode prompts — execute one phase at a time

## Shared guardrails for every phase

These apply to every prompt below:

- Work only in `D:\Budgeting_App\Budgenting_ui`.
- Read this file and the relevant UI/service requirements first.
- Preserve all existing Git changes; never stage, commit, push, restore or delete unrelated files.
- Inspect before editing. Do not replace app scaffolding or upgrade Angular without a verified reason.
- Use Tailwind CSS v4 syntax only after checking the installed version. Do not mix Tailwind v3 directives/config with v4.
- Use Tabler Icons consistently after verifying the official package name/version available for the existing Angular version.
- Use relative `/api` requests through the Angular development proxy to `http://localhost:8080`; don't hardcode production/local absolute API URLs in components.
- Session + CSRF auth, no JWT, no localStorage/sessionStorage tokens.
- Do not modify backend code in frontend phases. If API behavior differs from the frontend assumption, inspect backend source and report the contract mismatch.
- Keep TypeScript strict, component code understandable, and abstractions proportional to the MVP.
- Run lint/tests/build commands actually available in the current package scripts; report real outcomes rather than claiming unrun checks.
- Do not fill the page with mock data masquerading as real data. Mark demo fixtures clearly and isolate them from authenticated API-backed views.

---

## Prompt 0 — Frontend audit, design tokens, logo mark and app shell

**Scope:** Prepare the UI foundation and visual system only. Do not connect business endpoints or implement full auth/dashboard logic yet.

```text
We are starting the Angular UI phase of Monthly Budgeting Money Planner.

Work only in D:\Budgeting_App\Budgenting_ui. Read md_files/UI_UX_DESIGN_SPEC_AND_OPENCODE_PROMPTS.md and md_files/UI_REQUIREMENTS_FINAL.md first. Inspect the actual Angular app, package.json, global styles, route setup, assets and proxy configuration. Inspect Git status and preserve all existing changes; do not stage, commit, push, restore or delete unrelated files.

Implement Prompt 0 only:
1. Verify the current Angular version/build system and use its existing conventions. Do not upgrade Angular.
2. Install/configure Tailwind CSS v4 only if it is not already configured. Follow the current official Tailwind Angular/PostCSS guide compatible with the project. Do not use v3 @tailwind directives in a v4 project.
3. Verify the correct package name/version for Tabler Icons in Angular >=21, then add only the required official package and register used icons in a tree-shakable way. Avoid mixing icon libraries.
4. Implement the semantic OKLCH/CSS color tokens, dark-first palette, typography scale, 8px spacing rhythm with 4px fine adjustments, consistent radius/shadow/focus tokens and reusable component styles described in the design spec. Verify important foreground/background contrast and adjust tokens where needed.
5. Create a simple custom SVG brand mark based on an abstract “money allocation/progress” idea. Do NOT invent the final product name or wordmark; use the working title in app metadata only where needed.
6. Build the responsive authenticated app-shell skeleton: desktop sidebar, mobile bottom navigation (max 5 primary destinations), page header/content container, active state, mobile safe-area support, and placeholder route pages only. No real budget data or business API calls yet.
7. Add a small internal style-demo/preview page or section for buttons, inputs, cards, badges/status, typography, financial amounts, bucket colours, loading/empty/error states so the design system can be inspected before subsequent phases. Do not expose an insecure public debug route in production; gate it as an ordinary dev-only preview or document how to inspect it.
8. Use purposeful subtle effects, no excessive gradients/glow/shadow. Respect prefers-reduced-motion. Ensure keyboard focus and accessible icon naming.

Do not build login/register API integration, dashboard calculations, transaction screens or reports in this phase. Do not add Angular Material. Do not change backend files.

Validation: run the available npm build/test scripts and report exact results. Report changed files, Tailwind/Tabler package versions, routes created, how to run the UI, any contrast/accessibility issues, and Git status preservation. Stop after the foundation/shell.
```

### Prompt 0 acceptance checklist

- App starts/builds.
- Tailwind version/config is coherent and not a v3/v4 mix.
- Brand, semantic status and budget bucket tokens are centralized.
- Tabler icons have consistent size/stroke and accessible labels.
- Desktop shell and mobile navigation are responsive.
- App remains a shell: no invented financial data or business API wiring yet.

---

## Prompt 1 — Welcome, login/register, and secure session integration

**Scope:** Public welcome and real authentication screens; no business dashboard logic.

```text
Continue Monthly Budgeting Money Planner Angular implementation in D:\Budgeting_App\Budgenting_ui.

Read md_files/UI_UX_DESIGN_SPEC_AND_OPENCODE_PROMPTS.md, md_files/UI_REQUIREMENTS_FINAL.md, and inspect the backend source DTOs/controllers for the exact auth contract. Preserve the current Git worktree. Follow the established design tokens, custom brand mark and Tabler icon system; don't restyle the app independently.

Implement Prompt 1 only:
1. Create polished responsive welcome, login and registration routes using the dark-first charcoal/lime design system. Avoid oversized all-caps CTAs, unnecessary gradients and clutter.
2. Registration fields: fullName, email, phoneNumber, employmentType and password. Match backend enums exactly. Validate phone +91 plus ten digits and password 12–128 characters without modifying/trimming the password.
3. Login fields: email and password; provide show/hide password, visible focus, accessible labels, inline validation, loading state, duplicate-submit prevention and clear user-safe error feedback.
4. Integrate `GET /api/v1/auth/csrf`, `POST /api/v1/auth/register`, `POST /api/v1/auth/login`, `POST /api/v1/auth/logout`, `GET /api/v1/me` using relative `/api/v1/...` URLs through the dev proxy.
5. Preserve server-side cookie session auth. Do not use JWT or localStorage/sessionStorage. Configure fetch/XHR to preserve same-origin cookies as necessary.
6. Implement CSRF correctly: obtain the token and matching `XSRF-TOKEN` cookie, send the token as `X-XSRF-TOKEN` for state-changing calls, refresh/retrieve when missing or rejected, and account for login session rotation. Do not disable CSRF. Do not assume the Angular default XSRF interceptor automatically solves the initial token bootstrap; test the flow.
7. On login success, fetch `/api/v1/me` to establish user profile state, then route into the protected app shell. On registration success, show a useful confirmation and let the user log in; do not assume registration automatically logs in.
8. Add an auth guard and functional Angular HTTP interceptors as appropriate. Avoid redirect loops; allow public auth routes; on 401 from a protected request clear in-memory auth state and route to login. Never store session tokens in browser storage.
9. Do not implement real dashboard/budget/transactions in this phase; use an authenticated placeholder.

Add focused tests for form validation, auth state, CSRF/bootstrap behaviour, server errors and route guards using the project's existing test tools. Run tests and a production build. Do not modify backend code. Report exact files, commands/results, and any actual backend/frontend contract mismatch. Stop after auth UI + integration.
```

### Prompt 1 acceptance checklist

- Register matches the real DTO; no client `userId`.
- Correct CSRF cookie/header path works from browser dev proxy.
- Login maintains session cookie and `/me` verifies the identity.
- Logout invalidates the session and protected pages are gated.
- No JWT or token/localStorage storage.
- Responsive and accessible auth forms; all states designed.

---

## Prompt 2 — Dashboard and Monthly Budget

**Scope:** Real authenticated landing dashboard and budget setup/read/update.

```text
Continue the UI in D:\Budgeting_App\Budgenting_ui. Read this design spec and the actual backend MonthlyBudgetController, MonthlyBudgetService, request/response DTOs, ReportController and MonthlySummaryResponse. Preserve Git work. Do not modify backend code.

Implement Prompt 2 only:
1. Replace the authenticated placeholder with an API-backed dashboard. Use the current month in Asia/Kolkata business terms and fetch the documented monthly summary/budget endpoints. Confirm the exact API response fields from source; don't invent model names.
2. Show income, allocation preset, Essentials/Safety/Investments percentages, calculated allocations, actual used and remaining amounts as distinct concepts. Clearly separate budget limits from actual expenses.
3. Implement Budget page/form for salary/pocket money/other income, income-source label rules, preset selection and manual allocation. Default to Balanced only as a visible editable suggestion. If manual allocation is selected, display the percentage total and explain validation before submit.
4. Investments-disabled UI must follow backend behavior: MANUAL mode, investment percentage 0, Essentials + Safety = 100. Never silently redistribute or change user input.
5. Use current backend API response amounts as authoritative. Avoid frontend-only financial formulas for business truth. If a preview calculation is used for immediate feedback, label it as a preview and make server response authoritative after save.
6. Use clear form loading/saving/success/conflict states. Show read-only messaging for past months and conflict codes from the backend. Respect the backend month-format contract `YYYY-MM`.
7. Build a clean dashboard hierarchy: month selector, most important finance metrics, allocation visual, recent entries only if API support is present, and a clear “Add entry” CTA. No fake or hardcoded user data.
8. Desktop uses the shared sidebar; mobile uses the shared bottom navigation and thumb-friendly actions.

Add component/service tests for successful load, no budget, validation/conflict states, loading/error/empty states and allocation display formatting. Test responsive layouts and accessibility. Run the Angular test/build commands and report actual outcomes. Do not implement transaction forms, credit-card management or full reports yet. Stop after Dashboard + Monthly Budget.
```

### Prompt 2 acceptance checklist

- Budget form fields exactly match backend DTOs.
- Amounts show two decimals where required and use INR formatting.
- Allocation values are not confused with actual spending.
- Investments-off and past-period restrictions are represented accurately.
- No invented income/spending data.

---

## Prompt 3 — Money entries, category picker and transaction history

**Scope:** Add/list/detail/void entry UI.

```text
Continue the Angular app. Read the design spec and inspect actual MoneyEntryController, MoneyEntryService, request/response DTOs and CategoryController. Preserve Git status and the existing visual system. Do not modify backend code.

Implement Prompt 3 only:
1. Build a transaction/entry page and accessible create-entry form with date, time if required by the DTO, entry type, bucket, category, amount, payment method, optional note, and client request ID/idempotency handling only as the backend contract requires. Do not invent fields.
2. Retrieve valid categories from `GET /api/v1/reference-data/categories` and filter them according to the actual API contract. Do not hardcode category logic as the only source of truth.
3. Enforce UX-level validation for entry/bucket combinations, payment method requirements, amount precision, note length, and investment-disabled/budget-not-set responses, while treating backend validation as authoritative.
4. Make category and payment-method choices comprehensible using concise labels, not unexplained icon-only controls. Preserve exact enum values in API payloads.
5. Build paginated history with date/type/bucket/category/status filters supported by the backend. Keep stable server pagination; do not fetch every record and filter in memory.
6. Build entry detail and void confirmation. Explain that voiding marks the entry as VOID rather than deleting history. Handle 404, already-voided and other conflict errors with safe messages.
7. On create/void, display only confirmed server success. Disable duplicate submits while requests are in flight. Use a stable client request ID across retries only if the backend idempotency contract calls for it; inspect existing backend behavior.
8. Format timestamps for the user in Asia/Kolkata. Submit date/time values exactly as the backend request requires; don't convert UTC/IST twice.
9. Preserve dark surfaces, spacing, bucket colours, consistent Tabler icons, empty/loading/error states and responsive usability.

Add tests for form validation, category load, pagination/filter requests, create conflicts, duplicate-submit protection and void flows. Run the available tests/build. No credit-card summary/settings or reports UI in this phase. Stop after transaction functionality.
```

### Prompt 3 acceptance checklist

- Category source is the backend catalog.
- Backend validation errors are handled without generic “something went wrong” for known conflicts.
- No unbounded client-side history filtering.
- Voiding never looks like deletion.
- Date/time is not shifted across IST/UTC boundaries incorrectly.

---

## Prompt 4 — Credit-card tracking and financial reports

**Scope:** Credit-card summary/opening baseline and reports.

```text
Continue the Angular UI in D:\Budgeting_App\Budgenting_ui. Read this design spec and inspect the actual credit-card and reporting controller/service/DTO contracts before coding. Preserve the existing UI tokens and Git worktree. Do not modify backend code.

Implement Prompt 4 only:
1. Credit-card page/card using `GET /api/v1/credit-card/summary` and `PUT /api/v1/credit-card/opening-outstanding`. Clearly label the number “Estimated credit-card outstanding (manual tracking)” and never imply it is live issuer/bank data.
2. Explain opening baseline and tracking-start date in simple copy. Show conflict/locked states if posted card activity prevents edits. Do not build unsupported multi-card or bank-sync features.
3. Implement reports for `GET /api/v1/reports/monthly-summary?month=YYYY-MM` and `GET /api/v1/reports/summary?fromDate=&toDate=&groupBy=`. Use only supported groupBy values: DAY, MONTH, QUARTER, HALF_YEAR, YEAR.
4. Date range inputs must be interpreted as calendar dates in Asia/Kolkata. Respect report inclusion semantics returned by the backend, including recorded-income/incomeIncluded information. Do not present omitted income as zero or imply missing data when the API means “not included for this range.”
5. Provide a readable visual chart and an accessible table/list alternative with labels/values. No misleading axes, unexplained donut slices, 3D charts or decoration that hides totals. Reuse existing chart libraries if present; otherwise choose a small dependency only after reviewing bundle impact and compatibility.
6. Explain summary states such as BUDGET_NOT_SET, NO_INCOME, WITHIN_ALLOCATION and OVER_ALLOCATION in concise neutral language. Show negative remaining amount when over budget rather than silently clamping it to zero.
7. Include loading, no data, invalid range and server-error states. Dates/grouping controls must be keyboard accessible and responsive.
8. Do not implement bank sync, tax, net worth, investment market valuation or other explicitly out-of-scope features.

Add tests for period selection, date-range parameters, report status rendering, incomeIncluded/explanation display, empty data and errors. Run the Angular tests/build. Stop after credit-card and report UI.
```

### Prompt 4 acceptance checklist

- “Estimated” and “manual tracking” are visible wherever card balance is shown.
- Reports clearly distinguish consumed spending, safety saving, investment contribution, and recorded income.
- Date ranges/grouping match backend semantics exactly.
- Charts are visually restrained and accessible.

---

## Prompt 5 — Profile, polish, responsive/accessibility QA and end-to-end walkthrough

**Scope:** Finish the feature set already built; no new backend features.

```text
Perform a frontend polish and QA pass in D:\Budgeting_App\Budgenting_ui after Phases 0–4 are implemented. Read this spec, the actual UI requirements and current routes/components. Preserve user work and do not modify backend code.

Implement Prompt 5 only:
1. Complete the profile/account menu using only fields and actions that actually exist (`GET /api/v1/me`, logout). Do not create non-functional reset-password, theme-settings or profile-edit controls unless a real supported flow exists.
2. Audit every screen for consistent spacing (8px base, 4px fine adjustments), alignment, card/input/button radii, typography roles, icon sizes/strokes, borders and colours. Remove redundant labels, arrows, badges and decorative elements with no purpose.
3. Audit desktop/tablet/mobile layouts. Check navigation at narrow widths, 44×44 minimum practical hit targets, safe area, chart/table overflow, form wrapping and sticky action positioning.
4. Audit accessibility: keyboard-only flow, visible focus, semantic headings/landmarks, associated form labels, validation association, icon accessible names, meaningful status announcements, non-colour-only state communication, and prefers-reduced-motion.
5. Verify light/dark behavior only if theme switching was explicitly implemented. The proposed initial target is dark-first; do not add a theme toggle just to add a feature.
6. Verify no financial value is hardcoded into real user views, no raw API error/stack trace is displayed, no secrets/tokens are logged or saved in browser storage, and all session/CSRF handling remains intact.
7. Run the production Angular build and all available unit/component tests. If browser E2E tooling already exists, run it; don't add a heavy new test stack without approval. Do not claim manual cross-device testing unless it was actually done.
8. Write a concise UI verification checklist/result in the project documentation without overwriting the source-of-truth requirement documents.

Report files changed, tests/build results, screen sizes checked, remaining UI bugs, accessibility gaps and API integration limitations. Do not add new product scope, do not modify backend code, and do not stage/commit/push.
```

---

## 8. Visual acceptance checklist (use at every review)

### Visual hierarchy

- Can a user identify the page purpose and primary action in 2–3 seconds?
- Is the most important financial number visually prominent without overpowering context?
- Are there no more than a few competing accents on one screen?

### Content

- Labels are concise, specific and user-friendly.
- Currency/amount labels don't repeat context unnecessarily.
- Important distinctions are explicit: income vs budget allocation vs actual spending vs remaining amount.
- Empty states explain both the state and the next possible action.

### Consistency

- Same button variants, control heights, radii, page gutters, typography and icons are used everywhere.
- Same bucket/status colours mean the same thing on every page.
- Borders are subtle; shadows and gradients are purposeful.

### Interaction

- Every button does something real or is clearly disabled/marked as future work; no fake controls.
- Pending operations show feedback and prevent duplicate submissions.
- Saved/voided state reflects the server response.
- Navigation active state is clear.

### Responsive/accessibility

- Mobile forms don't overflow; tables have a mobile-friendly alternative.
- Bottom navigation respects safe-area and tap targets.
- Keyboard focus is always visible; forms can be completed without a mouse.
- Reduced-motion preference is respected.
- Contrast is verified, including lime button text, muted labels, border/focus states and semantic statuses.

### Security/API correctness

- No JWT or auth token in localStorage/sessionStorage.
- No public business API access introduced by frontend changes.
- CSRF header and cookie flow are exercised in the browser.
- No client-supplied user ID for ownership.
- No real dashboard figures from mock data.

---

## 9. Proposed logo direction

Create a minimal custom SVG mark, not a stock bank/rupee icon. Suggested concept: a rounded container or abstract growth/flow motif built from 2–3 simple shapes, hinting at deliberate allocation and steady financial progress. Use lime as a small accent on charcoal, with a one-colour version for small sizes. Avoid gradients in the core mark so it remains clear at favicon scale.

Until a final product name is selected:

- Keep the mark independent of any wordmark.
- Use “Monthly Budgeting Money Planner” only as working UI/title text where needed.
- Do not invent a final public brand name or produce a lockup that embeds a made-up name.

---

## 10. Official references for implementation

Check these links against the currently installed project versions when applying a prompt:

- Tailwind CSS Angular installation (v4 / PostCSS): https://tailwindcss.com/docs/installation/framework-guides/angular
- Tailwind CSS theme variables: https://tailwindcss.com/docs/theme
- Tabler Icons for Angular package README: https://github.com/tabler/tabler-icons/blob/main/packages/icons-angular/README.md
- Tabler Icons repository/license and visual grid: https://github.com/tabler/tabler-icons
- Angular Reactive Forms: https://angular.dev/guide/forms
- Angular Routing: https://angular.dev/guide/routing
- Angular accessibility best practices: https://angular.dev/best-practices/a11y
- Angular HTTP interceptors: https://angular.dev/guide/http/interceptors
- MDN `oklch()` CSS reference: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/Values/color_value/oklch
- MDN `prefers-reduced-motion`: https://developer.mozilla.org/en-US/docs/Web/CSS/Reference/At-rules/%40media/prefers-reduced-motion

Implementation notes from these references: current Tailwind Angular setup uses `@tailwindcss/postcss`, a PostCSS configuration, and `@import "tailwindcss"`; Tailwind v4 supports named theme variables through `@theme`. The Tabler Angular package uses tree-shakable icon imports/providers and documents Angular >=21; verify the npm package name/version before installing. Angular recommends functional HTTP interceptors; Angular's reactive forms are a good fit for testable, validated forms. OKLCH is supported in modern browsers, but the actual contrast of each pair must still be tested. Respect reduced-motion settings for non-essential transitions.
