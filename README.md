# PRUMO SYSTEM

Sistema móvel para coleta e controle de produção de refeições transportadas.
Os registros autenticados são isolados por conta. O Cloudflare D1 preserva
produções, fichas técnicas, equipamentos, auditoria e horas; o R2 armazena
fotos e comprovantes.

## Features

- Daily preparation lots, measured container tares, grouped containers, construction sites and transport.
- Ingredient costing, raw/clean/cooked yield, observed and projected production CMV, declared operational expenses.
- Temperature samples in blocks of twenty active weighing records; individual alerts and missing coverage remain visible.
- PDF summary with optional complete weighing trace; JSON export.
- No offline synchronization. Failed saves retain input; concurrent version conflicts require reopening the production.

## Accounting scope

CMV is a production management ratio, not accounting inventory valuation. Revenue assumes served meals are billable at the configured prices. Taxes are user-declared effective rates; unknown values prevent a completed managerial result. R$5.30 is a presumed comparison supplied by the user.

## Verificação

Execute `pnpm check` antes de abrir ou integrar um pull request. O comando
valida migrações, TypeScript, lint, testes e build de produção. Dados sintéticos
de teste nunca são inseridos no banco publicado.

## Storage

Schema is in db/schema.ts; generated SQL migrations are in drizzle. API: app/api/productions/route.ts. Calculations: lib/uan.ts. PDF: lib/report.ts. UI: components/uan/workspace.tsx. Limits: 80 preparations, 500 destinations, 10,000 weighing records and 1.8 MB serialized document per production.

Font license is included in licenses. PDF font is embedded and loaded with the on-demand report module.

## Segurança de dados e migrações

- Migrações de produção são somente aditivas. Não use `DELETE FROM`, `DROP TABLE`, `DROP COLUMN` ou `UPDATE` sem `WHERE` em migrações novas.
- Migrações já aplicadas são imutáveis; correções devem ser acrescentadas em uma nova migração.
- Execute `pnpm guard:migrations` antes de aplicar migrações.
- Ajustes de dados devem usar os scripts de `scripts/data-fixes/`, começando sempre em modo `--dry-run` e preservando o valor anterior em `data_fix_log`.
- Nunca aplique migrações, scripts de correção ou deploy sem backup validado e autorização do proprietário.
- O acesso depende da política privada do Sites. A publicação deve manter o endpoint público do Worker desativado (`workers_dev: false` ou equivalente da plataforma).
