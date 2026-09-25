# PRUMO SYSTEM

Mobile-first production collection for transported meals. Authenticated records are scoped to the account through ChatGPT identity headers. Cloudflare D1 stores production documents with optimistic version checks and server-appended operation history.

## Features

- Daily preparation lots, measured container tares, grouped containers, construction sites and transport.
- Ingredient costing, raw/clean/cooked yield, observed and projected production CMV, declared operational expenses.
- Temperature samples in blocks of twenty active weighing records; individual alerts and missing coverage remain visible.
- PDF summary with optional complete weighing trace; JSON export.
- No offline synchronization. Failed saves retain input; concurrent version conflicts require reopening the production.

## Accounting scope

CMV is a production management ratio, not accounting inventory valuation. Revenue assumes served meals are billable at the configured prices. Taxes are user-declared effective rates; unknown values prevent a completed managerial result. R$5.30 is a presumed comparison supplied by the user.

## Verification

TypeScript check and production build completed. Calculation tests in tests/calculations.test.ts cover tare multiplication, missing values, yield, CMV, cost completeness, sample coverage and cancellations. PDF generation was inspected using a synthetic dataset of 70 sites and five preparations. Synthetic data is never inserted into the app database.

## Storage

Schema is in db/schema.ts; generated SQL migrations are in drizzle. API: app/api/productions/route.ts. Calculations: lib/uan.ts. PDF: lib/report.ts. UI: components/uan/workspace.tsx. Limits: 80 preparations, 500 destinations, 10,000 weighing records and 1.8 MB serialized document per production.

Font license is included in licenses. PDF font is embedded and loaded with the on-demand report module.
