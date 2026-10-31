# Project Status

**Project:** Indian Family Money Planner (Budgeting App)  
**Updated:** October 31, 2026  
**Current phase:** V2 frontend features implemented; verification and backend integration review

## Current State

- The Angular 22 frontend implements the V1 application shell, authentication, Home, Budget, Entries, Reports, Credit Card and Profile screens.
- V2 Allocation C is implemented in the Budget screen:
  - Presets Conservative, Balanced and Aggressive.
  - Percentage and amount input modes.
  - Exact BigInt-paise conversions with backend-matching residual allocation.
  - Investments on/off handling.
  - Under-allocation guidance with immediate allocation and Undo.
  - Over-allocation blocking and backend-aligned validation.
- V2 investment categories use the eight supported options and exclude the legacy `GOLD_SIP` category from new entries.
- SIP Plans is implemented at `/sip-plans`:
  - Plan list, selection and detail view.
  - Create and edit plans.
  - Backend-generated installment schedule for two months back through three months ahead.
  - Mark-as-paid and stop flows with confirmation dialogs.
  - Monthly commitment summary and non-blocking over-allocation warning.
  - Links from Entries and the Home Investments card.
- SIP-managed money entries display their plan/installment context. Voiding one explains that the installment becomes unpaid and can be recorded again.
- Dates from the backend are displayed as `dd-MM-yyyy`.

## Architecture Notes

- Backend remains the source of truth for financial calculations, SIP schedules, statuses, payment idempotency and money-entry creation.
- The frontend never marks an installment paid optimistically or creates a local SIP payment entry.
- The SIP Plans route is lazy-loaded, so the feature does not add its full bundle to the initial load.
- Shared currency helpers use string/BigInt arithmetic and do not use floating-point values as financial truth.
- The business timezone is `Asia/Kolkata`; backend dates are calendar dates and are not converted as instants.

## Verification

- Test suite: 24 test files, 211 tests passing.
- Commands:
  - `npm test -- --watch=false`
  - `npm run build`
- Production build succeeds. The initial bundle is approximately 501 kB raw; the initial warning threshold was raised from 500 kB to 520 kB to accommodate the V2 feature set while keeping the 1 MB error limit.

## Known Considerations

- Applying prettier formatting to existing files may produce unrelated diffs; format only touched files when requested.
- The backend forbids changing SIP start dates after an installment has been paid; the UI surfaces the backend error rather than duplicating all schedule rules.
- Payment records use the selected payment date. The backend supplies the payment time when one is not sent.
- The initial bundle should continue to be monitored as more features are added; the current warning threshold has limited headroom.

## Recommended Next Steps

1. Perform an end-to-end check against the running backend for create, edit, pay, stop and summary flows.
2. Add focused tests for backend integration error codes if the contract changes.
3. Review bundle splitting and the 500 kB warning threshold.
4. Commit frontend changes only when explicitly requested.
